import * as vscode from "vscode";
export function deleteFilter(filterTreeItem: vscode.TreeItem, state: State) {
    const deleteIndex = state.filterArr.findIndex(filter => (filter.id === filterTreeItem.id));
    state.filterArr.splice(deleteIndex, 1);
    refreshEditors(state);
}

export function addFilter(state: State) {
    vscode.window.showInputBox({
        prompt: "Type a regex to filter",
        ignoreFocusOut: false
    }).then(regexStr => {
        if (regexStr === undefined) {
            return;
        }
        const id = `${Math.random()}`;
        const filter = {
            isHighlighted: true, 
            isShown: true, 
            regex: new RegExp(regexStr),
            color: generateRandomColor(),
            id,
            iconPath: generateSvgUri(state.storageUri, id, true),
            count: 0
        };
        state.filterArr.push(filter);
        //the order of the following two lines is deliberate (due to some unknown reason of async dependencies...)
        writeSvgContent(filter, state.filterTreeViewProvider);
        refreshEditors(state);
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
        refreshEditors(state);
    });
}
