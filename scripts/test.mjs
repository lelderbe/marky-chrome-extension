import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
function loadSource(entry, chrome, globals = {}) {
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const code = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const run = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { chrome, setTimeout, clearTimeout, ...globals });
    run((name) => {
      const target = resolve(dirname(path), name);
      return load(existsSync(target + '.ts') ? target + '.ts' : resolve(target, 'index.ts'));
    }, module, module.exports);
    return module.exports;
  }
  return load(resolve(root, entry));
}
const tab = { id: 1, url: 'https://example.com/article', title: 'Article' };
function bookmarksFixture({ saved = [], failSave = false, failCleanup = false, concurrentChild = false,
  rootFolders = [{ id: '1', title: 'Bookmarks bar', folderType: 'bookmarks-bar', syncing: false }],
} = {}) {
  const calls = [], nodes = saved.map(node => ({ ...node }));
  let nextId = 100;
  return { calls, nodes, chrome: { bookmarks: {
    getTree: async () => [{ id: '0', title: '', children: rootFolders }],
    search: async ({ url }) => nodes.filter(node => node.url === url),
    create: async (info) => {
      calls.push(info.url ? 'create-bookmark' : 'create-folder');
      const parent = [...rootFolders, ...nodes].find(node => node.id === info.parentId);
      if (!parent || parent.url || parent.unmodifiable) throw new Error('Invalid bookmark parent');
      if (info.url && failSave) throw new Error('Write failed');
      const node = { id: String(nextId++), ...info }; nodes.push(node); return node;
    },
    move: async (id, { parentId }) => { calls.push('move'); const node=nodes.find(node=>node.id===id); node.parentId=parentId; return node; },
    getChildren: async id => concurrentChild ? [{id:'other',parentId:id,url:'https://other.example'}] : nodes.filter(node=>node.parentId===id),
    remove: async id => { calls.push('remove-folder'); if(failCleanup)throw new Error('Cleanup failed'); nodes.splice(nodes.findIndex(node=>node.id===id),1); },
  } } };
}

test('unsupported pages cannot create a bookmark or an empty folder', async () => {
  for (const url of [undefined, '', 'chrome://extensions/', 'chrome-extension://id/page.html']) {
    const fixture=bookmarksFixture();const lib=loadSource('src/lib/bookmarks.ts',fixture.chrome);
    await assert.rejects(lib.saveToFolder({...tab,url},'10'));
    await assert.rejects(lib.createFolderAndSave({...tab,url},'Project'));
    assert.equal(fixture.calls.length,0);
  }
});
test('empty names cannot create folders', async () => {
  const fixture=bookmarksFixture();const lib=loadSource('src/lib/bookmarks.ts',fixture.chrome);
  await assert.rejects(lib.createFolderAndSave(tab,'   '));assert.equal(fixture.calls.length,0);
});
test('saving in the existing folder keeps the original bookmark', async () => {
  const fixture=bookmarksFixture({saved:[{id:'90',parentId:'10',url:tab.url}]});
  await loadSource('src/lib/bookmarks.ts',fixture.chrome).saveToFolder(tab,'10');
  assert.equal(fixture.calls.length,0);assert.equal(fixture.nodes.length,1);
});
test('moving preserves the bookmark ID and does not create duplicates', async () => {
  const fixture=bookmarksFixture({saved:[{id:'90',parentId:'10',url:tab.url}]});
  await loadSource('src/lib/bookmarks.ts',fixture.chrome).saveToFolder(tab,'20');
  assert.deepEqual(fixture.calls,['move']);assert.equal(fixture.nodes[0].id,'90');assert.equal(fixture.nodes[0].parentId,'20');assert.equal(fixture.nodes.length,1);
});
test('a new folder is created in the Bookmarks bar and receives the page', async () => {
  const fixture=bookmarksFixture();await loadSource('src/lib/bookmarks.ts',fixture.chrome).createFolderAndSave(tab,'  Project  ');
  assert.equal(fixture.nodes[0].parentId,'1');assert.equal(fixture.nodes[0].title,'Project');assert.equal(fixture.nodes[1].parentId,fixture.nodes[0].id);
});
test('folder creation uses the actual Bookmarks bar ID instead of assuming 1', async () => {
  const fixture = bookmarksFixture({ rootFolders: [
    { id: '42', title: 'Панель закладок', folderType: 'bookmarks-bar', syncing: true },
    { id: '43', title: 'Other bookmarks', folderType: 'other', syncing: true },
  ] });
  await loadSource('src/lib/bookmarks.ts', fixture.chrome).createFolderAndSave(tab, 'Project');
  assert.equal(fixture.nodes[0].parentId, '42');
  assert.equal(fixture.nodes[1].parentId, fixture.nodes[0].id);
});
test('account Bookmarks bar is preferred when both local and account bars exist', async () => {
  const fixture = bookmarksFixture({ rootFolders: [
    { id: '1', title: 'Bookmarks bar', folderType: 'bookmarks-bar', syncing: false },
    { id: '42', title: 'Bookmarks bar', folderType: 'bookmarks-bar', syncing: true },
  ] });
  await loadSource('src/lib/bookmarks.ts', fixture.chrome).createFolderAndSave(tab, 'Project');
  assert.equal(fixture.nodes[0].parentId, '42');
});
test('older Chrome without folderType still creates folders in the legacy bar', async () => {
  const fixture = bookmarksFixture({ rootFolders: [{ id: '1', title: 'Панель закладок' }] });
  await loadSource('src/lib/bookmarks.ts', fixture.chrome).createFolderAndSave(tab, 'Project');
  assert.equal(fixture.nodes[0].parentId, '1');
});
test('missing or managed bars do not create folders in an arbitrary location', async () => {
  for (const rootFolders of [
    [],
    [{ id: '1', title: 'Other bookmarks', folderType: 'other', syncing: false }],
    [{ id: '1', title: 'Managed bar', folderType: 'bookmarks-bar', unmodifiable: 'managed' }],
    [{ id: '1', title: 'Managed legacy bar', unmodifiable: 'managed' }],
  ]) {
    const fixture = bookmarksFixture({ rootFolders });
    await assert.rejects(loadSource('src/lib/bookmarks.ts', fixture.chrome).createFolderAndSave(tab, 'Project'));
    assert.equal(fixture.calls.length, 0);
    assert.equal(fixture.nodes.length, 0);
  }
});
test('folder creation rechecks the bar after account storage changes', async () => {
  const rootFolders = [{ id: '1', title: 'Bookmarks bar', folderType: 'bookmarks-bar', syncing: false }];
  const fixture = bookmarksFixture({ rootFolders });
  const lib = loadSource('src/lib/bookmarks.ts', fixture.chrome);
  await lib.createFolderAndSave(tab, 'Before');
  rootFolders.splice(0, 1, { id: '42', title: 'Bookmarks bar', folderType: 'bookmarks-bar', syncing: true });
  await lib.createFolderAndSave({ ...tab, url: 'https://example.com/next' }, 'After');
  assert.equal(fixture.nodes[2].parentId, '42');
  assert.equal(fixture.nodes[3].parentId, fixture.nodes[2].id);
});
test('a failed page save removes the empty folder it just created', async () => {
  const fixture=bookmarksFixture({failSave:true});const lib=loadSource('src/lib/bookmarks.ts',fixture.chrome);
  await assert.rejects(lib.createFolderAndSave(tab,'Project'),/Write failed/);
  assert.equal(fixture.nodes.length,0);assert.deepEqual(fixture.calls,['create-folder','create-bookmark','remove-folder']);
});
test('failed cleanup exposes the created folder ID for retry without creating another', async () => {
  const fixture=bookmarksFixture({failSave:true,failCleanup:true});const lib=loadSource('src/lib/bookmarks.ts',fixture.chrome);
  await assert.rejects(lib.createFolderAndSave(tab,'Project'),error=>error instanceof lib.CreatedFolderSaveError && error.folderId===fixture.nodes[0].id);
  assert.equal(fixture.nodes.length,1);
});
test('cleanup does not delete a folder that gained another bookmark meanwhile', async () => {
  const fixture=bookmarksFixture({failSave:true,concurrentChild:true});const lib=loadSource('src/lib/bookmarks.ts',fixture.chrome);
  await assert.rejects(lib.createFolderAndSave(tab,'Project'),error=>error instanceof lib.CreatedFolderSaveError);
  assert.equal(fixture.calls.includes('remove-folder'),false);
});
test('shortcut matching respects reassignment, modifiers and non-Latin layouts', () => {
  const {matchesShortcut}=loadSource('src/lib/shortcuts.ts',{});
  const key={key:'и',code:'KeyB',metaKey:true,ctrlKey:false,altKey:false,shiftKey:false};
  assert.equal(matchesShortcut(key,'⌘B'),true);
  assert.equal(matchesShortcut(key,'Command+B'),true);
  assert.equal(matchesShortcut(key,'Command+K'),false);
  assert.equal(matchesShortcut(key,''),false);
  assert.equal(matchesShortcut({...key,shiftKey:true},'Command+B'),false);
  assert.equal(matchesShortcut({...key,code:'KeyK',shiftKey:true},'Command+Shift+K'),true);
  assert.equal(matchesShortcut({...key,metaKey:false,ctrlKey:true},'Ctrl+B'),true);
});
function backgroundFixture(url=tab.url, actionOverrides={}) {
  const handlers={},texts=[],timers=new Map();let nextTimer=0;
  const event=name=>({addListener:callback=>{handlers[name]=callback;}});
  const chrome={
    runtime:{id:'test-extension',onMessage:event('message'),onStartup:event('startup'),onInstalled:event('installed')},
    tabs:{get:async()=>({...tab,url}),query:async()=>[],onActivated:event('activated'),onUpdated:event('updated'),onRemoved:event('removed')},
    action:{setIcon:async()=>{},setBadgeBackgroundColor:async()=>{},setBadgeText:async({text})=>texts.push(text),...actionOverrides},
    bookmarks:{search:async()=>[],onCreated:event('created'),onRemoved:event('bookmarkRemoved'),onChanged:event('changed')},
  };
  loadSource('src/background.ts',chrome,{setTimeout:callback=>{const id=++nextTimer;timers.set(id,callback);return id;},clearTimeout:id=>timers.delete(id)});
  const saved=()=>new Promise(resolve=>{assert.equal(handlers.message({type:'marky:saved',tabId:1,url:tab.url},{id:chrome.runtime.id},resolve),true);});
  return {handlers,texts,timers,saved};
}
test('success badge survives popup closure and clears after its timeout', async () => {
  const fixture=backgroundFixture();await fixture.saved();assert.deepEqual(fixture.texts,['✓']);
  fixture.timers.values().next().value();await new Promise(setImmediate);assert.deepEqual(fixture.texts,['✓','']);
});
test('confirmation is skipped if the tab has already navigated elsewhere', async () => {
  const fixture=backgroundFixture('https://other.example');await fixture.saved();assert.equal(fixture.texts.length,0);assert.equal(fixture.timers.size,0);
});
test('navigation clears confirmation and removes its old timeout', async () => {
  const fixture=backgroundFixture();await fixture.saved();fixture.handlers.updated(1,{url:'https://other.example'},{...tab,url:'https://other.example'});
  await new Promise(setImmediate);assert.equal(fixture.texts.at(-1),'');assert.equal(fixture.timers.size,0);
});
test('navigation during confirmation setup cannot show success on the next page', async () => {
  let resume;
  const fixture=backgroundFixture(tab.url,{setBadgeBackgroundColor:()=>new Promise(resolve=>{resume=resolve;})});
  const pending=fixture.saved();await new Promise(setImmediate);
  fixture.handlers.updated(1,{url:'https://other.example'},{...tab,url:'https://other.example'});
  resume();await pending;
  assert.deepEqual(fixture.texts,['']);assert.equal(fixture.timers.size,0);
});
test('closing a tab while confirmation is being set up cancels the pending badge', async () => {
  let resume;
  const fixture=backgroundFixture(tab.url,{setBadgeBackgroundColor:()=>new Promise(resolve=>{resume=resolve;})});
  const pending=fixture.saved();await new Promise(setImmediate);
  fixture.handlers.removed(1);resume();await pending;
  assert.equal(fixture.texts.length,0);assert.equal(fixture.timers.size,0);
});
test('confirmation messages reject unexpected senders and invalid tab IDs', () => {
  const fixture=backgroundFixture();const respond=()=>assert.fail('Unexpected response');
  assert.equal(fixture.handlers.message({type:'marky:saved',tabId:1,url:tab.url},{id:'other-extension'},respond),undefined);
  assert.equal(fixture.handlers.message({type:'marky:saved',tabId:'1',url:tab.url},{id:'test-extension'},respond),undefined);
});
