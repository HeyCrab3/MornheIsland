<template>
  <div>
    <h1 class="text-2xl font-semibold mb-1">设备追踪</h1>
    <p class="text-sm text-gray-500 mb-6">已接入集控的 ClassIsland 客户端设备</p>

    <!-- TIPS -->
     <el-alert class="mb-6 text-sm" effect="dark" type="warning" title="由于反向代理配置不当，导致在 7/10/2026 之前的所有客户端 IP 地址错误显示为了 CDN 节点地址，待客户端下次请求时即可恢复正常，同时我们正在研究其他的客户端追踪方式。给您带来不便，敬请谅解！"/>

    <el-table :data="devices" stripe v-loading="loading" empty-text="暂无设备连接记录" class="mt-6">
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
