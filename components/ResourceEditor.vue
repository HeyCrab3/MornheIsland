<template>
  <div v-loading="loading">
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3 min-w-0">
        <el-button circle text @click="navigateTo(`/${collection}`)">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-semibold truncate">{{ doc?.name || $t('components.resourceeditor.extra.editLabel', { label }) }}</h1>
            <el-tag v-if="doc" size="small" effect="plain" round>v{{ doc.version }}</el-tag>
          </div>
          <div class="text-xs text-gray-400 mt-0.5" v-if="doc">
            {{ $t('components.resourceeditor.extra.createdAt') }} {{ fmt(doc.createdAt) }} · {{ $t('components.resourceeditor.extra.updatedAt') }} {{ fmt(doc.updatedAt) }}
          </div>
        </div>
      </div>
      <el-dropdown placement="bottom-end" trigger="click" class="shrink-0">
        <el-button text><el-icon><More /></el-icon></el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-if="isClassplan" @click="showLinkedResources = true">{{ $t('components.resourceeditor.extra.linkedResourcesManage') }}</el-dropdown-item>
            <el-dropdown-item @click="showLinkedClasses = true">{{ $t('components.resourceeditor.extra.linkedClassesManage') }}</el-dropdown-item>
            <el-dropdown-item @click="showHistory = true">{{ $t('components.resourceeditor.historyVersions') }}</el-dropdown-item>
            <el-dropdown-item @click="openSnapshots">{{ $t('components.resourceeditor.dataSnapshot') }}</el-dropdown-item>
            <el-dropdown-item divided @click="doCopy">{{ $t('components.resourceeditor.extra.copy') }}</el-dropdown-item>
            <el-dropdown-item @click="doDelete" :disabled="viewOnly">
              <span :class="viewOnly ? 'text-gray-400' : 'text-red-500'">{{ $t('components.resourceeditor.delete') }}</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 被引用 -->
    <div v-if="doc?.usedBy?.length" class="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
      <span>{{ $t('components.resourceeditor.extra.usedByA') }} {{ doc.usedBy.length }} {{ $t('components.resourceeditor.extra.usedByB') }}</span>
      <el-tag v-for="c in doc.usedBy" :key="c._id" size="small" type="info" effect="plain">
        {{ c.name || c.identity }}
      </el-tag>
    </div>

    <!-- 学校共享 / 只读提示 -->
    <el-alert
      v-if="schoolShared"
      :type="viewOnly ? 'warning' : 'success'"
      :closable="false"
      show-icon
      class="mb-4"
    >
      <template #title>
        {{ viewOnly ? $t('components.resourceeditor.schoolSharedReadOnly') : $t('components.resourceeditor.schoolSharedEditable') }}
      </template>
      {{ viewOnly
        ? $t('components.resourceeditor.schoolSharedNotice')
        : $t('components.resourceeditor.schoolSharedImpact') }}
    </el-alert>

    <!-- 自定义编辑器 -->
    <slot v-if="$slots.default" :doc="doc" :save="doSave" :saving="saving" :viewOnly="viewOnly" />
    <template v-else>
      <div class="flex justify-end mb-3">
        <el-button type="primary" :loading="saving" :disabled="viewOnly" @click="doSave()">{{ $t('pages.subaccounts.save') }}</el-button>
      </div>
      <el-input v-model="jsonText" type="textarea" :rows="18" :placeholder="$t('components.resourceeditor.pasteJson')" :disabled="viewOnly" />
    </template>

    <!-- 历史版本（桌面 Dialog / 移动底部抽屉） -->
    <ResponsiveDrawer v-model:open="showHistory" :title="$t('components.resourceeditor.historyVersions')">
      <div v-if="historyList.length === 0" class="py-4 text-sm text-gray-400 text-center">{{ $t('components.resourceeditor.extra.noHistory') }}</div>
      <div
        v-for="h in historyList"
        :key="h.version"
        class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer"
        @click="previewHistory(h)"
      >
        <div>
          <span class="font-mono text-gray-500 mr-2">v{{ h.version }}</span>
          <span>{{ h.name }}</span>
          <div class="text-xs text-gray-400 mt-0.5">{{ fmt(h.createdAt) }}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <el-button size="small" text type="primary" @click.stop="previewHistory(h)">{{ $t('components.resourcelist.view') }}</el-button>
          <el-button size="small" text type="primary" @click.stop="doRestore(h.version)">{{ $t('components.resourceeditor.restore') }}</el-button>
        </div>
      </div>
    </ResponsiveDrawer>

    <!-- 数据快照（修改前 / 删除前 / 导入覆盖前 的原始数据） -->
    <ResponsiveDrawer v-model:open="showSnapshots" :title="$t('components.resourceeditor.dataSnapshot')">
      <div class="text-xs text-gray-400 mb-3 leading-relaxed">
        {{ $t('components.resourceeditor.extra.snapshotHintA') }}
        {{ $t('components.resourceeditor.extra.snapshotHintB') }}
      </div>
      <div v-if="snapshotList.length === 0" class="py-4 text-sm text-gray-400 text-center">{{ $t('components.resourceeditor.extra.noSnapshots') }}</div>
      <div
        v-for="s in snapshotList"
        :key="s._id"
        class="flex items-center justify-between gap-3 py-3 border-b border-gray-200 dark:border-gray-700 last:border-0 text-sm"
      >
        <div class="min-w-0">
          <el-tag size="small" effect="plain" type="info">{{ s.reasonLabel }}</el-tag>
          <span class="ml-2 font-mono text-gray-500" v-if="s.version">v{{ s.version }}</span>
          <div class="text-xs text-gray-400 mt-0.5 truncate">{{ fmt(s.at) }}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <el-button size="small" text type="primary" @click="previewSnapshot(s)">{{ $t('components.resourcelist.view') }}</el-button>
          <el-button size="small" text type="primary" :disabled="viewOnly" @click="doRestoreSnapshot(s)">{{ $t('components.resourceeditor.restore') }}</el-button>
        </div>
      </div>
    </ResponsiveDrawer>

    <!-- 历史版本预览（按类型结构化展示） -->
    <ResponsiveDrawer v-model:open="previewVisible" :title="previewTitle">
      <!-- 时间表 -->
      <div v-if="collection === 'timelayout'">
        <div v-if="previewLayouts.length" class="space-y-0.5">
          <div
            v-for="(tp, i) in previewLayouts"
            :key="i"
            class="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm"
          >
            <span class="w-6 text-xs text-gray-400 shrink-0">{{ Number(i) + 1 }}</span>
            <span class="font-medium">{{ tp.name || $t('components.resourceeditor.untitled') }}</span>
            <span class="text-xs text-gray-400 ml-auto">{{ tp.start }} - {{ tp.end }}</span>
          </div>
        </div>
        <div v-else class="text-gray-400 text-sm py-6 text-center">{{ $t('components.resourceeditor.extra.noPeriods') }}</div>
      </div>

      <!-- 科目 -->
      <div v-else-if="collection === 'subjects'">
        <div v-if="previewSubjects.length" class="space-y-0.5">
          <div
            v-for="s in previewSubjects"
            :key="s.uuid"
            class="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm"
          >
            <span class="font-medium">{{ s.name }}</span>
            <span class="text-xs text-gray-400">{{ s.teacherName || $t('components.resourceeditor.noTeacher') }}</span>
            <el-tag v-if="s.isOutDoor" size="small" type="warning" class="ml-auto">{{ $t('components.subjectseditor.outdoor') }}</el-tag>
          </div>
        </div>
        <div v-else class="text-gray-400 text-sm py-6 text-center">{{ $t('components.resourceeditor.extra.noSubjects') }}</div>
      </div>

      <!-- 课表：星期 × 节次 网格 -->
      <div v-else-if="collection === 'classplan'">
        <div v-if="previewActiveDays.length && previewTimePoints.length">
          <div v-for="weekTab in WEEK_TABS" :key="weekTab.value">
            <template v-if="hasWeekData(weekTab.value)">
              <div class="text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-300">{{ weekTab.label }}</div>
              <table class="border-collapse w-full mb-3 text-xs">
                <thead>
                  <tr>
                    <th class="border p-1.5 bg-gray-50 dark:bg-gray-700 font-medium">{{ $t('components.resourceeditor.extra.periodColumn') }}</th>
                    <th v-for="d in previewActiveDays" :key="d.value" class="border p-1.5 bg-gray-50 dark:bg-gray-700 font-medium">{{ d.label }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(tp, tpi) in previewTimePoints" :key="tpi">
                    <td class="border p-1.5 text-gray-500 whitespace-nowrap">
                      <div>{{ tp.name }}</div>
                      <div class="text-[10px] text-gray-400">{{ tp.start }}</div>
                    </td>
                    <td v-for="d in previewActiveDays" :key="d.value" class="border p-1.5 text-center">
                      {{ cellName(weekTab.value, d.value, tpi) || '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
          </div>
        </div>
        <div v-else class="text-gray-400 text-sm py-6 text-center">{{ $t('components.resourceeditor.extra.noPlanData') }}</div>
      </div>

      <!-- 设置 / 策略：JSON 配置 -->
      <pre v-else class="bg-gray-50 dark:bg-neutral-700 p-4 rounded text-xs overflow-auto max-h-[45vh]">{{ previewJson }}</pre>

      <template #footer>
        <el-button @click="previewVisible = false">{{ $t('components.resourceeditor.extra.close') }}</el-button>
        <el-button type="primary" @click="doRestore(previewVersion); previewVisible = false">{{ $t('components.resourceeditor.extra.restoreThisVersion') }}</el-button>
      </template>
    </ResponsiveDrawer>

    <!-- 关联资源管理（仅课表） -->
    <ResponsiveDrawer v-model:open="showLinkedResources" :title="$t('components.resourceeditor.linkedResources')">
      <div class="text-sm space-y-3 py-2">
        <div class="flex items-center justify-between">
          <span>{{ $t('components.classplaneditor.extra.timeLayoutLabel') }}</span>
          <span v-if="linkedRes?.timelayout">{{ linkedRes.timelayout.name }}</span>
          <span v-else class="text-gray-400">{{ $t('components.resourceeditor.extra.notLinked') }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span>{{ $t('components.classplaneditor.extra.subjectsLabel') }}</span>
          <span v-if="linkedRes?.subjects">{{ linkedRes.subjects.name }}</span>
          <span v-else class="text-gray-400">{{ $t('components.resourceeditor.extra.notLinked') }}</span>
        </div>
      </div>
    </ResponsiveDrawer>

    <!-- 关联班级管理 -->
    <ResponsiveDrawer v-model:open="showLinkedClasses" :title="$t('components.resourceeditor.linkedClasses')">
      <div v-if="linkedClasses.length > 0" class="space-y-0.5 py-1">
        <div
          v-for="c in linkedClasses"
          :key="c._id"
          class="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
          <span class="text-sm">{{ c.name || c.identity }}</span>
          <el-button size="small" text type="primary" @click="navigateTo(`/classes/${c._id}`)">{{ $t('components.resourceeditor.extra.manage') }}</el-button>
        </div>
      </div>
      <div v-else class="text-center text-gray-400 py-6">{{ $t('components.resourceeditor.extra.notUsedByClass') }}</div>
    </ResponsiveDrawer>

    <!-- 通用确认框 -->
    <AlertDialog v-model:open="confirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ confirmState.title }}</AlertDialogTitle>
          <AlertDialogDescription>{{ confirmState.description }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ $t('reauth.cancel') }}</AlertDialogCancel>
          <AlertDialogAction
            :class="confirmState.danger ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''"
            @click="runConfirm"
          >
            {{ confirmState.confirmText }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { More, ArrowLeft } from "@element-plus/icons-vue";
import ResponsiveDrawer from "@/components/ui/ResponsiveDrawer.vue";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const props = defineProps<{ collection: string; label: string }>();
const { t } = useI18n();
const { doc, persistedData, loading, dataReady, save } = useCiResourceEditor(props.collection, props.label);
const { isDirty } = useUnsavedGuard();

const jsonText = ref("");
const saving = ref(false);
const editName = ref("");
const showHistory = ref(false);
const historyList = ref<any[]>([]);
const previewVisible = ref(false);
const previewData = ref<any>(null);
const previewVersion = ref(0);
const previewLabel = ref("");
const showSnapshots = ref(false);
const snapshotList = ref<any[]>([]);

const previewTitle = computed(() =>
  previewLabel.value ? previewLabel.value : t('components.resourceeditor.extra.versionPreview', { version: previewVersion.value }),
);

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

async function fetchHistory() {
  const route = useRoute();
  const id = route.params.id as string;
  if (!id) return;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/${props.collection}/${id}/history`, {
      headers: authHeaders(),
    });
    historyList.value = res.data || [];
  } catch { /* */ }
}

async function previewHistory(h: any) {
  const route = useRoute();
  const id = route.params.id as string;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/${props.collection}/${id}/history/${h.version}`, {
      headers: authHeaders(),
    });
    previewData.value = res.data?.data;
    previewVersion.value = h.version;
    previewLabel.value = "";
    previewVisible.value = true;
    if (props.collection === "classplan") {
      await loadClassplanPreview(previewData.value);
    }
  } catch { ElMessage.error(t('components.resourceeditor.loadVersionFailed')); }
}

async function doRestore(version: number) {
  askConfirm(t('components.resourceeditor.confirmRestore'), t('components.resourceeditor.extra.restoreConfirm', { version }), t('components.resourceeditor.restore'), () => doRestoreConfirmed(version));
}

async function doRestoreConfirmed(version: number) {
  const route = useRoute();
  const id = route.params.id as string;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/${props.collection}/${id}/restore/${version}`, {
      method: "POST",
      headers: authHeaders(),
    });
    ElMessage.success(t('components.resourceeditor.extra.restored', { version, newVersion: res.data.version }));
    // 重新加载
    if (doc.value) {
      const fresh: any = await $fetch(`/api/v1/console/ci/${props.collection}/${id}`, { headers: authHeaders() });
      doc.value = fresh.data;
      isDirty.value = false;
    }
    await fetchHistory();
  } catch { /* cancelled */ }
}

// ── 数据快照（修改前 / 删除前 / 导入覆盖前） ──
async function openSnapshots() {
  showSnapshots.value = true;
  await fetchSnapshots();
}

async function fetchSnapshots() {
  const route = useRoute();
  const id = route.params.id as string;
  if (!id) return;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/${props.collection}/${id}/snapshots`, {
      headers: authHeaders(),
    });
    snapshotList.value = res.data?.snapshots || [];
  } catch {
    snapshotList.value = [];
  }
}

async function previewSnapshot(s: any) {
  const route = useRoute();
  const id = route.params.id as string;
  try {
    const res: any = await $fetch(
      `/api/v1/console/ci/${props.collection}/${id}/snapshots/${s._id}`,
      { headers: authHeaders() },
    );
    previewData.value = res.data?.data;
    previewVersion.value = s.version || 0;
    previewLabel.value = t('components.resourceeditor.extra.snapshotPreview', { reason: s.reasonLabel });
    previewVisible.value = true;
    if (props.collection === "classplan") {
      await loadClassplanPreview(previewData.value);
    }
  } catch { ElMessage.error(t('components.resourceeditor.loadSnapshotFailed')); }
}

function doRestoreSnapshot(s: any) {
  askConfirm(
    t('components.resourceeditor.restoreFromSnapshot'),
    t('components.resourceeditor.extra.snapshotRestoreConfirm', { reason: s.reasonLabel, time: fmt(s.at) }),
    t('components.resourceeditor.restore'),
    () => doRestoreSnapshotConfirmed(s),
  );
}

async function doRestoreSnapshotConfirmed(s: any) {
  const route = useRoute();
  const id = route.params.id as string;
  try {
    await $fetch(`/api/v1/console/ci/${props.collection}/${id}/snapshots/${s._id}/restore`, {
      method: "POST",
      headers: authHeaders(),
    });
    ElMessage.success(t('components.resourceeditor.restoredFromSnapshot'));
    const fresh: any = await $fetch(`/api/v1/console/ci/${props.collection}/${id}`, { headers: authHeaders() });
    doc.value = fresh.data;
    isDirty.value = false;
    await Promise.all([fetchSnapshots(), fetchHistory()]);
  } catch { /* cancelled */ }
}

let dirtySkip = true;
watch(doc, (d) => {
  if (!d) return;
  editName.value = d.name || "";
  if (d?.data) jsonText.value = JSON.stringify(d.data, null, 2);
});
watch(jsonText, () => {
  if (dirtySkip) { dirtySkip = false; return; }
  isDirty.value = true;
});

async function onNameChange() {
  if (!doc.value || editName.value === doc.value.name) return;
  try {
    await save(persistedData.value, editName.value);
    isDirty.value = false;
    await fetchHistory();
  } catch { /* */ }
}

function fmt(d: string) {
  return d ? new Date(d).toLocaleString("zh-CN") : "-";
}

// ── 版本预览：按资源类型结构化展示 ──
const previewJson = computed(() =>
  previewData.value ? JSON.stringify(previewData.value, null, 2) : ""
);

const previewLayouts = computed(() => {
  if (props.collection !== "timelayout" || !previewData.value) return [];
  const entries: any[] = Object.values(previewData.value);
  const layout = entries[0] as any;
  const layouts = layout?.Layouts || layout?.TimePoints || [];
  return layouts
    .filter((tp: any) => tp.TimeType === 0 || tp.TimeType === undefined)
    .map((tp: any) => ({
      name: tp.TimePointName || "",
      start: tp.StartTime || tp.Start || "",
      end: tp.EndTime || tp.End || "",
    }));
});

const previewSubjects = computed(() => {
  if (props.collection !== "subjects" || !previewData.value) return [];
  return Object.entries(previewData.value)
    .map(([uuid, s]: [string, any]) => ({
      uuid,
      name: s.Name || "",
      teacherName: s.TeacherName || "",
      isOutDoor: !!s.IsOutDoor,
    }))
    .filter((s) => s.name);
});

const DAYS = [
  { value: "Monday", label: t('components.classplaneditor.monday'), weekDay: 1 },
  { value: "Tuesday", label: t('components.classplaneditor.tuesday'), weekDay: 2 },
  { value: "Wednesday", label: t('components.classplaneditor.wednesday'), weekDay: 3 },
  { value: "Thursday", label: t('components.classplaneditor.thursday'), weekDay: 4 },
  { value: "Friday", label: t('components.classplaneditor.friday'), weekDay: 5 },
  { value: "Saturday", label: t('components.classplaneditor.saturday'), weekDay: 6 },
  { value: "Sunday", label: t('components.classplaneditor.sunday'), weekDay: 0 },
];

const WEEK_TABS = [
  { value: 0, label: t('components.classplaneditor.everyWeek') },
  { value: 1, label: t('components.classplaneditor.oddWeek') },
  { value: 2, label: t('components.classplaneditor.evenWeek') },
];

const previewTimePoints = ref<any[]>([]);
const previewSubjectMap = ref<Record<string, string>>({});

const previewClassGrid = computed(() => {
  if (props.collection !== "classplan" || !previewData.value) return { 0: {}, 1: {}, 2: {} };
  const cps = previewData.value.classPlans || {};
  const grid: Record<number, Record<string, (string | null)[]>> = { 0: {}, 1: {}, 2: {} };
  for (const [, cp] of Object.entries(cps) as [string, any][]) {
    if (!cp?.TimeRule || !cp?.Classes) continue;
    const dayKey = DAYS.find((d) => d.weekDay === cp.TimeRule.WeekDay)?.value;
    if (!dayKey) continue;
    const wd = cp.TimeRule.WeekCountDiv;
    const div = wd === 1 || wd === 2 ? wd : 0;
    if (!grid[div][dayKey]) grid[div][dayKey] = [];
    cp.Classes.forEach((cls: any, i: number) => {
      grid[div][dayKey][i] = cls?.SubjectId ? (previewSubjectMap.value[cls.SubjectId] || null) : null;
    });
  }
  return grid;
});

const previewActiveDays = computed(() => {
  const days = new Set<string>();
  (Object.values(previewClassGrid.value) as any[]).forEach((g) => {
    Object.keys(g || {}).forEach((d) => days.add(d));
  });
  return DAYS.filter((d) => days.has(d.value));
});

function hasWeekData(div: number) {
  return Object.keys(previewClassGrid.value[div] || {}).length > 0;
}

function cellName(div: number, dayKey: string, tpi: number) {
  return previewClassGrid.value[div]?.[dayKey]?.[tpi] || "";
}

async function loadClassplanPreview(data: any) {
  previewTimePoints.value = [];
  previewSubjectMap.value = {};
  if (data?.timelayoutId) {
    try {
      const tl: any = await $fetch(`/api/v1/console/ci/timelayout/${data.timelayoutId}`, { headers: authHeaders() });
      const d = tl.data?.data || tl.data || {};
      const entries: any[] = Object.values(d);
      const layout = entries[0] as any;
      const layouts = layout?.Layouts || layout?.TimePoints || [];
      previewTimePoints.value = layouts
        .filter((tp: any) => tp.TimeType === 0 || tp.TimeType === undefined)
        .map((tp: any) => ({
          name: tp.TimePointName || "",
          start: tp.StartTime || tp.Start || "",
          end: tp.EndTime || tp.End || "",
        }));
    } catch { /* */ }
  }
  if (data?.subjectsId) {
    try {
      const sj: any = await $fetch(`/api/v1/console/ci/subjects/${data.subjectsId}`, { headers: authHeaders() });
      const d = sj.data?.data || sj.data || {};
      const map: Record<string, string> = {};
      Object.entries(d).forEach(([uuid, s]: [string, any]) => {
        if (s?.Name) map[uuid] = s.Name;
      });
      previewSubjectMap.value = map;
    } catch { /* */ }
  }
}

async function doSave(raw?: any) {
  if (viewOnly.value) {
    ElMessage.warning(t('components.resourceeditor.noEditPermission'));
    return;
  }
  const data = raw ?? (() => {
    try { return JSON.parse(jsonText.value); }
    catch { ElMessage.error(t('components.resourceeditor.invalidJson')); return null; }
  })();
  if (!data && !raw) return;
  const submittedText = jsonText.value;
  saving.value = true;
  try {
    await save(data);
    if (jsonText.value === submittedText) isDirty.value = false;
    ElNotification.success({ title: t('components.resourceeditor.saved'), message: t('components.resourceeditor.extra.restartHint', { version: doc.value.version }) });
    await fetchHistory();
  } catch { ElMessage.error(t('components.resourceeditor.saveFailed')); }
  finally { saving.value = false; }
}

// ── Dropdown 功能 ──
const isClassplan = computed(() => props.collection === "classplan");
const showLinkedResources = ref(false);
const showLinkedClasses = ref(false);
const linkedRes = ref<any>(null);
const linkedClasses = ref<any[]>([]);

/**
 * 学校共享资源对普通成员是只读的。
 * 后端已经会 403，这里把界面也置灰，免得用户辛辛苦苦编辑完才被拒。
 */
const viewOnly = computed(() => (doc.value as any)?.editable === false);
const schoolShared = computed(() => !!(doc.value as any)?.isSchoolLevel);

async function loadLinkedInfo() {
  if (!doc.value) return;
  linkedClasses.value = doc.value.usedBy || [];
  // 课表：加载关联的时间表和课程表
  if (isClassplan.value && persistedData.value) {
    const d = persistedData.value;
    const info: any = {};
    if (d.timelayoutId) {
      try {
        const tl: any = await $fetch(`/api/v1/console/ci/timelayout/${d.timelayoutId}`, { headers: authHeaders() });
        info.timelayout = { name: tl.data?.name };
      } catch { /* */ }
    }
    if (d.subjectsId) {
      try {
        const sj: any = await $fetch(`/api/v1/console/ci/subjects/${d.subjectsId}`, { headers: authHeaders() });
        info.subjects = { name: sj.data?.name };
      } catch { /* */ }
    }
    linkedRes.value = info;
  }
}

watch([doc, persistedData], loadLinkedInfo);

async function doCopy() {
  if (!doc.value) return;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/${props.collection}`, {
      method: "POST",
      headers: authHeaders(),
      body: { name: t('components.resourceeditor.extra.copyName', { name: doc.value.name }), data: persistedData.value },
    });
    ElMessage.success(t('components.resourceeditor.copied'));
    navigateTo(`/${props.collection}/${res.data._id}`);
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('components.cw2centralpanel.copyFailed'));
  }
}

async function doDelete() {
  if (!doc.value) return;
  askConfirm(t('components.resourceeditor.deleteConfirm'), t('components.resourceeditor.extra.deleteConfirmDetail', { name: doc.value.name }), t('components.resourceeditor.delete'), () => doDeleteConfirmed(), true);
}

async function doDeleteConfirmed() {
  const route = useRoute();
  const id = route.params.id as string;
  try {
    await $fetch(`/api/v1/console/ci/${props.collection}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    ElMessage.success(t('components.resourceeditor.deleted'));
    navigateTo(`/${props.collection}`);
  } catch (e: any) {
    const msg = e?.response?._data?.msg;
    if (msg) ElMessageBox.alert(msg, t('components.resourceeditor.cannotDelete'), { type: "warning" });
  }
}

// ── 通用确认框状态 ──
const confirmOpen = ref(false);
const confirmState = ref({
  title: "",
  description: "",
  confirmText: t('components.resourceeditor.confirm'),
  danger: false,
  onConfirm: null as null | (() => void),
});

function askConfirm(title: string, description: string, confirmText: string, onConfirm: () => void, danger = false) {
  confirmState.value = { title, description, confirmText, danger, onConfirm };
  confirmOpen.value = true;
}

function runConfirm() {
  confirmState.value.onConfirm?.();
}

onMounted(() => { fetchHistory(); loadLinkedInfo(); });
</script>
