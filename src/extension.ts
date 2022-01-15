
import * as vscode from 'vscode';
import { FilterTreeViewProvider,FilterItem } from "./filterTreeViewProvider";
import { flattenFilterNode,cleanUpIconFiles,getActiveDocument, FilterNode} from "./utils";
import {editFilterGroup,addFilterGroup, setShownOrHiden,importFilters, exportFilters, addFilter, editFilter, deleteFilter,editColor,refresFilterTreeView } from "./filterCommands";
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
};
export function activate(context: vscode.ExtensionContext) {


	storageUri = context.globalStorageUri; 
    cleanUpIconFiles(storageUri); 

        
    //internal globals
    const root:FilterNode={
        isGroup:true,
        isShown:true
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
        (filterTreeItem: vscode.TreeItem) => deleteFilter(state,<FilterItem>filterTreeItem)
    );
    context.subscriptions.push(disposibleDeleteFilter);
   
    //add edit remove group
    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.addFilterGroup",
        (item) => addFilterGroup(state,item)
    ));
   
    context.subscriptions.push(vscode.commands.registerCommand(
        "log-knife.editFilterGroup",                
        (filterTreeItem: vscode.TreeItem) => editFilterGroup(state,<FilterItem>filterTreeItem)
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
        (filterTreeItem: vscode.TreeItem) => setShownOrHiden(false, state,state.filterRoot)
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
                        console.log("没有选择颜色");
                        return;
    
                     }
                    else{
                        console.log("颜色选取成功"+stdout);
                         var color=stdout;
                        editColor(color as string,state,<FilterItem>filterTreeItem);
                        
                    }
                }else{
                    console.log("程序执行失败");
                }
                   
                });


           
        }
    );
	context.subscriptions.push(disposibleEditColor);
   



/*Search of fiters into Log and display on the panel start-----------------------------------
  this section is responsible for searching with regex and displaying with webview
*/

    
const provider = new SearchWebViewProvider(context.extensionUri);

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
                vscode.window.showErrorMessage("vs限制插件使用大文件，请ctrl+c复制一份到新的tab中绕过该限制，或者点击菜单open large file打开文件");
              
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
                console.log("开始debug----------------------------------------------");
              
                    // vscode.window.showInformationMessage("请问你现在的心情如何",'你说什么','我不知道','再见！')
                    // .then(function(select){
                    //     console.log(select);
                    // });
           
                    // vscode.window.showInputBox(
                    //     { // 这个对象中所有参数都是可选参数
                    //         password:false, // 输入内容是否是密码
                    //         ignoreFocusOut:false, // 默认false，设置为true时鼠标点击别的地方输入框不会消失
                    //         placeHolder:'你到底想输入什么？', // 在输入框内的提示信息
                    //         prompt:'赶紧输入，不输入就赶紧滚', // 在输入框下方的提示信息
                    //         validateInput:function(text){return text;} // 对输入内容进行验证并返回
                    //     }).then(function(msg){
                    //     console.log("用户输入："+msg);
                    // });
                    // vscode.window.showQuickPick(
                    //     [
                    //         "红色", //#FF0000
                    //         "橙色", // #FF7D00
                    //         "黄色",//#FFFF00
                    //         "绿色", //#00FF00
                    //         "青色", //#0000FF
                    //         "蓝色",// #00FFFF
                    //         "紫色",//#FF00FF
                    //     ],
                    //     {
                    //         canPickMany:false,
                    //         ignoreFocusOut:true,
                    //         matchOnDescription:true,
                    //         matchOnDetail:true,
                    //         placeHolder:'温馨提示，请选择你是哪种类型？'
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
