// Requiere una compilación previa. No necesita credenciales reales.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {tmpdir}=require('node:os');
const {createHash}=require('node:crypto');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.E2E_PLAYWRIGHT_MODULE || 'playwright');
const root=path.resolve(__dirname,'..');
const basePort=Number(process.env.SECURITY_E2E_PORT || 3110);
const cookieName='mobile-heart-demo-session';
let browser;const servers=[];const logs=[];let count=0;
async function wait(check,description,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){if(await check())return;await new Promise(r=>setTimeout(r,100));}throw new Error(description);}
function pass(name){console.log(`PASS ${++count}: ${name}`);}
async function start(port,allow){
  let output='';
  const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-H','127.0.0.1','-p',String(port)],{
    cwd:root,env:{...process.env,DEMO_MODE:'true',NEXT_PUBLIC_DEMO_MODE:'true',ALLOW_DEMO_IN_PRODUCTION:allow?'true':'false'},stdio:['ignore','pipe','pipe'],
  });servers.push(child);child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
  logs.push(()=>output);await wait(()=>output.includes('Ready'),'Inicio del servidor');return `http://127.0.0.1:${port}`;
}
async function login(page,base){await page.goto(`${base}/login`);await page.waitForLoadState('networkidle');await page.getByLabel('Correo electrónico').fill('demo@mobileheart.local');await page.getByLabel('Contraseña',{exact:true}).fill('Demo1234!');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();try{await page.waitForURL('**/activities');}catch(error){console.error('Inicio de sesión fallido:',await page.locator('body').innerText());throw error;}}
async function protectedRoutes(context,base){
  for(const route of ['activities','schedule','plan','progress']) {
    // APIRequestContext no envía cookies Secure por HTTP, aunque Chromium sí permite localhost.
    const cookie=(await context.cookies(base)).map(item=>`${item.name}=${item.value}`).join('; ');
    const response=await context.request.get(`${base}/${route}`,{maxRedirects:0,headers:{cookie}});
    assert.equal(response.status(),307);assert.ok(response.headers().location.includes('/login'));
  }
}
async function upload(page,base,name){
  await page.goto(`${base}/schedule`);await page.locator('#activity-file').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from('Prueba privada')});
  await page.getByRole('button',{name:'Subir archivo',exact:true}).click();await wait(async()=> (await page.locator('body').innerText()).includes('Archivo guardado en la demostración local.'),'Carga del archivo');
}
function sessionPath(id){return path.join(tmpdir(),`mobile-heart-demo-${createHash('sha256').update(root).digest('hex').slice(0,16)}`,id);}
(async()=>{
  const base=await start(basePort,true);
  browser=await chromium.launch({headless:true,...(process.env.E2E_CHROMIUM_EXECUTABLE?{executablePath:process.env.E2E_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-zygote']}: {})});
  const forged=await browser.newContext();await forged.addCookies([{name:cookieName,value:crypto.randomUUID(),url:base}]);await protectedRoutes(forged,base);pass('UUID inventado rechazado en las cuatro rutas privadas');
  const ca=await browser.newContext(),cb=await browser.newContext();const a=await ca.newPage(),b=await cb.newPage();await login(a,base);await login(b,base);
  const tokenA=(await ca.cookies()).find(c=>c.name===cookieName),tokenB=(await cb.cookies()).find(c=>c.name===cookieName);assert.notEqual(tokenA.value,tokenB.value);assert.equal(tokenA.httpOnly,true);pass('Dos inicios válidos emiten cookies distintas y HttpOnly');
  const title=`Actividad privada A ${Date.now()}`;
  await a.getByLabel('Título de la actividad',{exact:true}).fill(title);await a.getByLabel('Fecha',{exact:true}).fill('2026-10-14');await a.getByLabel('Hora de inicio',{exact:true}).fill('18:00');await a.getByLabel('Hora de fin',{exact:true}).fill('19:00');await a.getByRole('button',{name:'Guardar actividad',exact:true}).click();await wait(async()=> (await a.locator('body').innerText()).includes('Actividad guardada en la demostración local.'),'Crear actividad');
  await b.reload();assert.equal((await b.locator('body').innerText()).includes(title),false);pass('La actividad de A no aparece en la cuenta B');
  await upload(a,base,'solo-A.txt');await upload(b,base,'solo-B.txt');await b.reload();await wait(async()=> (await b.locator('body').innerText()).includes('solo-B.txt'),'Archivo de B tras recarga');assert.equal((await b.locator('body').innerText()).includes('solo-A.txt'),false);await a.reload();await wait(async()=> (await a.locator('body').innerText()).includes('solo-A.txt'),'Archivo de A tras recarga');assert.equal((await a.locator('body').innerText()).includes('solo-B.txt'),false);pass('Los archivos permanecen aislados al recargar ambas cuentas');
  const fileA=JSON.parse(fs.readFileSync(path.join(sessionPath(tokenA.value),'state.json'),'utf8')).files[0].id;
  const fileB=JSON.parse(fs.readFileSync(path.join(sessionPath(tokenB.value),'state.json'),'utf8')).files[0].id;
  let deleteRequest;
  b.on('request',request=>{if(request.method()==='POST' && request.headers()['next-action'] && request.postData()?.includes(fileB)) deleteRequest=request;});
  await b.getByRole('button',{name:'Eliminar',exact:true}).click();await b.getByRole('button',{name:'Confirmar',exact:true}).click();await wait(()=>Boolean(deleteRequest),'Captura de Server Action');
  const response=await cb.request.post(`${base}/schedule`,{headers:{...Object.fromEntries(Object.entries(deleteRequest.headers()).filter(([name])=> !['cookie','host','content-length'].includes(name))),origin:base,cookie:`${cookieName}=${tokenB.value}`},data:deleteRequest.postData().replaceAll(fileB,fileA)});
  assert.equal(response.status(),200);const responseBody=await response.text();assert.ok(responseBody.includes('No se pudo eliminar el archivo'));await a.reload();await wait(async()=> (await a.locator('body').innerText()).includes('solo-A.txt'),'El archivo ajeno sigue disponible');assert.ok(JSON.parse(fs.readFileSync(path.join(sessionPath(tokenA.value),'state.json'),'utf8')).files.some(file=>file.id===fileA));pass('Una Server Action con ID de archivo ajeno rechaza el borrado');
  await a.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await a.waitForURL('**/login');await ca.addCookies([{...tokenA,url:undefined}]);await protectedRoutes(ca,base);pass('La cookie antigua queda revocada al cerrar sesión');
  fs.writeFileSync(path.join(sessionPath(tokenB.value),'session.json'),JSON.stringify({expiresAt:Date.now()-1}));await protectedRoutes(cb,base);pass('La caducidad del servidor bloquea las cuatro rutas privadas');
  const production=await start(basePort+1,false);const prod=await browser.newContext();await prod.addCookies([{name:cookieName,value:crypto.randomUUID(),url:production}]);await protectedRoutes(prod,production);const pp=await prod.newPage();await pp.goto(`${production}/login`);assert.equal((await pp.locator('body').innerText()).includes('demo@mobileheart.local'),false);pass('Producción desactiva demostración y credenciales públicas sin excepción explícita');
  console.log(`${count} pruebas de seguridad de navegador aprobadas.`);
})().catch(error=>{console.error(error);for(const log of logs)console.error(log().slice(-3000));process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();for(const server of servers)server.kill('SIGTERM');});
