<template>
  <el-card class="max-w-2xl mt-4">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-medium">{{ $t('components.cw2centralpanel.extra.panelTitle') }}</span>
        <el-tag size="small" type="info" effect="plain">{{ $t('components.cw2centralpanel.extra.protocolV1') }}</el-tag>
      </div>
    </template>

    <p class="text-xs text-gray-500 mb-4 leading-relaxed">
      {{ $t('components.cw2centralpanel.extra.introA') }}
      {{ $t('components.cw2centralpanel.extra.introB') }}
      <br />
      {{ $t('components.cw2centralpanel.extra.introC') }} <code>contracts/</code> {{ $t('components.cw2centralpanel.extra.introD') }}
    </p>

    <!-- 概览 -->
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-4">
      <span>{{ $t('components.cw2centralpanel.extra.scheduleVersion') }}<b>{{ revisions.schedule?.revision ?? $t('components.cw2centralpanel.unpublished') }}</b></span>
      <span>{{ $t('components.cw2centralpanel.extra.policyVersion') }}<b>{{ revisions.policy?.revision ?? $t('components.cw2centralpanel.unpublished') }}</b></span>
      <span>{{ $t('components.cw2centralpanel.extra.onlineDevices') }}<b>{{ onlineCount }} / {{ devices.length }}</b></span>
      <el-button size="small" text type="primary" @click="refreshAll">
        <el-icon class="mr-0.5"><Refresh /></el-icon>{{ $t('components.cw2centralpanel.extra.refresh') }}
      </el-button>
    </div>

    <!-- 发布 -->
    <div class="flex flex-wrap gap-2 mb-4">
      <el-button size="small" :loading="previewing" @click="doPreview">{{ $t('components.cw2centralpanel.extra.previewConversion') }}</el-button>
      <el-button size="small" type="primary" :loading="publishing" @click="doPublishSchedule">
        {{ $t('components.cw2centralpanel.extra.publishSchedule') }}
      </el-button>
      <el-button size="small" :loading="pairing" @click="doPairingCode">{{ $t('components.cw2centralpanel.extra.issuePairingCode') }}</el-button>
    </div>

    <el-alert v-if="pairingResult" type="success" :closable="false" class="mb-4">
      <template #title>{{ $t('components.cw2centralpanel.extra.pairingCodeTitle') }}</template>
      <div class="flex items-center gap-2 mt-2 flex-wrap">
        <code class="text-lg font-mono">{{ pairingResult.code }}</code>
        <el-button size="small" @click="copyPairingCode">{{ $t('components.cw2centralpanel.extra.copy') }}</el-button>
        <span class="text-xs text-gray-500">
          {{ $t('components.cw2centralpanel.extra.pairingHint') }}
        </span>
      </div>
    </el-alert>

    <!-- 预览结果 -->
    <el-collapse v-if="preview" class="mb-4">
      <el-collapse-item :title="previewTitle">
        <el-alert
          v-if="preview.errors?.length"
          type="error"
          :closable="false"
          class="mb-2"
          :title="$t('components.cw2centralpanel.extra.convertFailedTitle', { count: preview.errors.length })"
        >
          <ul class="m-0 pl-4 text-xs">
            <li v-for="(e, i) in preview.errors" :key="i">{{ e }}</li>
          </ul>
        </el-alert>
        <el-alert
          v-if="preview.warnings?.length"
          type="warning"
          :closable="false"
          class="mb-2"
          :title="$t('components.cw2centralpanel.extra.warningCountTitle', { count: preview.warnings.length })"
        >
          <ul class="m-0 pl-4 text-xs">
            <li v-for="(w, i) in preview.warnings" :key="i">{{ w }}</li>
          </ul>
        </el-alert>
        <pre class="text-xs bg-gray-50 dark:bg-neutral-700 p-3 rounded overflow-auto max-h-64">{{
          preview.schedule ? JSON.stringify(preview.schedule, null, 2) : $t('components.cw2centralpanel.noConversionResult')
        }}</pre>
      </el-collapse-item>
    </el-collapse>

    <!-- 设备 -->
    <div class="text-sm font-medium mb-2">{{ $t('components.cw2centralpanel.extra.pairedDevices') }}</div>
    <el-table v-if="devices.length" :data="devices" size="small" class="mb-4">
      <el-table-column :label="$t('components.cw2centralpanel.name')" min-width="120">
        <template #default="{ row }">
          <div class="truncate">{{ row.name || row.installationId }}</div>
          <div class="text-[11px] text-gray-400 truncate">{{ row.platform || $t('components.cw2centralpanel.unknownPlatform') }}</div>
        </template>
      </el-table-column>
      <el-table-column :label="$t('components.cw2centralpanel.status')" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.revoked ? 'info' : row.online ? 'success' : 'danger'" effect="plain">
            {{ row.revoked ? $t('components.cw2centralpanel.revoked') : row.online ? $t('dashboard.online') : $t('dashboard.offline') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="$t('components.cw2centralpanel.planOrPolicy')" width="90">
        <template #default="{ row }">
          <span class="text-xs">v{{ row.scheduleRevision }} / v{{ row.policyRevision }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('components.cw2centralpanel.lastSync')" min-width="130">
        <template #default="{ row }">
          <span class="text-xs text-gray-500">{{ fmtTime(row.lastSeen) }}</span>
          <div v-if="row.lastError" class="text-[11px] text-red-500 truncate" :title="row.lastError">
            {{ row.lastError }}
          </div>
        </template>
      </el-table-column>
      <el-table-column width="70" align="right">
        <template #default="{ row }">
          <el-button
            v-if="!row.revoked"
            size="small"
            text
            type="danger"
            @click="revokeDevice(row)"
          >{{ $t('components.cw2centralpanel.extra.revoke') }}</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div v-else class="text-xs text-gray-400 mb-4">{{ $t('components.cw2centralpanel.extra.noPairedDevices') }}</div>

    <!-- 命令 -->
    <el-divider content-position="left">{{ $t('components.cw2centralpanel.extra.dispatchCommand') }}</el-divider>
    <div class="flex flex-wrap items-end gap-2 mb-3">
      <el-select v-model="commandType" size="small" style="width: 190px">
        <el-option v-for="c in COMMAND_TYPES" :key="c.value" :label="c.label" :value="c.value" />
      </el-select>
      <el-input
        v-model="commandPayload"
        size="small"
        type="textarea"
        :rows="1"
        :autosize="{ minRows: 1, maxRows: 4 }"
        :placeholder="$t('components.cw2centralpanel.payloadJsonOptional')"
        style="width: 260px"
      />
      <el-button size="small" type="primary" :loading="sending" @click="doSendCommand">{{ $t('components.cw2centralpanel.extra.dispatch') }}</el-button>
    </div>

    <el-table v-if="commands.length" :data="commands" size="small">
      <el-table-column :label="$t('components.cw2centralpanel.command')" min-width="150">
        <template #default="{ row }">
          <div class="truncate">{{ row.type }}</div>
          <div class="text-[11px] text-gray-400 truncate">{{ fmtTime(row.createdAt) }}</div>
        </template>
      </el-table-column>
      <el-table-column :label="$t('components.cw2centralpanel.sequence')" width="70">
        <template #default="{ row }"><span class="text-xs">#{{ row.cursor }}</span></template>
      </el-table-column>
      <el-table-column :label="$t('components.cw2centralpanel.receipt')" min-width="120">
        <template #default="{ row }">
          <span v-if="!row.ackCount" class="text-xs text-gray-400">
            {{ row.expired ? $t('components.cw2centralpanel.expiredNoReceipt') : $t('components.cw2centralpanel.awaitingReceipt') }}
          </span>
          <span v-else class="text-xs">
            <el-tag
              v-for="(n, st) in row.ackByStatus"
              :key="st"
              size="small"
              class="mr-1"
              :type="st === 'succeeded' ? 'success' : st === 'failed' ? 'danger' : 'info'"
              effect="plain"
            >{{ st }} {{ n }}</el-tag>
          </span>
        </template>
      </el-table-column>
    </el-table>
    <div v-else class="text-xs text-gray-400">{{ $t('components.cw2centralpanel.extra.noCommands') }}</div>

    <!-- 策略 -->
    <el-collapse class="mt-4">
      <el-collapse-item :title="$t('components.cw2centralpanel.cw2PolicyHint')">
        <pre class="text-xs bg-gray-50 dark:bg-neutral-700 p-2 rounded mb-2 overflow-auto max-h-40">{{
          policyText
        }}</pre>
        <div class="flex gap-2">
          <el-button size="small" @click="fillPolicyFromCurrent">{{ $t('components.cw2centralpanel.extra.loadPublishedPolicy') }}</el-button>
          <el-button size="small" type="primary" :loading="publishingPolicy" @click="doPublishPolicy">
            {{ $t('components.cw2centralpanel.extra.publishPolicy') }}
          </el-button>
        </div>
      </el-collapse-item>
    </el-collapse>
  </el-card>
</template>

<script setup lang="ts">
import { Refresh } from "@element-plus/icons-vue";

const props = defineProps<{ classId: string }>();
const { t } = useI18n();

const COMMAND_TYPES = [
  { value: "refresh_status", label: t('components.cw2centralpanel.refreshStatus'), },
  { value: "show_notification", label: t('components.cw2centralpanel.showNotification'), },
  { value: "restart_app", label: t('components.cw2centralpanel.restartApp'), },
  { value: "apply_config", label: t('components.cw2centralpanel.applyConfig'), },
  { value: "switch_schedule", label: t('components.cw2centralpanel.switchPlan'), },
  { value: "trigger_action", label: t('components.cw2centralpanel.triggerAction'), },
  { value: "apply_class_swap", label: t('components.cw2centralpanel.applySwap'), },
  { value: "restore_class_swap", label: t('components.cw2centralpanel.restoreSwap'), },
  { value: "request_schedule_snapshot", label: t('components.cw2centralpanel.requestPlanSnapshot'), },
  { value: "upload_diagnostics", label: t('components.cw2centralpanel.uploadDiagnostics'), },
] as const;

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const devices = ref<any[]>([]);
const commands = ref<any[]>([]);
const revisions = reactive<{ schedule: any; policy: any }>({ schedule: null, policy: null });
const preview = ref<any>(null);
const pairingResult = ref<any>(null);

const pairing = ref(false);
const previewing = ref(false);
const publishing = ref(false);
const publishingPolicy = ref(false);
const sending = ref(false);

const commandType = ref<string>("refresh_status");
const commandPayload = ref("");
const policyText = ref(
  JSON.stringify({ overrides: {}, locked_keys: [], schedule_readonly: true }, null, 2),
);

const onlineCount = computed(() => devices.value.filter((d) => d.online && !d.revoked).length);

const previewTitle = computed(() => {
  if (!preview.value) return "";
  const { errors = [], warnings = [], schedule } = preview.value;
  if (errors.length) return t('components.cw2centralpanel.extra.previewFailedDetail', { count: errors.length });
  const days = schedule?.days?.length ?? 0;
  const asg = schedule?.assignments?.length ?? 0;
  return (
    t('components.cw2centralpanel.extra.previewSummary', { days, subjects: schedule?.subjects?.length ?? 0, asg }) +
    (warnings.length ? t('components.cw2centralpanel.extra.previewWarningSuffix', { count: warnings.length }) : '')
  );
});

function fmtTime(v: any): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

const q = () => `classId=${encodeURIComponent(props.classId)}`;

async function refreshAll() {
  try {
    const [d, r, c] = await Promise.all([
      $fetch<any>(`/api/v1/console/ci/central/devices?${q()}`, { headers: authHeaders() }),
      $fetch<any>(`/api/v1/console/ci/central/revisions?${q()}`, { headers: authHeaders() }),
      $fetch<any>(`/api/v1/console/ci/central/commands?${q()}`, { headers: authHeaders() }),
    ]);
    devices.value = d.data || [];
    revisions.schedule = r.data?.schedule ?? null;
    revisions.policy = r.data?.policy ?? null;
    commands.value = c.data || [];
  } catch {
    /* 静默：面板不阻塞页面其他部分 */
  }
}

async function doPreview() {
  previewing.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/central/preview/schedule?${q()}`, {
      headers: authHeaders(),
    });
    preview.value = res.data;
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('components.cw2centralpanel.previewFailed'));
  } finally {
    previewing.value = false;
  }
}

async function doPublishSchedule() {
  publishing.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/central/publish/schedule", {
      method: "POST",
      headers: authHeaders(),
      body: { classId: props.classId },
    });
    ElMessage.success(t('components.cw2centralpanel.extra.schedulePublished', { revision: res.data?.revision }));
    if (res.data?.warnings?.length) {
      preview.value = { warnings: res.data.warnings, errors: [], schedule: null };
    }
    await refreshAll();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('components.cw2centralpanel.publishFailed'));
  } finally {
    publishing.value = false;
  }
}

async function doPairingCode() {
  pairing.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/central/pairing-code", {
      method: "POST",
      headers: authHeaders(),
      body: { classId: props.classId, expiresInMinutes: 15 },
    });
    pairingResult.value = res.data;
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('components.cw2centralpanel.issueFailed'));
  } finally {
    pairing.value = false;
  }
}

async function copyPairingCode() {
  try {
    await navigator.clipboard.writeText(pairingResult.value?.code || "");
    ElMessage.success(t('components.cw2centralpanel.pairCodeCopied'));
  } catch {
    ElMessage.error(t('components.cw2centralpanel.copyFailed'));
  }
}

async function revokeDevice(row: any) {
  try {
    await ElMessageBox.confirm(t('components.cw2centralpanel.extra.revokeDeviceConfirm', { name: row.name || row.installationId }), t('components.cw2centralpanel.revokeDevice'), {
      type: "warning",
    });
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/central/devices/${row.id}/revoke`, {
      method: "POST",
      headers: authHeaders(),
    });
    ElMessage.success(t('components.cw2centralpanel.revoked'));
    await refreshAll();
  } catch {
    ElMessage.error(t('components.cw2centralpanel.revokeFailed'));
  }
}

async function doSendCommand() {
  let payload: any = {};
  const raw = commandPayload.value.trim();
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      ElMessage.error(t('components.cw2centralpanel.invalidPayloadJson'));
      return;
    }
  }
  sending.value = true;
  try {
    await $fetch("/api/v1/console/ci/central/commands", {
      method: "POST",
      headers: authHeaders(),
      body: { classId: props.classId, type: commandType.value, payload, expiresInSeconds: 300 },
    });
    ElMessage.success(t('components.cw2centralpanel.dispatchedAwaitingSync'));
    commandPayload.value = "";
    await refreshAll();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('components.cw2centralpanel.dispatchFailed'));
  } finally {
    sending.value = false;
  }
}

async function doPublishPolicy() {
  let policy: any;
  try {
    policy = JSON.parse(policyText.value);
  } catch {
    ElMessage.error(t('components.cw2centralpanel.invalidPolicyJson'));
    return;
  }
  publishingPolicy.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/central/publish/policy", {
      method: "POST",
      headers: authHeaders(),
      body: { classId: props.classId, policy },
    });
    ElMessage.success(t('components.cw2centralpanel.extra.policyPublished', { revision: res.data?.revision }));
    await refreshAll();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('components.cw2centralpanel.publishFailed'));
  } finally {
    publishingPolicy.value = false;
  }
}

function fillPolicyFromCurrent() {
  ElMessage.info(t('components.cw2centralpanel.publishedPolicyHint'));
}

onMounted(refreshAll);
watch(() => props.classId, refreshAll);
</script>
