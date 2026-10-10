// Compila los módulos TypeScript con el compilador que ya usa el proyecto.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const assert = require('node:assert/strict');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(root, 'src', request.slice(2));
  return resolve.call(this, request, parent, ...rest);
};
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  module._compile(code, filename);
};
const { generatePomodoroPlan } = require('../src/features/planner/lib/pomodoro-planner.ts');
const { applyDemoTransition } = require('../src/features/demo/session-transition.ts');
const { elapsedSessionSeconds } = require('../src/features/pomodoro/lib/session-clock.ts');
const { activitySchema } = require('../src/features/activities/schemas/activity-schema.ts');
const { weeklyScheduleSchema } = require('../src/features/schedule/schemas/weekly-schedule-schema.ts');
const { getEvaluationLevel } = require('../src/features/evaluations/lib/evaluation-scale.ts');
const activity = { id: '10000000-0000-4000-8000-000000000001', title: 'Integración', category: 'academic', activityDate: '2026-10-14', startTime: '18:00', endTime: '19:30', priority: 'high', createdAt: '2026-10-10T12:00:00Z' };
const schedule = { id: '20000000-0000-4000-8000-000000000001', activityId: activity.id, dayOfWeek: 0, allocatedMinutes: 60, startTime: '18:00', alertBeforeStartMinutes: null, alertOnEnd: false };
const instant = new Date('2026-10-10T12:00:00Z');
function state() {
  const generated = generatePomodoroPlan({ activities: [activity], schedules: [schedule], now: instant });
  return { activities: [activity], schedules: [schedule], files: [], plan: { id: crypto.randomUUID(), name: generated.name, status: 'confirmed', confirmedAt: instant.toISOString(), createdAt: instant.toISOString() }, blocks: generated.blocks.map((block) => ({ ...block, id: crypto.randomUUID(), status: 'pending' })), sessions: [] };
}
function later(seconds) { return new Date(instant.getTime() + seconds * 1000); }

test('Actividades: rechaza horarios invertidos y conserva la categoría y prioridad', () => {
  assert.equal(activitySchema.safeParse(activity).success, true);
  assert.equal(activitySchema.safeParse({ ...activity, endTime: '17:00' }).success, false);
  assert.equal(activitySchema.safeParse({ ...activity, priority: 'urgent' }).success, false);
});
test('Cronograma: valida los siete días y exige una selección', () => {
  const days = Array.from({ length: 7 }, (_, dayOfWeek) => ({ ...schedule, dayOfWeek, enabled: dayOfWeek === 0 }));
  assert.equal(weeklyScheduleSchema.safeParse({ days }).success, true);
  assert.equal(weeklyScheduleSchema.safeParse({ days: days.map((day) => ({ ...day, enabled: false })) }).success, false);
});
test('Plan: conserva actividad y minutos de estudio, introduce descansos sin superposición', () => {
  const { blocks } = generatePomodoroPlan({ activities: [activity], schedules: [schedule], now: instant });
  assert.deepEqual(blocks.map((block) => block.blockType), ['study', 'break', 'study', 'break', 'study']);
  assert.equal(blocks.filter((block) => block.blockType === 'study').reduce((sum, block) => sum + block.plannedMinutes, 0), 60);
  for (let i = 0; i < blocks.length; i++) {
    assert.equal(blocks[i].activityId, activity.id);
    if (i) assert.ok(new Date(blocks[i].scheduledStart) >= new Date(blocks[i-1].scheduledEnd));
  }
});
test('Plan: impide generar bloques a partir de actividades inexistentes', () => {
  assert.throws(() => generatePomodoroPlan({ activities: [], schedules: [schedule], now: instant }), /no disponible/);
});
test('Sesión: pausa, recarga y reanuda sin contar el tiempo pausado', () => {
  let data = state(); const blockId = data.blocks[0].id;
  applyDemoTransition(data, blockId, 'start', instant);
  applyDemoTransition(data, blockId, 'pause', later(10));
  data = JSON.parse(JSON.stringify(data));
  assert.equal(elapsedSessionSeconds(data.sessions[0], later(100).getTime()), 10);
  applyDemoTransition(data, blockId, 'resume', later(100));
  const completed = applyDemoTransition(data, blockId, 'complete', later(105));
  assert.equal(completed.elapsedSeconds, 15);
  assert.equal(data.blocks[0].status, 'completed');
});
test('Sesión: no inventa 25 minutos al completar inmediatamente ni duplica bloques', () => {
  const data = state(); const id = data.blocks[0].id;
  applyDemoTransition(data, id, 'start', instant);
  assert.equal(applyDemoTransition(data, id, 'complete', instant).elapsedSeconds, 0);
  assert.throws(() => applyDemoTransition(data, id, 'start', later(1)), /completado/);
});
test('Sesión: impide ejecutar sin confirmar y empezar dos sesiones simultáneas', () => {
  const data = state(); data.plan.status = 'draft';
  assert.throws(() => applyDemoTransition(data, data.blocks[0].id, 'start', instant), /Confirma/);
  data.plan.status = 'confirmed';
  applyDemoTransition(data, data.blocks[0].id, 'start', instant);
  assert.throws(() => applyDemoTransition(data, data.blocks[1].id, 'start', instant), /sesión actual/);
});
test('Sesión: cancelar permite reiniciar, terminar estudio y descansos completa el plan', () => {
  const data = state(); const id = data.blocks[0].id;
  applyDemoTransition(data, id, 'start', instant);
  applyDemoTransition(data, id, 'cancel', later(5));
  for (const block of data.blocks) {
    applyDemoTransition(data, block.id, 'start', later(10));
    applyDemoTransition(data, block.id, 'complete', later(10 + block.plannedMinutes * 60));
  }
  assert.equal(data.plan.status, 'completed');
  assert.equal(data.sessions.filter((session) => session.status === 'completed' && session.sessionType === 'focus').length, 3);
});
test('Escala: clasifica los límites 11/12 y 15/16 sin simular evaluaciones', () => {
  assert.equal(getEvaluationLevel(11), 'needs_reinforcement');
  assert.equal(getEvaluationLevel(12), 'satisfactory');
  assert.equal(getEvaluationLevel(15), 'satisfactory');
  assert.equal(getEvaluationLevel(16), 'outstanding');
});
