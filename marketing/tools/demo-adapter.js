// Browser-only fixture. This is never included in the extension package.
const demoOptions = window.demoOptions || {};
const demoScenario = demoOptions.scenario || 'new';
if (demoOptions.fresh) localStorage.removeItem('marky.hasSaved');
if (demoScenario === 'returning') localStorage.setItem('marky.hasSaved', 'true');
const demoTitles = ['React', 'React Native', 'TypeScript', 'CSS', 'Research', 'Design', 'Projects', 'Reading'];
if (demoScenario === 'many-folders') {
  for (let i=1; i<=40; i++) demoTitles.push('Project ' + i);
  demoTitles.unshift('A very long folder name for project references and useful articles');
}
const demoFolders = demoTitles.map((title, i) => ({ id: String(10 + i), parentId: '1', title, dateGroupModified: 10000 - i, children: [] }));
const demoUrl = demoScenario === 'unsupported' ? 'chrome://extensions/' : demoScenario === 'missing' ? undefined : 'https://react.dev/learn';
let demoSaved = demoScenario === 'saved' ? [{id:'90',parentId:'10',title:'React — Quick Start',url:demoUrl}] : [];
let demoNextId = 100, demoFailures = 0, demoBadge = '', demoClosed = false;
const demoReport = () => window.parent.postMessage({ type: 'marky-demo-state', folders: demoFolders.map(x => ({id:x.id, title:x.title, parentId:x.parentId})), bookmarks: demoSaved, badge:demoBadge, closed:demoClosed, hasSaved:localStorage.getItem('marky.hasSaved')==='true' }, location.origin);
const demoPause = () => demoScenario === 'slow' ? new Promise(resolve => setTimeout(resolve, 900)) : Promise.resolve();
const demoBeforeSave = async () => {
  await demoPause();
  if (['save-error','cleanup-error'].includes(demoScenario) && demoFailures++ === 0) throw new Error('Demo save failure');
};
window.chrome = {
  i18n: {
    getUILanguage: () => window.demoLanguage,
    getMessage: (key, substitution) => (window.demoMessages[key]?.message || '').replace(/\$([A-Z_]+)\$/g, () => String(substitution ?? ''))
  },
  commands: {getAll:async () => [{name:'_execute_action',shortcut:demoOptions.shortcut ?? (demoScenario==='no-shortcut'?'':'Command+B')}]},
  runtime: {sendMessage:async () => {demoBadge='✓';demoReport();setTimeout(()=>{demoBadge='';demoReport();},1200);return {ok:true};}},
  tabs: {
    query: async () => [{ id:1, url:demoUrl, title:'React — Quick Start' }],
    create: async ({url}) => {window.parent.postMessage({type:'marky-demo-settings',url},location.origin); return {id:2,url};}
  },
  bookmarks: {
    getTree: async () => {
      if (demoScenario === 'load-error' && demoFailures++ === 0) throw new Error('Demo load failure');
      return [{ id:'0', title:'', children:[{id:'1', title:window.demoLanguage==='ru'?'Панель закладок':'Bookmarks bar', children:demoFolders, dateGroupModified:1}, {id:'2', title:window.demoLanguage==='ru'?'Другие закладки':'Other bookmarks', children:[], dateGroupModified:0}] }];
    },
    search: async ({url}) => demoSaved.filter(x => x.url === url),
    getChildren: async id => demoSaved.filter(x => x.parentId === id),
    remove: async id => {
      if(demoScenario === 'cleanup-error') throw new Error('Demo cleanup failure');
      const index=demoFolders.findIndex(x=>x.id===id); if(index>=0)demoFolders.splice(index,1); demoReport();
    },
    create: async info => {
      if (info.url) await demoBeforeSave();
      const node = {id:String(demoNextId++), ...info};
      if (info.url) demoSaved.push(node); else demoFolders.unshift({...node, children:[], dateGroupModified:20000});
      demoReport(); return node;
    },
    move: async (id, {parentId}) => {
      await demoBeforeSave();
      const node = demoSaved.find(x => x.id === id);
      if (!node) throw new Error('Missing demo bookmark');
      node.parentId = parentId; demoReport(); return node;
    }
  }
};
window.close = () => {
  demoClosed=true;demoReport();
  window.parent.postMessage({type:'marky-demo-close', saved:demoSaved.length>0}, location.origin);
};
document.addEventListener('input', event => window.parent.postMessage({type:'marky-demo-query', query:event.target.value}, location.origin));
document.addEventListener('DOMContentLoaded', demoReport);
