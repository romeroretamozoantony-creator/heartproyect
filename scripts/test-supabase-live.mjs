// Prueba opcional sobre un proyecto de pruebas con dos cuentas existentes.
// Solo crea y limpia sus propias actividades/archivos. No sustituye su cronograma.
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { validatePublicSupabaseEnv } from './public-env.mjs';
const names=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SECURITY_TEST_USER_A_EMAIL','SECURITY_TEST_USER_A_PASSWORD','SECURITY_TEST_USER_B_EMAIL','SECURITY_TEST_USER_B_PASSWORD'];
const missing=names.filter(name=>!process.env[name]?.trim());
if(missing.length){console.error(`Prueba no ejecutada. Faltan: ${missing.join(', ')}.`);process.exit(1);}
const env=validatePublicSupabaseEnv(process.env[names[0]].trim(),process.env[names[1]].trim());
const clients=['A','B'].map(label=>({label,client:createClient(env.url,env.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}}),user:null,activity:null,path:null,file:null}));
let passed=0;
async function check(name,fn){await fn();console.log(`PASS ${++passed}: ${name}`);}
function ok(result,message){assert.equal(result.error,null,message);return result.data;}
try {
  for(const item of clients){
    const data=ok(await item.client.auth.signInWithPassword({email:process.env[`SECURITY_TEST_USER_${item.label}_EMAIL`],password:process.env[`SECURITY_TEST_USER_${item.label}_PASSWORD`]}),'No se pudo autenticar una cuenta de pruebas.');item.user=data.user.id;
  }
  await check('Dos cuentas reales con identidades diferentes',async()=>assert.notEqual(clients[0].user,clients[1].user));
  for(const item of clients){
    item.activity=ok(await item.client.from('activities').insert({title:`Prueba 8.2 ${crypto.randomUUID()}`,category:'academic',activity_date:'2026-10-14',start_time:'18:00',end_time:'19:00'}).select('id').single(),'No se pudo crear actividad propia.').id;
    item.path=`${item.user}/${item.activity}/${crypto.randomUUID()}-prueba.txt`;
    ok(await item.client.storage.from('activity-files').upload(item.path,Buffer.from('Material privado de pruebas'),{contentType:'text/plain'}),'No se pudo cargar archivo propio.');
    item.file=ok(await item.client.from('uploaded_files').insert({activity_id:item.activity,object_path:item.path,original_name:'prueba.txt',mime_type:'text/plain',size_bytes:26}).select('id').single(),'No se pudieron guardar metadatos propios.').id;
  }
  await check('Carga y descarga privadas funcionan con ambas cuentas',async()=>{for(const item of clients) ok(await item.client.storage.from('activity-files').download(item.path),'No se pudo descargar el archivo propio.');});
  for(const [own,other] of [[clients[0],clients[1]],[clients[1],clients[0]]]){
    await check(`Cuenta ${own.label}: actividad y metadatos ajenos ocultos`,async()=>{
      assert.equal(ok(await own.client.from('activities').select('id').eq('id',other.activity),'Consulta falló.').length,0);
      assert.equal(ok(await own.client.from('uploaded_files').select('id').eq('id',other.file),'Consulta falló.').length,0);
      assert.equal(ok(await own.client.from('activities').update({title:'Intrusión'}).eq('id',other.activity).select('id'),'Consulta falló.').length,0);
      assert.equal(ok(await own.client.from('activities').delete().eq('id',other.activity).select('id'),'Consulta falló.').length,0);
    });
    await check(`Cuenta ${own.label}: archivo ajeno no se descarga ni recibe URL firmada`,async()=>{
      assert.ok((await own.client.storage.from('activity-files').download(other.path)).error);
      assert.ok((await own.client.storage.from('activity-files').createSignedUrl(other.path,60)).error);
      // Algunas versiones de Storage devuelven éxito con lista vacía para DELETE denegado.
      await own.client.storage.from('activity-files').remove([other.path]);
      ok(await other.client.storage.from('activity-files').download(other.path),'La petición ajena eliminó el archivo.');
    });
    await check(`Cuenta ${own.label}: no se carga un archivo para una actividad ajena`,async()=>{
      const illegal=`${own.user}/${other.activity}/${crypto.randomUUID()}-ilegal.txt`;
      const result=await own.client.storage.from('activity-files').upload(illegal,Buffer.from('x'),{contentType:'text/plain'});
      if(!result.error)await own.client.storage.from('activity-files').remove([illegal]);
      assert.ok(result.error);
    });
    await check(`Cuenta ${own.label}: RPC rechaza una actividad ajena sin crear plan`,async()=>{
      assert.ok((await own.client.rpc('create_study_plan',{plan_name:'Prueba rechazada 8.2',plan_blocks:[{activity_id:other.activity,block_type:'study',position:0,title:'Prueba',scheduled_start:'2026-10-14T18:00:00Z',scheduled_end:'2026-10-14T18:01:00Z',planned_minutes:1}]})).error);
    });
    await check(`Cuenta ${own.label}: clientes no consultan respuestas correctas`,async()=>assert.ok((await own.client.from('evaluation_answer_keys').select('*').limit(1)).error));
  }
  console.log(`${passed} pruebas de Supabase real aprobadas.`);
} catch { console.error('Falló una comprobación de Supabase real. Revisar migraciones, RLS y configuración del proyecto de pruebas.');process.exitCode=1; }
finally {
  for(const item of clients){
    let failed=false;
    if(item.path)failed = Boolean((await item.client.storage.from('activity-files').remove([item.path])).error) || failed;
    if(item.activity)failed = Boolean((await item.client.from('activities').delete().eq('id',item.activity)).error) || failed;
    if(item.user)await item.client.auth.signOut({scope:'local'});
    if(failed){console.error(`Limpieza incompleta para la cuenta de pruebas ${item.label}; actividad ${item.activity}.`);process.exitCode=1;}
  }
}
