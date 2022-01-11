
import * as vscode from 'vscode';
import { FilterTreeViewProvider } from "./filterTreeViewProvider";
import { Filter, cleanUpIconFiles,getActiveDocument} from "./utils";
import {deleteFilter, setShownOrHiden,importFilters, exportFilters, addFilter, editFilter, editColor,refresFilterTreeView } from "./filterCommands";
import {SearchWebViewProvider} from "./searchWebViewProvider";
import * as Process from 'child_process';
//Extension storge position
let storageUri: vscode.Uri;
import { SearchTreeViewProvider } from './searchTreeViewProvider';
import { VSColorPicker } from './debug';

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
                        editColor(filterTreeItem, state, color as string);
                        
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
                     var picker=new VSColorPicker(context.extensionUri.fsPath);
                     picker.LaunchColorPickerWindow();





			
			})
		);



}




// this method is called when your extension is deactivated
export function deactivate() {

}
