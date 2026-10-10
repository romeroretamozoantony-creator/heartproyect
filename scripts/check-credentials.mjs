// Nunca imprime valores de credenciales, solo el archivo y la categoría detectada.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { validatePublicSupabaseEnv } from './public-env.mjs';
const root=process.cwd(), findings=[];
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
if(key) {
  try { validatePublicSupabaseEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',key); }
  catch { findings.push('entorno: configuración pública inválida o privilegiada'); }
}
async function scan(directory) {
  let entries;try{entries=await readdir(directory,{withFileTypes:true});}catch{return;}
  for(const entry of entries) {
    const file=join(directory,entry.name);
    if(entry.isDirectory()) { if(!['node_modules','.git'].includes(entry.name)) await scan(file);continue; }
    if(!/\.(ts|tsx|js|jsx|mjs|cjs|sql|json|md)$/.test(entry.name)) continue;
    const content=await readFile(file,'utf8');
    if(/sb_secret_[A-Za-z0-9_-]{16,}/.test(content) || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) findings.push(`${relative(root,file)}: secreto o clave privada`);
    for(const token of content.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]) {
      try { if(JSON.parse(Buffer.from(token.split('.')[1],'base64url')).role==='service_role') findings.push(`${relative(root,file)}: JWT privilegiado`); } catch { /* No es un JWT. */ }
    }
  }
}
for(const directory of ['src','scripts','supabase','docs']) await scan(join(root,directory));
if(!process.argv.includes('--source-only')) await scan(join(root,'.next/static'));
if(findings.length){console.error([...new Set(findings)].join('\n'));process.exitCode=1;}
else console.log('Sin claves secret/service_role ni claves privadas en los archivos y bundles examinados.');
