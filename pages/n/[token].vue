<template>
  <div class="mnp-root">
    <div class="mnp-card">
      <div class="mnp-head">
        <div class="mnp-title">{{ $t('pages.n.token.classNotification') }}</div>
        <div v-if="className" class="mnp-sub">{{ className }}</div>
      </div>

      <div v-if="state === 'loading'" class="mnp-center">{{ $t('pages.n.token.extra.loading') }}</div>

      <div v-else-if="state === 'invalid'" class="mnp-center">
        <div class="mnp-invalid">{{ $t('pages.n.token.extra.qrInvalid') }}</div>
        <div class="mnp-hint">{{ $t('pages.n.token.extra.qrInvalidHint') }}</div>
      </div>

      <template v-else>
        <div class="mnp-status" :class="online ? 'is-on' : 'is-off'">
          <span class="mnp-dot"></span>
          {{ online ? $t('pages.n.token.onlineDevices', { count: online }) : $t('pages.n.token.deviceOffline') }}
        </div>

        <el-input
          v-model="message"
          type="textarea"
          :rows="4"
          maxlength="200"
          show-word-limit
          :placeholder="$t('pages.n.token.enterNotificationForBoard')"
          class="mnp-textarea"
        />

        <div class="mnp-options">
          <el-checkbox v-model="isEmergency">{{ $t('pages.n.token.extra.emergency') }}</el-checkbox>
          <el-checkbox v-model="isTopmost">{{ $t('pages.n.token.extra.topmost') }}</el-checkbox>
          <el-checkbox v-model="isSoundEnabled">{{ $t('pages.n.token.extra.sound') }}</el-checkbox>
        </div>

        <div class="mnp-slider">
          <span class="mnp-slider-label">{{ $t('pages.n.token.extra.durationLabel') }}</span>
          <el-slider v-model="durationSeconds" :min="0" :max="120" :step="10" class="mnp-slider-ctl" />
          <span class="mnp-slider-val">{{ durationSeconds ? $t('pages.n.token.seconds', { count: durationSeconds }) : $t('pages.n.token.doNotAutoClose') }}</span>
        </div>

        <el-button
          type="primary"
          size="large"
          class="mnp-send"
          :loading="sending"
          :disabled="!online || !message.trim()"
          @click="send"
        >
          {{ $t('pages.n.token.extra.sendNotification') }}
        </el-button>

        <div class="mnp-warn">
          {{ $t('pages.n.token.extra.qrWarning') }}
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, title: "班级通知" });

const { t } = useI18n();

const route = useRoute();
const token = String(route.params.token ?? "");

const state = ref<"loading" | "ok" | "invalid">("loading");
const className = ref("");
const online = ref(0);

const message = ref("");
const isEmergency = ref(false);
const isTopmost = ref(false);
const isSoundEnabled = ref(true);
const durationSeconds = ref(10);
const sending = ref(false);

async function load() {
  state.value = "loading";
  try {
    const res: any = await $fetch(`/api/v1/public/notify/${token}`);
    className.value = res?.data?.className || "";
    online.value = Number(res?.data?.online) || 0;
    state.value = "ok";
  } catch {
    state.value = "invalid";
  }
}

async function send() {
  const text = message.value.trim();
  if (!text) return;
  sending.value = true;
  try {
    const res: any = await $fetch(`/api/v1/public/notify/${token}`, {
      method: "POST",
      body: {
        message: text,
        isEmergency: isEmergency.value,
        isTopmost: isTopmost.value,
        isSoundEnabled: isSoundEnabled.value,
        durationSeconds: durationSeconds.value,
      },
    });
    const sent = Number(res?.data?.sent) || 0;
    ElMessage.success(t('pages.n.token.sentTo', { count: sent }));
    message.value = "";
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('pages.n.token.sendFailed'));
  } finally {
    sending.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.mnp-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  background: #f5f7fa;
  box-sizing: border-box;
}
.mnp-card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 14px;
  padding: 22px 20px;
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}
.mnp-head {
  margin-bottom: 14px;
}
.mnp-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}
.mnp-sub {
  font-size: 13px;
  color: #6b7280;
  margin-top: 3px;
}
.mnp-center {
  padding: 32px 0;
  text-align: center;
}
.mnp-invalid {
  font-size: 16px;
  font-weight: 600;
  color: #ef4444;
}
.mnp-hint {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 8px;
  line-height: 1.6;
}
.mnp-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 12px;
}
.mnp-status.is-on {
  background: #ecfdf5;
  color: #059669;
}
.mnp-status.is-off {
  background: #fef2f2;
  color: #dc2626;
}
.mnp-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.mnp-textarea {
  margin-bottom: 12px;
}
.mnp-options {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-bottom: 8px;
}
.mnp-slider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.mnp-slider-label {
  font-size: 13px;
  color: #6b7280;
  flex-shrink: 0;
}
.mnp-slider-ctl {
  flex: 1;
  min-width: 80px;
}
.mnp-slider-val {
  font-size: 13px;
  color: #374151;
  min-width: 68px;
  text-align: right;
  flex-shrink: 0;
}
.mnp-send {
  width: 100%;
}
.mnp-warn {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.7;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 10px 12px;
}
</style>
