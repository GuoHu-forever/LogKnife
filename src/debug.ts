'use strict';
import * as VSCode from 'vscode';
import * as Process from 'child_process'
export class VSColorPicker {
    private _config = { autoLaunch: true, autoLaunchDelay: 100 };
    constructor(private _extensionPath: string) {
        let configSection = VSCode.workspace.getConfiguration('vs-color-picker');

        this._config.autoLaunch = configSection.get<boolean>('autoLaunch', this._config.autoLaunch);
        this._config.autoLaunchDelay = configSection.get<number>('autoLaunchDelay', this._config.autoLaunchDelay);
    }

   
    public LaunchColorPickerWindow(orignalColor: string): void {
        Process.exec(`ColorPicker.exe ${orignalColor}`, { cwd: this._extensionPath },
        (error: Process.ExecException | null, stdout: string | Buffer, stderr: string | Buffer) => {
                if (stdout.length == 0) {
                    return;
                }
               
            });
    }

    

  

    dispose() {
    }
}