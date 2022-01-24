import * as vscode from 'vscode';
import { ResultItem, searchFilters } from './searchCommands';
import { Filter } from "./utils";
export class SearchWebViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'searchWebView';

	private _view?: vscode.WebviewView;
	private _results?: ResultItem[];
	private _doc?: vscode.TextDocument;
	private _readCache: boolean = true;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {

		console.log("resolveWebviewView");


		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'jump':
					{

						this.jump(data.value);
						break;
					}
			}
		});
		// webviewView.onDidDispose(()=>{
		// 	vscode.commands.executeCommand("searchWebView.removeView");
		// });
	}
	private _getHtmlForWebview(webview: vscode.Webview) {

		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'js', 'main.js'));

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				
				<title>Log Knife</title>
				<style>
				
					.container{
						font-family:-moz-fixed;
						white-space:pre;
						margin:4px;
						font-size:14px;

					} 
					
					body.vscode-light {
						--color: rgb(19, 1, 1);
						--background-color:white;
					  }
					  body.vscode-dark {
						--color: rgb(248, 244, 244);
                       --background-color:rgb(24, 2, 2);
					  }
					  body.vscode-high-contrast {
						--color: rgb(19, 1, 1);
						--background-color:rgb(231, 224, 224);
					  } 
		
			
					  .search {
						/* position:fixed; */
			
						width: 50%;
						border-radius: 18px;
						outline: none;
						border: 1px solid #ccc;
						padding-left: 40px;
						/*textBlockQuote.background*/
						/*background-color: var(--widget-shadow);*/
						/*background-color: var(--textBlockQuote-background);*/
						/*background-color:black;*/
						background-color: var(--background-color);
						color: var(--color);
						margin: auto auto 0 auto;
			
					}
			
	
			
			
			
			.button { /* 按钮美化 */
			
				border-width: 0px; /* 边框宽度 */
				border-radius: 3px; /* 边框半径 */
				cursor: pointer; /* 鼠标移入按钮范围时出现手势 */
				outline: none; /* 不显示轮廓线 */
				font-family: Microsoft YaHei; /* 设置字体 */
				color: white; /* 字体颜色 */
				font-size: 17px; /* 字体大小 */
			
			}
			/* 悬停样式 */
			.button:hover {
				  background-color: #008CBA;
				  color: white;
			}
				
				  </style>       
			</head>
			<body>
					<div style="position: fixed; left: 20px; top: 0; width: 100%; opacity:1">
					<input type="text" id="search" class="search" placeholder="搜索" />
					<select>
						<option class="select" value="volvo">filter</option>
						<option class="select" value="saab">find</option>
					</select>
					<input type="button" class="button" value="下一个" onclick="next()" />
					<input type="button" class="button" value="上一个" onclick="previous()" />
				  </div>

				  <div  id="container" class="container"> 
			
				 </div>
				 <script  src="${scriptUri}"></script>
			</body>
			</html>`;
	}
	public webViewSearchFilters(doc: vscode.TextDocument | undefined, filters: Filter[]) {
		console.log("webViewSearchFilters");
		console.log("fiters:  " + filters);
		this._doc = doc;

		this._results = searchFilters(doc, filters);
		console.log("results: " + this._results);

		if (typeof this._results === undefined) {
			return;
		}


		this.viewResult();


	}

	public viewResult() {

		vscode.commands.executeCommand("workbench.view.extension.searchWebViewContainer").then(() => {
			console.log("Webview up！");

			if (this._view) {
				this._view.show(false);
				console.log("viewResult");
				this._view.webview.postMessage({ type: 'viewResult', value: this._results });

				for (var i = 0; i < this._results!.length; i++) {
					var r = this._results![i];
					var docorationType = vscode.window.createTextEditorDecorationType({
						color: `${r.color}`,
						fontWeight: "bold"
						//	gutterIconPath:`\$(chevron-right)`
					});
					let editor = vscode.window.activeTextEditor;
					editor!.setDecorations(docorationType, [new vscode.Range(r.lineBegin, r.columnBegin, r.lineEnd, r.columnEnd)]);

				}

			}
		}

		);

	}

	public jump(value: any) {


		let line: number = value.line;
		let columnEnd: number = value.columnEnd;
		console.log("line " + line.toString());
		console.log("columnEn " + columnEnd.toString());


		// Make sure document is showing
		if (!this._doc) {
			return;
		}

		vscode.window.showTextDocument(this._doc).then(
			() => { },
			() => { }
		);
		if (typeof vscode.window.activeTextEditor !== "undefined") {
			console.log(vscode.window.activeTextEditor);
			// Make the result visible
			vscode.window.activeTextEditor.revealRange(new vscode.Range(line, 0, line, columnEnd));

			// Select the result
			vscode.window.activeTextEditor.selection = new vscode.Selection(line, 0, line, columnEnd);
		}

	}

}




