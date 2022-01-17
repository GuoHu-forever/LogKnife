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
    var gResults;
    var searchDom=document.getElementById("search");
    searchDom.onkeydown=function(event){
        var code = event.keyCode;
        if(code ===13){ //这是键盘的enter监听事件
        //绑定焦点，有可能不成功，需要多试试一些标签 
           // @ts-ignore
           var searchText=searchDom.value;
           console.log("searchText:"+searchText);
           searchInResults(searchText);
         }
    };


    function searchInResults(searchText){
         if(!gResults||!searchText){
             console.log("gResults: "+gResults);
            return;
         }
         var regexText=new RegExp(searchText);
        var container=document.getElementById('container');
        container.innerHTML="";
        for(var i=0;i<gResults.length;i++){
            if(regexText.test(gResults[i].text)){
                console.log("匹配:"+gResults[i].text);
                var p=document.createElement("div");
                var lineNumberNodeStr="<span style='color:blue'>"+(gResults[i].lineBegin+1)+"</span>";
                p.innerHTML=lineNumberNodeStr+space+"<span id="+i+">"+gResults[i].text+"\n"+"</span>";
                p.style.color=gResults[i].color;
                p.setAttribute("line",gResults[i].lineBegin.toString());
                p.setAttribute("columnEnd",gResults[i].columnEnd.toString());
                //p.setAttribute("id",i.toString());
                container.appendChild(p);
            }

         
        } 
         document.getElementById('container').addEventListener('dblclick',function(event){
            jump(event.target);
        },false);

    }

    function viewResultBySearch(results){
        var container=document.getElementById('container');
        container.innerHTML="";
        gResults=results;
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