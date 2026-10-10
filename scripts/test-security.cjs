const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const assert = require('node:assert/strict');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename, originalLoad = Module._load;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(root, 'src', request.slice(2));
  return resolve.call(this, request, parent, ...rest);
};
// Permite probar utilidades server-only fuera del compilador de Next.
Module._load = function (request, ...args) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true},
}).outputText,filename);
const { isDemoMode } = require('../src/features/demo/mode.ts');
const { issueDemoSession, validDemoSessionDirectory, revokeDemoSession, DEMO_SESSION_SECONDS } = require('../src/features/demo/session-registry.ts');
const previous = { ...process.env };
test.after(() => { process.env = previous; });
function demo() { process.env.DEMO_MODE='true';process.env.NEXT_PUBLIC_DEMO_MODE='true';process.env.NODE_ENV='development';delete process.env.ALLOW_DEMO_IN_PRODUCTION; }
test('Demostración desactivada si falta cualquiera de los dos indicadores', () => {
  demo();assert.equal(isDemoMode(),true);process.env.DEMO_MODE='false';assert.equal(isDemoMode(),false);
  demo();process.env.NEXT_PUBLIC_DEMO_MODE='false';assert.equal(isDemoMode(),false);
});
test('Producción exige una excepción explícita para la demostración', () => {
  demo();process.env.NODE_ENV='production';assert.equal(isDemoMode(),false);assert.throws(()=>issueDemoSession());
  process.env.ALLOW_DEMO_IN_PRODUCTION='true';assert.equal(isDemoMode(),true);
});
test('Cookie UUID inventada y rutas manipuladas no crean sesiones', () => {
  demo();const forged=crypto.randomUUID();assert.equal(validDemoSessionDirectory(forged),null);
  assert.equal(validDemoSessionDirectory('../state.json'),null);assert.equal(validDemoSessionDirectory(undefined),null);
});
test('Sesiones emitidas tienen directorios aislados y permisos privados', () => {
  demo();const a=issueDemoSession(),b=issueDemoSession();
  try {
    const pa=validDemoSessionDirectory(a),pb=validDemoSessionDirectory(b);
    assert.ok(pa);assert.ok(pb);assert.notEqual(pa,pb);
    fs.writeFileSync(path.join(pa,'state.json'),'solo A');assert.equal(fs.existsSync(path.join(pb,'state.json')),false);
    assert.equal(fs.statSync(path.join(pa,'session.json')).mode & 0o777,0o600);
  } finally { revokeDemoSession(a);revokeDemoSession(b); }
});
test('Caducidad del servidor y cierre de sesión impiden reutilizar la cookie', () => {
  demo();const now=Date.now();const a=issueDemoSession(now),b=issueDemoSession(now);
  assert.equal(validDemoSessionDirectory(a,now+DEMO_SESSION_SECONDS*1000),null);
  revokeDemoSession(b);assert.equal(validDemoSessionDirectory(b,now),null);
});
test('Validador permite publishable/anon y rechaza secret/service_role sin mostrar sus valores', async () => {
  const {validatePublicSupabaseEnv:validate}=await import('./public-env.mjs');
  const jwt=role=>[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({role})).toString('base64url'),'firma'].join('.');
  const publicKey='sb_publishable_'+'x'.repeat(32);
  assert.equal(validate('https://example.supabase.co',publicKey).publishableKey,publicKey);
  assert.equal(validate('http://127.0.0.1:54321',jwt('anon')).publishableKey,jwt('anon'));
  for(const key of ['sb_'+'secret_'+'x'.repeat(32),jwt('service_role'),jwt('authenticated'),'invalid']) assert.throws(()=>validate('https://example.supabase.co',key),/claves secret y service_role/);
  for(const url of ['ftp://localhost','http://example.com','https://user:pass@example.com']) assert.throws(()=>validate(url,publicKey));
});
let fakeClient;
const realLoad=Module._load;
Module._load=function(request,...args){
  if(request==='@/lib/supabase/client')return {createClient:()=>fakeClient};
  if(request==='@/features/files/actions/demo-file-actions')return {};
  if(request==='@/features/files/actions/file-refresh-actions')return {refreshFilePages:async()=>{}};
  return realLoad.call(this,request,...args);
};
const {deleteActivityFile,uploadActivityFile}=require('../src/features/files/lib/file-storage.ts');
const user='10000000-0000-4000-8000-000000000001',activity='20000000-0000-4000-8000-000000000001',fileId='30000000-0000-4000-8000-000000000001';
function client(metadata){
  const removed=[],filters=[];
  const query={select(){return this;},eq(column,value){filters.push([column,value]);return this;},delete(){return this;},async maybeSingle(){return {data:metadata,error:null};}};
  return {removed,filters,auth:{getUser:async()=>({data:{user:{id:user}},error:null})},from:()=>query,storage:{from:()=>({remove:async(paths)=>{removed.push(...paths);return {error:null};}})}};
}
test('Borrado usa la ruta almacenada del ID propio, aunque el cliente envíe otra',async()=>{
  const actual=`${user}/${activity}/real.txt`;fakeClient=client({id:fileId,activity_id:activity,object_path:actual});
  assert.equal((await deleteActivityFile({id:fileId,objectPath:`${user}/${activity}/otro.txt`},false)).status,'success');
  assert.deepEqual(fakeClient.removed,[actual]);assert.ok(fakeClient.filters.some(([key,value])=>key==='user_id'&&value===user));
});
test('ID ajeno o inexistente no ocasiona ninguna eliminación de Storage',async()=>{
  fakeClient=client(null);assert.equal((await deleteActivityFile({id:fileId,objectPath:`${user}/${activity}/otro.txt`},false)).status,'error');assert.deepEqual(fakeClient.removed,[]);
});
test('Actividad inexistente se rechaza antes de intentar cargar bytes',async()=>{
  fakeClient=client(null);assert.equal((await uploadActivityFile(activity,new File(['prueba'],'prueba.txt',{type:'text/plain'}),false)).status,'error');
});
