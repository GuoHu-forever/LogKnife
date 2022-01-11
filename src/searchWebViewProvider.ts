import * as vscode from 'vscode';
import { ResultItem,searchFilters} from './searchCommands';
import { Filter } from "./utils";
export class SearchWebViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'searchWebView';

	private _view?: vscode.WebviewView;
    private _results?:ResultItem[];
	private _doc?:vscode.TextDocument;
	private _readCache:boolean=true;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }
    
	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		console.log("resolveWebviewView");
		

		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'jump':
					{
						
						this.jump(data.value);
                        break;
					}
			}
		});
	}
    private _getHtmlForWebview(webview: vscode.Webview) {
        
     // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'js', 'main.js'));

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				
				<title>Log Knife</title>
				<style>
				*{
					font-family:-moz-fixed;
					white-space:pre;
					margin:4px;
					font-size:14px;

		          } 
				  </style>       
			</head>
			<body id="container">
				<script  src="${scriptUri}"></script>
			</body>
			</html>`;
	}
    public webViewSearchFilters(doc: vscode.TextDocument | undefined,filters:Filter[]){
		console.log("webViewSearchFilters");
		console.log("fiters:  "+filters);
		this._doc=doc;
		
        this._results=searchFilters(doc,filters);
		console.log("results: "+this._results);
		
        if(typeof this._results===undefined){
			return;
		}
	       
        this.viewResult();
	

    }
    
    public viewResult() {
		
		
		if (this._view) {
			this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
			console.log("viewResult");
			this._view.webview.postMessage({ type: 'viewResult',value:this._results});
		}
	}

    public jump(value:any){
     
	   
        let line:number=value.line;
        let columnEnd:number=value.columnEnd;
		console.log("line "+line.toString());
		console.log("columnEn "+columnEnd.toString());
		
		
    // Make sure document is showing
	    if(!this._doc){
			return;
		}
		
        vscode.window.showTextDocument(this._doc).then(
            () => {},
            () => {}
        );
        if (typeof vscode.window.activeTextEditor !== "undefined") {
			console.log(vscode.window.activeTextEditor);
            // Make the result visible
            vscode.window.activeTextEditor.revealRange(new vscode.Range(line, 0, line, columnEnd));
    
            // Select the result
            vscode.window.activeTextEditor.selection = new vscode.Selection(line, 0, line, columnEnd);
        }
	
    }
        
}




 