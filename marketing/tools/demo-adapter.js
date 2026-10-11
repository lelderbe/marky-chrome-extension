// Browser-only fixture. This is never included in the extension package.
const demoTitles = ['React', 'React Native', 'TypeScript', 'CSS', 'Research', 'Design', 'Projects', 'Reading'];
const demoFolders = demoTitles.map((title, i) => ({ id: String(10 + i), parentId: '1', title, dateGroupModified: 10000 - i, children: [] }));
let demoSaved = [];
let demoNextId = 100;
const demoReport = () => window.parent.postMessage({ type: 'marky-demo-state', folders: demoFolders.map(x => ({id:x.id, title:x.title, parentId:x.parentId})), bookmarks: demoSaved }, location.origin);
window.chrome = {
  i18n: {
    getUILanguage: () => window.demoLanguage,
    getMessage: (key, substitution) => (window.demoMessages[key]?.message || '').replace(/\$TITLE\$/g, String(substitution ?? ''))
  },
  tabs: { query: async () => [{ id: 1, url: 'https://react.dev/learn', title: 'React — Quick Start' }] },
  bookmarks: {
    getTree: async () => [{ id:'0', title:'', children:[{id:'1', title:window.demoLanguage==='ru'?'Панель закладок':'Bookmarks bar', children:demoFolders, dateGroupModified:1}, {id:'2', title:window.demoLanguage==='ru'?'Другие закладки':'Other bookmarks', children:[], dateGroupModified:0}] }],
    search: async ({url}) => demoSaved.filter(x => x.url === url),
    create: async (info) => {
      const node = {id:String(demoNextId++), ...info};
      if (info.url) demoSaved.push(node); else demoFolders.unshift({...node, children:[], dateGroupModified:20000});
      demoReport(); return node;
    },
    move: async (id, {parentId}) => {
      const node = demoSaved.find(x => x.id === id);
      if (!node) throw new Error('Missing demo bookmark');
      node.parentId = parentId; demoReport(); return node;
    }
  }
};
window.close = () => {
  demoReport();
  window.parent.postMessage({type:'marky-demo-close', saved:demoSaved.length>0}, location.origin);
};
document.addEventListener('input', event => window.parent.postMessage({type:'marky-demo-query', query:event.target.value}, location.origin));
document.addEventListener('DOMContentLoaded', demoReport);
