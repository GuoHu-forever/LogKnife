
import * as vscode from 'vscode';
import { FilterTreeViewProvider } from "./filterTreeViewProvider";
import { Filter, cleanUpIconFiles,getActiveDocument} from "./utils";
import {deleteFilter, setShownOrHiden,importFilters, exportFilters, addFilter, editFilter, refresFilterTreeView } from "./filterCommands";
import {SearchWebViewProvider} from "./searchWebViewProvider";
//Extension storge position
let storageUri: vscode.Uri;
import { SearchTreeViewProvider } from './searchTreeViewProvider';

export type State = {
    filterArr: Filter[];
    filterTreeViewProvider: FilterTreeViewProvider;
    storageUri: vscode.Uri; 
};

export function activate(context: vscode.ExtensionContext) {


	storageUri = context.globalStorageUri; 
    cleanUpIconFiles(storageUri); 

        
    //internal globals
    const filterArr: Filter[] = []; 
	//global variable so you can visit it everywhere
    const state: State = {
        filterArr,
        filterTreeViewProvider: new FilterTreeViewProvider(filterArr),
        storageUri
    };
    /*filter Tree View code start----------------------------------------------------------------
	  filter tree View is on the sidebar of Vscode, you can add/remove/import/export fitlers
	*/

    vscode.window.registerTreeDataProvider('log-knife-view', state.filterTreeViewProvider);
    

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




/*Search of fiters into Log and display on the panel start-----------------------------------
  this section is responsible for searching with regex and displaying with webview
*/

    
const provider = new SearchWebViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('searchWebView', provider));

	context.subscriptions.push(
		vscode.commands.registerCommand('log-knife.searchWebView', () => {
			let doc:vscode.TextDocument|undefined=getActiveDocument();
            if( doc === undefined){
                vscode.window.showErrorMessage("vs限制插件使用大文件，请ctrl+c复制一份到新的tab中绕过该限制");
              
	           return ;
             }
            doc=doc as vscode.TextDocument;
			provider.webViewSearchFilters(doc,state.filterArr);
		}));

 //just for debug----------------------------------------------------------------------------------------
		context.subscriptions.push(
			vscode.commands.registerCommand('log-knife.debug',()=>{
                console.log("开始debug----------------------------------------------");
                var editor = vscode.window.activeTextEditor;
                console.log("editor: "+editor);
                //vscode.window.showErrorMessage("Please open any Text in Editor or check that log file is not to big");
              
                var docs=vscode.workspace.textDocuments;
                for(var i=0;i<docs.length;i++){
                    console.log(docs[i].fileName);
                }
			    



			
			})
		);



}



// this method is called when your extension is deactivated
export function deactivate() {

}
