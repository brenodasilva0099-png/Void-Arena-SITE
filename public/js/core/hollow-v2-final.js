(function(){
  if(window.__HollowNexusV2Final)return;
  window.__HollowNexusV2Final=true;

  const main=document.querySelector('.va-main,.frm-main,main');
  if(!main)return;

  function cleanTextNode(node){
    if(!node||node.nodeType!==Node.TEXT_NODE)return;
    const parent=node.parentElement;
    if(!parent||parent.closest('script,style,textarea,input,select,option,code,pre'))return;
    let value=node.nodeValue||'';
    value=value.replace(/Void Arena/gi,'Hollow Nexus');
    if(parent.matches('h1,h2,h3,.va-eyebrow,.va-badge,.va-status')){
      value=value.replace(/[🏆📌📊🏠🛡️🧩⚔️🎥📋⚙️🔧📜👤💬]/gu,'').replace(/\s{2,}/g,' ');
    }
    if(value!==node.nodeValue)node.nodeValue=value;
  }

  function sweep(root=main){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode()))cleanTextNode(node);
    document.querySelectorAll('.dashboard-side-rail,.tournament-topbar,.hn-header').forEach(el=>el.remove());
    const primary=document.getElementById('clubCountKpi');
    const side=document.getElementById('clubCountKpiSide');
    if(primary&&side&&primary.textContent.trim()!=='—')side.textContent=primary.textContent;
  }

  sweep();
  let scheduled=false;
  new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;sweep();});
  }).observe(main,{childList:true,subtree:true,characterData:true});
})();
