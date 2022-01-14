import type { TextDocument, TextLine } from "vscode";
import { Filter} from "./utils";
import * as vscode from "vscode";

export class ResultItem{

    public  lineBegin:number;
    public columnBegin:number;
    public  lineEnd:number;
    public  columnEnd:number;
    public text:string;
    public color:string;
    constructor(lineBegin:number,columnBegin:number,lineEnd:number,columnEnd:number,color:string,text:string){
        this.lineBegin=lineBegin;
        this.columnBegin=columnBegin;
        this.lineEnd=lineEnd;
        this.columnEnd=columnEnd;
        this.color=color;
        this.text=text;
    
    }
   

     
}

export function searchFilters(doc: TextDocument | undefined,filters:Filter[]):ResultItem[]|undefined{
    if (typeof doc === "undefined") {

		return undefined;
	}
    vscode.window.showTextDocument(doc).then(
        () => {},
        () => {}
    );



    let results:ResultItem[]=[];
    const lineCount: number = doc.lineCount;
    for(let line:number=0;line<lineCount;line++){
               const textLine:TextLine=doc.lineAt(line);
                for(let filterIndex=0;filterIndex<filters.length;filterIndex++){
                    if(!filters[filterIndex].isShown){
                        continue;
                    }
                    if(filters[filterIndex].regex.test(textLine.text)){
                           let  item:ResultItem=new ResultItem(line,0,line,textLine.text.length-1,filters[filterIndex].color,textLine.text);
                           results.push(item);
                           break;
                    }
                }


    }
    return results;


}

 function viewResult(doc:TextDocument, lineBegin: number, columnBegin: number, lineEnd:number,columnEnd: number): void{
	// Make sure document is showing
	vscode.window.showTextDocument(doc).then(
		() => {},
		() => {}
	);

	if (typeof vscode.window.activeTextEditor !== "undefined") {
		// Make the result visible
		vscode.window.activeTextEditor.revealRange(new vscode.Range(lineBegin, columnBegin, lineEnd, columnEnd));

		// Select the result
		vscode.window.activeTextEditor.selection = new vscode.Selection(lineBegin, columnBegin, lineEnd, columnEnd);
	}
}

