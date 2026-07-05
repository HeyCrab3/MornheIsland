<template>
  <div>
    <HomeWelcomeBanner />
    <HomeQuickStartupGuide />
    <h1 class="text-2xl font-semibold mb-1">仪表盘</h1>
    <p class="text-sm text-gray-500 mb-6">在这里查看当前账号下关联的资源情况。</p>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="mb-6">
      <el-col :span="6" v-for="card in statCards" :key="card.label">
        <el-card shadow="hover" class="stat-card">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs text-gray-400 mb-1">{{ card.label }}</div>
              <div class="text-2xl font-bold" :style="{ color: card.color }">{{ card.value }}</div>
            </div>
            <div class="stat-icon" :style="{ background: card.bg }">
              <el-icon size="20" :color="card.color"><component :is="card.icon" /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 资源分布 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span class="font-medium">资源分布</span></template>
          <div v-if="resourceBars.length" class="space-y-3">
            <div v-for="bar in resourceBars" :key="bar.label">
              <div class="flex justify-between text-xs mb-1">
                <span>{{ bar.label }}</span>
                <span class="text-gray-400">{{ bar.value }}</span>
              </div>
              <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{ width: bar.pct + '%', background: bar.color }"
                />
              </div>
            </div>
          </div>
          <div v-else class="text-center text-gray-400 py-8 text-sm">暂无资源</div>
        </el-card>
      </el-col>

      <!-- 最近活跃 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span class="font-medium">最近活跃</span></template>
          <div v-if="recentRequests.length" class="space-y-2">
            <div
              v-for="(r, i) in recentRequests"
              :key="i"
              class="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0 text-sm"
            >
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :class="i === 0 ? 'bg-green-400' : 'bg-gray-300'" />
                <span class="font-mono text-xs">{{ r.ip }}</span>
              </div>
              <span class="text-xs text-gray-400">{{ r.time }}</span>
            </div>
          </div>
          <div v-else class="text-center text-gray-400 py-8 text-sm">暂无活跃记录</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { School, Monitor, Notebook, Lock } from "@element-plus/icons-vue";

definePageMeta({ title: "仪表盘", protected: true });

const stats = reactive({ classCount: 0, deviceCount: 0, classplanCount: 0, policyCount: 0 });
const recentRequests = ref<{ ip: string; time: string }[]>([]);
const resourceBars = ref<{ label: string; value: number; pct: number; color: string }[]>([]);

function auth() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

const statCards = computed(() => [
  { label: "班级总数", value: stats.classCount, color: "var(--mi-brand)", bg: "var(--mi-brand-light)", icon: School },
  { label: "已连接设备", value: stats.deviceCount, color: "var(--mi-accent)", bg: "var(--mi-accent-bg)", icon: Monitor },
  { label: "已下发课表", value: stats.classplanCount, color: "#4CAF50", bg: "#E8F5E9", icon: Notebook },
  { label: "策略数", value: stats.policyCount, color: "#FF9800", bg: "#FFF3E0", icon: Lock },
]);

onMounted(async () => {
  try {
    const [classesRes, devicesRes, cpRes, tlRes, sjRes, polRes] = await Promise.all([
      $fetch("/api/v1/console/ci/class/list", { headers: auth() }),
      $fetch("/api/v1/console/ci/devices", { headers: auth() }),
      $fetch("/api/v1/console/ci/classplan/list", { headers: auth() }),
      $fetch("/api/v1/console/ci/timelayout/list", { headers: auth() }),
      $fetch("/api/v1/console/ci/subjects/list", { headers: auth() }),
      $fetch("/api/v1/console/ci/policy/list", { headers: auth() }),
    ]);

    const classes: any[] = (classesRes as any)?.data || [];
    const devices: any[] = (devicesRes as any)?.data || [];

    stats.classCount = classes.length;
    stats.deviceCount = devices.length;
    stats.classplanCount = classes.filter((c: any) => c.classplanId).length;
    stats.policyCount = classes.filter((c: any) => c.policyId).length;

    // 资源统计
    const resCounts = [
      { label: "课表", value: ((cpRes as any)?.data || []).length, color: "#4CAF50" },
      { label: "时间表", value: ((tlRes as any)?.data || []).length, color: "#2196F3" },
      { label: "课程表", value: ((sjRes as any)?.data || []).length, color: "#FF9800" },
      { label: "策略", value: ((polRes as any)?.data || []).length, color: "#9C27B0" },
    ];
    const max = Math.max(...resCounts.map((r) => r.value), 1);
    resourceBars.value = resCounts.map((r) => ({ ...r, pct: Math.round((r.value / max) * 100) }));

    // 最近活跃
    recentRequests.value = devices.slice(0, 6).map((d: any) => ({
      ip: d._id,
      time: d.lastSeen ? new Date(d.lastSeen).toLocaleString("zh-CN") : "-",
    }));
  } catch {
    // 静默
  }
});
</script>

<style scoped>
.stat-card :deep(.el-card__body) {
  padding: 20px;
}
.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
