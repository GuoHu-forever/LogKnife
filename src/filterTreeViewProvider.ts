import * as vscode from 'vscode';
import { FilterNode } from "./utils";

//provides filters as tree items to be displayed on the sidebar
export class FilterTreeViewProvider implements vscode.TreeDataProvider<FilterItem> {

    constructor(private root:FilterNode) {}

    getTreeItem(element: FilterItem): vscode.TreeItem {
        return element;
    }

    //getChildren(filterItem) returns empty list because filters have no children.
    //getChildren() returns the root elements (all the filters)
    getChildren(element?: FilterItem): FilterItem[] {
        if (element) {
            var filterNode=element.filterNode;
            if(!filterNode.children||filterNode.children.length===0){
                return [];
            }else{
                return filterNode.children.map(child=>new FilterItem(child));
            }
            return [];
        } else { // root
            if(this.root.children){
                return this.root.children.map(child=>new FilterItem(child));
            }else{
                return [];
            }
           
        }
    }

    private _onDidChangeTreeData: vscode.EventEmitter<FilterItem | undefined> = new vscode.EventEmitter<FilterItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<FilterItem | undefined> = this._onDidChangeTreeData.event;
    
    refresh(): void {
        console.log("in refresh");
        this._onDidChangeTreeData.fire(undefined);
    }
}

//represents a filter as one row in the sidebar
export class FilterItem extends vscode.TreeItem {

    constructor(
        public filterNode: FilterNode,
    ) {
        super(filterNode.regex!.toString());
        this.label = filterNode.regex!.source;
        this.iconPath = filterNode.iconPath;
        if(filterNode.isGroup){
            this.contextValue='group';
        }else{
            if (filterNode.isShown) {
                this.contextValue='shown';
            
                
            } else {
                this.contextValue='hiden';
              
            }

        }

       
        console.log("filter state change to :"+this.contextValue);
          
    }


    //contextValue connects to package.json>menus>view/item/context
   contextValue: 'shown' | 'hiden'|'group' ;
}

