
import * as vscode from 'vscode';
import { FilterTreeViewProvider,FilterItem } from "./filterTreeViewProvider";
import { flattenFilterNode,cleanUpIconFiles,getActiveDocument, FilterNode} from "./utils";
import {moveUpOrDown,editFilterGroup,addFilterGroup, setShownOrHiden,importFilters, exportFilters, addFilter, editFilter, deleteFilter,editColor,refresFilterTreeView } from "./filterCommands";
import {SearchWebViewProvider} from "./searchWebViewProvider";
import * as Process from 'child_process';
import {LargeFileSystemProvider} from './LargeFileSystemProvider';
import * as fs from 'fs';
//import TelemetryReporter from 'vscode-extension-telemetry';
//Extension storge position
let storageUri: vscode.Uri;
import { VSColorPicker } from './debug';

export type State = {
    filterRoot: FilterNode;
    filterTreeViewProvider: FilterTreeViewProvider;
    storageUri: vscode.Uri; 
    searchWebviewProvider?:SearchWebViewProvider;
};
export function activate(context: vscode.ExtensionContext) {


	storageUri = context.globalStorageUri; 
    cleanUpIconFiles(storageUri); 

        
    //internal globals
    const root:FilterNode={
        isGroup:true,
        isShown:true,
        id:0,
        children:[],
        regex:new RegExp("log-knife-root")
    };
	//global variable so you can visit it everywhere
    const state: State = {
        filterRoot:root,
        filterTreeViewProvider: new FilterTreeViewProvider(root),
        storageUri
    };
    
    if(!context.globalState.get("state")){
        console.log("state is null");
        
        context.globalState.update("state","1");

    }
    

    /*filter Tree View code start----------------------------------------------------------------
	  filter tree View is on the sidebar of Vscode, you can add/remove/import/export fitlers
	*/

   // vscode.window.registerTreeDataProvider('log-knife-view', state.filterTreeViewProvider);
    let treeView=vscode.window.createTreeView("log-knife-view",{
        treeDataProvider:state.filterTreeViewProvider,
        canSelectMany:true
    });
  
  
    
   //import and export --------------------------------------------
    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.exportAllFilters", 
        () => exportFilters(state.filterRoot)));
    
    
    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.exportFilters", 
        (filterTreeItem: vscode.TreeItem) => exportFilters(
            (<FilterItem>filterTreeItem).filterNode)
        )
    );
  
    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.importAllFilters", 
        (filterTreeItem: vscode.TreeItem) => importFilters(state,state.filterRoot)));

    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.importFilters", 
        (filterTreeItem: vscode.TreeItem) => importFilters(state,(<FilterItem>filterTreeItem).filterNode)));
    
    
    //add/edit/delete fitlers--------------------------------------------
    
    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.addFilter",
        () => addFilter(state)
    ));
  
    
	let disposibleAddFilter = vscode.commands.registerCommand(
        "log-knife.addFilterInGroup",
        (item) => addFilter(state,item)
    );
    context.subscriptions.push(disposibleAddFilter);


    let disposibleEditFilter = vscode.commands.registerCommand(
        "log-knife.editFilter",                
        (filterTreeItem: vscode.TreeItem) => editFilter(state,<FilterItem>filterTreeItem)
    );
    context.subscriptions.push(disposibleEditFilter);

    let disposibleDeleteFilter = vscode.commands.registerCommand(
        "log-knife.deleteFilter",
        (filterTreeItem: vscode.TreeItem) => deleteFilter(state,(<FilterItem>filterTreeItem).filterNode)
    );
    context.subscriptions.push(disposibleDeleteFilter);
   
    //add edit remove group-----------------------------
    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.addFilterGroup",
        (item) => addFilterGroup(state,item)
    ));
   
    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.editFilterGroup",                
        (filterTreeItem: vscode.TreeItem) => editFilterGroup(state,<FilterItem>filterTreeItem)
    ));
    
    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.deleteFilterGroup",
        (filterTreeItem: vscode.TreeItem) => deleteFilter(state,(<FilterItem>filterTreeItem).filterNode)
    ));

    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.deleteAllFilter",
        (filterTreeItem: vscode.TreeItem,filterTreeItem2: vscode.TreeItem) => deleteFilter(state,state.filterRoot)
    ));
   
   
    

 

    //enable or disable filter------------------------------------------------
    
    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.enableAllFilter",
        (filterTreeItem: vscode.TreeItem) => setShownOrHiden(true, state,state.filterRoot)
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.enableFilter",
        (filterTreeItem: vscode.TreeItem) => setShownOrHiden(true, state,(<FilterItem>filterTreeItem).filterNode)
    ));

    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.disableAllFilter",
        (filterTreeItem: vscode.TreeItem) => setShownOrHiden(false,  state,state.filterRoot)
        ));
    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.disableFilter",
        (filterTreeItem: vscode.TreeItem) => setShownOrHiden(false, state,(<FilterItem>filterTreeItem).filterNode)
    ));


   //edit color------------------
    
    let disposibleEditColor = vscode.commands.registerCommand(
        "log-knife.editColor",
        (filterTreeItem: vscode.TreeItem) => {

            Process.exec(`java ColorPicker`, { cwd: context.extensionUri.fsPath },
            (error: Process.ExecException | null, stdout: string | Buffer, stderr: string | Buffer) => {
                if(stdout){
                    if (stdout[0] === "-") {
                        console.log("??????????????????");
                        return;
    
                     }
                    else{
                        console.log("??????????????????"+stdout);
                         var color=stdout;
                        editColor(color as string,state,<FilterItem>filterTreeItem);
                        
                    }
                }else{
                    console.log("??????????????????");
                }
                   
                });


           
        }
    );
	context.subscriptions.push(disposibleEditColor);
   
//refresh treeView-------------------------------------------------------
context.subscriptions.push(vscode.commands.registerCommand(
    "log-knife.refresFilterTreeView",
    () => refresFilterTreeView(state)
));

context.subscriptions.push(vscode.commands.registerCommand(
    "log-knife.moveUp",
    () => moveUpOrDown(state,treeView,true)
));
context.subscriptions.push(vscode.commands.registerCommand(
    "log-knife.moveDown",
    () => moveUpOrDown(state,treeView,false)
));
/*Search of fiters into Log and display on the panel start-----------------------------------
  this section is responsible for searching with regex and displaying with webview
*/

    
const provider = new SearchWebViewProvider(context.extensionUri);
state.searchWebviewProvider=provider;

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('searchWebView', provider,{
            webviewOptions:{
                retainContextWhenHidden:true
            }
        }));

     
	context.subscriptions.push(
		vscode.commands.registerCommand('log-knife.searchWebView', () => {
			let doc:vscode.TextDocument|undefined=getActiveDocument();
            if( doc === undefined){
                vscode.window.showErrorMessage("vs?????????????????????????????????ctrl+c?????????????????????tab???????????????????????????????????????open large file????????????");
              
	           return ;
             }
            doc=doc as vscode.TextDocument;
            var filters=flattenFilterNode(state.filterRoot);
			provider.webViewSearchFilters(doc,filters);
		}));

//Break large file limit----------------------------------------------------------------------------------

	const extensionId = 'guohu.log-knife';
	const extension = vscode.extensions.getExtension(extensionId);

	// if (extension) {
	// 	const extensionVersion = extension.packageJSON.version;

	// 	// the aik is not really sec_ret. but lets avoid bo_ts finding it too easy:
	// 	const strKE = 'ZjJlMDA4NTQtNmU5NC00ZDVlLTkxNDAtOGFiNmIzNTllODBi';
	// 	const strK = Buffer.from(strKE, "base64").toString();
	// 	reporter = new TelemetryReporter(extensionId, extensionVersion, strK);
	// 	context.subscriptions.push(reporter);
	// 	reporter?.sendTelemetryEvent('activate');
	// } else {
	// 	console.log("not found as extension!");
	// }

	const guofsp = new LargeFileSystemProvider(context.globalState);
	context.subscriptions.push(vscode.workspace.registerFileSystemProvider('guofsp', guofsp, { isReadonly: true, isCaseSensitive: true }));

	context.subscriptions.push(vscode.commands.registerCommand('log-knife.openLargeFile', async () => {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		return vscode.window.showOpenDialog({ canSelectFiles: true, canSelectFolders: false, canSelectMany: false, openLabel: 'Select large file to open...' }).then(
			async (uris: vscode.Uri[] | undefined) => {
				if (uris) {
					uris.forEach(async (uri) => {
                        //get metat of file
						const fileStat = fs.statSync(uri.fsPath);
						console.log(`open large file with size=${fileStat.size} from URI=${uri.toString()}`);
						let lfsUri = uri.with({ scheme: 'guofsp' });
						guofsp.markLimitSize(lfsUri, true, undefined);
						vscode.workspace.openTextDocument(lfsUri).then((value) => { 
                          
                            vscode.window.showTextDocument(value, { preview: false }); 
                        });
					});
				}
			}
		);
	}));

	context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((doc) => {
		guofsp.onDidCloseTextDocument(doc.uri);
	}));

 //just for debugging----------------------------------------------------------------------------------------

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
    statusBarItem.command = 'log-knife.debug';
    statusBarItem.text = 'Debug';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
   
 
 context.subscriptions.push(
			vscode.commands.registerCommand('log-knife.debug',()=>{
                console.log("??????debug----------------------------------------------");
              
                    // vscode.window.showInformationMessage("??????????????????????????????",'????????????','????????????','?????????')
                    // .then(function(select){
                    //     console.log(select);
                    // });
           
                    // vscode.window.showInputBox(
                    //     { // ?????????????????????????????????????????????
                    //         password:false, // ???????????????????????????
                    //         ignoreFocusOut:false, // ??????false????????????true????????????????????????????????????????????????
                    //         placeHolder:'???????????????????????????', // ??????????????????????????????
                    //         prompt:'????????????????????????????????????', // ?????????????????????????????????
                    //         validateInput:function(text){return text;} // ????????????????????????????????????
                    //     }).then(function(msg){
                    //     console.log("???????????????"+msg);
                    // });
                    // vscode.window.showQuickPick(
                    //     [
                    //         "??????", //#FF0000
                    //         "??????", // #FF7D00
                    //         "??????",//#FFFF00
                    //         "??????", //#00FF00
                    //         "??????", //#0000FF
                    //         "??????",// #00FFFF
                    //         "??????",//#FF00FF
                    //     ],
                    //     {
                    //         canPickMany:false,
                    //         ignoreFocusOut:true,
                    //         matchOnDescription:true,
                    //         matchOnDetail:true,
                    //         placeHolder:'?????????????????????????????????????????????'
                    //     })
                    //     .then(function(msg){
                    //     console.log(msg);
                    // });
           

                    // // var  ArrayList = Java.type("java.util.ArrayList");
                    //  var picker=new VSColorPicker(context.extensionUri.fsPath);
                    //  picker.LaunchColorPickerWindow();

                  
                 // vscode.commands.executeCommand("workbench.view.extension.searchWebViewContainer");
              //  console.log(context.globalState.get("state"));
                
                //vscode.workspace.textDocuments[0].
              

			
			})
		);



}




// this method is called when your extension is deactivated
export function deactivate() {

}
