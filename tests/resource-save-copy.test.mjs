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
const base = { ref, reactive, computed, watch, nextTick, onMounted() {}, onUnmounted() {}, ElMessage: { warning() {}, success() {}, error() {} }, useI18n: () => ({ t: (k) => k }) };
const plain = value => JSON.parse(JSON.stringify(value));

test('successful save updates the copy source to the submitted snapshot', async () => {
  let finish, body;
  const ctx = load('composables/useCiResource.ts', { ...base, useRoute: () => ({ params: { id: 'resource' } }), localStorage: { getItem: () => '' },
    $fetch: async (_, options) => { body = options.body; await new Promise(resolve => finish = resolve); return { data: { version: 2 } }; },
  }, 'globalThis.editor = useCiResourceEditor("subjects", "subjects");');
  ctx.editor.doc.value = { data: { name: 'old' }, version: 1 };
  const data = { name: 'saved' }; const saving = ctx.editor.save(data);
  data.name = 'unsaved edit while request pending'; finish(); await saving;
  assert.deepEqual(plain(ctx.editor.persistedData.value), { name: 'saved' });
  assert.deepEqual(plain(ctx.editor.doc.value.data), { name: 'old' });
  assert.deepEqual(plain(body.data), { name: 'saved' });
  assert.equal(ctx.editor.doc.value.version, 2);
});
test('failed save leaves the last persisted copy source intact', async () => {
  const ctx = load('composables/useCiResource.ts', { ...base, useRoute: () => ({ params: { id: 'resource' } }), localStorage: { getItem: () => '' }, $fetch: async () => { throw Error('offline'); } }, 'globalThis.editor = useCiResourceEditor("subjects", "subjects");');
  ctx.editor.doc.value = { data: { name: 'old' }, version: 1 };
  await assert.rejects(ctx.editor.save({ name: 'new' }), /offline/);
  assert.deepEqual(plain(ctx.editor.doc.value), { data: { name: 'old' }, version: 1 });
  assert.deepEqual(plain(ctx.editor.persistedData.value), { name: 'old' });
});

function fixture() {
  let finish, pendingSave, copyBody;
  const editor = load('composables/useCiResource.ts', { ...base,
    useRoute: () => ({ params: { id: 'resource' } }), localStorage: { getItem: () => '' },
    $fetch: async () => { await new Promise(resolve => finish = resolve); return { data: { version: 2 } }; },
  }, 'globalThis.editor = useCiResourceEditor("subjects", "subjects");').editor;
  const dirty = ref(false);
  const parent = load('components/ResourceEditor.vue', { ...base,
    defineProps: () => ({ collection: 'subjects', label: 'subjects' }),
    useCiResourceEditor: () => editor, useUnsavedGuard: () => ({ isDirty: dirty }),
    useRoute: () => ({ params: { id: 'resource' } }), localStorage: { getItem: () => '' },
    ElNotification: { success() {} }, navigateTo() {},
    $fetch: async (_, options) => { if (options?.method === 'POST') copyBody = plain(options.body); return { data: [] }; },
  }, 'globalThis.api = { doSave, doCopy, jsonText };').api;
  editor.doc.value = { name: 'Subjects', version: 1, data: { math: { Name: 'initial' } } };
  const child = load('components/SubjectsEditor.vue', { ...base,
    defineProps: () => ({ get modelValue() { return editor.doc.value.data; } }),
    defineEmits: () => (_, data) => { pendingSave = parent.doSave(data); },
    generateUUID: (() => { let n = 0; return () => `subject-${++n}`; })(),
  }, 'globalThis.api = { subjects, doSave };').api;
  return { editor, parent, child, dirty, complete: async () => { finish(); await pendingSave; await nextTick(); }, copy: () => copyBody };
}

test('real subject editor keeps B after saving A while copy uses A', async () => {
  const f = fixture(); await nextTick();
  f.child.subjects.value[0].name = 'A'; f.child.doSave();
  f.child.subjects.value[0].name = 'B';
  await f.complete();
  assert.equal(f.child.subjects.value[0].name, 'B');
  assert.equal(f.editor.persistedData.value.math.Name, 'A');
  await f.parent.doCopy();
  assert.equal(f.copy().data.math.Name, 'A');
  // The next explicit save persists B normally.
  f.child.doSave(); await f.complete(); await f.parent.doCopy();
  assert.equal(f.child.subjects.value[0].name, 'B');
  assert.equal(f.copy().data.math.Name, 'B');
});

test('JSON edits made during save remain dirty and copy excludes them', async () => {
  const f = fixture(); await nextTick();
  f.parent.jsonText.value = '{"name":"A"}'; await nextTick();
  const saving = f.parent.doSave();
  f.parent.jsonText.value = '{"name":"B"}'; await nextTick();
  await f.complete(); await saving;
  assert.equal(f.parent.jsonText.value, '{"name":"B"}');
  assert.equal(f.dirty.value, true);
  await f.parent.doCopy(); assert.deepEqual(f.copy().data, { name: 'A' });
});

test('explicit restore refreshes draft and copy source, even with an older save pending', async () => {
  const f = fixture(); await nextTick();
  f.child.subjects.value[0].name = 'A'; f.child.doSave();
  f.editor.doc.value = { name: 'Restored', version: 3, data: { math: { Name: 'restored' } } };
  await nextTick(); await f.complete();
  assert.equal(f.child.subjects.value[0].name, 'restored');
  assert.equal(f.editor.doc.value.version, 3);
  await f.parent.doCopy(); assert.equal(f.copy().data.math.Name, 'restored');
});
