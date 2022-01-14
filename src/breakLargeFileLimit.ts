/* --------------------
 * Copyright (C) Matthias Behr, 2020 - 2021
 * 
 * This extension provides a temporary solution until vscode issue #27100, feature request #31078
 * is changed/implemented.
 * 
 * Missing features:
 * [ ] support watch for changing files
 * [ ] remove readonly restriction
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { createInterface } from 'readline';
const { once } = require('events');
import TelemetryReporter from 'vscode-extension-telemetry';


export class LFSProvider implements vscode.FileSystemProvider { // export only for test access?

	limitedSize: number = 1024 * 1024; // limit to 1MB on first read.
	reReadTimeout: number = 5000; // 5s default
	private _fileFilters: string[]=[];
	private _uriMap: Map<string, { limitSize: boolean, fileBuffer?: Buffer, filters?: { search: string, replace: string }[] }> = new Map<string, { limitSize: boolean, fileBuffer?: Buffer, filters?: { search: string, replace: string }[] }>();

	constructor(private storage?: vscode.Memento,private reporter?:TelemetryReporter) {

	}

	markLimitSize(uri: vscode.Uri, limitSize = true, filters?: { search: string, replace: string }[]) {
		this.storage?.update(`filters_${uri.toString()}`, filters);
		if (!this._uriMap.has(uri.toString())) {
			console.log(`log-knife.markLimitSize(uri=${uri.toString()})... limitSize=${limitSize}`);
			this._uriMap.set(uri.toString(), { limitSize: limitSize, filters: filters });
		} else {
			let curSet = this._uriMap.get(uri.toString());
			if (curSet) {
				curSet.limitSize = limitSize;
				curSet.filters = filters;
				this._uriMap.set(uri.toString(), curSet);
			}
		}
	}

	/**
	 * read a file line by line and apply replaces per line
	 * filters are only allowed to shrink the file!
	 * @param fsPath filepath of the file to read
	 * @param filters array of search/replace to be applied per line
	 * @returns Buffer with the full replaced file content 
	 */
	async readWithFilters(fsPath: string, filtersJson: { search: string, replace: string }[]): Promise<Buffer | undefined> {
		try {
			const fileStat = fs.statSync(fsPath);
			const buf = Buffer.allocUnsafe(fileStat.size);
			let bufUsed = 0;
			const filters = filtersJson.map(f => { return { search: new RegExp(f.search, 'g'), replace: f.replace }; });
			const filtersLen = filters.length;
			try {
				const rl = createInterface({
					input: fs.createReadStream(fsPath),
					crlfDelay: Infinity
				});

				rl.on('line', (line) => {
					// we keep empty lines as empty:
					if (!line.length) {
						bufUsed += buf.write('\n', bufUsed); // todo detect \r\n? 
						return;
					}
					// check each search regExp:
					for (let i = 0; i < filtersLen; ++i) {
						line = line.replace(filters[i].search, filters[i].replace);
						// todo check whether it's faster to always replace line or 
						// e.g. match first and then replace.
					}
					if (line.length) {
						if (bufUsed) {
							bufUsed += buf.write('\n', bufUsed); // todo detect \r\n? 
						}
						bufUsed += buf.write(line, bufUsed);
					}
				});
				await once(rl, 'close');
			}
			catch (err) {
				console.error(`readWithFilters got inner err='${err}'`);
			}
			return buf.slice(0, bufUsed);
		}
		catch (err) {
			console.error(`readWithFilters got outer err='${err}'`);
		}
		return undefined;
	}

	stat(uri: vscode.Uri): vscode.FileStat {

		if (!this._uriMap.has(uri.toString())) {
			this._uriMap.set(uri.toString(), { limitSize: true, filters: this.storage?.get(`filters_${uri.toString()}`) });
		}
		// todo do we have to return here the size of the filtered content?

		const limitSize = this._uriMap.get(uri.toString())?.limitSize;

		// console.log(`log-knife.stat(uri=${uri.toString()})... _limitSize=${limitSize}`);
		const fileUri = uri.with({ scheme: 'file' });
		const realStat = fs.statSync(fileUri.fsPath);
		let fileStat: vscode.FileStat = { ctime: realStat.ctime.valueOf(), mtime: realStat.mtime.valueOf(), size: (limitSize && realStat.size > this.limitedSize) ? this.limitedSize : realStat.size, type: realStat.isFile() ? (vscode.FileType.File) : (realStat.isDirectory() ? vscode.FileType.Directory : vscode.FileType.Unknown) };
		// console.log(` stat returning size=${fileStat.size}/${realStat.size}`);
		return fileStat;
	}

	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		if (!this._uriMap.has(uri.toString())) {
			this._uriMap.set(uri.toString(), { limitSize: true, filters: this.storage?.get(`filters_${uri.toString()}`) });
		}
		let curSet = this._uriMap.get(uri.toString());
		if (!curSet) {
			throw vscode.FileSystemError.Unavailable();
		}

		console.log(`log-knife.readFile(uri=${uri.toString()})... _limitSize=${curSet.limitSize} filters=${JSON.stringify(curSet.filters)}`);

		if (!curSet.fileBuffer) {
			const fileUri = uri.with({ scheme: 'file' });
			if (curSet.filters === undefined || curSet.filters.length === 0) {
				console.log(` largeFile reading ${fileUri.fsPath} without filters`);
				curSet.fileBuffer = fs.readFileSync(fileUri.fsPath);
			} else {
				// reading with filters
				curSet.fileBuffer = await this.readWithFilters(fileUri.fsPath, curSet.filters);
			}
			if (!curSet.fileBuffer) {
				throw vscode.FileSystemError.FileNotFound();
			}
			this.reporter?.sendTelemetryEvent('open large file', undefined, { 'fileSize': curSet.fileBuffer.length, 'filters': curSet.filters?.length || 0 });
		}

		if (curSet.limitSize && curSet.fileBuffer && (curSet.fileBuffer.length <= this.limitedSize)) {
			// the file is already smaller than our limit
			curSet.limitSize = false;
		}

		if (curSet.limitSize) {
			setTimeout(() => {
				//console.log(` readFile triggering re-read...`);
				let curSet = this._uriMap.get(uri.toString());
				if (curSet) {
					curSet.limitSize = false;
					this._uriMap.set(uri.toString(), curSet);
				}
				this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri: uri }]);
			}, this.reReadTimeout);

			return curSet.fileBuffer.slice(0, 0 + this.limitedSize);
		} else {
			let toRet = curSet.fileBuffer;
			curSet.fileBuffer = undefined;
			return toRet;
		}
	}

	private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

	watch(uri: vscode.Uri): vscode.Disposable {
		console.log(`log-knife.watch(uri=${uri.toString()}...`);
		return new vscode.Disposable(() => {
			console.log(`log-knife.watch.Dispose ${uri}`);
			let curSet = this._uriMap.get(uri.toString());
			if (curSet) {
				// on changing to a different editor the watch dispose is called already.
				// let's try to optimize that.
				// we don't delete the key here as we don't know whether the file is still open.
				//curSet.limitSize = true;
				curSet.fileBuffer = undefined;
				this._uriMap.set(uri.toString(), curSet);
			}
		});
	}

	onDidCloseTextDocument(uri: vscode.Uri) {
		// console.log(`log-knife onDidCloseTextDocument(${uri.toString()})...`);
		let curSet = this._uriMap.get(uri.toString());
		if (curSet) {
			console.log(` onDidCloseTextDocument(${uri.toString()}) closing internally.`);
			curSet.limitSize = true;
			curSet.fileBuffer = undefined;
			this._uriMap.set(uri.toString(), curSet);
		}
	}

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
		console.log(`log-knife.readDirectory(uri=${uri.toString()}...`);
		let entries: [string, vscode.FileType][] = [];
		// list all dirs and files matching our filter:
		const dirEnts = fs.readdirSync(uri.fsPath, { withFileTypes: true });
		for (var i = 0; i < dirEnts.length; ++i) {
			// console.log(` log-knife.readDirectory found ${dirEnts[i].name}`);
			if (dirEnts[i].isDirectory()) {
				entries.push([dirEnts[i].name, vscode.FileType.Directory]);
			} else {
				if (dirEnts[i].isFile()) {
					let matchesFilter = this._fileFilters.length > 0 ? false : true;
					for (let j = 0; j < this._fileFilters.length; ++j) {
						if (dirEnts[i].name.endsWith(this._fileFilters[j])) {
							matchesFilter = true;
							break;
						}
					}
					if (matchesFilter) {
						entries.push([dirEnts[i].name, vscode.FileType.File]);
					}
				}
			}
		}
		return entries;
	}

	writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void {
		console.log(`log-knife.writeFile(uri=${uri.toString()}...`);
		throw vscode.FileSystemError.NoPermissions();
	}

	rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
		console.log(`log-knife.rename(oldUri=${oldUri.toString()}...`);
		throw vscode.FileSystemError.NoPermissions();
	}

	delete(uri: vscode.Uri): void {
		console.log(`log-knife.delete(uri=${uri.toString()}...`);
		throw vscode.FileSystemError.NoPermissions();
	}

	createDirectory(uri: vscode.Uri): void {
		console.log(`log-knife.createDirectory(uri=${uri.toString()}...`);
		throw vscode.FileSystemError.NoPermissions();
	}

}