<template>
  <div>
    <HomeWelcomeBanner />
    <HomeQuickStartupGuide />
    <h1 class="text-2xl font-semibold mb-1">仪表盘</h1>
    <p class="text-sm text-gray-500 mb-6">
      在这里查看当前账号下关联的资源情况。
    </p>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="mb-2">
      <el-col :xs="12" :sm="12" :md="6" v-for="card in statCards" :key="card.label">
        <el-card shadow="hover" class="stat-card mb-4">
          <div class="flex items-center justify-between">
            <div class="min-w-0">
              <div class="text-xs text-gray-400 mb-1">{{ card.label }}</div>
              <div class="text-2xl font-bold">
                {{ card.value }}
              </div>
              <div v-if="card.hint" class="text-[11px] text-gray-400 mt-1 truncate" :title="card.hint">
                {{ card.hint }}
              </div>
            </div>
            <div class="stat-icon" :style="{ background: card.gradient }">
              <el-icon size="20" color="#fff"
                ><component :is="card.icon"
              /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 公告 -->
      <el-col :xs="24" :lg="8">
        <el-card header="公告" class="mb-4 lg:mb-0">
          <el-carousel v-if="platform.notices.length !== 0" height="200px">
            <el-carousel-item v-for="(item, index) in platform.notices" :key="index">
              <p class="text-lg font-medium">{{ item.title }}</p>
              <p class="text-sm text-gray-400">发布于 {{ processTime(item.publishAt) }}</p>
              <p class="text-gray-600 dark:text-gray-400 mt-2">{{ item.content }}</p>
            </el-carousel-item>
          </el-carousel>
          <el-empty v-else description="暂无公告" />
        </el-card>
      </el-col>

      <!-- 数据区 -->
      <el-col :xs="24" :lg="16">
        <!-- 资源分布 -->
        <el-card shadow="hover" class="mb-4">
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

        <!-- 最近活跃 -->
        <el-card shadow="hover">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">最近活跃</span>
              <span class="text-xs text-gray-400">集控 gRPC {{ deviceSummary.grpcOnline }}/{{ deviceSummary.grpc }} 在线 · 静态 {{ deviceSummary.static }}</span>
            </div>
          </template>
          <div v-if="recentActivity.length" class="space-y-2">
            <div
              v-for="(r, i) in recentActivity"
              :key="r.key"
              class="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0 text-sm gap-2"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  :class="r.online ? 'bg-green-400' : 'bg-gray-300'"
                  :title="r.online ? '在线' : '离线'"
                />
                <el-tag size="small" :type="r.mode === 'grpc' ? 'primary' : 'info'" effect="plain">
                  {{ r.mode === 'grpc' ? '集控' : '静态' }}
                </el-tag>
                <span class="text-xs truncate" :title="r.title">{{ r.label }}</span>
              </div>
              <span class="text-xs text-gray-400 whitespace-nowrap">{{ r.time }}</span>
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
import { usePlatformStore } from "#imports";

definePageMeta({ title: "仪表盘", protected: true });

const platform = usePlatformStore()
const stats = reactive({
  classCount: 0,
  deviceCount: 0,
  classplanCount: 0,
  policyCount: 0,
});

/** 两种接入方式的汇总：集控（gRPC）与静态（serverless）并存 */
const deviceSummary = reactive({ grpc: 0, grpcOnline: 0, static: 0, total: 0 });
const recentActivity = ref<
  { key: string; mode: "grpc" | "static"; label: string; title: string; online: boolean; time: string }[]
>([]);

const resourceBars = ref<
  { label: string; value: number; pct: number; color: string }[]
>([]);

const processTime = (isoTime: string) => {
  const date = new Date(isoTime);
  return date.toLocaleString("zh-CN");
};

function auth() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function fmtTime(t: any): string {
  if (!t) return "-";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

const statCards = computed(() => [
  {
    label: "班级总数",
    value: stats.classCount,
    hint: "",
    gradient: "linear-gradient(135deg, #A6C2F7 0%, #859BC6 100%)",
    icon: School,
  },
  {
    label: "已连接设备",
    value: stats.deviceCount,
    hint: `集控 ${deviceSummary.grpcOnline} 在线 · 静态 ${deviceSummary.static}`,
    gradient: "linear-gradient(135deg, #9B8FC2 0%, #4D3B8E 100%)",
    icon: Monitor,
  },
  {
    label: "已下发课表",
    value: stats.classplanCount,
    hint: "",
    gradient: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
    icon: Notebook,
  },
  {
    label: "策略数",
    value: stats.policyCount,
    hint: "",
    gradient: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
    icon: Lock,
  },
]);

onMounted(async () => {
  try {
    const [classesRes, overviewRes, cpRes, tlRes, sjRes, polRes] =
      await Promise.all([
        $fetch("/api/v1/console/ci/class/list", { headers: auth() }),
        $fetch("/api/v1/console/ci/device-overview", { headers: auth() }),
        $fetch("/api/v1/console/ci/classplan/list", { headers: auth() }),
        $fetch("/api/v1/console/ci/timelayout/list", { headers: auth() }),
        $fetch("/api/v1/console/ci/subjects/list", { headers: auth() }),
        $fetch("/api/v1/console/ci/policy/list", { headers: auth() }),
      ]);

    const classes: any[] = (classesRes as any)?.data || [];
    const ov: any = (overviewRes as any)?.data || {};
    const grpc: any[] = ov.grpc || [];
    const statics: any[] = ov.static || [];

    stats.classCount = classes.length;
    stats.classplanCount = classes.filter((c: any) => c.classplanId).length;
    stats.policyCount = classes.filter((c: any) => c.policyId).length;

    deviceSummary.grpc = ov.summary?.grpc ?? grpc.length;
    deviceSummary.grpcOnline = ov.summary?.grpcOnline ?? 0;
    deviceSummary.static = ov.summary?.static ?? statics.length;
    deviceSummary.total = ov.summary?.total ?? grpc.length + statics.length;
    // “已连接设备”把两种接入方式都算上
    stats.deviceCount = deviceSummary.total;

    // 资源统计
    const resCounts = [
      { label: "课表", value: ((cpRes as any)?.data || []).length, color: "#4CAF50" },
      { label: "时间表", value: ((tlRes as any)?.data || []).length, color: "#2196F3" },
      { label: "课程表", value: ((sjRes as any)?.data || []).length, color: "#FF9800" },
      { label: "策略", value: ((polRes as any)?.data || []).length, color: "#9C27B0" },
    ];
    const max = Math.max(...resCounts.map((r) => r.value), 1);
    resourceBars.value = resCounts.map((r) => ({
      ...r,
      pct: Math.round((r.value / max) * 100),
    }));

    // 最近活跃：把集控设备与静态设备按最后活跃时间合并排序
    const merged = [
      ...grpc.map((d: any) => ({
        key: `grpc:${d.cuid}`,
        mode: "grpc" as const,
        label: d.className || d.identity || d.cuid,
        title: `班级：${d.className || "—"}｜标识：${d.identity || "—"}｜MAC：${d.mac || "—"}`,
        online: !!d.online,
        ts: d.lastSeen ? new Date(d.lastSeen).getTime() : 0,
        time: fmtTime(d.lastSeen),
      })),
      ...statics.map((d: any) => ({
        key: `static:${d.ip}`,
        mode: "static" as const,
        label: d.className ? `${d.className} · ${d.ip}` : d.ip,
        title: `IP：${d.ip}｜最后请求：${d.lastPath || "—"}｜累计 ${d.requestCount ?? 0} 次`,
        online: false,
        ts: d.lastSeen ? new Date(d.lastSeen).getTime() : 0,
        time: fmtTime(d.lastSeen),
      })),
    ].sort((a, b) => b.ts - a.ts);

    recentActivity.value = merged.slice(0, 8);
  } catch {
    // 静默
  }
});
</script>

<style scoped>
.stat-card {
  border-radius: var(--mi-radius-lg);
}
.stat-card :deep(.el-card__body) {
  padding: 20px;
}
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--mi-shadow-sm);
}
</style>
