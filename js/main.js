//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
     // @ts-ignore
    const vscode = acquireVsCodeApi();
    var space="    ";
    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'viewResult':
                {
                 console.log("receive message viewResult");
                    viewResultBySearch(message.value);
                    break;
                }
            
           
        }
    });
    function viewResultBySearch(results){
        var container=document.getElementById('container');
        container.innerHTML="";
  
        for(var i=0;i<results.length;i++){
            var p=document.createElement("div");
            var lineNumberNodeStr="<span style='color:blue'>"+(results[i].lineBegin+1)+"</span>";
            p.innerHTML=lineNumberNodeStr+space+"<span id="+i+">"+results[i].text+"\n"+"</span>";
            p.style.color=results[i].color;
            p.setAttribute("line",results[i].lineBegin.toString());
            p.setAttribute("columnEnd",results[i].columnEnd.toString());
            //p.setAttribute("id",i.toString());
            container.appendChild(p);
        } 
         document.getElementById('container').addEventListener('dblclick',function(event){
            jump(event.target);
        },false);

    }
    function jump(dom){
        var p=dom.parentNode;
        
       var value={
           line:parseInt(p.getAttribute("line")),
           columnEnd:parseInt(p.getAttribute("columnEnd"))

       };
        vscode.postMessage({ type: 'jump', value: value});
    }
    

}());