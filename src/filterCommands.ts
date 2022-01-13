import * as vscode from "vscode";
import { State } from "./extension";
import { generateSvgUri, writeSvgContent, generateRandomColor } from "./utils";

let iconNumber:number=0;
export function deleteFilter(filterTreeItem: vscode.TreeItem, state: State) {
    const deleteIndex = state.filterArr.findIndex(filter => (filter.id === filterTreeItem.id));
    const filter=state.filterArr[deleteIndex];
    state.filterArr.splice(deleteIndex, 1);
    // vscode.workspace.fs.delete(filter.iconPath).then(()=>{
    //     console.log("delete icon file:");
        
    //     refresFilterTreeView(state);

    // });
    refresFilterTreeView(state);
}

export function addFilter(state: State) {
    vscode.window.showInputBox({
        prompt: "Type a regex to filter",
        ignoreFocusOut: false
    }).then(async regexStr => {
        if (regexStr === undefined) {
            return;
        }
        const id = `${Math.random()}`;
        const filter = {
            isShown: true, 
            regex: new RegExp(regexStr),      
            color: generateRandomColor(),
            id,
            iconPath: generateSvgUri(state.storageUri, id, true)
    
        };
        state.filterArr.push(filter);
        //the order of the following two lines is deliberate (due to some unknown reason of async dependencies...)
         writeSvgContent(filter, state.filterTreeViewProvider);
        //refresFilterTreeView(state);
    });
}

export function editFilter(filterTreeItem: vscode.TreeItem, state: State) {
    vscode.window.showInputBox({
        prompt: "Type a new regex",
        ignoreFocusOut: false
    }).then(regexStr => {
        if (regexStr === undefined) {
            return;
        }
        const id = filterTreeItem.id;
        const filter = state.filterArr.find(filter => (filter.id === id));
        filter!.regex = new RegExp(regexStr);
        refresFilterTreeView(state);
    });
}
//record the important fields of each filter on a json object and open a new tab for the json
export function exportFilters(state: State) {
    const content = JSON.stringify(state.filterArr.map(filter => {
        return {
            regexText: filter.regex.source,
            color: filter.color,
            isShown: filter.isShown,
        };
    }));
    vscode.workspace.openTextDocument({
        content: content,
        language: "json"
    });
}
//open a selected json file and parse each filter to add back
export function importFilters(state: State) {
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
            const array = parsed as any[];
            array.forEach((filterText) => {
                if (
                    (typeof filterText.regexText === "string") &&
                    (typeof filterText.color === "string") &&
                    (typeof filterText.isShown === "boolean")
                ) {
                    const id = `${Math.random()}`;
                    const filter = {
                        regex: new RegExp(filterText.regexText),
                        color: filterText.color as string,
                        isShown: filterText.isShown as boolean,
                        id,
                        iconPath: generateSvgUri(state.storageUri, id, filterText.isShown),
                    };
                    state.filterArr.push(filter);
                    writeSvgContent(filter, state.filterTreeViewProvider);
                }
            });
            refresFilterTreeView(state);
        });
}
//show or hidne

export function setShownOrHiden(isShown: boolean, filterTreeItem: vscode.TreeItem, state: State) {
    const id = filterTreeItem.id;
    const filter = state.filterArr.find(filter => (filter.id === id));
    filter!.isShown = isShown;
    filter!.iconPath = generateSvgUri(state.storageUri, filter!.id, filter!.isShown);
    writeSvgContent(filter!, state.filterTreeViewProvider);
}

export function editColor(filterTreeItem: vscode.TreeItem, state: State,color:string){
    const id = filterTreeItem.id;
    const filter = state.filterArr.find(filter => (filter.id === id));
    filter!.color=color;
    iconNumber++;
    filter!.iconPath= vscode.Uri.joinPath(state.storageUri, `./${id}${iconNumber}${filter!.isShown}.svg`);
    writeSvgContent(filter!, state.filterTreeViewProvider);

   

}

export function refresFilterTreeView(state: State) {
   
    state.filterTreeViewProvider.refresh();

}