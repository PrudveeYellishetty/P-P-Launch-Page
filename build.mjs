// Small dependency-free bundle for this static app. Modules share one private
// scope so store.js's live `state` binding stays live in every feature.
import {readFile,writeFile,mkdir,copyFile,cp} from 'node:fs/promises';
const modules=['supabase-config.js','store.js','ui.js','notes.js','tasks.js','resources.js','sync.js','app.js'];
const source=await Promise.all(modules.map(async name=>`\n// ${name}\n`+(await readFile(new URL(name,import.meta.url),'utf8')).replace(/^import .*?;\r?\n/gm,'').replace(/^export /gm,'')));
await writeFile(new URL('app.bundle.js',import.meta.url),'(()=>{\n"use strict";\n'+source.join('\n')+'\n})();\n');
// Only browser assets are deployed; SQL and documentation remain in Git.
const output=new URL('./dist/',import.meta.url);
await mkdir(output,{recursive:true});
await Promise.all(['index.html','app.bundle.js','styles.css','responsive.css','_headers'].map(name=>copyFile(new URL(name,import.meta.url),new URL(name,output))));
await cp(new URL('./assets/',import.meta.url),new URL('./assets/',output),{recursive:true});
console.log('Built static site in dist/');
