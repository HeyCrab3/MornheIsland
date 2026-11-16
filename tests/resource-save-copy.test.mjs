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
const base = { ref, reactive: x => x, computed: f => ({ get value() { return f(); } }), onMounted() {}, onUnmounted() {}, watch() {}, ElMessage: { warning() {}, success() {}, error() {} } };
const plain = value => JSON.parse(JSON.stringify(value));

test('successful save updates the copy source to the submitted snapshot', async () => {
  let finish, body;
  const ctx = load('composables/useCiResource.ts', { ...base, useRoute: () => ({ params: { id: 'resource' } }), localStorage: { getItem: () => '' },
    $fetch: async (_, options) => { body = options.body; await new Promise(resolve => finish = resolve); return { data: { version: 2 } }; },
  }, 'globalThis.editor = useCiResourceEditor("subjects", "subjects");');
  ctx.editor.doc.value = { data: { name: 'old' }, version: 1 };
  const data = { name: 'saved' }; const saving = ctx.editor.save(data);
  data.name = 'unsaved edit while request pending'; finish(); await saving;
  assert.deepEqual(plain(ctx.editor.doc.value.data), { name: 'saved' });
  assert.deepEqual(plain(body.data), { name: 'saved' });
  assert.equal(ctx.editor.doc.value.version, 2);
});
test('failed save leaves the last persisted copy source intact', async () => {
  const ctx = load('composables/useCiResource.ts', { ...base, useRoute: () => ({ params: { id: 'resource' } }), localStorage: { getItem: () => '' }, $fetch: async () => { throw Error('offline'); } }, 'globalThis.editor = useCiResourceEditor("subjects", "subjects");');
  ctx.editor.doc.value = { data: { name: 'old' }, version: 1 };
  await assert.rejects(ctx.editor.save({ name: 'new' }), /offline/);
  assert.deepEqual(plain(ctx.editor.doc.value), { data: { name: 'old' }, version: 1 });
});
