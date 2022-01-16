import { createDiffieHellman } from "crypto";
import * as vscode from "vscode";
import { FilterTreeViewProvider } from "./filterTreeViewProvider";


// One filter corresponds to one line in the configuration file
//for display in tree view
export type FilterNode = {
    isShown?: boolean; 
    regex?: RegExp;
    color?: string;
    id?: number; //random generated number
    iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon; //
    isGroup?:boolean;
    children?:FilterNode[];
    parent?:FilterNode;
};
//for search in webview
export type Filter={
    isShown:boolean;
    regex:RegExp;
    color:string;  
};


export function generateRandomColor(): string {
    return `hsl(${Math.floor(360 * Math.random())}, 40%, 40%)`;
}
export function produceColor(number:number):string{
    var colors=[
         `#FF0000`,//read
        `#FF7D00`,//orange
        `#FFFF00`,//yellow
        `#00FF00`,//green
        `#0000FF`,//indigo
        `#00FFFF`,//blue
        `#FF00FF`//purple
    ];
    var index=number%colors.length;
    if(index<0 || index>=colors.length){
      console.log("索引超过colors数组,返回默认颜色");
      return `rgb(0,0,0)`;
      
    }

    return colors[number%colors.length];
    
     

}

//clean up the generated svgs stored in the folder created for this extension
export function cleanUpIconFiles(storageUri: vscode.Uri) {
    vscode.workspace.fs.delete(storageUri, {
        recursive: true,
        useTrash: false
    });
}

//create an svg icon representing a filter: a filled circle if the filter is shown, or an empty circle otherwise.
//this icon gets stored in the file system at filter.iconPath.
export function writeSvgContent(filter:FilterNode, treeViewProvider: FilterTreeViewProvider): void {
    const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle fill="${filter.color}" cx="50" cy="50" r="30"/></svg>`;
    const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle stroke="${filter.color}" fill="transparent" stroke-width="10" cx="50" cy="50" r="35"/></svg>`;
    vscode.workspace.fs.writeFile(filter.iconPath!as vscode.Uri, str2Uint8(filter.isShown ? fullSvg : emptySvg)).then(() => {
        console.log("before refresh");
        console.log("iconPath:"+(filter.iconPath!as vscode.Uri).fsPath);
        treeViewProvider.refresh();
    });
}
export function writeSvgContentNoRefresh(filter:FilterNode): void {
    const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle fill="${filter.color}" cx="50" cy="50" r="30"/></svg>`;
    const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle stroke="${filter.color}" fill="transparent" stroke-width="10" cx="50" cy="50" r="35"/></svg>`;
    vscode.workspace.fs.writeFile(filter.iconPath!as vscode.Uri, str2Uint8(filter.isShown ? fullSvg : emptySvg));
}


//convert a string to a Uint8Array
function str2Uint8(str: string): Uint8Array {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);//TODO: check if can just use str.length
    for (var i=0, strLen=str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return bufView;
}
// the Svg file id include parent id
var   iconNumber=0;
export function genearteSvgIdStr(filterNode:FilterNode){
    iconNumber++;
    var idstr=genearteSvgIdStrInner(filterNode);
    return iconNumber+idstr;

}
export function genearteSvgIdStrInner(filterNode:FilterNode){
        
          
       if(!filterNode.parent){
        return (filterNode.id!+iconNumber).toString();
       }
       var parentIdstr:string=genearteSvgIdStr(filterNode.parent);
       return filterNode.id!.toString()+parentIdstr;

}
// genearte icon path and relationship between paren and son.
export function reconstructTree(filterNode:FilterNode,storageUri: vscode.Uri){
     if(filterNode.isGroup){
         filterNode.iconPath=new vscode.ThemeIcon("window");
         for(var i=0;i<filterNode.children!.length;i++){
            var child=filterNode.children![i];
            reconstructTree(child,storageUri);
            child.parent=filterNode;  
        }

     }else{
        filterNode.iconPath=generateSvgUri(storageUri,genearteSvgIdStr(filterNode), true);
        writeSvgContentNoRefresh(filterNode);
     }

   
     
}


export function generateSvgUri(storageUri: vscode.Uri, id: string, isShown: boolean): vscode.Uri {
    //forexample C:\Users\AlanGuo666\AppData\Roaming\Code\User\globalStorage\undefined_publisher.log-knife/0.4490539887309699true.svg
    return vscode.Uri.joinPath(storageUri, `./${id}${isShown}.svg`);
}
export const getActiveDocument = (): vscode.TextDocument | undefined => {
	// Make sure there is an active editor window for us to use
	if (typeof vscode.window.activeTextEditor === "undefined") {
		return undefined;
	}

	// Get the active document
	return vscode.window.activeTextEditor.document;
};
export function flattenFilterNode(filterNode:FilterNode){
    var filters:Filter[]=[];
    flattenFilterNodeInner(filterNode,filters);
    console.log("filters:"+filters);
    return filters;
    
    
}
function flattenFilterNodeInner(filterNode:FilterNode,filters:Filter[]){
    if(!filterNode.isGroup){
        filters.push({
            isShown:filterNode.isShown!,
            regex:filterNode.regex!,
            color:filterNode.color!
        });
        return ;
    }else{
        if(!filterNode.isShown){
            return;
        }else{
            filterNode.children?.forEach((child)=>{
                   flattenFilterNodeInner(child,filters);
            });
        }        
        
    }
}