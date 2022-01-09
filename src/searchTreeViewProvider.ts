import * as vscode from 'vscode';
import { ResultItem } from "./searchCommands";


export class  SearchTreeViewProvider implements vscode.TreeDataProvider<ResultItem>{
    private results:ResultItem[];
    private doc:vscode.TextDocument|undefined;
    constructor(results:ResultItem[],doc: vscode.TextDocument|undefined){
        this.results=results;
        this.doc=doc;
    
    }
getTreeItem(element: ResultItem): vscode.TreeItem {
    return this.itemFromResult(element);
}


//getChildren(filterItem) returns empty list because filters have no children.
//getChildren() returns the root elements (all the filters)
getChildren(element?: ResultItem): ResultItem[] {
    if (element) {
        return [];
    } else { // root
        return this.results;
}
}

private     _onDidChangeTreeData: vscode.EventEmitter<ResultItem | undefined> = new vscode.EventEmitter<ResultItem | undefined>();
readonly onDidChangeTreeData: vscode.Event<ResultItem | undefined> = this._onDidChangeTreeData.event;

refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
}

private itemFromResult(element:ResultItem):vscode.TreeItem{
            const highlight:[number,number]=[element.columnBegin,element.columnEnd];
            const label:vscode.TreeItemLabel={highlights:[highlight],label:element.text};
            const treeItem:vscode.TreeItem=new vscode.TreeItem(label);
            treeItem.tooltip=element.toMarkdown();
            const args:any[]=[this.doc,element.lineBegin,element.columnBegin,element.lineEnd,element.columnEnd];            treeItem.command = {
				arguments: args,
				command: "log-knife.viewResult",
				title: "",
			};
        return treeItem;
    }
}
