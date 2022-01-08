// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { FilterTreeViewProvider } from "./filterTreeViewProvider";
import { Filter, cleanUpIconFiles } from "./utils";
import {deleteFilter, setShownOrHiden,importFilters, exportFilters, addFilter, editFilter, refresFilterTreeView } from "./commands";
let storageUri: vscode.Uri;
import { SearchTreeViewProvider } from './searchTreeViewProvider';
import { ResultItem,searchFilters,viewResult } from './searchCommands';
export type State = {
    filterArr: Filter[];
    filterTreeViewProvider: FilterTreeViewProvider;
    storageUri: vscode.Uri; 
};
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {


	storageUri = context.globalStorageUri; //get the store path
    cleanUpIconFiles(storageUri); //clean up the old icon files

        
    //internal globals
    const filterArr: Filter[] = []; 
    const state: State = {
        filterArr,
        filterTreeViewProvider: new FilterTreeViewProvider(filterArr),
        storageUri
    };

    //register filterTreeViewProvider under id 'filters' which gets attached
    //to the file explorer according to package.json's contributes>views>explorer
    vscode.window.registerTreeDataProvider('log-knife-view', state.filterTreeViewProvider);
    
    //Add events listener
    // var disposableOnDidChangeVisibleTextEditors = vscode.window.onDidChangeVisibleTextEditors(event => {
    //     refresFilterTreeView(state);
    // });
    // context.subscriptions.push(disposableOnDidChangeVisibleTextEditors);

    


    //register commands
    let disposableExport = vscode.commands.registerCommand(
        "log-knife.exportFilters", 
        () => exportFilters(state));
    context.subscriptions.push(disposableExport);

    let disposableImport = vscode.commands.registerCommand(
        "log-knife.importFilters", 
        () => importFilters(state));
    context.subscriptions.push(disposableImport);

    
	let disposibleAddFilter = vscode.commands.registerCommand(
        "log-knife.addFilter",
        () => addFilter(state)
    );
    context.subscriptions.push(disposibleAddFilter);



    let disposibleEditFilter = vscode.commands.registerCommand(
        "log-knife.editFilter",                
        (filterTreeItem: vscode.TreeItem) => editFilter(filterTreeItem, state)
    );
    context.subscriptions.push(disposibleEditFilter);

    let disposibleDeleteFilter = vscode.commands.registerCommand(
        "log-knife.deleteFilter",
        (filterTreeItem: vscode.TreeItem) => deleteFilter(filterTreeItem, state)
    );
    context.subscriptions.push(disposibleDeleteFilter);

    let disposibleEnableHighlight = vscode.commands.registerCommand(
        "log-knife.enableFilter",
        (filterTreeItem: vscode.TreeItem) => setShownOrHiden(true, filterTreeItem, state)
    );
    context.subscriptions.push(disposibleEnableHighlight);

    let disposibleDisableHighlight = vscode.commands.registerCommand(
        "log-knife.disableFilter",
        (filterTreeItem: vscode.TreeItem) => setShownOrHiden(false, filterTreeItem, state)
    );
	context.subscriptions.push(disposibleDisableHighlight);




	//search view
	//searview
const getActiveDocument = (): vscode.TextDocument | undefined => {
	// Make sure there is an active editor window for us to use
	if (typeof vscode.window.activeTextEditor === "undefined") {
		return undefined;
	}

	// Get the active document
	return vscode.window.activeTextEditor.document;
};

const createTreeView = (provider: SearchTreeViewProvider): vscode.TreeView<ResultItem> => {
	const treeViewOptions: vscode.TreeViewOptions<ResultItem> = {
		showCollapseAll: false,
		treeDataProvider: provider,
	};

	return vscode.window.createTreeView("searchView", treeViewOptions);
};



const searchRegexCase=():void=>{
	let doc:vscode.TextDocument|undefined=getActiveDocument();
	let results:ResultItem[]|undefined=searchFilters(doc,state.filterArr);
	if(results==undefined)
	     return;
	const provider: SearchTreeViewProvider = new SearchTreeViewProvider(results,doc);
	const treeView: vscode.TreeView<ResultItem> = createTreeView(provider);
	treeView.reveal(results[0], { expand: true, focus: true, select: false }).then(
					() => {},
					() => {}
				);

}


context.subscriptions.push(vscode.commands.registerCommand("log-knife.searchRegexCase", searchRegexCase));
context.subscriptions.push(vscode.commands.registerCommand("log-knife.viewResult", viewResult));



}



// this method is called when your extension is deactivated
export function deactivate() {}
