import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url));
const captures=join(root,'marketing/captures'), frames=join(captures,'frames');
await mkdir(frames,{recursive:true});
const sequence=[
 ['intro',1.8],['save-open',1.2],['save-r',.25],['save-re',.25],['save-rea',.25],['save-reac',.25],['save-react',1.5],['save-done',1.8],
 ['filter-open',.7],['filter-r',.2],['filter-re',.2],['filter-rea',1.9],
 ['create-open',.7],['create-d',.15],['create-design',.35],['create-full',1.8],['create-done',1.7],['outro',3]
];
for(const lang of ['en','ru']){
 const dir=join(root,'marketing/assets',lang);await mkdir(dir,{recursive:true});
 for(const [name] of sequence){
   const source=join(captures,`${lang}-${name}.jpg`), meta=await sharp(source).metadata();
   const legacy=meta.width===3456&&meta.height===1988;
   if(!legacy&&(meta.width!==1280||meta.height!==800))throw new Error('Capture geometry changed: '+source);
   const capture=legacy?sharp(source).extract({left:0,top:242,width:2560,height:1600}):sharp(source);
   await capture.resize(1280,800).flatten({background:'#f4f7fb'}).png().toFile(join(frames,`${lang}-${name}.png`));
 }
 for(const [name,source] of [['01-save','save-react'],['02-filter','filter-rea'],['03-create','create-full']]){
   await writeFile(join(dir,name+'.png'),await readFile(join(frames,`${lang}-${source}.png`)));
 }
 await writeFile(join(captures,`${lang}-timeline.json`),JSON.stringify(sequence.map(([name,duration])=>({file:join(frames,`${lang}-${name}.png`),duration})),null,2));
}
const icon=(await readFile(join(root,'public/icons/icon128.png'))).toString('base64');
const promo=`<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280"><rect width="440" height="280" fill="#1a73e8"/><rect x="30" y="32" width="76" height="76" rx="16" fill="#fff"/><image href="data:image/png;base64,${icon}" x="44" y="46" width="48" height="48"/><text x="126" y="83" font-family="Arial" font-size="44" font-weight="700" fill="#fff">Marky</text><rect x="30" y="146" width="380" height="95" rx="12" fill="#fff"/><path d="M55 176h16l7 7h27v32H55z" fill="none" stroke="#1a73e8" stroke-width="3" stroke-linejoin="round"/><text x="123" y="205" font-family="Arial" font-size="25" fill="#193b61">React</text><path d="M249 193h38m-9-9 9 9-9 9" fill="none" stroke="#8babc9" stroke-width="2"/><rect x="307" y="169" width="78" height="49" rx="7" fill="#eff5ff" stroke="#d7e5f8"/><text x="322" y="200" font-family="Arial" font-size="17" font-weight="700" fill="#1a73e8">Enter</text></svg>`;
await sharp(Buffer.from(promo)).flatten({background:'#1a73e8'}).png().toFile(join(root,'marketing/assets/promo-small.png'));
const sheets=[];
for(const [row,lang] of ['en','ru'].entries())for(const [col,name] of ['01-save','02-filter','03-create'].entries()){
 sheets.push({input:await sharp(join(root,'marketing/assets',lang,name+'.png')).resize(640,400).toBuffer(),left:col*640,top:row*400});
}
await sharp({create:{width:1920,height:800,channels:3,background:'#f4f7fb'}}).composite(sheets).png().toFile(join(root,'marketing/assets/contact-sheet.png'));
console.log('Prepared 6 screenshots, a promo tile, and 18-second video timelines.');

const listingContent={};
for(const lang of ['en','ru']){
 listingContent[lang]={metadata:JSON.parse(await readFile(join(root,'public/_locales',lang,'messages.json'),'utf8')),description:await readFile(join(root,'marketing/listing',lang+'.txt'),'utf8')};
}
const previewPath=join(root,'marketing/preview.html');
const preview=await readFile(previewPath,'utf8');
await writeFile(previewPath,preview.replace(/\/\*BEGIN_LISTING_DATA\*\/[\s\S]*?\/\*END_LISTING_DATA\*\//,`/*BEGIN_LISTING_DATA*/const listingContent=${JSON.stringify(listingContent).replace(/</g,'\\u003c')};/*END_LISTING_DATA*/`));
