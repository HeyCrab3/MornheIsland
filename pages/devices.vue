<template>
  <div>
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">{{ $t('sidebar.items.devices') }}</h1>
        <p class="text-sm text-gray-500">
          {{ $t('pages.devices.extra.pageDesc') }}
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <el-radio-group v-model="mode">
          <el-radio-button value="all">{{ $t('pages.devices.extra.all') }}</el-radio-button>
          <el-radio-button value="grpc">{{ $t('dashboard.grpc') }}</el-radio-button>
          <el-radio-button value="static">{{ $t('dashboard.static') }}</el-radio-button>
        </el-radio-group>
        <el-button :loading="loading" @click="fetchAll">
          <el-icon class="mr-1"><Refresh /></el-icon>{{ $t('pages.devices.extra.refresh') }}
        </el-button>
      </div>
    </div>

    <!-- 统计 -->
    <el-row :gutter="16" class="mb-2">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card mb-4">
          <div class="text-xs text-gray-400 mb-1">{{ $t('pages.devices.extra.totalDevices') }}</div>
          <div class="text-2xl font-bold">{{ summary.total }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card mb-4">
          <div class="text-xs text-gray-400 mb-1">{{ $t('pages.devices.extra.grpcOnline') }}</div>
          <div class="text-2xl font-bold" style="color: #34d399">{{ summary.grpcOnline }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card mb-4">
          <div class="text-xs text-gray-400 mb-1">{{ $t('pages.devices.extra.staticDevices') }}</div>
          <div class="text-2xl font-bold text-gray-500">{{ summary.static }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card mb-4">
          <div class="text-xs text-gray-400 mb-1">{{ $t('pages.devices.extra.coveredClasses') }}</div>
          <div class="text-2xl font-bold">{{ classCount }}</div>
        </el-card>
      </el-col>
    </el-row>

    <div v-loading="loading" class="min-h-40">
      <template v-if="visibleGrpc.length">
        <div v-if="mode === 'all'" class="text-xs text-gray-400 mb-2">
          {{ $t('dashboard.grpc') }}（gRPC）· {{ visibleGrpc.length }} {{ $t('pages.devices.extra.unit') }}，{{ $t('pages.devices.extra.grpcHint') }}
        </div>

        <!-- 批量操作条 -->
        <div class="flex items-center flex-wrap gap-2 mb-3 px-3 py-2 rounded-lg batch-bar">
          <el-checkbox
            :model-value="allOnlineSelected"
            :indeterminate="someSelected"
            :disabled="!onlineCuids.length"
            @change="toggleSelectAll"
          >
            {{ $t('pages.devices.extra.selectAllOnline') }}（{{ onlineCuids.length }} {{ $t('pages.devices.extra.unit') }}）
          </el-checkbox>
          <span class="text-xs text-gray-400">{{ $t('pages.devices.extra.selectedCount') }} {{ selectedCuids.length }} {{ $t('pages.devices.extra.unit') }}</span>
          <el-button
            size="small"
            type="primary"
            :disabled="!selectedCuids.length"
            @click="openNotifyBatch"
          >
            {{ $t('pages.schools.id.batchPushNotification') }}
          </el-button>
          <el-button size="small" text :disabled="!selectedCuids.length" @click="selectedCuids = []">
            {{ $t('pages.devices.extra.clearSelection') }}
          </el-button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          <el-card
            v-for="d in visibleGrpc"
            :key="d.cuid"
            shadow="hover"
            class="device-card"
            :class="{ 'is-selected': selectedCuids.includes(d.cuid) }"
          >
            <div class="flex items-center gap-3">
              <el-checkbox
                :model-value="selectedCuids.includes(d.cuid)"
                :disabled="!d.online"
                class="shrink-0"
                @change="toggleSelect(d.cuid)"
                @click.stop
              />
              <div class="device-icon" :class="{ online: d.online }">
                <el-icon :size="20"><Monitor /></el-icon>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate flex items-center gap-1.5">
                  <span class="truncate">{{ d.className || d.identity || $t('pages.devices.unnamedDevice') }}</span>
                  <el-tooltip
                    v-if="d.drift"
                    placement="top"
                    :content="$t('pages.devices.classIdentityMismatch')"
                  >
                    <el-tag size="small" type="warning" effect="plain" class="shrink-0">{{ $t('pages.devices.extra.pendingOwnership') }}</el-tag>
                  </el-tooltip>
                </div>
                <div class="text-xs text-gray-400 font-mono truncate">{{ d.cuid }}</div>
              </div>
              <span class="status-dot" :class="{ online: d.online }" :title="d.online ? $t('dashboard.online') : $t('dashboard.offline')" />
            </div>

            <div class="mt-3 space-y-1 text-xs text-gray-500">
              <div class="flex justify-between gap-2">
                <span>{{ $t('pages.devices.extra.classIdentity') }}</span><span class="font-mono">{{ d.identity || '—' }}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span>MAC</span><span class="font-mono truncate">{{ d.mac || '—' }}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span>{{ $t('pages.devices.extra.lastSeen') }}</span><span>{{ formatTime(d.lastSeen) }}</span>
              </div>
              <div class="flex justify-between gap-2 items-center">
                <span>{{ $t('pages.devices.extra.pluginsInstalled') }}</span>
                <span
                  v-if="d.plugins?.length"
                  class="cursor-pointer underline decoration-dotted"
                  @click="togglePlugins(d.cuid)"
                >
                  {{ d.plugins.length }} {{ $t('pages.devices.extra.unitItem') }} {{ expandedPlugins === d.cuid ? '▲' : '▼' }}
                </span>
                <span v-else>{{ d.pluginsUpdatedAt ? $t('pages.devices.zeroCount') : $t('pages.devices.notCollected') }}</span>
              </div>
              <div v-if="d.pluginsUpdatedAt" class="flex justify-between gap-2">
                <span>{{ $t('pages.devices.extra.pluginsCollectedAt') }}</span><span>{{ formatTime(d.pluginsUpdatedAt) }}</span>
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
              <el-button size="small" :disabled="!d.online" @click="openNotify(d)">{{ $t('pages.devices.extra.pushNotification') }}</el-button>
              <el-button size="small" :disabled="!d.online" @click="sendDataUpdated(d)">{{ $t('pages.devices.extra.refreshData') }}</el-button>
              <el-button size="small" :disabled="!d.online" :loading="refreshingCuid === d.cuid" @click="refreshPlugins(d)">
                {{ $t('pages.devices.extra.refreshPlugins') }}
              </el-button>
              <el-button size="small" text type="danger" :disabled="!d.online" @click="confirmRestart(d)">{{ $t('pages.devices.restart') }}</el-button>
            </div>
          </el-card>
        </div>
      </template>

      <template v-if="visibleStatic.length">
        <div v-if="mode === 'all'" class="text-xs text-gray-400 mb-2">
          {{ $t('pages.devices.extra.staticConfig') }} · {{ visibleStatic.length }} {{ $t('pages.devices.extra.unit') }}（{{ $t('pages.devices.extra.staticHint') }}）
        </div>
        <el-alert
          v-if="mode === 'static'"
          type="info"
          :closable="false"
          show-icon
          class="mb-3"
          :title="$t('pages.devices.staticModePolling')"
          :description="$t('pages.devices.unregisteredClientHint')"
        />
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <el-card v-for="d in visibleStatic" :key="d.ip" shadow="hover" class="device-card">
            <div class="flex items-center gap-3">
              <div class="device-icon">
                <el-icon :size="20"><Monitor /></el-icon>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">{{ d.className || $t('pages.devices.unrecognizedClass') }}</div>
                <div class="text-xs text-gray-400 font-mono truncate">{{ d.ip }}</div>
              </div>
              <el-tag size="small" type="info" effect="plain">{{ $t('dashboard.static') }}</el-tag>
            </div>

            <div class="mt-3 space-y-1 text-xs text-gray-500">
              <div class="flex justify-between gap-2">
                <span>{{ $t('pages.devices.extra.classIdentity') }}</span><span class="font-mono">{{ d.identity || '—' }}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span>{{ $t('pages.devices.extra.lastSeen') }}</span><span>{{ formatTime(d.lastSeen) }}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span>{{ $t('pages.devices.extra.requestsTotal') }}</span><span>{{ d.requestCount ?? 0 }} {{ $t('pages.devices.extra.times') }}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span>{{ $t('pages.devices.extra.lastRequest') }}</span>
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
          ? $t('pages.devices.extra.emptyStatic')
          : mode === 'grpc'
            ? $t('pages.devices.extra.emptyGrpc')
            : $t('pages.devices.extra.emptyAll')"
      />
    </div>

    <!-- 推送通知 -->
    <ResponsiveDrawer
      v-model:open="notifyVisible"
      :title="
        notifyBatch?.length
          ? $t('pages.devices.extra.notifyBatchTitle', { count: notifyBatch.length })
          : $t('pages.devices.extra.notifyTargetTitle', { target: notifyTarget?.className || notifyTarget?.identity || '' })
      "
    >
      <el-form label-position="top" class="py-2">
        <el-form-item :label="$t('pages.devices.notificationContent')" required>
          <el-input
            v-model="notifyForm.messageContent"
            type="textarea"
            :rows="3"
            :placeholder="$t('pages.devices.notificationExample')"
          />
        </el-form-item>
        <el-form-item :label="$t('pages.devices.topMaskTextOptional')">
          <el-input v-model="notifyForm.messageMask" :placeholder="$t('pages.devices.defaultMaskText')" />
        </el-form-item>
        <div class="flex flex-wrap gap-4 text-sm">
          <el-checkbox v-model="notifyForm.isEmergency">{{ $t('pages.devices.extra.emergency') }}</el-checkbox>
          <el-checkbox v-model="notifyForm.isSpeechEnabled">{{ $t('pages.devices.extra.speech') }}</el-checkbox>
        </div>
        <div class="flex gap-4 mt-3">
          <el-form-item :label="$t('pages.devices.displayDurationSeconds')" class="flex-1">
            <el-input-number v-model="notifyForm.durationSeconds" :min="0" :max="600" class="w-full" />
          </el-form-item>
          <el-form-item :label="$t('pages.devices.repeatCount')" class="flex-1">
            <el-input-number v-model="notifyForm.repeatCounts" :min="1" :max="20" class="w-full" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="notifyVisible = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="notifySending" @click="sendNotify">{{ $t('pages.devices.extra.send') }}</el-button>
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
          <AlertDialogCancel>{{ $t('reauth.cancel') }}</AlertDialogCancel>
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

const { t } = useI18n();

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

// ── 推送通知（单个 / 批量）──
const notifyVisible = ref(false);
const notifySending = ref(false);
const notifyTarget = ref<any>(null);
/** 批量模式下要推送的 cuid 列表；null 表示单台模式 */
const notifyBatch = ref<string[] | null>(null);
const notifyForm = reactive({
  messageContent: "",
  messageMask: "",
  isEmergency: false,
  isSpeechEnabled: false,
  durationSeconds: 5,
  repeatCounts: 1,
});

// ── 批量选择 ──
const selectedCuids = ref<string[]>([]);
const onlineCuids = computed<string[]>(() =>
  (visibleGrpc.value || []).filter((d: any) => d.online).map((d: any) => d.cuid),
);
const allOnlineSelected = computed(
  () => onlineCuids.value.length > 0 && onlineCuids.value.every((c) => selectedCuids.value.includes(c)),
);
const someSelected = computed(() => selectedCuids.value.length > 0 && !allOnlineSelected.value);

function toggleSelect(cuid: string) {
  const i = selectedCuids.value.indexOf(cuid);
  if (i >= 0) selectedCuids.value.splice(i, 1);
  else selectedCuids.value.push(cuid);
}

function toggleSelectAll(checked: any) {
  selectedCuids.value = checked ? [...onlineCuids.value] : [];
}

function resetNotifyForm() {
  notifyForm.messageContent = "";
  notifyForm.messageMask = "";
  notifyForm.isEmergency = false;
  notifyForm.isSpeechEnabled = false;
  notifyForm.durationSeconds = 5;
  notifyForm.repeatCounts = 1;
}

function openNotify(d: any) {
  notifyBatch.value = null;
  notifyTarget.value = d;
  resetNotifyForm();
  notifyVisible.value = true;
}

function openNotifyBatch() {
  if (!selectedCuids.value.length) return ElMessage.warning(t('pages.devices.selectDevicesFirst'));
  notifyTarget.value = null;
  notifyBatch.value = [...selectedCuids.value];
  resetNotifyForm();
  notifyVisible.value = true;
}

async function sendNotify() {
  if (!notifyForm.messageContent.trim()) return ElMessage.warning(t('pages.devices.enterNotificationContent'));
  const batch = notifyBatch.value;
  const body: any = batch?.length
    ? { cuids: batch, ...notifyForm }
    : { cuid: notifyTarget.value?.cuid, ...notifyForm };

  notifySending.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/grpc/notification", {
      method: "POST",
      headers: auth(),
      body,
    });
    const sent = res.data?.sent ?? 0;
    if (res.data?.rejected?.length) {
      ElMessage.warning(t('pages.devices.extra.notifyPartiallyRejected', { sent, rejected: res.data.rejected.length }));
    } else {
      ElMessage.success(t('pages.devices.extra.notifySent', { sent }));
    }
    notifyVisible.value = false;
    if (batch?.length) selectedCuids.value = [];
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.devices.pushFailed'));
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
    ElMessage.success(t('pages.devices.extra.refreshNotified', { sent: res.data?.sent ?? 0 }));
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.devices.operationFailed'));
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
      ElMessage.success(t('pages.devices.extra.pluginsFetched', { count: res.data.plugins.length }));
    } else {
      ElMessage.warning(res.msg || t('pages.devices.deviceNotResponding'));
    }
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.devices.queryFailed'));
  } finally {
    refreshingCuid.value = "";
  }
}

// ── 重启（带确认）──
const confirmOpen = ref(false);
const confirmState = ref({
  title: "",
  description: "",
  confirmText: t('components.resourceeditor.confirm'),
  onConfirm: null as null | (() => void),
});

function confirmRestart(d: any) {
  confirmState.value = {
    title: t('pages.devices.restartDevice'),
    description: t('pages.devices.extra.restartConfirm', { name: d.className || d.identity }),
    confirmText: t('pages.devices.restart'),
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
    ElMessage.success(t('pages.devices.extra.restartDispatched', { sent: res.data?.sent ?? 0 }));
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.devices.operationFailed'));
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
.device-card.is-selected {
  border-color: var(--mi-brand);
  box-shadow: 0 0 0 1px var(--mi-brand);
}
.batch-bar {
  background: var(--mi-brand-light);
  border: 1px solid var(--mi-brand);
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
