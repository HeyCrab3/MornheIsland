<template>
  <el-card class="max-w-2xl mt-4">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-medium">Class Widgets 2 集控</span>
        <el-tag size="small" type="info" effect="plain">协议 v1</el-tag>
      </div>
    </template>

    <p class="text-xs text-gray-500 mb-4 leading-relaxed">
      把本班下发给 Class Widgets 2 的集控插件。设备的课表与策略随版本号变化时才重新拉取，
      命令按确认序号增量下发，设备每 10 秒同步一次。
      <br />
      客户端插件目前尚未公开；本面板按官方 <code>contracts/</code> 协议实现，插件到手即可直接连。
    </p>

    <!-- 概览 -->
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-4">
      <span>课表版本：<b>{{ revisions.schedule?.revision ?? "未发布" }}</b></span>
      <span>策略版本：<b>{{ revisions.policy?.revision ?? "未发布" }}</b></span>
      <span>在线设备：<b>{{ onlineCount }} / {{ devices.length }}</b></span>
      <el-button size="small" text type="primary" @click="refreshAll">
        <el-icon class="mr-0.5"><Refresh /></el-icon>刷新
      </el-button>
    </div>

    <!-- 发布 -->
    <div class="flex flex-wrap gap-2 mb-4">
      <el-button size="small" :loading="previewing" @click="doPreview">预览课表转换</el-button>
      <el-button size="small" type="primary" :loading="publishing" @click="doPublishSchedule">
        发布课表
      </el-button>
      <el-button size="small" :loading="pairing" @click="doPairingCode">签发配对码</el-button>
    </div>

    <el-alert v-if="pairingResult" type="success" :closable="false" class="mb-4">
      <template #title>配对码（15 分钟内有效，只能用一次）</template>
      <div class="flex items-center gap-2 mt-2 flex-wrap">
        <code class="text-lg font-mono">{{ pairingResult.code }}</code>
        <el-button size="small" @click="copyPairingCode">复制</el-button>
        <span class="text-xs text-gray-500">
          在教室机器的 Class Widgets 2 集控插件里填入此码完成配对
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
          :title="`转换失败（${preview.errors.length} 项）`"
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
          :title="`有 ${preview.warnings.length} 条警告`"
        >
          <ul class="m-0 pl-4 text-xs">
            <li v-for="(w, i) in preview.warnings" :key="i">{{ w }}</li>
          </ul>
        </el-alert>
        <pre class="text-xs bg-gray-50 dark:bg-neutral-700 p-3 rounded overflow-auto max-h-64">{{
          preview.schedule ? JSON.stringify(preview.schedule, null, 2) : "（无转换结果）"
        }}</pre>
      </el-collapse-item>
    </el-collapse>

    <!-- 设备 -->
    <div class="text-sm font-medium mb-2">已配对设备</div>
    <el-table v-if="devices.length" :data="devices" size="small" class="mb-4">
      <el-table-column label="名称" min-width="120">
        <template #default="{ row }">
          <div class="truncate">{{ row.name || row.installationId }}</div>
          <div class="text-[11px] text-gray-400 truncate">{{ row.platform || "未知平台" }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.revoked ? 'info' : row.online ? 'success' : 'danger'" effect="plain">
            {{ row.revoked ? "已撤销" : row.online ? "在线" : "离线" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="课表/策略" width="90">
        <template #default="{ row }">
          <span class="text-xs">v{{ row.scheduleRevision }} / v{{ row.policyRevision }}</span>
        </template>
      </el-table-column>
      <el-table-column label="最近同步" min-width="130">
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
          >撤销</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div v-else class="text-xs text-gray-400 mb-4">还没有设备配对。</div>

    <!-- 命令 -->
    <el-divider content-position="left">下发命令</el-divider>
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
        placeholder="payload JSON，可选"
        style="width: 260px"
      />
      <el-button size="small" type="primary" :loading="sending" @click="doSendCommand">下发</el-button>
    </div>

    <el-table v-if="commands.length" :data="commands" size="small">
      <el-table-column label="命令" min-width="150">
        <template #default="{ row }">
          <div class="truncate">{{ row.type }}</div>
          <div class="text-[11px] text-gray-400 truncate">{{ fmtTime(row.createdAt) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="序号" width="70">
        <template #default="{ row }"><span class="text-xs">#{{ row.cursor }}</span></template>
      </el-table-column>
      <el-table-column label="回执" min-width="120">
        <template #default="{ row }">
          <span v-if="!row.ackCount" class="text-xs text-gray-400">
            {{ row.expired ? "已过期未回执" : "等待回执" }}
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
    <div v-else class="text-xs text-gray-400">还没有下发过命令。</div>

    <!-- 策略 -->
    <el-collapse class="mt-4">
      <el-collapse-item title="CW2 策略（与 ClassIsland 策略不是一套语义，需单独填）">
        <pre class="text-xs bg-gray-50 dark:bg-neutral-700 p-2 rounded mb-2 overflow-auto max-h-40">{{
          policyText
        }}</pre>
        <div class="flex gap-2">
          <el-button size="small" @click="fillPolicyFromCurrent">载入当前已发布策略</el-button>
          <el-button size="small" type="primary" :loading="publishingPolicy" @click="doPublishPolicy">
            发布策略
          </el-button>
        </div>
      </el-collapse-item>
    </el-collapse>
  </el-card>
</template>

<script setup lang="ts">
import { Refresh } from "@element-plus/icons-vue";

const props = defineProps<{ classId: string }>();

const COMMAND_TYPES = [
  { value: "refresh_status", label: "刷新状态" },
  { value: "show_notification", label: "显示通知" },
  { value: "restart_app", label: "重启应用" },
  { value: "apply_config", label: "应用配置" },
  { value: "switch_schedule", label: "切换课表" },
  { value: "trigger_action", label: "触发动作" },
  { value: "apply_class_swap", label: "应用换课" },
  { value: "restore_class_swap", label: "恢复换课" },
  { value: "request_schedule_snapshot", label: "请求课表快照" },
  { value: "upload_diagnostics", label: "上传诊断" },
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
  if (errors.length) return `预览失败：${errors.length} 项错误`;
  const days = schedule?.days?.length ?? 0;
  const asg = schedule?.assignments?.length ?? 0;
  return `预览：${days} 天 / ${schedule?.subjects?.length ?? 0} 个科目 / ${asg} 条课时${
    warnings.length ? `（${warnings.length} 条警告）` : ""
  }`;
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
    ElMessage.error(e?.data?.msg || "预览失败");
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
    ElMessage.success(`已发布课表 v${res.data?.revision}`);
    if (res.data?.warnings?.length) {
      preview.value = { warnings: res.data.warnings, errors: [], schedule: null };
    }
    await refreshAll();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "发布失败");
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
    ElMessage.error(e?.data?.msg || "签发失败");
  } finally {
    pairing.value = false;
  }
}

async function copyPairingCode() {
  try {
    await navigator.clipboard.writeText(pairingResult.value?.code || "");
    ElMessage.success("已复制配对码");
  } catch {
    ElMessage.error("复制失败");
  }
}

async function revokeDevice(row: any) {
  try {
    await ElMessageBox.confirm(`确定撤销设备「${row.name || row.installationId}」？`, "撤销设备", {
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
    ElMessage.success("已撤销");
    await refreshAll();
  } catch {
    ElMessage.error("撤销失败");
  }
}

async function doSendCommand() {
  let payload: any = {};
  const raw = commandPayload.value.trim();
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      ElMessage.error("payload 不是合法 JSON");
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
    ElMessage.success("已下发，等待设备下次同步");
    commandPayload.value = "";
    await refreshAll();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "下发失败");
  } finally {
    sending.value = false;
  }
}

async function doPublishPolicy() {
  let policy: any;
  try {
    policy = JSON.parse(policyText.value);
  } catch {
    ElMessage.error("策略不是合法 JSON");
    return;
  }
  publishingPolicy.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/central/publish/policy", {
      method: "POST",
      headers: authHeaders(),
      body: { classId: props.classId, policy },
    });
    ElMessage.success(`已发布策略 v${res.data?.revision}`);
    await refreshAll();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "发布失败");
  } finally {
    publishingPolicy.value = false;
  }
}

function fillPolicyFromCurrent() {
  ElMessage.info("已发布策略的内容请用接口查看；这里只做新策略的编辑入口");
}

onMounted(refreshAll);
watch(() => props.classId, refreshAll);
</script>
