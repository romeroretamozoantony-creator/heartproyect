// Ejecuta las migraciones reales en PostgreSQL WASM. No sustituye Auth/Storage HTTP de Supabase.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite({ extensions: { pgcrypto } });
const A = '10000000-0000-4000-8000-000000000001', B = '10000000-0000-4000-8000-000000000002';
const activityA = '20000000-0000-4000-8000-000000000001', activityB = '20000000-0000-4000-8000-000000000002';
let count = 0;
async function check(name, fn) { await fn(); console.log(`PASS ${++count}: ${name}`); }
async function as(user, fn, role = 'authenticated') {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user || '']);
  try { return await fn(); } finally { await db.exec('reset role'); }
}
async function denied(sql, values = [], code) {
  let error;
  try { await db.query(sql, values); } catch (caught) { error = caught; }
  assert.ok(error, 'La operación prohibida fue aceptada');
  if (code) assert.equal(error.code, code);
}
const blocks = (activity, two = false) => JSON.stringify(Array.from({ length: two ? 2 : 1 }, (_, position) => ({ activity_id: activity, block_type: 'study', position, title: 'Bloque', scheduled_start: '2026-10-14T18:00:00Z', scheduled_end: '2026-10-14T18:01:00Z', planned_minutes: 1 })));
const pathA = `${A}/${activityA}/material.txt`, pathB = `${B}/${activityB}/material.txt`;
try {
  await db.exec(`
    create schema auth; create schema storage; create schema extensions;
    create role anon; create role authenticated;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema auth, storage, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner_id text, metadata jsonb, unique(bucket_id,name));
    create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1]$$;
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `);
  const migrations = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(migrations)).filter(f => f.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, migrations), 'utf8'));
  }
  await check('Las diez migraciones se aplican sin modificar su SQL', async () => {
    const { rows } = await db.query("select count(*)::int as n from pg_class c join pg_namespace n on c.relnamespace=n.oid where n.nspname='public' and c.relkind='r' and c.relrowsecurity");
    assert.equal(rows[0].n, 12);
  });
  for (const [user, activity, suffix] of [[A, activityA, 'uno'], [B, activityB, 'dos']]) {
    await db.query('insert into auth.users values ($1,$2,$3)', [user, `${suffix}@example.test`, JSON.stringify({ username: suffix, first_name: 'Prueba', last_name: suffix, student_code: suffix })]);
    await as(user, () => db.query("insert into public.activities(id,title,category,activity_date,start_time,end_time) values ($1,$2,'academic','2026-10-14','18:00','19:00')", [activity, suffix]));
  }
  await check('El trigger crea perfiles separados para ambos usuarios', () => as(A, async () => {
    assert.deepEqual((await db.query('select id from profiles')).rows, [{ id: A }]);
  }));
  await check('Ambos usuarios ven únicamente sus actividades', async () => {
    for (const [user, id] of [[A,activityA],[B,activityB]]) await as(user, async () => assert.deepEqual((await db.query('select id from activities')).rows, [{ id }]));
  });
  await check('Cambiar o borrar una actividad ajena afecta cero filas', () => as(A, async () => {
    assert.equal((await db.query("update activities set title='Intrusión' where id=$1 returning id",[activityB])).rows.length,0);
    assert.equal((await db.query('delete from activities where id=$1 returning id',[activityB])).rows.length,0);
  }));
  await check('No se puede insertar ni transferir datos con user_id ajeno', () => as(A, async () => {
    await denied("insert into activities(user_id,title,category,activity_date,start_time,end_time) values($1,'Intrusión','academic','2026-10-14','18:00','19:00')",[B],'42501');
    await denied('update activities set user_id=$1 where id=$2',[B,activityA],'42501');
  }));
  await check('Sin identidad validada no se leen datos ni se ejecutan RPC', () => as('', async () => {
    assert.equal((await db.query('select * from activities')).rows.length,0);
    await denied("select create_study_plan('Inválido',$1)",[blocks(activityA)],'28000');
  }));
  await check('El rol anónimo no accede a tablas ni a RPC', () => as('', async () => {
    await denied('select * from activities',[],'42501');
    await denied("select create_study_plan('Inválido',$1)",[blocks(activityA)],'42501');
    await denied('select transition_study_plan(gen_random_uuid(),\'confirm\')',[],'42501');
  },'anon'));
  await check('Cronograma propio por RPC; actividad ajena y días duplicados rechazados', () => as(A, async () => {
    const row={activity_id:activityA,day_of_week:0,allocated_minutes:25,alert_before_start_minutes:null,alert_on_end:false};
    assert.equal((await db.query('select * from replace_activity_schedules($1)',[JSON.stringify([row])])).rows.length,1);
    await denied('select * from replace_activity_schedules($1)',[JSON.stringify([{...row,activity_id:activityB}])],'23503');
    await denied('select * from replace_activity_schedules($1)',[JSON.stringify([row,row])],'23505');
    assert.equal((await db.query('select * from activity_schedules')).rows.length,1);
  }));
  await check('Bucket privado con límite de 10 MB y tipos permitidos', async () => {
    assert.deepEqual((await db.query("select public, file_size_limit::int, cardinality(allowed_mime_types)::int as tipos from storage.buckets where id='activity-files'")).rows,[{public:false,file_size_limit:10485760,tipos:10}]);
  });
  await check('Cada usuario puede cargar y registrar su propio archivo', async () => {
    for (const [user,activity,path] of [[A,activityA,pathA],[B,activityB,pathB]]) await as(user, async () => {
      await db.query("insert into storage.objects(bucket_id,name,owner_id) values('activity-files',$1,$2)",[path,user]);
      await db.query("insert into uploaded_files(activity_id,object_path,original_name,mime_type,size_bytes) values($1,$2,'material.txt','text/plain',100)",[activity,path]);
    });
  });
  await check('Archivos y metadatos ajenos no son visibles, modificables ni eliminables', () => as(A, async () => {
    assert.deepEqual((await db.query('select name from storage.objects')).rows,[{name:pathA}]);
    assert.equal((await db.query('select * from uploaded_files')).rows.length,1);
    assert.equal((await db.query('delete from storage.objects where name=$1 returning id',[pathB])).rows.length,0);
    assert.equal((await db.query("update storage.objects set name='otro' where name=$1 returning id",[pathB])).rows.length,0);
    assert.equal((await db.query('delete from uploaded_files where object_path=$1 returning id',[pathB])).rows.length,0);
  }));
  await check('Carga rechazada con propietario, carpeta, actividad o ruta incorrectos', () => as(A, async () => {
    for (const [path,owner] of [[`${B}/${activityB}/x.txt`,A],[`${A}/${activityB}/x.txt`,A],[`${A}/00000000-0000-4000-8000-000000000000/x.txt`,A],[`${A}/${activityA}/../x.txt`,A],[`${A}/${activityA}/..`,A],[`${A}/${activityA}/x.txt`,B]]) {
      await denied("insert into storage.objects(bucket_id,name,owner_id) values('activity-files',$1,$2)",[path,owner],'42501');
    }
    await denied('update storage.objects set name=$1 where name=$2',[`${A}/${activityB}/x.txt`,pathA],'42501');
  }));
  await check('Metadatos sin objeto o con ruta ajena son rechazados', () => as(A, async () => {
    for (const path of [pathB,`${A}/${activityA}/missing.txt`]) await denied("insert into uploaded_files(activity_id,object_path,original_name,mime_type,size_bytes) values($1,$2,'x.txt','text/plain',100)",[activityA,path]);
    await denied('update uploaded_files set object_path=$1 where object_path=$2',[pathB,pathA]);
  }));
  await check('No se permiten escrituras directas en planes, bloques, sesiones, progreso y cronogramas', () => as(A, async () => {
    for (const table of ['study_plans','plan_blocks','pomodoro_sessions','activity_progress','activity_schedules']) {
      await denied(`delete from ${table}`,[],'42501');
      assert.equal((await db.query('select has_table_privilege(current_user,$1,\'INSERT\') as allowed',[table])).rows[0].allowed,false);
      assert.equal((await db.query('select has_table_privilege(current_user,$1,\'UPDATE\') as allowed',[table])).rows[0].allowed,false);
    }
  }));
  await check('RPC no crea planes con actividades de otro usuario', () => as(A, () => denied("select create_study_plan('Inválido',$1)",[blocks(activityB)],'23503')));
  let planA, planB, blockA, secondA, blockB;
  for (const [user,activity] of [[A,activityA],[B,activityB]]) await as(user, async () => {
    const id=(await db.query("select create_study_plan('Prueba',$1) as id",[blocks(activity,user===A)])).rows[0].id;
    const owned=(await db.query('select id from plan_blocks where plan_id=$1 order by position',[id])).rows;
    if(user===A){planA=id;blockA=owned[0].id;secondA=owned[1].id;} else {planB=id;blockB=owned[0].id;}
  });
  await check('Planes y bloques están aislados; RPC ajenas rechazadas', () => as(A, async () => {
    assert.equal((await db.query('select * from study_plans where id=$1',[planB])).rows.length,0);
    assert.equal((await db.query('select * from plan_blocks where id=$1',[blockB])).rows.length,0);
    await denied("select transition_study_plan($1,'confirm')",[planB],'P0002');
    await denied("select transition_pomodoro_session($1,'start')",[blockB]);
    await denied("select transition_pomodoro_session($1,'start')",[blockA]);
    await db.query("select transition_study_plan($1,'confirm')",[planA]);
  }));
  await check('Solo una sesión activa; crear/reestructurar/confirmar quedan bloqueados durante ella', () => as(A, async () => {
    await db.query("select transition_pomodoro_session($1,'start')",[blockA]);
    await denied("select transition_pomodoro_session($1,'start')",[secondA],'23514');
    await denied("select create_study_plan('Otro',$1)",[blocks(activityA)],'23514');
    await denied("select transition_study_plan($1,'restructure')",[planA],'23514');
    await denied("select transition_study_plan($1,'confirm')",[planA],'23514');
  }));
  await check('Las sesiones de A no bloquean ni aparecen en la cuenta de B', () => as(B, async () => {
    assert.equal((await db.query('select * from pomodoro_sessions')).rows.length,0);
    await db.query("select transition_study_plan($1,'confirm')",[planB]);
    await db.query("select transition_pomodoro_session($1,'start')",[blockB]);
    await db.query("select transition_pomodoro_session($1,'cancel')",[blockB]);
  }));
  await check('Pausa/reanudación/finalización guardan tiempo real y progreso por trigger', () => as(A, async () => {
    await db.query("select transition_pomodoro_session($1,'pause')",[blockA]);
    await denied("select transition_pomodoro_session($1,'pause')",[blockA]);
    await db.query("select transition_pomodoro_session($1,'resume')",[blockA]);
    const session=(await db.query("select * from transition_pomodoro_session($1,'complete')",[blockA])).rows[0];
    assert.equal(session.status,'completed'); assert.ok(session.elapsed_seconds < session.planned_seconds);
    assert.equal((await db.query('select completion_percentage from activity_progress')).rows[0].completion_percentage,50);
    await denied("select transition_pomodoro_session($1,'start')",[blockA]);
    await db.query("select transition_pomodoro_session($1,'start')",[secondA]);
    await db.query("select transition_pomodoro_session($1,'complete')",[secondA]);
    assert.equal((await db.query('select completion_percentage from activity_progress')).rows[0].completion_percentage,100);
    assert.equal((await db.query('select status from study_plans where id=$1',[planA])).rows[0].status,'completed');
  }));
  await check('Progreso ajeno oculto y respuestas correctas sin permisos de cliente', () => as(B, async () => {
    assert.equal((await db.query('select * from activity_progress where user_id=$1',[A])).rows.length,0);
    await denied('select * from evaluation_answer_keys',[],'42501');
  }));
  const questions = {};
  for (const [user, activity] of [[A,activityA],[B,activityB]]) {
    const file=(await db.query('select id from uploaded_files where user_id=$1',[user])).rows[0].id;
    const evaluation=(await as(user,()=>db.query('insert into evaluations(activity_id,file_id) values($1,$2) returning id',[activity,file]))).rows[0].id;
    const question=(await db.query("insert into evaluation_questions(user_id,evaluation_id,position,prompt,question_type) values($1,$2,0,'Pregunta','short_answer') returning id",[user,evaluation])).rows[0].id;
    questions[user]=question;
    await db.query("insert into evaluation_answer_keys(question_id,user_id,correct_answer) values($1,$2,'Solución')",[question,user]);
    await as(user,()=>db.query("insert into evaluation_responses(question_id,answer) values($1,'Respuesta')",[question]));
  }
  await check('Evaluaciones, preguntas y respuestas están aisladas en ambas cuentas', async () => {
    for(const user of [A,B]) await as(user,async()=>{
      for(const table of ['evaluations','evaluation_questions','evaluation_responses']) {
        const {rows}=await db.query(`select user_id from ${table}`);
        assert.equal(rows.length,1);assert.equal(rows[0].user_id,user);
      }
      await denied('select * from evaluation_answer_keys',[],'42501');
    });
  });
  const foreignQuestion=(await db.query("insert into evaluation_questions(user_id,evaluation_id,position,prompt,question_type) select $1,evaluation_id,1,'Otra pregunta','short_answer' from evaluation_questions where id=$2 returning id",[B,questions[B]])).rows[0].id;
  await check('Respuestas ajenas no se pueden editar ni enlazar; nota no se puede falsificar',()=>as(A,async()=>{
    assert.equal((await db.query("update evaluation_responses set answer='Intrusión' where question_id=$1 returning id",[questions[B]])).rows.length,0);
    await denied('update evaluation_responses set question_id=$1 where question_id=$2',[foreignQuestion,questions[A]],'23503');
    await denied("update evaluations set status='completed',score=20,completed_at=now()",[],'42501');
  }));
  await check('RPC privilegiadas tienen search_path fijo y ejecución limitada', async () => {
    const {rows}=await db.query("select proname,prosecdef,proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('create_study_plan','replace_activity_schedules','transition_study_plan','transition_pomodoro_session')");
    assert.equal(rows.length,4);
    for(const row of rows){assert.equal(row.prosecdef,true);assert.ok(row.proconfig.includes('search_path=""'));}
  });
  console.log(`${count} pruebas RLS/SQL aprobadas en PostgreSQL local.`);
} finally { await db.close(); }
