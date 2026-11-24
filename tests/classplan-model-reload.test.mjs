// Node >= 22.13: node --test tests/*.test.mjs
// Execute production source; replace only framework hooks and external services.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ref, reactive, computed, watch, nextTick } from 'vue';
const root = process.env.AUDIT_SOURCE_ROOT || path.resolve(import.meta.dirname, '..');
function load(file, globals = {}, expose = '') {
  let source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.vue')) source = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
  source = source.replace(/^import\s[\s\S]*?;\s*$/gm, '').replace(/^export default .*;\s*$/gm, '').replace(/^export /gm, '');
  const ctx = vm.createContext({ console, ...globals });
  vm.runInContext(stripTypeScriptTypes(source) + '\n' + expose, ctx, { filename: file });
  return ctx;
}
const base = { ref, reactive, computed, watch, onMounted() {}, onUnmounted() {}, ElMessage: { warning() {}, success() {}, error() {} }, useI18n: () => ({ t: (k) => k }) };
const plain = value => JSON.parse(JSON.stringify(value));

const original = { timelayoutId: 'tl', subjectsId: 'sj', classPlans: { cp: { TimeRule: { WeekDay: 1, WeekCountDiv: 0 }, Classes: [{ SubjectId: 'math', IsEnabled: true, IsChangedClass: true, AttachedObjects: { custom: { enabled: true } }, ExtraInfo: 'keep me' }] } } };
const resources = { '/api/v1/console/ci/timelayout/list': { data: [{ _id: 'tl', data: { axis: { Layouts: [{ TimeType: 0, StartTime: '08:00', EndTime: '08:45' }, { TimeType: 0, StartTime: '09:00', EndTime: '09:45' }] } } }] }, '/api/v1/console/ci/subjects/list': { data: [{ _id: 'sj', data: { math: { Name: 'Math' }, english: { Name: 'English' } } }] } };
function editor(model = structuredClone(original), fetcher = async url => resources[url]) {
  let emitted;
  const props = reactive({ modelValue: model });
  const ctx = load('components/ClassPlanEditor.vue', { ...base,
    defineProps: () => props, defineEmits: () => (_, data) => emitted = data,
    generateUUID: () => 'generated', localStorage: { getItem: () => 'test-token' }, $fetch: fetcher,
  }, 'globalThis.api = { fetchResources, doSave, setCell, setEnabled, pickedSubject, getCellSubject, timePoints, subjectPool, activeDays };');
  return { ...ctx.api, props, output: () => plain(emitted), async replaceModel(value) { props.modelValue = value; await nextTick(); } };
}

test('restoring a model replaces the grid and clears obsolete rows and references', async () => {
  const e = editor(); await e.fetchResources();
  const restored = structuredClone(original);
  restored.classPlans.cp.Classes[0].SubjectId = 'english';
  restored.classPlans.cp.TimeRule.WeekDay = 2;
  await e.replaceModel(restored); e.doSave();
  assert.equal(e.output().classPlans.cp.Classes[0].SubjectId, 'english');
  assert.deepEqual(plain(e.activeDays.value), ['Tuesday']);
  assert.equal(e.getCellSubject('Monday', 0), null);
  await e.replaceModel({ classPlans: {} });
  assert.equal(e.timePoints.value.length, 0);
  assert.equal(e.subjectPool.value.length, 0);
  assert.equal(e.activeDays.value.length, 0);
});
test('a restore during resource loading wins over the initial model', async () => {
  const pending = [];
  const e = editor(undefined, url => new Promise(resolve => pending.push(() => resolve(resources[url]))));
  const loading = e.fetchResources();
  const restored = structuredClone(original); restored.classPlans.cp.Classes[0].SubjectId = 'english';
  await e.replaceModel(restored); pending.forEach(resolve => resolve()); await loading; e.doSave();
  assert.equal(e.output().classPlans.cp.Classes[0].SubjectId, 'english');
});
