<template>
  <div>
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">{{ $t('sidebar.items.security') }}</h1>
        <p class="text-sm text-gray-500">
          {{ $t('pages.security.extra.subtitle') }}
        </p>
      </div>
      <el-button :loading="loading" @click="load">{{ $t('pages.security.extra.refresh') }}</el-button>
    </div>

    <!-- 概览 -->
    <div class="flex flex-wrap gap-3 mb-5">
      <div class="stat-card">
        <div class="stat-num" :class="overview?.mfaEnabled ? 'text-emerald-500' : 'text-amber-500'">
          {{ overview?.mfaEnabled ? $t('pages.security.enabled') : $t('pages.security.disabled') }}
        </div>
        <div class="stat-label">{{ $t('pages.security.twoFactorAuth') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ overview?.eventCount7d ?? "-" }}</div>
        <div class="stat-label">{{ $t('pages.security.extra.events7d') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" :class="overview?.newIpCount90d ? 'text-amber-500' : ''">
          {{ overview?.newIpCount90d ?? "-" }}
        </div>
        <div class="stat-label">{{ $t('pages.security.extra.newIps90d') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num text-sm leading-tight !font-normal">
          {{ overview?.lastLogin ? fmtTime(overview.lastLogin.at) : $t('pages.security.noRecords') }}
        </div>
        <div class="stat-label">{{ $t('pages.security.extra.lastLogin') }}{{ overview?.lastLogin?.newIp ? $t('pages.security.newIp') : "" }}</div>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2 max-w-5xl">
      <!-- 二步验证 -->
      <el-card>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">{{ $t('pages.security.twoFactorAuth') }}</span>
            <el-tag :type="overview?.mfaEnabled ? 'success' : 'info'" size="small">
              {{ overview?.mfaEnabled ? $t('pages.security.enabled') : $t('pages.security.disabled') }}
            </el-tag>
          </div>
        </template>

        <p class="text-sm text-gray-500 leading-relaxed">
          {{ $t('pages.security.extra.totpDesc') }}
          <span class="text-gray-400">{{ $t('pages.security.extra.totpDescHint') }}</span>
        </p>

        <div class="mt-3 flex flex-wrap gap-2">
          <el-tag :type="overview?.methods?.totp ? 'success' : 'info'" size="small" effect="plain">
            {{ $t('pages.security.extra.totpLabel') }} {{ overview?.methods?.totp ? $t('pages.security.enabled') : $t('pages.security.disabled') }}
          </el-tag>
          <el-tag :type="overview?.methods?.passkey ? 'success' : 'info'" size="small" effect="plain">
            {{ $t('pages.security.extra.passkeyCount', { count: overview?.passkeyCount || 0 }) }}
          </el-tag>
        </div>

        <el-alert
          v-if="!overview?.mfaEnabled"
          type="warning"
          :closable="false"
          show-icon
          class="mt-3"
        >
          <template #title>{{ $t('pages.security.extra.stronglyRecommend') }}</template>
          {{ $t('pages.security.extra.mfaWarning') }}
        </el-alert>

        <div v-if="overview?.mfaEnabledAt" class="text-xs text-gray-400 mt-3">
          {{ $t('pages.security.extra.totpEnabledAtTime', { time: fmtTime(overview.mfaEnabledAt) }) }}
        </div>

        <div class="mt-4 flex gap-2">
          <el-button v-if="!overview?.methods?.totp" type="primary" :loading="setupLoading" @click="startSetup">
            {{ $t('pages.security.extra.bindTotp') }}
          </el-button>
          <el-button v-else type="danger" plain @click="disableMfa">{{ $t('pages.security.disableOtp') }}</el-button>
        </div>
      </el-card>

      <!-- 登录凭证 -->
      <el-card>
        <template #header>
          <span class="font-medium">{{ $t('pages.security.extra.credentials') }}</span>
        </template>

        <p class="text-sm text-gray-500 leading-relaxed">
          {{ $t('pages.security.extra.credentialsDesc') }}
        </p>
        <div class="text-xs text-gray-400 mt-2">{{ $t('pages.security.extra.tokenVersionValue', { version: overview?.tokenVersion ?? 0 }) }}</div>

        <div class="mt-4 flex flex-wrap gap-2">
          <el-button :loading="revoking" @click="revokeOthers">{{ $t('pages.security.signOutOtherDevices') }}</el-button>
          <el-button type="danger" plain :loading="revoking" @click="revokeAll">{{ $t('pages.security.signOutAll') }}</el-button>
        </div>
        <p class="text-xs text-gray-400 mt-3">
          {{ $t('pages.security.extra.revokeHint') }}
        </p>
      </el-card>

      <!-- 通行密钥 -->
      <el-card class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">{{ $t('pages.security.extra.passkeyTitle') }}</span>
            <el-tag :type="passkeys.length ? 'success' : 'info'" size="small">
              {{ passkeys.length ? $t('pages.security.extra.boundCount', { count: passkeys.length }) : $t('pages.security.notBound') }}
            </el-tag>
          </div>
        </template>

        <p class="text-sm text-gray-500 leading-relaxed">
          {{ $t('pages.security.extra.passkeyDesc1') }}
          {{ $t('pages.security.extra.passkeyDesc2Prefix') }}<strong>{{ $t('pages.security.extra.passkeyDesc2Bold') }}</strong>{{ $t('pages.security.extra.passkeyDesc2Suffix') }}
        </p>

        <el-alert
          v-if="!passkeys.length && !overview?.mfaEnabled"
          type="warning"
          :closable="false"
          show-icon
          class="mt-3"
        >
          <template #title>{{ $t('pages.security.extra.configureOneTitle') }}</template>
          {{ $t('pages.security.extra.configureOneBody') }}
        </el-alert>

        <div v-if="passkeys.length" class="mt-3">
          <div v-for="p in passkeys" :key="p._id" class="passkey-row">
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">
                <el-icon class="align-middle mr-1"><Key /></el-icon>{{ p.name }}
              </div>
              <div class="text-xs text-gray-400">
                {{ $t('pages.security.extra.boundAtTime', { time: fmtTime(p.createdAt) }) }}
                <span v-if="p.lastUsedAt">{{ $t('pages.security.extra.lastUsedAtTime', { time: fmtTime(p.lastUsedAt) }) }}</span>
                <span v-else> · {{ $t('pages.security.extra.neverUsed') }}</span>
              </div>
            </div>
            <el-button size="small" type="danger" plain @click="removePasskey(p)">{{ $t('components.resourceeditor.delete') }}</el-button>
          </div>
        </div>

        <div class="mt-4">
          <el-button type="primary" :loading="passkeyLoading" @click="addPasskey">
            {{ $t('pages.security.addPasskey') }}
          </el-button>
          <span class="text-xs text-gray-400 ml-3">{{ $t('pages.security.extra.oneKeyOneAccount') }}</span>
        </div>
      </el-card>
    </div>

    <!-- 记录 -->
    <el-card class="max-w-5xl mt-4" v-loading="logsLoading">
      <template #header>
        <div class="flex items-center justify-between flex-wrap gap-2">
          <span class="font-medium">{{ $t('pages.security.extra.securityLogs') }}</span>
          <el-select v-model="eventFilter" size="small" style="width: 150px" @change="loadLogs">
            <el-option :label="$t('pages.security.allEvents')" value="" />
            <el-option :label="$t('login.errors.loginSuccess')" value="login" />
            <el-option :label="$t('pages.security.loginFailed')" value="login_fail" />
            <el-option :label="$t('pages.security.sensitiveAction')" value="sensitive" />
            <el-option :label="$t('pages.security.revokeCredential')" value="token_revoke" />
            <el-option :label="$t('pages.security.twoFactorAuth')" value="mfa_enable" />
            <el-option :label="$t('pages.security.verificationFailed')" value="mfa_fail" />
          </el-select>
        </div>
      </template>

      <el-empty v-if="!logsLoading && !logs.length" :description="$t('pages.security.noRecordsYet')" :image-size="80" />

      <el-table v-else :data="logs" size="small" style="width: 100%">
        <el-table-column :label="$t('pages.security.extra.time')" width="150">
          <template #default="{ row }">{{ fmtTime(row.at) }}</template>
        </el-table-column>
        <el-table-column :label="$t('pages.security.event')" width="130">
          <template #default="{ row }">
            <el-tag :type="eventMeta(row.event).type" size="small">{{ eventMeta(row.event).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('pages.security.result')" width="70">
          <template #default="{ row }">
            <span :class="row.success === false ? 'text-red-500' : 'text-emerald-600'">
              {{ row.success === false ? $t('pages.security.failure') : $t('pages.security.success') }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="IP" width="140">
          <template #default="{ row }">
            <span class="font-mono text-xs">{{ row.ip || "-" }}</span>
            <el-tag v-if="row.newIp" type="warning" size="small" class="ml-1">{{ $t('pages.security.extra.new') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('dashboard.cards.devices')" width="140">
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ shortUa(row.ua) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('pages.security.description')" min-width="180">
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ row.detail || "-" }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 绑定二步验证 -->
    <el-dialog v-model="setupVisible" :title="$t('pages.security.bindTwoFactor')" width="440px" :close-on-click-modal="false">
      <div v-if="setupData">
        <p class="text-sm text-gray-500 mb-3">
          {{ $t('pages.security.extra.scanAuthenticator') }}
        </p>
        <div class="flex justify-center py-2 bg-white rounded-lg">
          <QrcodeVue :value="setupData.otpauth" :size="180" level="M" render-as="svg" />
        </div>
        <p class="text-xs text-gray-400 mt-2 text-center">{{ $t('pages.security.extra.manualKeyHint') }}</p>
        <el-input :model-value="setupData.secret" readonly size="small" class="mt-1 font-mono">
          <template #append>
            <el-button @click="copy(setupData.secret)">{{ $t('components.notifyqrdialog.extra.copy') }}</el-button>
          </template>
        </el-input>

        <el-alert type="warning" :closable="false" show-icon class="mt-4">
          <template #title>{{ $t('pages.security.extra.recoveryOnceTitle') }}</template>
          {{ $t('pages.security.extra.recoveryOnceBody') }}
        </el-alert>
        <div class="recovery-grid mt-2">
          <code v-for="c in setupData.recoveryCodes" :key="c">{{ c }}</code>
        </div>
        <el-button size="small" class="mt-2" @click="copy(setupData.recoveryCodes.join('\n'))">
          {{ $t('pages.security.extra.copyAllRecoveryCodes') }}
        </el-button>

        <p class="text-sm mt-4 mb-1">{{ $t('pages.security.extra.enterCodeToBind') }}</p>
        <el-input
          v-model="setupCode"
          maxlength="6"
          :placeholder="$t('login.codePlaceholder')"
          @keyup.enter="confirmEnable"
        />
      </div>
      <template #footer>
        <el-button @click="setupVisible = false">{{ $t('pages.profile.later') }}</el-button>
        <el-button type="primary" :loading="enableLoading" :disabled="!setupCode.trim()" @click="confirmEnable">
          {{ $t('pages.security.extra.finishBinding') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.stat-card {
  min-width: 132px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
}
.stat-num {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
}
.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}
.recovery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}
.recovery-grid code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  letter-spacing: 0.5px;
}
.passkey-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 8px;
}
</style>

<script setup lang="ts">
import QrcodeVue from "qrcode.vue";
import { Key } from "@element-plus/icons-vue";
import api from "@/util/api";

definePageMeta({ title: "账号安全", protected: true });

const { t } = useI18n();

const loading = ref(false);
const overview = ref<any>(null);

const logs = ref<any[]>([]);
const logsLoading = ref(false);
const eventFilter = ref("");

const setupVisible = ref(false);
const setupLoading = ref(false);
const enableLoading = ref(false);
const setupData = ref<any>(null);
const setupCode = ref("");

const revoking = ref(false);

const passkeys = ref<any[]>([]);
const passkeyLoading = ref(false);

async function load() {
  loading.value = true;
  try {
    overview.value = await api.get("/v1/user/security/overview");
    await loadPasskeys();
  } finally {
    loading.value = false;
  }
}

/* ---------------- 通行密钥 ---------------- */

function bufToB64u(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64uToBuf(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function loadPasskeys() {
  try {
    passkeys.value = (await api.get("/v1/user/security/webauthn")) || [];
  } catch {
    passkeys.value = [];
  }
}

/** 给钥匙起个能认出来的名字，默认按平台猜一个 */
function guessKeyName(): string {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows Hello";
  if (/iPhone|iPad|iOS/i.test(ua)) return "iPhone / iPad";
  if (/Macintosh/i.test(ua)) return t('pages.security.macTouchId');
  if (/Android/i.test(ua)) return t('pages.security.androidPhone');
  return t('pages.security.passkey');
}

async function addPasskey() {
  if (!window.PublicKeyCredential) {
    ElMessage.error(t('pages.security.passkeyUnsupported'));
    return;
  }
  const named = await ElMessageBox.prompt(t('pages.security.namePasskey'), t('pages.security.addPasskey'), {
    inputValue: guessKeyName(),
    confirmButtonText: t('pages.security.startBinding'),
    cancelButtonText: t('reauth.cancel'),
  }).catch(() => null);
  if (!named) return;

  passkeyLoading.value = true;
  try {
    const opt: any = await api.post("/v1/user/security/webauthn/options", {});
    const publicKey: PublicKeyCredentialCreationOptions = {
      ...opt,
      challenge: b64uToBuf(opt.challenge),
      user: { ...opt.user, id: b64uToBuf(opt.user.id) },
      excludeCredentials: (opt.excludeCredentials || []).map((c: any) => ({
        ...c,
        id: b64uToBuf(c.id),
      })),
    };
    const cred: any = await navigator.credentials.create({ publicKey });
    if (!cred) throw new Error(t('login.errors.noCredential'));

    const res: any = await api.post("/v1/user/security/webauthn/register", {
      challenge: opt.challenge,
      name: String(named.value || guessKeyName()).slice(0, 30),
      credential: {
        id: cred.id,
        type: cred.type,
        response: {
          attestationObject: bufToB64u(cred.response.attestationObject),
          clientDataJSON: bufToB64u(cred.response.clientDataJSON),
        },
      },
    });

    ElMessage.success(t('pages.security.passkeyBound'));
    if (res?.recoveryCodes?.length) {
      await ElMessageBox.alert(
        `<div style="line-height:1.9">${t('pages.security.extra.recoveryGift')}<br/><br/><code style="font-family:ui-monospace;letter-spacing:.08em">${res.recoveryCodes.join(
          "　",
        )}</code><br/><br/><span style="color:#b45309">${t('pages.security.extra.saveItOnce')}</span></div>`,
        t('pages.security.recoveryCodes'),
        { dangerouslyUseHTMLString: true, confirmButtonText: t('pages.security.savedIt') },
      ).catch(() => null);
    }
    await load();
  } catch (e: any) {
    if (e?.name === "NotAllowedError") {
      ElMessage.info(t('login.errors.cancelled'));
    } else {
      ElMessage.error(e?.data?.msg || e?.message || t('pages.security.bindFailed'));
    }
  } finally {
    passkeyLoading.value = false;
  }
}

/** 敏感操作前用钥匙复核一次（不依赖动态码，没开 TOTP 也能用） */
async function reauthViaPasskey(): Promise<boolean> {
  try {
    const opt: any = await api.post("/v1/user/security/webauthn/auth-options", {});
    const publicKey: PublicKeyCredentialRequestOptions = {
      ...opt,
      challenge: b64uToBuf(opt.challenge),
      allowCredentials: (opt.allowCredentials || []).map((c: any) => ({
        ...c,
        id: b64uToBuf(c.id),
      })),
    };
    const cred: any = await navigator.credentials.get({ publicKey });
    if (!cred) return false;
    const r = cred.response;
    await api.post("/v1/user/security/webauthn/verify", {
      challenge: opt.challenge,
      credential: {
        id: cred.id,
        type: cred.type,
        response: {
          authenticatorData: bufToB64u(r.authenticatorData),
          clientDataJSON: bufToB64u(r.clientDataJSON),
          signature: bufToB64u(r.signature),
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

async function removePasskey(p: any, retried = false, confirmed = false) {
  // 「最后一种验证方式」和「还有别的」要说不同的话：前者会关掉两步验证，不能轻描淡写
  const lastOne = passkeys.value.length <= 1 && !overview.value?.totpEnabled;
  if (!confirmed) {
    const okConfirm = await ElMessageBox.confirm(
      lastOne
        ? t('pages.security.extra.lastMethodWarning', { name: p.name })
        : t('pages.security.extra.deletePasskeyMessage', { name: p.name }),
      lastOne ? t('pages.security.willDisableTwoFactor') : t('pages.security.deletePasskey'),
      {
        type: "warning",
        confirmButtonText: lastOne ? t('pages.security.stillDelete') : t('components.resourceeditor.delete'),
        cancelButtonText: t('reauth.cancel'),
      },
    ).catch(() => null);
    if (!okConfirm) return;
  }

  try {
    await api.delete(
      `/v1/user/security/webauthn/${p._id}`,
      lastOne ? { data: { confirmDisableMfa: true } } : undefined,
    );
    ElMessage.success(lastOne ? t('pages.security.deletedTwoFactorOff') : t('components.resourceeditor.deleted'));
    await load();
    await loadLogs();
  } catch (e: any) {
    if (e?.data?.needReauth && !retried) {
      const done = await reauthViaPasskey();
      if (done) return removePasskey(p, true, true);
      ElMessage.warning(t('pages.security.verifyFirst'));
      return;
    }
    if (e?.data?.needConfirm) {
      // 本地状态过期（例如另一个标签页刚开了动态码），按服务端要求再确认一次
      return removePasskey(p, retried, true);
    }
    ElMessage.error(e?.data?.msg || t('pages.security.extra.deleteFailed'));
  }
}

async function loadLogs() {
  logsLoading.value = true;
  try {
    const q = eventFilter.value ? `?event=${eventFilter.value}&limit=100` : "?limit=100";
    logs.value = (await api.get("/v1/user/security/logs" + q)) || [];
  } finally {
    logsLoading.value = false;
  }
}

async function startSetup() {
  setupLoading.value = true;
  try {
    const data: any = await api.post("/v1/user/security/mfa/setup", {});
    setupData.value = data;
    setupCode.value = "";
    setupVisible.value = true;
  } finally {
    setupLoading.value = false;
  }
}

async function confirmEnable() {
  const code = setupCode.value.trim();
  if (!code) return;
  enableLoading.value = true;
  try {
    await api.post("/v1/user/security/mfa/enable", { code });
    ElMessage.success(t('pages.security.twoFactorEnabled'));
    setupVisible.value = false;
    setupData.value = null;
    await load();
    await loadLogs();
  } finally {
    enableLoading.value = false;
  }
}

async function disableMfa() {
  const stillHasPasskey = (overview.value?.passkeyCount || 0) > 0;
  try {
    const { value } = await ElMessageBox.prompt(
      stillHasPasskey
        ? t('pages.security.disableOtpWithPasskeyHint')
        : t('pages.security.disableTwoFactorHint'),
      stillHasPasskey ? t('pages.security.disableOtp') : t('pages.security.disableTwoFactor'),
      { inputPlaceholder: t('login.codePlaceholder'), confirmButtonText: t('pages.security.confirmDisable'), cancelButtonText: t('pages.security.neverMind') },
    );
    await api.post("/v1/user/security/mfa/disable", { code: value });
    ElMessage.success(stillHasPasskey ? t('pages.security.otpDisabledPasskeyValid') : t('pages.security.twoFactorDisabled'));
    await load();
    await loadLogs();
  } catch {
    /* 用户取消或验证失败 */
  }
}

async function revokeOthers() {
  try {
    await ElMessageBox.confirm(
      t('pages.security.signOutOthersConfirm'),
      t('pages.security.signOutOtherDevices'),
      { type: "warning", confirmButtonText: t('components.resourceeditor.confirm'), cancelButtonText: t('reauth.cancel') },
    );
    revoking.value = true;
    const data: any = await api.post("/v1/user/security/revoke-all", { keepCurrent: true });
    if (data?.token) localStorage.setItem("token", data.token);
    ElMessage.success(t('pages.security.signedOutOtherDevices'));
    await load();
    await loadLogs();
  } catch {
    /* 取消 */
  } finally {
    revoking.value = false;
  }
}

async function revokeAll() {
  try {
    await ElMessageBox.confirm(
      t('pages.security.signOutAllConfirm'),
      t('pages.security.signOutAll'),
      { type: "warning", confirmButtonText: t('pages.security.signOutAll'), cancelButtonText: t('reauth.cancel') },
    );
    revoking.value = true;
    await api.post("/v1/user/security/revoke-all", { keepCurrent: false });
    ElMessage.success(t('pages.security.signedOutAll'));
    setTimeout(() => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }, 600);
  } catch {
    /* 取消 */
  } finally {
    revoking.value = false;
  }
}

function fmtTime(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const EVENT_META: Record<string, { label: string; type: any }> = {
  login: { label: t('login.errors.loginSuccess'), type: "success" },
  login_fail: { label: t('pages.security.loginFailed'), type: "danger" },
  logout: { label: t('sidebar.logout'), type: "info" },
  reauth: { label: t('pages.security.secondaryVerification'), type: "warning" },
  reauth_fail: { label: t('pages.security.verificationFailed'), type: "danger" },
  token_revoke: { label: t('pages.security.revokeCredential'), type: "warning" },
  sensitive: { label: t('pages.security.sensitiveAction'), type: "danger" },
  mfa_enable: { label: t('pages.security.enableVerification'), type: "success" },
  mfa_disable: { label: t('pages.security.disableVerification'), type: "warning" },
  mfa_fail: { label: t('pages.security.verificationFailed'), type: "danger" },
};

function eventMeta(e: string) {
  return EVENT_META[e] || { label: e || t('nuxt_config.unknown'), type: "info" };
}

function shortUa(ua?: string | null) {
  if (!ua) return "-";
  const os = /Windows NT 10/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const br = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "";
  return [os, br].filter(Boolean).join(" · ") || ua.slice(0, 24);
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t('components.resourceeditor.copied'));
  } catch {
    ElMessage.warning(t('pages.security.copyFailedManual'));
  }
}

onMounted(() => {
  load();
  loadLogs();
});
</script>
