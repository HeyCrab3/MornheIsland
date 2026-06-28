<template>
  <div>
    <h1 class="text-2xl font-semibold mb-1">设备追踪</h1>
    <p class="text-sm text-gray-500 mb-6">已接入集控的 ClassIsland 客户端设备</p>

    <el-table :data="devices" stripe v-loading="loading" empty-text="暂无设备连接记录">
      <el-table-column prop="_id" label="IP 地址" min-width="160" />
      <el-table-column label="最后活跃" min-width="180">
        <template #default="{ row }">
          {{ formatTime(row.lastSeen) }}
        </template>
      </el-table-column>
      <el-table-column prop="lastPath" label="最后请求" min-width="260" />
      <el-table-column prop="requestCount" label="请求次数" width="100" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "设备追踪", protected: true });

const loading = ref(false);
const devices = ref<any[]>([]);

function formatTime(ts: number): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

async function fetchDevices() {
  loading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/devices", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    devices.value = res.data || [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchDevices);
</script>
