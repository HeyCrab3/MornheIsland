<template>
  <div>
    <h1 class="text-2xl font-semibold mb-1">设备追踪</h1>
    <p class="text-sm text-gray-500 mb-6">已接入集控的 ClassIsland 客户端设备</p>

    <!-- TIPS -->
    <el-alert
      class="mb-4 text-sm"
      effect="dark"
      type="warning"
      title="由于反向代理配置不当，导致在 7/10/2026 之前的所有客户端 IP 地址错误显示为了 CDN 节点地址，待客户端下次请求时即可恢复正常，同时我们正在研究其他的客户端追踪方式。给您带来不便，敬请谅解！"
    />

    <div v-loading="loading" class="min-h-40">
      <div v-if="devices.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
        <el-card v-for="d in devices" :key="d._id" shadow="hover" class="device-card">
          <div class="flex items-center gap-3">
            <div class="device-icon">
              <el-icon :size="20"><Monitor /></el-icon>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-mono text-sm font-semibold truncate">{{ d._id }}</div>
              <div class="text-xs text-gray-400 mt-0.5">最后活跃 {{ formatTime(d.lastSeen) }}</div>
            </div>
          </div>

          <div class="mt-3 text-xs text-gray-500 truncate">最后请求 {{ d.lastPath || '—' }}</div>

          <div class="mt-3 pt-3 border-t dark:border-neutral-700 flex items-center gap-2">
            <span class="status-dot" :class="d.requestCount ? 'online' : ''" />
            <span class="text-xs text-gray-400">累计请求 {{ d.requestCount ?? 0 }} 次</span>
          </div>
        </el-card>
      </div>

      <el-empty v-else :image-size="100" description="暂无设备连接记录" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Monitor } from "@element-plus/icons-vue";

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

<style scoped>
.device-card {
  border-radius: var(--mi-radius-lg);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.device-card:hover {
  transform: translateY(-2px);
}
.device-card :deep(.el-card__body) {
  padding: 18px;
}
.device-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--mi-brand-light);
  color: var(--mi-brand-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
}
.status-dot.online {
  background: #34d399;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.15);
}
</style>
