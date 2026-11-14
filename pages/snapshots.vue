<template>
  <div>
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">数据恢复</h1>
        <p class="text-sm text-gray-500">
          每次修改、删除、导入覆盖、批量修复之前，系统都会自动把当时的完整数据存一份。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <el-alert type="info" :closable="false" show-icon class="mb-4 max-w-4xl">
      <template #title>这份东西和「历史版本」不一样</template>
      「历史版本」按版本号记，只有保存/回滚会写；这里按<b>动作</b>记，连<b>删除前</b>、
      <b>导入覆盖前</b>、<b>批量修复前</b>都留。资源被删掉之后，历史版本跟着没了，快照还在 ——
      所以在这里可以把已经删掉的资源原地恢复回来。
    </el-alert>

    <div class="flex flex-wrap items-center gap-2 mb-3">
      <el-radio-group v-model="filter" size="small" @change="load">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="ci_classplans">课表</el-radio-button>
        <el-radio-button value="ci_timelayouts">时间表</el-radio-button>
        <el-radio-button value="ci_subjects">科目</el-radio-button>
        <el-radio-button value="ci_settings">设置</el-radio-button>
        <el-radio-button value="ci_policies">策略</el-radio-button>
      </el-radio-group>
    </div>

    <el-card v-loading="loading" class="max-w-5xl">
      <div v-if="rows.length === 0 && !loading" class="py-8 text-sm text-gray-400 text-center">
        还没有任何快照。修改或删除资源之后，这里会自动出现记录。
      </div>
      <div
        v-for="r in rows"
        :key="r._id"
        class="flex items-center justify-between gap-3 py-3 border-b border-gray-200 dark:border-gray-700 last:border-0 text-sm"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <el-tag size="small" effect="plain" type="info">{{ r.reasonLabel }}</el-tag>
            <span class="font-medium truncate">{{ r.name || "未命名" }}</span>
            <el-tag size="small" effect="plain" round>{{ typeLabel(r.collection) }}</el-tag>
            <span v-if="r.version" class="text-xs text-gray-400 font-mono">v{{ r.version }}</span>
          </div>
          <div class="text-xs text-gray-400 mt-1">
            {{ fmt(r.at) }}
            <span v-if="r.detail"> · {{ r.detail }}</span>
          </div>
        </div>
        <el-button size="small" type="primary" text @click="restore(r)">恢复到这一刻</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "数据恢复", protected: true });

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const loading = ref(false);
const filter = ref("");
const rows = ref<any[]>([]);

const TYPE_OF: Record<string, string> = {
  ci_classplans: "classplan",
  ci_timelayouts: "timelayout",
  ci_subjects: "subjects",
  ci_settings: "settings",
  ci_policies: "policy",
};
const LABEL_OF: Record<string, string> = {
  ci_classplans: "课表",
  ci_timelayouts: "时间表",
  ci_subjects: "科目",
  ci_settings: "设置",
  ci_policies: "策略",
};

function typeLabel(c: string) {
  return LABEL_OF[c] || c;
}

function fmt(d: string) {
  return d ? new Date(d).toLocaleString("zh-CN") : "-";
}

async function load() {
  loading.value = true;
  try {
    const q = filter.value ? `&collection=${filter.value}` : "";
    const res: any = await $fetch(`/api/v1/console/ci/snapshots/recent?limit=100${q}`, {
      headers: authHeaders(),
    });
    rows.value = res.data || [];
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "加载失败");
  } finally {
    loading.value = false;
  }
}

async function restore(r: any) {
  const type = TYPE_OF[r.collection];
  if (!type) return ElMessage.error("不支持的资源类型");
  try {
    await ElMessageBox.confirm(
      `将把「${r.name || "未命名"}」恢复成 ${fmt(r.at)} 时的内容。\n` +
        `当前内容会先另存一份快照，所以这一步也能反悔。`,
      `恢复到「${r.reasonLabel}」`,
      { type: "warning", confirmButtonText: "恢复", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  try {
    const res: any = await $fetch(
      `/api/v1/console/ci/${type}/${r.resourceId}/snapshots/${r._id}/restore`,
      { method: "POST", headers: authHeaders() },
    );
    const recreated = res?.data?.recreated;
    ElMessage.success(recreated ? "资源已从快照重建" : `已恢复（新版本 v${res?.data?.version}）`);
    await load();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "恢复失败");
  }
}

onMounted(load);
</script>
