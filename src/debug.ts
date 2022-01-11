'use strict';
import * as VSCode from 'vscode';
import * as Process from 'child_process';
export class VSColorPicker {

    constructor(private _extensionPath: string) {
       
    }

   
    public LaunchColorPickerWindow(): void {
        Process.exec(`java ColorPicker`, { cwd: this._extensionPath },
        (error: Process.ExecException | null, stdout: string | Buffer, stderr: string | Buffer) => {
            if(stdout){
                if (stdout[0] === "-") {
                    console.log("调取颜色面板失败");
                    return;

                 }
                else{
                    console.log("颜色选取成功"+stdout);
                    
                }
            }else{
                console.log("程序执行失败");
            }
               
            });
    }

    

  

    dispose() {
    }
}