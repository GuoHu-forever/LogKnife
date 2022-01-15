import { group } from "console";
import { stat } from "fs";
import * as vscode from "vscode";
import { State } from "./extension";
import { generateSvgUri, writeSvgContent, produceColor, FilterNode } from "./utils";
import {FilterItem} from "./filterTreeViewProvider";
import { fileURLToPath } from "url";

let iconNumber:number=0;

export function addFilterGroup(state:State,treeItem: FilterItem){
    vscode.window.showInputBox({
        prompt: "Type a filter group name",
        ignoreFocusOut: false
    }).then(async groupName => {
        if (groupName === undefined) {
            return;
        }
        var filterNode;
        if(!treeItem){
            filterNode=state.filterRoot;
        }else{
            filterNode=treeItem.filterNode;
        }
   

        if(!filterNode.children){
            filterNode.children=[];
        }

        filterNode.children.push({
            id:filterNode.children.length,
            isGroup:true,
            regex:new RegExp(groupName),
            parent:filterNode,
            isShown:true   
        });
        refresFilterTreeView(state);

    });
}

export function editFilterGroup(state:State,treeItem: FilterItem){
    vscode.window.showInputBox({
        prompt: "Type a filter group name",
        ignoreFocusOut: false
    }).then(async groupName => {
        if (groupName === undefined) {
            return;
        }
        var filterNode=treeItem.filterNode;
        filterNode.regex=new RegExp(groupName);
        refresFilterTreeView(state);
    });
}
 
   


export function addFilter(state:State,treeItem?: FilterItem) {
    vscode.window.showInputBox({
        prompt: "Type a regex to filter",
        ignoreFocusOut: false
    }).then(async regexStr => {
        if (regexStr === undefined) {
            return;
        }
        var groupNode;
        if(!treeItem){
            groupNode=state.filterRoot;
        }else{
            groupNode=treeItem.filterNode;
        }
     

        if(!groupNode.children){
            groupNode.children=[];
        }

        const id = groupNode.children!.length;
       let filterNode:FilterNode={
            id:id,
            regex:new RegExp(regexStr),
            color:produceColor(id),
            iconPath:generateSvgUri(state.storageUri, id, true),
            isShown:true,
            isGroup:false,
            parent:groupNode     

        };
        groupNode.children!.push(filterNode);
   
        //the order of the following two lines is deliberate (due to some unknown reason of async dependencies...)
         writeSvgContent(filterNode, state.filterTreeViewProvider);
        //refresFilterTreeView(state);
    });
}

export function editFilter(state:State,treeItem: FilterItem) {
    vscode.window.showInputBox({
        prompt: "Type a new regex",
        ignoreFocusOut: false
    }).then(regexStr => {
        if (regexStr === undefined) {
            return;
        }
        var filterNode=treeItem.filterNode;
        filterNode.regex=new RegExp(regexStr);
        refresFilterTreeView(state);
    });
}
export function deleteFilter(state:State,treeItem: FilterItem) {
    var filterNode=treeItem.filterNode;
    var parent=filterNode.parent;
    parent?.children?.splice(filterNode.id!,1);
    refresFilterTreeView(state);
    
}




//record the important fields of each filter on a json object and open a new tab for the json
export function exportFilters(parenNode:FilterNode) {

    const  content =JSON.stringify(parenNode.children);
    vscode.workspace.openTextDocument({
        content: content,
        language: "json"
    }).then((doc)=>{
        vscode.window.showTextDocument(doc).then(
            () => {},
            () => {}
        );
        }
        );      
}




//open a selected json file and parse each filter to add back
export function importFilters(state: State,parenNode:FilterNode) {
        vscode.window.showOpenDialog({
            canSelectFiles: true, 
            canSelectMany: false, 
            filters: {
                "json": ["json"]
            }
        }).then(uriArr => {
            if (!uriArr) {
                return;
            }
            return vscode.workspace.openTextDocument(uriArr[0]);
        }).then(textDocument => {
            const text = textDocument!.getText();
            const parsed = JSON.parse(text);
            if (typeof parsed !== "object") {
                return;
            }
            const filterNode=parsed as FilterNode;
          
            if(parenNode.children&&parenNode.children.length>0){
                filterNode.id=parenNode.children.length;
            }else{
                parenNode.children=[];
                filterNode.id=0;
            }
            parenNode.children.push(filterNode);
            filterNode.parent=parenNode;
            if(!filterNode.isGroup){
                filterNode.children?.forEach((child)=>{
                    writeSvgContent(child, state.filterTreeViewProvider);
                });
            }
            refresFilterTreeView(state);
        
        });
           
}




//show or hide filters, support group

export function setShownOrHiden(isShown: boolean, state:State,filterNode:FilterNode) {
    if(filterNode.isGroup){
        var children=filterNode.children;
        if(children){
            children.forEach((son)=>{
                setShownOrHiden(isShown, state,son);
            });
        }else{
            filterNode.isShown=isShown;
            filterNode!.iconPath = generateSvgUri(state.storageUri, filterNode.id!, filterNode.isShown);
            writeSvgContent(filterNode!, state.filterTreeViewProvider);
        }
    }else{
        filterNode.isShown=isShown;
        filterNode!.iconPath = generateSvgUri(state.storageUri, filterNode.id!, filterNode.isShown);
        writeSvgContent(filterNode!, state.filterTreeViewProvider);
    }
}


export function editColor(color:string,state:State,treeItem: FilterItem){
    

    
    var filterNode=treeItem.filterNode;
    var isShown=filterNode.isShown;
    filterNode!.color=color;
    iconNumber++;
    filterNode!.iconPath= vscode.Uri.joinPath(state.storageUri, `./${filterNode.id}${iconNumber}${filterNode!.isShown}.svg`);
    writeSvgContent(filterNode!, state.filterTreeViewProvider); 

}

export function refresFilterTreeView(state: State) {
   
    state.filterTreeViewProvider.refresh();

}