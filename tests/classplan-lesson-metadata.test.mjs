// Node >= 22.13: node --test tests/*.test.mjs
// Execute production source; replace only framework hooks and external services.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
const root = process.env.AUDIT_SOURCE_ROOT || path.resolve(import.meta.dirname, '..');
function load(file, globals = {}, expose = '') {
  let source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.vue')) source = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
  source = source.replace(/^import\s[\s\S]*?;\s*$/gm, '').replace(/^export default .*;\s*$/gm, '').replace(/^export /gm, '');
  const ctx = vm.createContext({ console, ...globals });
  vm.runInContext(stripTypeScriptTypes(source) + '\n' + expose, ctx, { filename: file });
  return ctx;
}
const ref = value => ({ value });
const base = { ref, reactive: x => x, computed: f => ({ get value() { return f(); } }), onMounted() {}, onUnmounted() {}, watch() {}, ElMessage: { warning() {}, success() {}, error() {} }, useI18n: () => ({ t: (k) => k }) };
const plain = value => JSON.parse(JSON.stringify(value));

const original = { timelayoutId: 'tl', subjectsId: 'sj', classPlans: { cp: { TimeRule: { WeekDay: 1, WeekCountDiv: 0 }, Classes: [{ SubjectId: 'math', IsEnabled: true, IsChangedClass: true, AttachedObjects: { custom: { enabled: true } }, ExtraInfo: 'keep me' }] } } };
const resources = { '/api/v1/console/ci/timelayout/list': { data: [{ _id: 'tl', data: { axis: { Layouts: [{ TimeType: 0, StartTime: '08:00', EndTime: '08:45' }, { TimeType: 0, StartTime: '09:00', EndTime: '09:45' }] } } }] }, '/api/v1/console/ci/subjects/list': { data: [{ _id: 'sj', data: { math: { Name: 'Math' }, english: { Name: 'English' } } }] } };
function editor(model = structuredClone(original), fetcher = async url => resources[url]) {
  let emitted;
  const watches = [];
  const props = { modelValue: model };
  const ctx = load('components/ClassPlanEditor.vue', { ...base,
    watch: (get, fn) => watches.push({ get, fn, old: get() }),
    defineProps: () => props, defineEmits: () => (_, data) => emitted = data,
    generateUUID: () => 'generated', localStorage: { getItem: () => 'test-token' }, $fetch: fetcher,
  }, 'globalThis.api = { fetchResources, doSave, setCell, setEnabled, pickedSubject, getCellSubject, timePoints, subjectPool, activeDays };');
  return { ...ctx.api, props, output: () => plain(emitted), replaceModel(value) { props.modelValue = value; for (const w of watches) { if (w.get() !== w.old) { w.old = w.get(); w.fn(); } } } };
}

test('editing a subject preserves existing lesson attachments and unknown fields', async () => {
  const e = editor(); await e.fetchResources();
  e.pickedSubject.value = 'English'; e.setCell('Monday', 0); e.doSave();
  const lesson = e.output().classPlans.cp.Classes[0];
  assert.equal(lesson.SubjectId, 'english');
  assert.deepEqual(lesson.AttachedObjects, original.classPlans.cp.Classes[0].AttachedObjects);
  assert.equal(lesson.IsChangedClass, true);
  assert.equal(lesson.ExtraInfo, 'keep me');
  assert.equal(original.classPlans.cp.Classes[0].SubjectId, 'math');
  assert.deepEqual(e.output().classPlans.cp.Classes[1], { SubjectId: '00000000-0000-0000-0000-000000000000', IsChangedClass: false, IsEnabled: false, AttachedObjects: {}, IsActive: false });
});
