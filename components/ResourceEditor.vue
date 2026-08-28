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

    <!-- 历史版本 Drawer -->
    <el-drawer v-model="showHistory" title="历史版本" size="400px">
      <div v-if="historyList.length === 0" class="p-4 text-sm text-gray-400 text-center">暂无历史版本</div>
      <div
        v-for="h in historyList"
        :key="h.version"
        class="flex items-center justify-between px-4 py-3 border-b hover:bg-gray-50 text-sm cursor-pointer"
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
    </el-drawer>

    <!-- 历史版本预览 -->
    <el-dialog v-model="previewVisible" title="版本预览" width="600px">
      <pre class="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">{{ previewJson }}</pre>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="doRestore(previewVersion); previewVisible = false">恢复此版本</el-button>
      </template>
    </el-dialog>

    <!-- 关联资源管理（仅课表） -->
    <el-dialog v-model="showLinkedResources" title="关联资源" width="450px">
      <div class="text-sm space-y-3" v-if="linkedRes">
        <div class="flex items-center justify-between">
          <span>时间表：</span>
          <span v-if="linkedRes.timelayout">{{ linkedRes.timelayout.name }}</span>
          <span v-else class="text-gray-400">未关联</span>
        </div>
        <div class="flex items-center justify-between">
          <span>课程表：</span>
          <span v-if="linkedRes.subjects">{{ linkedRes.subjects.name }}</span>
          <span v-else class="text-gray-400">未关联</span>
        </div>
      </div>
    </el-dialog>

    <!-- 关联班级管理 -->
    <el-dialog v-model="showLinkedClasses" title="关联班级" width="450px">
      <div v-if="linkedClasses.length > 0" class="space-y-2">
        <div v-for="c in linkedClasses" :key="c._id" class="flex items-center justify-between">
          <span>{{ c.name || c.identity }}</span>
          <el-button size="small" text type="primary" @click="navigateTo(`/classes/${c._id}`)">管理</el-button>
        </div>
      </div>
      <div v-else class="text-center text-gray-400 py-4">未被任何班级引用</div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { More, ArrowLeft } from "@element-plus/icons-vue";

const props = defineProps<{ collection: string; label: string }>();
const { doc, loading, dataReady, save } = useCiResourceEditor(props.collection, props.label);
const { isDirty } = useUnsavedGuard();

const jsonText = ref("");
const saving = ref(false);
const editName = ref("");
const showHistory = ref(false);
const historyList = ref<any[]>([]);
const previewVisible = ref(false);
const previewJson = ref("");
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
    previewJson.value = JSON.stringify(res.data?.data, null, 2);
    previewVersion.value = h.version;
    previewVisible.value = true;
  } catch { ElMessage.error("加载版本失败"); }
}

async function doRestore(version: number) {
  const route = useRoute();
  const id = route.params.id as string;
  try {
    await ElMessageBox.confirm(`确定恢复到 v${version}？当前内容将存入历史。`, "确认恢复", { type: "warning" });
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
  try {
    await ElMessageBox.confirm(`确定删除「${doc.value.name}」？此操作不可撤销。`, "删除确认", { type: "error", confirmButtonText: "删除" });
    const route = useRoute();
    const id = route.params.id as string;
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

onMounted(() => { fetchHistory(); loadLinkedInfo(); });
</script>
