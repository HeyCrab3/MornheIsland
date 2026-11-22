<template>
  <div>
    <div class="mb-5">
      <h1 class="text-2xl font-semibold mb-1">{{ $t('pages.backup.extra.pageTitle') }}</h1>
      <p class="text-sm text-gray-500">
        {{ $t('pages.backup.extra.pageDesc') }}
      </p>
    </div>

    <!-- 导出 -->
    <el-card shadow="hover" class="mb-4">
      <template #header><span class="font-medium">{{ $t('pages.backup.extra.exportCard') }}</span></template>

      <div class="space-y-4">
        <div class="flex items-start gap-3 flex-wrap">
          <el-button type="primary" :loading="exporting === 'full'" @click="exportFull">
            <el-icon class="mr-1"><Download /></el-icon>{{ $t('pages.backup.extra.exportAll') }}
          </el-button>
          <div class="text-xs text-gray-500 leading-relaxed max-w-2xl">
            {{ $t('pages.backup.extra.exportFullHint1') }}<b>{{ $t('pages.backup.extra.exportFullHintBold') }}</b>{{ $t('pages.backup.extra.exportFullHint2') }}
          </div>
        </div>

        <el-divider class="!my-2" />

        <div class="flex items-start gap-3 flex-wrap">
          <el-select
            v-model="classId"
            :placeholder="$t('pages.backup.selectClassesToExport')"
            class="w-64"
            filterable
            :loading="classesLoading"
          >
            <el-option
              v-for="c in classes"
              :key="c._id"
              :label="`${c.name || c.identity}（${c.identity || $t('pages.backup.extra.unnamedIdentity')}）`"
              :value="c._id"
            />
          </el-select>
          <el-button :disabled="!classId" :loading="exporting === 'class'" @click="exportClass">
            <el-icon class="mr-1"><Download /></el-icon>{{ $t('pages.backup.extra.exportClass') }}
          </el-button>
          <div class="text-xs text-gray-500 leading-relaxed max-w-xl">
            {{ $t('pages.backup.extra.exportClassHint') }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 导入 -->
    <el-card shadow="hover">
      <template #header><span class="font-medium">{{ $t('pages.backup.extra.importCard') }}</span></template>

      <div class="space-y-4">
        <div class="flex items-center gap-2 flex-wrap">
          <el-button @click="fileInput?.click()">
            <el-icon class="mr-1"><Upload /></el-icon>{{ $t('pages.backup.extra.chooseBackupFile') }}
          </el-button>
          <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onFileChange" />
          <span v-if="fileName" class="text-xs text-gray-500 font-mono truncate max-w-md">{{ fileName }}</span>
          <el-button v-if="parsed" text type="danger" @click="clearFile">{{ $t('components.resourceeditor.delete') }}</el-button>
        </div>

        <el-alert v-if="parseError" type="error" :closable="false" show-icon :title="parseError" />

        <template v-if="parsed">
          <div class="bg-gray-50 dark:bg-neutral-800 rounded p-3 text-xs space-y-1">
            <div class="flex justify-between gap-2">
              <span class="text-gray-500">{{ $t('pages.backup.extra.format') }}</span>
              <span class="font-mono">{{ parsed.format }} v{{ parsed.version }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-gray-500">{{ $t('pages.backup.extra.exportedAt') }}</span>
              <span>{{ formatTime(parsed.exportedAt) }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-gray-500">{{ $t('pages.backup.extra.scope') }}</span>
              <span>{{ scopeText }}</span>
            </div>
            <div class="flex justify-between gap-2 items-start">
              <span class="text-gray-500 shrink-0">{{ $t('pages.backup.extra.contains') }}</span>
              <span class="text-right">{{ countsText }}</span>
            </div>
          </div>

          <div>
            <div class="text-sm mb-2">{{ $t('pages.backup.extra.importMode') }}</div>
            <el-radio-group v-model="importMode">
              <el-radio value="new">{{ $t('pages.backup.extra.importModeNew') }}</el-radio>
              <el-radio value="overwrite">{{ $t('pages.backup.extra.importModeOverwrite') }}</el-radio>
            </el-radio-group>
            <div class="text-xs text-gray-500 mt-2 leading-relaxed">
              <template v-if="importMode === 'new'">
                <b>{{ $t('pages.backup.extra.importModeNewHintBold') }}</b>{{ $t('pages.backup.extra.importModeNewHint') }}
              </template>
              <template v-else>
                {{ $t('pages.backup.extra.importModeOverwriteHint1') }}<b>{{ $t('pages.backup.extra.importModeOverwriteHintBold') }}</b>{{ $t('pages.backup.extra.importModeOverwriteHint2') }}
              </template>
            </div>
          </div>

          <el-alert
            v-if="importMode === 'overwrite'"
            type="warning"
            :closable="false"
            show-icon
            :title="$t('pages.backup.overwriteModeWarning')"
            :description="$t('pages.backup.overwriteModeDetail')"
          />

          <div class="flex items-center gap-2">
            <el-button type="primary" :loading="importing" @click="doImport">
              <el-icon class="mr-1"><Upload /></el-icon>{{ $t('pages.backup.extra.startImport') }}
            </el-button>
            <span class="text-xs text-gray-400">{{ $t('pages.backup.extra.importNoDeleteHint') }}</span>
          </div>
        </template>

        <el-empty v-else-if="!parseError" :image-size="80" :description="$t('pages.backup.selectBackupToPreview')" />
      </div>
    </el-card>

    <!-- 导入结果 -->
    <ResponsiveDrawer v-model:open="resultVisible" :title="$t('pages.backup.importResult')">
      <div v-if="result" class="py-2 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div class="report-stat">
            <div class="report-stat-num">{{ result.totals?.created ?? 0 }}</div>
            <div class="report-stat-label">{{ $t('pages.backup.extra.statCreated') }}</div>
          </div>
          <div class="report-stat">
            <div class="report-stat-num">{{ result.totals?.updated ?? 0 }}</div>
            <div class="report-stat-label">{{ $t('pages.backup.extra.statUpdated') }}</div>
          </div>
        </div>

        <div class="text-xs space-y-1">
          <div v-for="(n, k) in nonZero(result.created)" :key="`c-${k}`" class="flex justify-between gap-2">
            <span class="text-gray-500">{{ labelOf(k as string) || k }}</span>
            <span>{{ $t('pages.backup.extra.statCreated') }} {{ n }}</span>
          </div>
          <div v-for="(n, k) in nonZero(result.updated)" :key="`u-${k}`" class="flex justify-between gap-2">
            <span class="text-gray-500">{{ labelOf(k as string) || k }}</span>
            <span>{{ $t('pages.backup.extra.statUpdated') }} {{ n }}</span>
          </div>
        </div>

        <el-alert
          v-if="result.skipped?.length"
          type="warning"
          :closable="false"
          show-icon
          :title="$t('pages.backup.extra.skippedNewIds', { count: result.skipped.length })"
        >
          <div v-for="(s, i) in result.skipped" :key="i" class="text-xs">
            {{ s.name }}：{{ s.reason }}
          </div>
        </el-alert>

        <div class="text-xs text-gray-400">
          {{ $t('pages.backup.extra.resultFootnote') }}
        </div>
      </div>
      <template #footer>
        <el-button @click="resultVisible = false">{{ $t('pages.backup.extra.close') }}</el-button>
        <el-button type="primary" @click="reloadAll">{{ $t('pages.backup.extra.refreshData') }}</el-button>
      </template>
    </ResponsiveDrawer>
  </div>
</template>

<script setup lang="ts">
import { Download, Upload } from "@element-plus/icons-vue";
import ResponsiveDrawer from "@/components/ui/ResponsiveDrawer.vue";

definePageMeta({ title: "配置备份", protected: true });

const { t } = useI18n();

// 存 i18n key，使用时再 t()，保证 no_prefix 切换语言后标签会更新
const LABELS: Record<string, string> = {
  classes: 'dashboard.cards.classes',
  classplans: 'composables.useciresource.plan',
  timelayouts: 'components.home.quickstartupguide.timeLayout',
  subjects: 'components.home.quickstartupguide.subjects',
  settings: 'composables.useciresource.settings',
  policies: 'composables.useciresource.policy',
  plugins: 'pages.backup.plugins',
  pluginProfiles: 'pages.backup.pluginConfigGroups',
};

function labelOf(k: string) {
  const key = LABELS[k];
  return key ? t(key) : "";
}

function auth() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function downloadJson(obj: any, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatTime(t: string): string {
  if (!t) return "-";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

// ── 导出 ──
const exporting = ref<"" | "full" | "class">("");
const classes = ref<any[]>([]);
const classesLoading = ref(false);
const classId = ref("");

async function fetchClasses() {
  classesLoading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/class/list", { headers: auth() });
    classes.value = res.data || [];
  } catch {
    /* 静默 */
  } finally {
    classesLoading.value = false;
  }
}

async function exportFull() {
  exporting.value = "full";
  try {
    const res: any = await $fetch("/api/v1/console/ci/backup/export", { headers: auth() });
    downloadJson(res.data, `mornheisland-backup-full-${stamp()}.json`);
    ElMessage.success(t('pages.backup.downloadStarted'));
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.backup.exportFailed'));
  } finally {
    exporting.value = "";
  }
}

async function exportClass() {
  if (!classId.value) return;
  exporting.value = "class";
  try {
    const res: any = await $fetch(`/api/v1/console/ci/backup/export/class/${classId.value}`, {
      headers: auth(),
    });
    const name = res.data?.scope?.className || res.data?.scope?.identity || classId.value;
    downloadJson(res.data, `mornheisland-backup-${name}-${stamp()}.json`);
    ElMessage.success(t('pages.backup.downloadStarted'));
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.backup.exportFailed'));
  } finally {
    exporting.value = "";
  }
}

// ── 导入 ──
const fileInput = ref<HTMLInputElement | null>(null);
const fileName = ref("");
const parsed = ref<any>(null);
const parseError = ref("");
const importMode = ref<"new" | "overwrite">("new");
const importing = ref(false);
const resultVisible = ref(false);
const result = ref<any>(null);

const scopeText = computed(() => {
  const s = parsed.value?.scope;
  if (!s) return t('pages.backup.unlabeled');
  if (s.type === "full") return t('pages.backup.full');
  if (s.type === "class") return t('pages.backup.extra.classScope', { name: s.className || s.identity || s.classId });
  return s.type;
});

const countsText = computed(() => {
  const c = parsed.value?.counts || {};
  const parts = Object.entries(c)
    .filter(([, n]) => Number(n) > 0)
    .map(([k, n]) => `${labelOf(k) || k} ${n}`);
  return parts.length ? parts.join(" · ") : t('pages.backup.emptyBackup');
});

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  fileName.value = file.name;
  parseError.value = "";
  parsed.value = null;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(String(reader.result || ""));
      if (obj?.format !== "mornheisland-backup") {
        parseError.value = t('pages.backup.extra.invalidBackupFormat', { format: obj?.format ?? t('pages.backup.extra.missingFormat') });
        return;
      }
      if (Number(obj.version) > 1) {
        parseError.value = t('pages.backup.extra.versionTooNew', { version: obj.version });
        return;
      }
      parsed.value = obj;
    } catch (err: any) {
      parseError.value = t('pages.backup.cannotParseFile') + (err?.message || err);
    } finally {
      input.value = "";
    }
  };
  reader.readAsText(file);
}

function clearFile() {
  parsed.value = null;
  fileName.value = "";
  parseError.value = "";
}

function nonZero(obj: Record<string, number> | undefined) {
  if (!obj) return {};
  return Object.fromEntries(Object.entries(obj).filter(([, n]) => Number(n) > 0));
}

async function doImport() {
  if (!parsed.value) return;
  if (importMode.value === "overwrite") {
    try {
      await ElMessageBox.confirm(
        t('pages.backup.confirmOverwriteWarning'),
        t('pages.backup.confirmOverwriteImport'),
        { type: "warning", confirmButtonText: t('pages.backup.confirmImport'), cancelButtonText: t('reauth.cancel') },
      );
    } catch {
      return;
    }
  }

  importing.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/backup/import?mode=${importMode.value}`, {
      method: "POST",
      headers: auth(),
      body: { backup: parsed.value },
    });
    result.value = res.data;
    resultVisible.value = true;
    ElMessage.success(t('pages.backup.extra.importCompleted', { created: res.data?.totals?.created ?? 0, updated: res.data?.totals?.updated ?? 0 }));
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.backup.importFailed'));
  } finally {
    importing.value = false;
  }
}

function reloadAll() {
  resultVisible.value = false;
  ElMessage.info(t('pages.backup.switchPageToView'));
}

onMounted(fetchClasses);
</script>

<style scoped>
.report-stat {
  text-align: center;
  padding: 10px 6px;
  border-radius: var(--mi-radius-md, 10px);
  background: var(--mi-brand-light);
}
.report-stat-num {
  font-size: 20px;
  font-weight: 600;
  color: var(--mi-brand-deep);
  line-height: 1.2;
}
.report-stat-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>
