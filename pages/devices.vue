<template>
  <div>
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">设备追踪</h1>
        <p class="text-sm text-gray-500">
          集控（gRPC）与静态配置两种接入方式并存，用右侧切换查看
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <el-radio-group v-model="mode">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="grpc">集控</el-radio-button>
          <el-radio-button value="static">静态</el-radio-button>
        </el-radio-group>
        <el-button :loading="loading" @click="fetchAll">
          <el-icon class="mr-1"><Refresh /></el-icon>刷新
        </el-button>
      </div>
    </div>

    <!-- 统计 -->
    <el-row :gutter="16" class="mb-2">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card mb-4">
          <div class="text-xs text-gray-400 mb-1">设备总数</div>
          <div class="text-2xl font-bold">{{ summary.total }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card mb-4">
          <div class="text-xs text-gray-400 mb-1">集控在线</div>
          <div class="text-2xl font-bold" style="color: #34d399">{{ summary.grpcOnline }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card mb-4">
          <div class="text-xs text-gray-400 mb-1">静态设备</div>
          <div class="text-2xl font-bold text-gray-500">{{ summary.static }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card mb-4">
          <div class="text-xs text-gray-400 mb-1">覆盖班级</div>
          <div class="text-2xl font-bold">{{ classCount }}</div>
        </el-card>
      </el-col>
    </el-row>

    <div v-loading="loading" class="min-h-40">
      <template v-if="visibleGrpc.length">
        <div v-if="mode === 'all'" class="text-xs text-gray-400 mb-2">
          集控（gRPC）· {{ visibleGrpc.length }} 台，可下发实时指令
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          <el-card v-for="d in visibleGrpc" :key="d.cuid" shadow="hover" class="device-card">
            <div class="flex items-center gap-3">
              <div class="device-icon" :class="{ online: d.online }">
                <el-icon :size="20"><Monitor /></el-icon>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">{{ d.className || d.identity || '未命名设备' }}</div>
                <div class="text-xs text-gray-400 font-mono truncate">{{ d.cuid }}</div>
              </div>
              <span class="status-dot" :class="{ online: d.online }" :title="d.online ? '在线' : '离线'" />
            </div>

            <div class="mt-3 space-y-1 text-xs text-gray-500">
              <div class="flex justify-between gap-2">
                <span>班级标识</span><span class="font-mono">{{ d.identity || '—' }}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span>MAC</span><span class="font-mono truncate">{{ d.mac || '—' }}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span>最后活跃</span><span>{{ formatTime(d.lastSeen) }}</span>
              </div>
              <div class="flex justify-between gap-2 items-center">
                <span>已装插件</span>
                <span
                  v-if="d.plugins?.length"
                  class="cursor-pointer underline decoration-dotted"
                  @click="togglePlugins(d.cuid)"
                >
                  {{ d.plugins.length }} 个 {{ expandedPlugins === d.cuid ? '▲' : '▼' }}
                </span>
                <span v-else>{{ d.pluginsUpdatedAt ? '0 个' : '未采集' }}</span>
              </div>
              <div v-if="d.pluginsUpdatedAt" class="flex justify-between gap-2">
                <span>插件采集于</span><span>{{ formatTime(d.pluginsUpdatedAt) }}</span>
              </div>
              <div v-if="expandedPlugins === d.cuid" class="pl-2 pt-1 space-y-0.5">
                <div
                  v-for="id in d.plugins"
                  :key="id"
                  class="font-mono text-[11px] text-gray-400 truncate"
                  :title="id"
                >
                  {{ id }}
                </div>
              </div>
            </div>

            <div class="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-1.5 flex-wrap">
              <el-button size="small" :disabled="!d.online" @click="openNotify(d)">推送通知</el-button>
              <el-button size="small" :disabled="!d.online" @click="sendDataUpdated(d)">刷新数据</el-button>
              <el-button size="small" :disabled="!d.online" :loading="refreshingCuid === d.cuid" @click="refreshPlugins(d)">
                刷新插件
              </el-button>
              <el-button size="small" text type="danger" :disabled="!d.online" @click="confirmRestart(d)">重启</el-button>
            </div>
          </el-card>
        </div>
      </template>

      <template v-if="visibleStatic.length">
        <div v-if="mode === 'all'" class="text-xs text-gray-400 mb-2">
          静态配置 · {{ visibleStatic.length }} 台（按 IP 识别，只能看到它来拉过清单）
        </div>
        <el-alert
          v-if="mode === 'static'"
          type="info"
          :closable="false"
          show-icon
          class="mb-3"
          title="静态模式设备按清单轮询"
          description="这类客户端不在集控服务器上注册，服务端拿不到它的 CUID/MAC，也无法下发实时指令。要远程控制请让它改为集控模式加入。"
        />
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <el-card v-for="d in visibleStatic" :key="d.ip" shadow="hover" class="device-card">
            <div class="flex items-center gap-3">
              <div class="device-icon">
                <el-icon :size="20"><Monitor /></el-icon>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">{{ d.className || '未识别班级' }}</div>
                <div class="text-xs text-gray-400 font-mono truncate">{{ d.ip }}</div>
              </div>
              <el-tag size="small" type="info" effect="plain">静态</el-tag>
            </div>

            <div class="mt-3 space-y-1 text-xs text-gray-500">
              <div class="flex justify-between gap-2">
                <span>班级标识</span><span class="font-mono">{{ d.identity || '—' }}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span>最后活跃</span><span>{{ formatTime(d.lastSeen) }}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span>累计请求</span><span>{{ d.requestCount ?? 0 }} 次</span>
              </div>
              <div class="flex justify-between gap-2">
                <span>最后请求</span>
                <span class="font-mono truncate" :title="d.lastPath">{{ shortPath(d.lastPath) }}</span>
              </div>
            </div>
          </el-card>
        </div>
      </template>

      <el-empty
        v-if="!visibleGrpc.length && !visibleStatic.length"
        :image-size="100"
        :description="mode === 'static'
          ? '暂无静态配置设备（还没有客户端来拉取过清单）'
          : mode === 'grpc'
            ? '暂无集控设备（客户端需以集控服务器模式加入）'
            : '暂无设备记录'"
      />
    </div>

    <!-- 推送通知 -->
    <ResponsiveDrawer
      v-model:open="notifyVisible"
      :title="`推送通知 · ${notifyTarget?.className || notifyTarget?.identity || ''}`"
    >
      <el-form label-position="top" class="py-2">
        <el-form-item label="通知内容" required>
          <el-input
            v-model="notifyForm.messageContent"
            type="textarea"
            :rows="3"
            placeholder="如：今天下午第三节调整为数学课"
          />
        </el-form-item>
        <el-form-item label="顶部掩码文字（可选）">
          <el-input v-model="notifyForm.messageMask" placeholder="留空则显示「集控通知」" />
        </el-form-item>
        <div class="flex flex-wrap gap-4 text-sm">
          <el-checkbox v-model="notifyForm.isEmergency">紧急（置顶覆盖）</el-checkbox>
          <el-checkbox v-model="notifyForm.isSpeechEnabled">语音朗读</el-checkbox>
        </div>
        <div class="flex gap-4 mt-3">
          <el-form-item label="显示时长（秒）" class="flex-1">
            <el-input-number v-model="notifyForm.durationSeconds" :min="0" :max="600" class="w-full" />
          </el-form-item>
          <el-form-item label="重复次数" class="flex-1">
            <el-input-number v-model="notifyForm.repeatCounts" :min="1" :max="20" class="w-full" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="notifyVisible = false">取消</el-button>
        <el-button type="primary" :loading="notifySending" @click="sendNotify">发送</el-button>
      </template>
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
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
import { Monitor, Refresh } from "@element-plus/icons-vue";
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

definePageMeta({ title: "设备追踪", protected: true });

const loading = ref(false);
const clients = ref<any[]>([]);
const staticDevices = ref<any[]>([]);
const summary = reactive({ total: 0, grpc: 0, grpcOnline: 0, static: 0, classes: 0 });

/** 两种接入方式并存，用这个切换看哪一类 */
const mode = ref<"all" | "grpc" | "static">("all");
const visibleGrpc = computed(() => (mode.value === "static" ? [] : clients.value));
const visibleStatic = computed(() => (mode.value === "grpc" ? [] : staticDevices.value));

const classCount = computed(
  () => new Set(clients.value.map((c) => c.identity).filter(Boolean)).size,
);

function auth() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function formatTime(ts: number | string): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

/** 静态设备只知道它最后拉的是哪个端点，截短了显示 */
function shortPath(p: string): string {
  if (!p) return "—";
  return p.replace(/^\/v1\/ci\//, "").replace(/\.json$/, "");
}

async function fetchAll() {
  loading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/device-overview", { headers: auth() });
    const d = res.data || {};
    clients.value = d.grpc || [];
    staticDevices.value = d.static || [];
    Object.assign(summary, d.summary || {});
  } catch {
    /* 静默 */
  } finally {
    loading.value = false;
  }
}

// ── 推送通知 ──
const notifyVisible = ref(false);
const notifySending = ref(false);
const notifyTarget = ref<any>(null);
const notifyForm = reactive({
  messageContent: "",
  messageMask: "",
  isEmergency: false,
  isSpeechEnabled: false,
  durationSeconds: 5,
  repeatCounts: 1,
});

function openNotify(d: any) {
  notifyTarget.value = d;
  notifyForm.messageContent = "";
  notifyForm.messageMask = "";
  notifyForm.isEmergency = false;
  notifyForm.isSpeechEnabled = false;
  notifyForm.durationSeconds = 5;
  notifyForm.repeatCounts = 1;
  notifyVisible.value = true;
}

async function sendNotify() {
  if (!notifyForm.messageContent.trim()) return ElMessage.warning("请输入通知内容");
  notifySending.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/grpc/notification", {
      method: "POST",
      headers: auth(),
      body: { cuid: notifyTarget.value.cuid, ...notifyForm },
    });
    ElMessage.success(`已推送（${res.data?.sent ?? 0} 台）`);
    notifyVisible.value = false;
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || "推送失败");
  } finally {
    notifySending.value = false;
  }
}

async function sendDataUpdated(d: any) {
  try {
    const res: any = await $fetch("/api/v1/console/ci/grpc/data-updated", {
      method: "POST",
      headers: auth(),
      body: { cuid: d.cuid },
    });
    ElMessage.success(`已通知刷新（${res.data?.sent ?? 0} 台）`);
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || "操作失败");
  }
}

// ── 已装插件（命令 104 查询，结果落库到 ci_clients.plugins）──
const expandedPlugins = ref<string | null>(null);
const refreshingCuid = ref("");

function togglePlugins(cuid: string) {
  expandedPlugins.value = expandedPlugins.value === cuid ? null : cuid;
}

async function refreshPlugins(d: any) {
  refreshingCuid.value = d.cuid;
  try {
    const res: any = await $fetch("/api/v1/console/ci/plugin/query", {
      method: "POST",
      headers: auth(),
      body: { cuid: d.cuid },
    });
    if (res.data?.plugins) {
      d.plugins = res.data.plugins;
      d.pluginsUpdatedAt = new Date().toISOString();
      ElMessage.success(`已获取 ${res.data.plugins.length} 个插件`);
    } else {
      ElMessage.warning(res.msg || "设备未响应");
    }
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || "查询失败");
  } finally {
    refreshingCuid.value = "";
  }
}

// ── 重启（带确认）──
const confirmOpen = ref(false);
const confirmState = ref({
  title: "",
  description: "",
  confirmText: "确定",
  onConfirm: null as null | (() => void),
});

function confirmRestart(d: any) {
  confirmState.value = {
    title: "重启设备",
    description: `确定让「${d.className || d.identity}」重启 ClassIsland？`,
    confirmText: "重启",
    onConfirm: () => doRestart(d),
  };
  confirmOpen.value = true;
}

function runConfirm() {
  confirmState.value.onConfirm?.();
}

async function doRestart(d: any) {
  try {
    const res: any = await $fetch("/api/v1/console/ci/grpc/restart", {
      method: "POST",
      headers: auth(),
      body: { cuid: d.cuid },
    });
    ElMessage.success(`已下发重启（${res.data?.sent ?? 0} 台）`);
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || "操作失败");
  }
}

onMounted(fetchAll);
</script>

<style scoped>
.stat-card {
  border-radius: var(--mi-radius-lg);
}
.stat-card :deep(.el-card__body) {
  padding: 16px 18px;
}
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
  opacity: 0.55;
}
.device-icon.online {
  opacity: 1;
}
.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #d1d5db;
  flex-shrink: 0;
}
.status-dot.online {
  background: #34d399;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.18);
}
</style>
