<template>
  <div>
    <h1 class="text-2xl font-semibold mb-1">组织设置</h1>
    <p class="text-sm text-gray-500 mb-6">管理部署配置，为每个班级生成 ClassIsland 集控配置文件</p>

    <el-alert type="info" :closable="false" show-icon class="mb-6">
      <template #title>部署步骤</template>
      <ol class="m-0 pl-4 text-sm">
        <li>在「班级列表」中创建班级，设置好课表、时间表、策略</li>
        <li>在下表中复制对应班级的配置文件内容</li>
        <li>将内容保存为 <code>ManagementPreset.json</code>，放到 ClassIsland 应用目录下</li>
        <li>启动 ClassIsland，在设置中点击「加入管理」即可自动加载</li>
      </ol>
    </el-alert>

    <el-table :data="classes" stripe v-loading="loading" empty-text="暂无班级，请先在「班级列表」中创建">
      <el-table-column prop="identity" label="班级标识" min-width="100" />
      <el-table-column prop="name" label="班级名称" min-width="140" />
      <el-table-column label="配置文件" min-width="300">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <code class="text-xs bg-gray-100 dark:bg-neutral-600 px-2 py-1 rounded flex-1 truncate">
              {{ buildPreset(row) }}
            </code>
            <el-button text type="primary" @click="copyPreset(row)">
              <el-icon><CopyDocument /></el-icon>
            </el-button>
            <el-button type="primary" @click="downloadPreset(row)">
              <el-icon><Download /></el-icon>
              下载配置文件
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { CopyDocument, Download } from "@element-plus/icons-vue";

definePageMeta({ title: "组织设置", protected: true });

const loading = ref(false);
const classes = ref<any[]>([]);

// API Endpoint
const apiOrigin = computed(() => {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://your-server";
});

// 构造参数
function buildPreset(row: any): string {
  return JSON.stringify({
    ManagementServerKind: 0,
    ManifestUrlTemplate: `${apiOrigin.value}/api/v1/ci/${String(row._id)}/manifest.json`,
    ClassIdentity: row.identity,
  });
}

// 复制配置
async function copyPreset(row: any) {
  try {
    await navigator.clipboard.writeText(buildPreset(row));
    ElMessage.success(`已复制 ${row.name || row.identity} 的配置文件`);
  } catch {
    ElMessage.error("复制失败");
  }
}

// 下载配置文件
const downloadPreset = (row: any) => {
  const blob = new Blob([buildPreset(row)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ManagementPreset.json";
  a.click();
  URL.revokeObjectURL(url);
};

// 请求班级信息
async function fetchClasses() {
  loading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/class/list", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    classes.value = res.data || [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchClasses);
</script>
