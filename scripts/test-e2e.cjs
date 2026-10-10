// Requiere npm run build previo; habilita demostración solo en su servidor local.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.E2E_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const port = process.env.E2E_PORT || '3100';
const base = `http://127.0.0.1:${port}`;
let server, browser;
const errors = [];
async function waitFor(check, description, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Tiempo agotado: ${description}`);
}
async function contains(page, text) {
  await waitFor(async () => (await page.locator('body').innerText()).includes(text), text);
}
async function choose(page, label, text) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: text, exact: true }).click();
}
(async () => {
  let output = '';
  server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', port], {
    cwd: root, env: { ...process.env, DEMO_MODE: 'true', NEXT_PUBLIC_DEMO_MODE: 'true', ALLOW_DEMO_IN_PRODUCTION: 'true' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (data) => { output += data.toString(); });
  server.stderr.on('data', (data) => { output += data.toString(); });
  await waitFor(async () => output.includes('Ready'), 'inicio del servidor', 20000);
  browser = await chromium.launch({ headless: true, ...(process.env.E2E_CHROMIUM_EXECUTABLE ? {
    executablePath: process.env.E2E_CHROMIUM_EXECUTABLE,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-zygote'],
  } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  await page.goto(`${base}/activities`);
  await page.waitForURL('**/login');
  await page.getByLabel('Correo electrónico').fill('demo@mobileheart.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.waitForURL('**/activities');
  console.log('PASS 1: inicio de sesión y acceso privado');

  const title = `Actividad de integración ${Date.now()}`;
  await page.getByLabel('Título de la actividad', { exact: true }).fill(title);
  await page.getByLabel('Fecha', { exact: true }).fill('2026-10-14');
  await page.getByLabel('Hora de inicio', { exact: true }).fill('18:00');
  await page.getByLabel('Hora de fin', { exact: true }).fill('19:00');
  await choose(page, 'Prioridad', 'Alta');
  await page.getByRole('button', { name: 'Guardar actividad', exact: true }).click();
  await contains(page, 'Actividad guardada en la demostración local.');
  await page.reload();
  await contains(page, title);
  console.log('PASS 2: actividad creada y conservada al recargar');

  await page.getByRole('link', { name: 'Cronograma', exact: true }).click();
  await page.waitForURL('**/schedule');
  for (let i = 1; i < 7; i++) await page.locator(`#schedule-${i}-enabled`).uncheck();
  await page.locator('#schedule-0-enabled').check();
  await page.locator('#schedule-0-activity').click();
  await page.getByRole('option', { name: 'Bailar', exact: true }).click();
  await page.locator('#schedule-0-start').fill('19:00');
  await page.locator('#schedule-0-minutes').fill('1');
  await page.getByRole('button', { name: 'Guardar cronograma', exact: true }).click();
  await contains(page, 'Cronograma guardado en la demostración local.');
  console.log('PASS 3: días y tiempo guardados con la nueva actividad');

  const lunes = page.locator('fieldset').filter({ hasText: 'Lunes' });
  await lunes.getByRole('button', { name: 'Subir documento', exact: true }).waitFor();
  await lunes.locator('input[type="file"]').setInputFiles({ name: 'material-integracion.txt', mimeType: 'text/plain', buffer: Buffer.alloc(2 * 1024 * 1024, 65) });
  await contains(page, 'Archivo guardado en la demostración local.');
  await page.reload();
  await contains(page, 'material-integracion.txt');
  console.log('PASS 4: archivo opcional de 2 MB conservado al recargar');

  await page.getByRole('button', { name: 'Diseñar plan', exact: true }).click();
  await page.waitForURL('**/plan');
  await contains(page, 'Bailar');
  await page.getByRole('button', { name: 'Confirmar plan', exact: true }).click();
  await contains(page, 'Plan confirmado');
  console.log('PASS 5-6: plan generado desde el cronograma y confirmado');

  await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
  await contains(page, 'Sesión en curso');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await contains(page, 'Sesión pausada');
  await page.reload();
  await contains(page, 'Sesión pausada');
  await page.getByRole('button', { name: 'Reanudar', exact: true }).click();
  await contains(page, 'Sesión en curso');
  await page.getByRole('button', { name: 'Completar ahora', exact: true }).click();
  await contains(page, 'Bloque completado');
  console.log('PASS 7: sesión iniciada, pausada, recuperada, reanudada y completada');

  await page.getByRole('link', { name: 'Consultar progreso', exact: true }).click();
  await page.waitForURL('**/progress');
  await contains(page, 'Bailar');
  await contains(page, 'Cumplida');
  await contains(page, '100%');
  await page.reload();
  await contains(page, 'Cumplida');
  assert.equal(await page.locator('section[aria-label="Resumen de progreso"]').evaluate((element) => getComputedStyle(element).display), 'grid');
  console.log('PASS 8: progreso calculado desde la sesión y estilos de producción aplicados');

  // Segunda ejecución sin archivo y finalización automática real, con tiempo de servidor.
  await page.getByRole('link', { name: 'Cronograma', exact: true }).click();
  await page.getByRole('button', { name: 'Eliminar material-integracion.txt', exact: true }).click();
  await contains(page, 'Archivo eliminado de la demostración local.');
  await page.getByRole('button', { name: 'Diseñar plan', exact: true }).click();
  await page.waitForURL('**/plan');
  await page.getByRole('button', { name: 'Confirmar plan', exact: true }).click();
  await contains(page, 'Plan confirmado');
  await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
  await contains(page, 'Sesión en curso');
  await waitFor(async () => (await page.locator('body').innerText()).includes('Bloque completado'), 'finalización automática', 75000);
  await page.getByRole('link', { name: 'Consultar progreso', exact: true }).click();
  await contains(page, 'Cumplida');
  await contains(page, '1 min');
  console.log('PASS adicional: finalización automática registra un minuto real y actualiza progreso');

  if (process.env.E2E_SCREENSHOT_DIR) {
    fs.mkdirSync(process.env.E2E_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(process.env.E2E_SCREENSHOT_DIR, 'progress-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(process.env.E2E_SCREENSHOT_DIR, 'progress-mobile.png'), fullPage: true });
  }
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await page.waitForURL('**/login');
  await page.goto(`${base}/progress`);
  await page.waitForURL('**/login');
  assert.deepEqual(errors, []);
  console.log('PASS adicional: cierre de sesión y cero errores de JavaScript');
  console.log('E2E COMPLETO: 8 pasos y comprobaciones adicionales aprobados en modo demostración.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await browser?.close();
  server?.kill();
});
