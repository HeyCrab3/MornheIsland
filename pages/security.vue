<template>
  <div>
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">账号安全</h1>
        <p class="text-sm text-gray-500">
          二步验证、登录记录、下线设备。账号被盗时，这里是你能第一时间踩刹车的地方。
        </p>
      </div>
      <el-button :loading="loading" @click="load">刷新</el-button>
    </div>

    <!-- 概览 -->
    <div class="flex flex-wrap gap-3 mb-5">
      <div class="stat-card">
        <div class="stat-num" :class="overview?.mfaEnabled ? 'text-emerald-500' : 'text-amber-500'">
          {{ overview?.mfaEnabled ? "已开启" : "未开启" }}
        </div>
        <div class="stat-label">二步验证</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ overview?.eventCount7d ?? "-" }}</div>
        <div class="stat-label">近 7 天安全事件</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" :class="overview?.newIpCount90d ? 'text-amber-500' : ''">
          {{ overview?.newIpCount90d ?? "-" }}
        </div>
        <div class="stat-label">近 90 天新 IP 登录</div>
      </div>
      <div class="stat-card">
        <div class="stat-num text-sm leading-tight !font-normal">
          {{ overview?.lastLogin ? fmtTime(overview.lastLogin.at) : "暂无记录" }}
        </div>
        <div class="stat-label">最近登录{{ overview?.lastLogin?.newIp ? "（新 IP）" : "" }}</div>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2 max-w-5xl">
      <!-- 二步验证 -->
      <el-card>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">二步验证</span>
            <el-tag :type="overview?.mfaEnabled ? 'success' : 'info'" size="small">
              {{ overview?.mfaEnabled ? "已开启" : "未开启" }}
            </el-tag>
          </div>
        </template>

        <p class="text-sm text-gray-500 leading-relaxed">
          除了 SSO 登录，再要第二种验证：验证器 App 里的 6 位动态码，或者一把通行密钥（指纹 / 面容 / 安全密钥）。
          <span class="text-gray-400">两种是并列关系，任意一种可用就算二步验证已开启。</span>
        </p>

        <div class="mt-3 flex flex-wrap gap-2">
          <el-tag :type="overview?.methods?.totp ? 'success' : 'info'" size="small" effect="plain">
            动态码 · {{ overview?.methods?.totp ? "已开启" : "未开启" }}
          </el-tag>
          <el-tag :type="overview?.methods?.passkey ? 'success' : 'info'" size="small" effect="plain">
            通行密钥 · {{ overview?.passkeyCount || 0 }} 把
          </el-tag>
        </div>

        <el-alert
          v-if="!overview?.mfaEnabled"
          type="warning"
          :closable="false"
          show-icon
          class="mt-3"
        >
          <template #title>强烈建议开启</template>
          你的账号里有全校的课表和时间表。这里没有密码可以泄漏，但令牌一旦被拷走，
          对方就能一直用到 30 天后。
        </el-alert>

        <div v-if="overview?.mfaEnabledAt" class="text-xs text-gray-400 mt-3">
          动态码开启于 {{ fmtTime(overview.mfaEnabledAt) }}
        </div>

        <div class="mt-4 flex gap-2">
          <el-button v-if="!overview?.methods?.totp" type="primary" :loading="setupLoading" @click="startSetup">
            绑定动态码
          </el-button>
          <el-button v-else type="danger" plain @click="disableMfa">关闭动态码</el-button>
        </div>
      </el-card>

      <!-- 登录凭证 -->
      <el-card>
        <template #header>
          <span class="font-medium">登录凭证</span>
        </template>

        <p class="text-sm text-gray-500 leading-relaxed">
          登录令牌在别的设备上被拷走，靠改密码是没用的（这里没有密码）。
          一键吊销会让所有已签发的令牌立即失效。
        </p>
        <div class="text-xs text-gray-400 mt-2">当前凭证版本：v{{ overview?.tokenVersion ?? 0 }}</div>

        <div class="mt-4 flex flex-wrap gap-2">
          <el-button :loading="revoking" @click="revokeOthers">下线其他设备</el-button>
          <el-button type="danger" plain :loading="revoking" @click="revokeAll">全部下线</el-button>
        </div>
        <p class="text-xs text-gray-400 mt-3">
          「下线其他设备」会保留当前浏览器；「全部下线」连自己一起踢，需要重新登录。
        </p>
      </el-card>

      <!-- 通行密钥 -->
      <el-card class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">通行密钥（Passkey）</span>
            <el-tag :type="passkeys.length ? 'success' : 'info'" size="small">
              {{ passkeys.length ? `已绑定 ${passkeys.length} 个` : "未绑定" }}
            </el-tag>
          </div>
        </template>

        <p class="text-sm text-gray-500 leading-relaxed">
          用手机指纹、Windows Hello 或硬件密钥代替动态码，登录时按一下就行，不用再抄 6 位数字。
          和动态码是<strong>并列</strong>的两种方式，绑了钥匙也可以继续用动态码。
        </p>

        <el-alert
          v-if="!passkeys.length && !overview?.mfaEnabled"
          type="warning"
          :closable="false"
          show-icon
          class="mt-3"
        >
          <template #title>至少配一种</template>
          绑通行密钥或开启动态码都可以，两者都没有时，令牌被拷走就等于账号被接管。
        </el-alert>

        <div v-if="passkeys.length" class="mt-3">
          <div v-for="p in passkeys" :key="p._id" class="passkey-row">
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">
                <el-icon class="align-middle mr-1"><Key /></el-icon>{{ p.name }}
              </div>
              <div class="text-xs text-gray-400">
                绑定于 {{ fmtTime(p.createdAt) }}
                <span v-if="p.lastUsedAt"> · 最后使用 {{ fmtTime(p.lastUsedAt) }}</span>
                <span v-else> · 还没用过</span>
              </div>
            </div>
            <el-button size="small" type="danger" plain @click="removePasskey(p)">删除</el-button>
          </div>
        </div>

        <div class="mt-4">
          <el-button type="primary" :loading="passkeyLoading" @click="addPasskey">
            添加通行密钥
          </el-button>
          <span class="text-xs text-gray-400 ml-3">同一把钥匙只能绑一个账号</span>
        </div>
      </el-card>
    </div>

    <!-- 记录 -->
    <el-card class="max-w-5xl mt-4" v-loading="logsLoading">
      <template #header>
        <div class="flex items-center justify-between flex-wrap gap-2">
          <span class="font-medium">登录与安全记录</span>
          <el-select v-model="eventFilter" size="small" style="width: 150px" @change="loadLogs">
            <el-option label="全部事件" value="" />
            <el-option label="登录成功" value="login" />
            <el-option label="登录失败" value="login_fail" />
            <el-option label="敏感操作" value="sensitive" />
            <el-option label="吊销凭证" value="token_revoke" />
            <el-option label="二步验证" value="mfa_enable" />
            <el-option label="验证失败" value="mfa_fail" />
          </el-select>
        </div>
      </template>

      <el-empty v-if="!logsLoading && !logs.length" description="还没有记录" :image-size="80" />

      <el-table v-else :data="logs" size="small" style="width: 100%">
        <el-table-column label="时间" width="150">
          <template #default="{ row }">{{ fmtTime(row.at) }}</template>
        </el-table-column>
        <el-table-column label="事件" width="130">
          <template #default="{ row }">
            <el-tag :type="eventMeta(row.event).type" size="small">{{ eventMeta(row.event).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="结果" width="70">
          <template #default="{ row }">
            <span :class="row.success === false ? 'text-red-500' : 'text-emerald-600'">
              {{ row.success === false ? "失败" : "成功" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="IP" width="140">
          <template #default="{ row }">
            <span class="font-mono text-xs">{{ row.ip || "-" }}</span>
            <el-tag v-if="row.newIp" type="warning" size="small" class="ml-1">新</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="设备" width="140">
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ shortUa(row.ua) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="说明" min-width="180">
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ row.detail || "-" }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 绑定二步验证 -->
    <el-dialog v-model="setupVisible" title="绑定二步验证" width="440px" :close-on-click-modal="false">
      <div v-if="setupData">
        <p class="text-sm text-gray-500 mb-3">
          用验证器 App（Microsoft Authenticator、Google Authenticator、1Password 等）扫描二维码：
        </p>
        <div class="flex justify-center py-2 bg-white rounded-lg">
          <QrcodeVue :value="setupData.otpauth" :size="180" level="M" render-as="svg" />
        </div>
        <p class="text-xs text-gray-400 mt-2 text-center">扫不了？手动输入密钥：</p>
        <el-input :model-value="setupData.secret" readonly size="small" class="mt-1 font-mono">
          <template #append>
            <el-button @click="copy(setupData.secret)">复制</el-button>
          </template>
        </el-input>

        <el-alert type="warning" :closable="false" show-icon class="mt-4">
          <template #title>恢复码只显示这一次</template>
          手机丢了就靠它们登录，每枚只能用一次。请抄到纸上或存进离线笔记，
          不要截图放在这台电脑上。
        </el-alert>
        <div class="recovery-grid mt-2">
          <code v-for="c in setupData.recoveryCodes" :key="c">{{ c }}</code>
        </div>
        <el-button size="small" class="mt-2" @click="copy(setupData.recoveryCodes.join('\n'))">
          复制全部恢复码
        </el-button>

        <p class="text-sm mt-4 mb-1">输入验证器里显示的 6 位动态码以完成绑定：</p>
        <el-input
          v-model="setupCode"
          maxlength="6"
          placeholder="6 位动态码"
          @keyup.enter="confirmEnable"
        />
      </div>
      <template #footer>
        <el-button @click="setupVisible = false">稍后再说</el-button>
        <el-button type="primary" :loading="enableLoading" :disabled="!setupCode.trim()" @click="confirmEnable">
          完成绑定
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
  if (/Macintosh/i.test(ua)) return "Mac 触控 ID";
  if (/Android/i.test(ua)) return "Android 手机";
  return "通行密钥";
}

async function addPasskey() {
  if (!window.PublicKeyCredential) {
    ElMessage.error("这个浏览器不支持通行密钥");
    return;
  }
  const named = await ElMessageBox.prompt("给这个通行密钥起个名字", "添加通行密钥", {
    inputValue: guessKeyName(),
    confirmButtonText: "开始绑定",
    cancelButtonText: "取消",
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
    if (!cred) throw new Error("没有拿到凭据");

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

    ElMessage.success("已绑定通行密钥");
    if (res?.recoveryCodes?.length) {
      await ElMessageBox.alert(
        `<div style="line-height:1.9">绑好了。再送你一组恢复码 —— 万一哪天钥匙丢了、手机也没了，这是最后一条路。<br/><br/><code style="font-family:ui-monospace;letter-spacing:.08em">${res.recoveryCodes.join(
          "　",
        )}</code><br/><br/><span style="color:#b45309">只显示这一次，请自己存好。</span></div>`,
        "恢复码",
        { dangerouslyUseHTMLString: true, confirmButtonText: "我已保存" },
      ).catch(() => null);
    }
    await load();
  } catch (e: any) {
    if (e?.name === "NotAllowedError") {
      ElMessage.info("已取消");
    } else {
      ElMessage.error(e?.data?.msg || e?.message || "绑定失败");
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
        ? `「${p.name}」是你最后一种两步验证方式。删除后两步验证会被关闭——之后只凭一枚登录令牌就能进入你的账号，令牌被拷走就能一直用到 30 天后。确定要删除吗？`
        : `删除后「${p.name}」就不能用来登录了，确定吗？`,
      lastOne ? "这将会关闭两步验证" : "删除通行密钥",
      {
        type: "warning",
        confirmButtonText: lastOne ? "仍然删除" : "删除",
        cancelButtonText: "取消",
      },
    ).catch(() => null);
    if (!okConfirm) return;
  }

  try {
    await api.delete(
      `/v1/user/security/webauthn/${p._id}`,
      lastOne ? { data: { confirmDisableMfa: true } } : undefined,
    );
    ElMessage.success(lastOne ? "已删除，两步验证已关闭" : "已删除");
    await load();
    await loadLogs();
  } catch (e: any) {
    if (e?.data?.needReauth && !retried) {
      const done = await reauthViaPasskey();
      if (done) return removePasskey(p, true, true);
      ElMessage.warning("请先在「二步验证」里完成一次验证，或重新登录后再试");
      return;
    }
    if (e?.data?.needConfirm) {
      // 本地状态过期（例如另一个标签页刚开了动态码），按服务端要求再确认一次
      return removePasskey(p, retried, true);
    }
    ElMessage.error(e?.data?.msg || "删除失败");
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
    ElMessage.success("二步验证已开启");
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
        ? "关闭后就不再需要输入动态码，两步验证将由通行密钥承担。请输入当前的 6 位动态码（或用一枚恢复码）确认。"
        : "关闭二步验证后，只凭一枚令牌就能登录。请输入当前的 6 位动态码（或用一枚恢复码）确认。",
      stillHasPasskey ? "关闭动态码" : "关闭二步验证",
      { inputPlaceholder: "6 位动态码", confirmButtonText: "确认关闭", cancelButtonText: "算了" },
    );
    await api.post("/v1/user/security/mfa/disable", { code: value });
    ElMessage.success(stillHasPasskey ? "已关闭动态码，通行密钥仍有效" : "已关闭二步验证");
    await load();
    await loadLogs();
  } catch {
    /* 用户取消或验证失败 */
  }
}

async function revokeOthers() {
  try {
    await ElMessageBox.confirm(
      "其他设备上的登录会立即失效，当前浏览器保持登录。确定吗？",
      "下线其他设备",
      { type: "warning", confirmButtonText: "确定", cancelButtonText: "取消" },
    );
    revoking.value = true;
    const data: any = await api.post("/v1/user/security/revoke-all", { keepCurrent: true });
    if (data?.token) localStorage.setItem("token", data.token);
    ElMessage.success("已下线其他设备");
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
      "所有设备（包括当前浏览器）都会被强制下线，你需要重新登录一次。确定吗？",
      "全部下线",
      { type: "warning", confirmButtonText: "全部下线", cancelButtonText: "取消" },
    );
    revoking.value = true;
    await api.post("/v1/user/security/revoke-all", { keepCurrent: false });
    ElMessage.success("已全部下线，正在跳转登录");
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
  login: { label: "登录成功", type: "success" },
  login_fail: { label: "登录失败", type: "danger" },
  logout: { label: "退出登录", type: "info" },
  reauth: { label: "二次校验", type: "warning" },
  reauth_fail: { label: "校验失败", type: "danger" },
  token_revoke: { label: "吊销凭证", type: "warning" },
  sensitive: { label: "敏感操作", type: "danger" },
  mfa_enable: { label: "开启验证", type: "success" },
  mfa_disable: { label: "关闭验证", type: "warning" },
  mfa_fail: { label: "验证失败", type: "danger" },
};

function eventMeta(e: string) {
  return EVENT_META[e] || { label: e || "未知", type: "info" };
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
    ElMessage.success("已复制");
  } catch {
    ElMessage.warning("复制失败，请手动选中");
  }
}

onMounted(() => {
  load();
  loadLogs();
});
</script>
