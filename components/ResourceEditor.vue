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
            <h1 class="text-xl font-semibold truncate">{{ doc?.name || `${label}编辑` }}</h1>
            <el-tag v-if="doc" size="small" effect="plain" round>v{{ doc.version }}</el-tag>
          </div>
          <div class="text-xs text-gray-400 mt-0.5" v-if="doc">
            创建于 {{ fmt(doc.createdAt) }} · 更新于 {{ fmt(doc.updatedAt) }}
          </div>
        </div>
      </div>
      <el-dropdown placement="bottom-end" trigger="click" class="shrink-0">
        <el-button text><el-icon><More /></el-icon></el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-if="isClassplan" @click="showLinkedResources = true">关联资源管理</el-dropdown-item>
            <el-dropdown-item @click="showLinkedClasses = true">关联班级管理</el-dropdown-item>
            <el-dropdown-item @click="showHistory = true">历史版本</el-dropdown-item>
            <el-dropdown-item divided @click="doCopy">复制</el-dropdown-item>
            <el-dropdown-item @click="doDelete"><span class="text-red-500">删除</span></el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 被引用 -->
    <div v-if="doc?.usedBy?.length" class="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
      <span>被 {{ doc.usedBy.length }} 个班级使用：</span>
      <el-tag v-for="c in doc.usedBy" :key="c._id" size="small" type="info" effect="plain">
        {{ c.name || c.identity }}
      </el-tag>
    </div>

    <!-- 自定义编辑器 -->
    <slot v-if="$slots.default" :doc="doc" :save="doSave" :saving="saving" />
    <template v-else>
      <div class="flex justify-end mb-3">
        <el-button type="primary" :loading="saving" @click="doSave()">保存</el-button>
      </div>
      <el-input v-model="jsonText" type="textarea" :rows="18" placeholder="粘贴 JSON 数据" />
    </template>

    <!-- 历史版本（桌面 Dialog / 移动底部抽屉） -->
    <ResponsiveDrawer v-model:open="showHistory" title="历史版本">
      <div v-if="historyList.length === 0" class="py-4 text-sm text-gray-400 text-center">暂无历史版本</div>
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
          <el-button size="small" text type="primary" @click.stop="previewHistory(h)">查看</el-button>
          <el-button size="small" text type="primary" @click.stop="doRestore(h.version)">恢复</el-button>
        </div>
      </div>
    </ResponsiveDrawer>

    <!-- 历史版本预览（按类型结构化展示） -->
    <ResponsiveDrawer v-model:open="previewVisible" :title="`版本预览 · v${previewVersion}`">
      <!-- 时间表 -->
      <div v-if="collection === 'timelayout'">
        <div v-if="previewLayouts.length" class="space-y-0.5">
          <div
            v-for="(tp, i) in previewLayouts"
            :key="i"
            class="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm"
          >
            <span class="w-6 text-xs text-gray-400 shrink-0">{{ i + 1 }}</span>
            <span class="font-medium">{{ tp.name || '未命名' }}</span>
            <span class="text-xs text-gray-400 ml-auto">{{ tp.start }} - {{ tp.end }}</span>
          </div>
        </div>
        <div v-else class="text-gray-400 text-sm py-6 text-center">暂无时段</div>
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
            <span class="text-xs text-gray-400">{{ s.teacherName || '无教师' }}</span>
            <el-tag v-if="s.isOutDoor" size="small" type="warning" class="ml-auto">室外</el-tag>
          </div>
        </div>
        <div v-else class="text-gray-400 text-sm py-6 text-center">暂无科目</div>
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
                    <th class="border p-1.5 bg-gray-50 dark:bg-gray-700 font-medium">节次</th>
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
        <div v-else class="text-gray-400 text-sm py-6 text-center">暂无课表数据</div>
      </div>

      <!-- 设置 / 策略：JSON 配置 -->
      <pre v-else class="bg-gray-50 dark:bg-neutral-700 p-4 rounded text-xs overflow-auto max-h-[45vh]">{{ previewJson }}</pre>

      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="doRestore(previewVersion); previewVisible = false">恢复此版本</el-button>
      </template>
    </ResponsiveDrawer>

    <!-- 关联资源管理（仅课表） -->
    <ResponsiveDrawer v-model:open="showLinkedResources" title="关联资源">
      <div class="text-sm space-y-3 py-2">
        <div class="flex items-center justify-between">
          <span>时间表：</span>
          <span v-if="linkedRes?.timelayout">{{ linkedRes.timelayout.name }}</span>
          <span v-else class="text-gray-400">未关联</span>
        </div>
        <div class="flex items-center justify-between">
          <span>课程表：</span>
          <span v-if="linkedRes?.subjects">{{ linkedRes.subjects.name }}</span>
          <span v-else class="text-gray-400">未关联</span>
        </div>
      </div>
    </ResponsiveDrawer>

    <!-- 关联班级管理 -->
    <ResponsiveDrawer v-model:open="showLinkedClasses" title="关联班级">
      <div v-if="linkedClasses.length > 0" class="space-y-0.5 py-1">
        <div
          v-for="c in linkedClasses"
          :key="c._id"
          class="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
          <span class="text-sm">{{ c.name || c.identity }}</span>
          <el-button size="small" text type="primary" @click="navigateTo(`/classes/${c._id}`)">管理</el-button>
        </div>
      </div>
      <div v-else class="text-center text-gray-400 py-6">未被任何班级引用</div>
    </ResponsiveDrawer>

    <!-- 通用确认框 -->
    <AlertDialog v-model:open="confirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ confirmState.title }}</AlertDialogTitle>
          <AlertDialogDescription>{{ confirmState.description }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
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
const { doc, loading, dataReady, save } = useCiResourceEditor(props.collection, props.label);
const { isDirty } = useUnsavedGuard();

const jsonText = ref("");
const saving = ref(false);
const editName = ref("");
const showHistory = ref(false);
const historyList = ref<any[]>([]);
const previewVisible = ref(false);
const previewData = ref<any>(null);
const previewVersion = ref(0);

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
    previewVisible.value = true;
    if (props.collection === "classplan") {
      await loadClassplanPreview(previewData.value);
    }
  } catch { ElMessage.error("加载版本失败"); }
}

async function doRestore(version: number) {
  askConfirm("确认恢复", `确定恢复到 v${version}？当前内容将存入历史。`, "恢复", () => doRestoreConfirmed(version));
}

async function doRestoreConfirmed(version: number) {
  const route = useRoute();
  const id = route.params.id as string;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/${props.collection}/${id}/restore/${version}`, {
      method: "POST",
      headers: authHeaders(),
    });
    ElMessage.success(`已恢复到 v${version}（新版本 v${res.data.version}）`);
    // 重新加载
    if (doc.value) {
      const fresh: any = await $fetch(`/api/v1/console/ci/${props.collection}/${id}`, { headers: authHeaders() });
      doc.value = fresh.data;
      isDirty.value = false;
    }
    await fetchHistory();
  } catch { /* cancelled */ }
}

watch(doc, (d) => {
  if (!d) return;
  editName.value = d.name || "";
  if (d?.data) jsonText.value = JSON.stringify(d.data, null, 2);
});

let dirtySkip = true;
watch(jsonText, () => {
  if (dirtySkip) { dirtySkip = false; return; }
  isDirty.value = true;
});

async function onNameChange() {
  if (!doc.value || editName.value === doc.value.name) return;
  try {
    await save(doc.value.data, editName.value);
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
  { value: "Monday", label: "周一", weekDay: 1 },
  { value: "Tuesday", label: "周二", weekDay: 2 },
  { value: "Wednesday", label: "周三", weekDay: 3 },
  { value: "Thursday", label: "周四", weekDay: 4 },
  { value: "Friday", label: "周五", weekDay: 5 },
  { value: "Saturday", label: "周六", weekDay: 6 },
  { value: "Sunday", label: "周日", weekDay: 0 },
];

const WEEK_TABS = [
  { value: 0, label: "每周" },
  { value: 1, label: "单周" },
  { value: 2, label: "双周" },
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
  const data = raw ?? (() => {
    try { return JSON.parse(jsonText.value); }
    catch { ElMessage.error("JSON 格式错误"); return null; }
  })();
  if (!data && !raw) return;
  saving.value = true;
  try {
    await save(data);
    isDirty.value = false;
    ElNotification.success({ title: "已保存", message: `当前版本：v${doc.value.version}，更新后请重新启动一遍 ClassIsland 以加载最新的集控配置` });
    await fetchHistory();
  } catch { ElMessage.error("保存失败"); }
  finally { saving.value = false; }
}

// ── Dropdown 功能 ──
const isClassplan = computed(() => props.collection === "classplan");
const showLinkedResources = ref(false);
const showLinkedClasses = ref(false);
const linkedRes = ref<any>(null);
const linkedClasses = ref<any[]>([]);

async function loadLinkedInfo() {
  if (!doc.value) return;
  linkedClasses.value = doc.value.usedBy || [];
  // 课表：加载关联的时间表和课程表
  if (isClassplan.value && doc.value.data) {
    const d = doc.value.data;
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

watch(doc, loadLinkedInfo);

async function doCopy() {
  if (!doc.value) return;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/${props.collection}`, {
      method: "POST",
      headers: authHeaders(),
      body: { name: `${doc.value.name} - 副本`, data: doc.value.data },
    });
    ElMessage.success("已复制");
    navigateTo(`/${props.collection}/${res.data._id}`);
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || "复制失败");
  }
}

async function doDelete() {
  if (!doc.value) return;
  askConfirm("删除确认", `确定删除「${doc.value.name}」？此操作不可撤销。`, "删除", () => doDeleteConfirmed(), true);
}

async function doDeleteConfirmed() {
  const route = useRoute();
  const id = route.params.id as string;
  try {
    await $fetch(`/api/v1/console/ci/${props.collection}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    ElMessage.success("已删除");
    navigateTo(`/${props.collection}`);
  } catch (e: any) {
    const msg = e?.response?._data?.msg;
    if (msg) ElMessageBox.alert(msg, "无法删除", { type: "warning" });
  }
}

// ── 通用确认框状态 ──
const confirmOpen = ref(false);
const confirmState = ref({
  title: "",
  description: "",
  confirmText: "确定",
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
