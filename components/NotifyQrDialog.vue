<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('components.notifyqrdialog.scanToNotify')"
    width="420px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div v-loading="loading" class="qr-body">
      <div v-if="url" class="qr-img-wrap">
        <QrcodeVue :value="url" :size="200" level="M" render-as="svg" />
      </div>

      <div v-if="url" class="qr-meta">
        <span :class="['qr-dot', online ? 'is-on' : 'is-off']"></span>
        {{ online ? `${online} 台设备在线` : $t('components.notifyqrdialog.noOnlineDevice') }}
        <span class="text-gray-400">{{ $t('components.notifyqrdialog.extra.totalPrefix') }} {{ deviceCount }} {{ $t('components.notifyqrdialog.extra.totalUnit') }}</span>
      </div>

      <el-input v-if="url" :model-value="url" readonly size="small" class="mt-3">
        <template #append>
          <el-button @click="copyUrl">{{ $t('components.notifyqrdialog.extra.copy') }}</el-button>
        </template>
      </el-input>

      <el-alert type="warning" :closable="false" show-icon class="mt-3">
        <template #title>{{ $t('components.notifyqrdialog.extra.qrDoNotShareTitle') }}</template>
        {{ $t('components.notifyqrdialog.extra.qrDoNotShareBody') }}
      </el-alert>

      <el-alert v-if="!url && !loading" type="info" :closable="false" show-icon>
        <template #title>{{ $t('components.notifyqrdialog.extra.noQrTitle') }}</template>
        {{ $t('components.notifyqrdialog.extra.noQrBody') }}
      </el-alert>
    </div>

    <template #footer>
      <el-button v-if="url" type="danger" plain @click="revoke">{{ $t('components.notifyqrdialog.disable') }}</el-button>
      <el-button v-if="url" :loading="rotating" @click="rotate">{{ $t('components.notifyqrdialog.resetQr') }}</el-button>
      <el-button type="primary" @click="emit('update:modelValue', false)">{{ $t('components.notifyqrdialog.extra.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import QrcodeVue from "qrcode.vue";

const { t } = useI18n();

const props = defineProps<{ modelValue: boolean; classId: string; className?: string }>();
const emit = defineEmits<{ "update:modelValue": [boolean] }>();

const loading = ref(false);
const rotating = ref(false);
const url = ref("");
const online = ref(0);
const deviceCount = ref(0);

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

function apply(data: any) {
  url.value = data?.url || "";
  online.value = Number(data?.online) || 0;
  deviceCount.value = Number(data?.deviceCount) || 0;
}

async function load() {
  if (!props.classId) return;
  loading.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/notify-link/${props.classId}`, {
      headers: authHeaders(),
    });
    apply(res?.data);
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('components.notifyqrdialog.fetchQrFailed'));
  } finally {
    loading.value = false;
  }
}

// 每次打开都重新拉一遍，顺便刷新在线设备数
watch(
  () => props.modelValue,
  (v) => {
    if (v) load();
  },
);

function copyUrl() {
  if (!url.value) return;
  navigator.clipboard.writeText(url.value).then(
    () => ElMessage.success(t('components.notifyqrdialog.linkCopied')),
    () => ElMessage.error(t('components.cw2centralpanel.copyFailed')),
  );
}

async function rotate() {
  try {
    await ElMessageBox.confirm(
      t('components.notifyqrdialog.resetConfirmHint'),
      t('components.notifyqrdialog.resetQr'),
      { type: "warning", confirmButtonText: t('components.notifyqrdialog.reset'), cancelButtonText: t('reauth.cancel') },
    );
  } catch {
    return;
  }
  rotating.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/notify-link/${props.classId}/rotate`, {
      method: "POST",
      headers: authHeaders(),
    });
    apply(res?.data);
    ElMessage.success(t('components.notifyqrdialog.resetDone'));
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('components.notifyqrdialog.resetFailed'));
  } finally {
    rotating.value = false;
  }
}

async function revoke() {
  try {
    await ElMessageBox.confirm(
      t('components.notifyqrdialog.disableConfirmHint'),
      t('components.notifyqrdialog.disableQr'),
      { type: "warning", confirmButtonText: t('components.notifyqrdialog.disable'), cancelButtonText: t('reauth.cancel') },
    );
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/notify-link/${props.classId}/revoke`, {
      method: "POST",
      headers: authHeaders(),
    });
    url.value = "";
    online.value = 0;
    deviceCount.value = 0;
    ElMessage.success(t('components.notifyqrdialog.disabled'));
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('components.notifyqrdialog.disableFailed'));
  }
}
</script>

<style scoped>
.qr-body {
  min-height: 80px;
}
.qr-img-wrap {
  display: flex;
  justify-content: center;
  padding: 6px 0 12px;
  background: #fff;
  border-radius: 10px;
}
.qr-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.qr-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.qr-dot.is-on {
  background: #10b981;
}
.qr-dot.is-off {
  background: #ef4444;
}
</style>
