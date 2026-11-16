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

test('cancel keeps both route and browser unload protection until saved', async () => {
  let guard, unload, prompts = 0, confirm = false;
  const ctx = load('composables/useUnsavedGuard.ts', { ...base,
    onBeforeRouteLeave: fn => guard = fn,
    onMounted: fn => fn(),
    window: { addEventListener: (_, fn) => unload = fn },
    ElMessageBox: { confirm: async () => { prompts++; if (!confirm) throw Error('cancel'); } },
  }, 'globalThis.state = useUnsavedGuard();');
  ctx.state.isDirty.value = true;
  assert.equal(await guard(), false);
  assert.equal(ctx.state.isDirty.value, true);
  assert.equal(await guard(), false);
  let prevented = false;
  unload({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(prompts, 2);
  confirm = true;
  assert.equal(await guard(), true);
  // Another navigation guard can still cancel; keep dirty until save/unmount.
  assert.equal(ctx.state.isDirty.value, true);
  ctx.state.isDirty.value = false;
  assert.equal(await guard(), true);
  assert.equal(prompts, 3);
});
