<template>
  <h2 class="text-xl font-semibold mb-1">{{ $t('login.welcome') }}</h2>
  <p class="text-sm text-gray-500 dark:text-gray-400 my-1 mb-4">
    {{ $t('login.subtitle') }}
  </p>

  <div class="custom-style">
    <el-segmented
      class="mb-4"
      v-model="loginMode"
      :options="loginModeOptions"
      block
    />
  </div>

  <template v-if="loginMode == loginModeOptions[0]">
    <el-button
      :loading="loginLoading"
      type="primary"
      size="large"
      class="w-full mb-3"
      @click="loginByCrabCity"
    >
      <span class="flex items-center justify-center gap-2">
        {{ $t('login.viaCrabCity') }}
      </span>
    </el-button>
    <br />
    <el-button
      :loading="loginLoading"
      size="large"
      class="w-full mb-3"
      @click="loginBySTCN"
    >
      {{ $t('login.viaStcn') }}
    </el-button>
  </template>

  <template v-if="loginMode == loginModeOptions[1]">
    <!-- 第一步：登录名 + 密码 -->
    <template v-if="!mfaTicket">
      <div class="mb-3">
        <el-input
          v-model="subForm.login"
          size="large"
          :placeholder="$t('login.subLoginPlaceholder')"
          autocomplete="username"
          @keyup.enter="doSubLogin()"
        ></el-input>
      </div>

      <div class="mb-3">
        <el-input
          v-model="subForm.password"
          type="password"
          size="large"
          :placeholder="$t('login.passwordPlaceholder')"
          show-password
          autocomplete="current-password"
          @keyup.enter="doSubLogin()"
        />
      </div>

      <el-button
        type="primary"
        size="large"
        class="w-full mb-3"
        :loading="subLoading"
        @click="doSubLogin()"
      >
        {{ $t('login.login') }}
      </el-button>

      <p class="text-xs text-neutral-400 text-center">
        {{ $t('pages.login.subAccountHintBefore') }}
        <b>{{ $t('pages.login.subAccountHintBold') }}</b>{{ $t('pages.login.subAccountHintAfter') }}
      </p>
    </template>

    <!-- 第二步：两步验证。外观必须与 /callback 完全一致，否则用户会怀疑是不是假站 -->
    <template v-else>
      <div class="text-center">
        <div class="mfa-icon">
          <el-icon :size="30"><Key /></el-icon>
        </div>
        <h3 class="text-base font-semibold mt-2">{{ $t('login.mfaTitle') }}</h3>
        <p class="text-xs text-neutral-500 mt-1">
          {{ $t('login.mfaDesc') }}
        </p>
      </div>

      <el-input
        v-model="subForm.code"
        class="mt-4"
        size="large"
        maxlength="12"
        :placeholder="$t('login.codePlaceholder')"
        :disabled="subLoading"
        @keyup.enter="doSubLogin(true)"
      >
        <template #prefix>
          <el-icon><Key /></el-icon>
        </template>
      </el-input>

      <el-button
        type="primary"
        class="w-full mt-3"
        size="large"
        :loading="subLoading"
        :disabled="!subForm.code.trim()"
        @click="doSubLogin(true)"
      >
        {{ $t('login.verifyAndLogin') }}
      </el-button>

      <p v-if="subError" class="text-xs text-red-500 mt-2 text-center">
        {{ subError }}
      </p>

      <p class="text-xs text-neutral-400 mt-4 text-center leading-relaxed">
        {{ $t('login.recoveryHint') }}
      </p>

      <template v-if="subMethods.passkey">
        <div class="mfa-or"><span>{{ $t('login.or') }}</span></div>
        <el-button
          class="w-full"
          size="large"
          :loading="passkeyLoading"
          @click="subPasskey"
        >
          <el-icon class="mr-1"><Key /></el-icon>{{ $t('login.passkey') }}
        </el-button>
        <p class="text-xs text-neutral-400 mt-2 text-center">
          {{ $t('login.passkeyHint') }}
        </p>
      </template>

      <p class="text-xs text-center mt-2">
        <a class="text-[var(--mi-brand)] cursor-pointer" @click="resetMfa"
          >{{ $t('login.backToPassword') }}</a
        >
      </p>
    </template>
  </template>

  <p class="text-xs text-gray-400 mt-4 text-center">
    {{ $t('login.agreePrefix') }}
    <NuxtLink to="/terms" class="text-blue-500 hover:underline"
      >《{{ $t('sidebar.userAgreement') }}》</NuxtLink
    >
    {{ $t('pages.login.agreementBetween') }}
    <NuxtLink to="/privacy" class="text-blue-500 hover:underline"
      >《{{ $t('sidebar.privacyPolicy') }}》</NuxtLink
    >{{ $t('pages.login.agreementAfter') }}
  </p>
  <p class="text-xs text-gray-400 mt-2 text-center">
    {{ $t('login.delegateHint') }}
    <NuxtLink to="/d" class="text-blue-500 hover:underline"
      >{{ $t('login.delegateLink') }}</NuxtLink
    >
  </p>
</template>

<style>
.custom-style .el-segmented {
  --el-segmented-item-selected-color: #000000;
  --el-segmented-item-selected-bg-color: #eceaea;
  --el-border-radius-base: 10px;
}
</style>

<script setup lang="ts">
import { Key } from "@element-plus/icons-vue";
import api from "@/util/api";

const { t } = useI18n();

const loginLoading = ref(false);
const loginModeOptions = computed(() => [
  t('login.modeMain'),
  t('login.modeSub'),
]);
const loginMode = ref(loginModeOptions.value[0]);

async function ssoLogin(
  channel: number,
  authorizeUrl: string,
  clientId: string,
) {
  try {
    loginLoading.value = true;
    const state = await api.get("/v1/user/sso/generateState");
    if (state) {
      window.open(
        `${authorizeUrl}/login/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(`${window.location.origin}/callback?loginChannel=${channel}`)}&scope=openid profile email phone&state=${state}`,
        "_self",
      );
      ElMessage.success(t('login.errors.redirecting'));
    } else {
      ElMessage.error(t('login.errors.loginFailed'));
    }
  } catch {
    ElMessage.error(t('login.errors.loginFailed'));
  } finally {
    loginLoading.value = false;
  }
}

const loginByCrabCity = () =>
  ssoLogin(1, "https://id.crabapi.cn", "bdf051dd1e6323ce5b16");
const loginBySTCN = () =>
  ssoLogin(2, "https://auth.smart-teach.cn", "4b00709e8abb3c32ed94");

/**
 * 登录后回跳。
 *
 * 背景：邀请链接 `/schools/join/<token>` 是 protected 页面，未登录会被送到
 * /login。OAuth 往返会经过外站再回到 /callback，路由 query 活不下来，
 * 所以把目标地址存进 localStorage，登录成功后由 callback.vue 取出来跳回去。
 * 不这么做的话，别人点邀请链接 = 登录完落到首页，链接白点了。
 */
const route = useRoute();
const REDIRECT_KEY = "mi-login-redirect";

function stashRedirect(raw: unknown) {
  if (!import.meta.client) return;
  const target = String(raw ?? "").trim();
  // 只接受站内相对路径，杜绝 //evil.com 这类开放重定向
  if (!target.startsWith("/") || target.startsWith("//")) return;
  try {
    localStorage.setItem(REDIRECT_KEY, target);
  } catch {
    /* 隐私模式下忽略 */
  }
}

onMounted(() => {
  stashRedirect(route.query.redirect);
});

/**
 * 子账号登录
 *
 * 与 SSO 那条链路的区别：不发 code、不跳转，直接拿登录名 + 密码换令牌。
 * 开了两步验证的账号分两步：第一次返回 needMfa + ticket，第二次带验证码换令牌。
 */
const subLoading = ref(false);
const passkeyLoading = ref(false);
const mfaTicket = ref("");
const subError = ref("");
/** 这个账号支持哪几种第二步：有通行密钥的人不该被迫去抄动态码 */
const subMethods = ref<{ totp: boolean; passkey: boolean }>({
  totp: true,
  passkey: false,
});
const subForm = reactive({ login: "", password: "", code: "" });

function resetMfa() {
  mfaTicket.value = "";
  subError.value = "";
  subForm.code = "";
}

// 切回主账号登录 / 切走再回来时，别把上一轮的票据和错误留在界面上
watch(loginMode, () => {
  resetMfa();
  subForm.password = "";
});

/** 拿到令牌后的统一收尾：存令牌 → 拉用户与能力位 → 回到来时的地方 */
async function finishLogin(token: string) {
  localStorage.setItem("token", token);
  await useUserStore().fetchUserData();
  ElMessage.success(t('login.errors.loginSuccess'));

  let target = "/classes";
  try {
    const saved = localStorage.getItem("mi-login-redirect");
    if (saved && saved.startsWith("/") && !saved.startsWith("//")) target = saved;
    localStorage.removeItem("mi-login-redirect");
  } catch {
    /* 隐私模式下忽略 */
  }
  await navigateTo(target);
}

async function doSubLogin(withCode = false) {
  if (subLoading.value) return;
  if (!withCode && (!subForm.login.trim() || !subForm.password)) {
    ElMessage.warning(t('login.errors.needLoginNameAndPassword'));
    return;
  }
  if (withCode && !subForm.code.trim()) {
    ElMessage.warning(t('login.errors.needCode'));
    return;
  }
  subLoading.value = true;
  subError.value = "";
  try {
    const payload = withCode
      ? { ticket: mfaTicket.value, code: subForm.code.trim() }
      : { login: subForm.login.trim().toLowerCase(), password: subForm.password };

    // util/api 的拦截器会把 code!==0 直接弹错误并抛出，成功时返回 body.data
    const data: any = await api.post("/v1/public/subaccount/login", payload);

    // 开了两步验证：这次只给了 5 分钟票据，没有令牌
    if (data?.ticket && !data?.token) {
      mfaTicket.value = data.ticket;
      const m = data.methods || {};
      subMethods.value = { totp: m.totp !== false, passkey: !!m.passkey };
      subForm.password = "";
      subForm.code = "";
      return;
    }

    const token = pickToken(data);
    if (!token) {
      subError.value = t('login.errors.loginFailed');
      return;
    }

    await finishLogin(token);
  } catch (e: any) {
    // 错误提示已由拦截器统一弹出（含「还可尝试 N 次」这类文案），这里额外留在页面上
    const msg = String(e?.message || "");
    subError.value = msg;
    if (msg.includes("票据") || msg.includes("重新登录")) {
      resetMfa();
      ElMessage.warning(t('login.errors.ticketExpired'));
      return;
    }
    subForm.code = "";
  } finally {
    subLoading.value = false;
  }
}

/* ---------------- 通行密钥（与 /callback 同一套实现） ---------------- */

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

/**
 * 登录成功时后端有两种返回形态：
 *   SSO / 通行密钥 → data 直接是令牌字符串
 *   子账户密码     → data 是 { token, user }
 * 这里统一取出来，别再让「data.token」这种写法把字符串当成对象。
 */
function pickToken(res: any): string {
  if (typeof res === "string") return res;
  if (res && typeof res === "object" && typeof res.token === "string") return res.token;
  return "";
}

async function subPasskey() {
  if (passkeyLoading.value || !mfaTicket.value) return;
  passkeyLoading.value = true;
  subError.value = "";
  try {
    const opt: any = await api.post("/v1/public/webauthn/login-options", {
      ticket: mfaTicket.value,
    });
    const publicKey: PublicKeyCredentialRequestOptions = {
      ...opt,
      challenge: b64uToBuf(opt.challenge),
      allowCredentials: (opt.allowCredentials || []).map((c: any) => ({
        ...c,
        id: b64uToBuf(c.id),
      })),
    };
    const cred: any = await navigator.credentials.get({ publicKey });
    if (!cred) throw new Error(t('login.errors.noCredential'));
    const r = cred.response;

    const res: any = await api.post("/v1/public/webauthn/login", {
      ticket: mfaTicket.value,
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
    const token = pickToken(res);
    if (!token) {
      subError.value = t('pages.callback.loginFailedRetry');
      return;
    }
    await finishLogin(token);
  } catch (e: any) {
    if (e?.name === "NotAllowedError") {
      subError.value = t('login.errors.cancelled');
      return;
    }
    const msg = String(e?.message || e || "");
    subError.value = msg || t('login.errors.passkeyFailed');
    if (msg.includes("票据") || msg.includes("重新登录")) {
      resetMfa();
      ElMessage.warning(t('login.errors.ticketExpired'));
    }
  } finally {
    passkeyLoading.value = false;
  }
}

definePageMeta({
  layout: "login",
  title: "登录",
});
</script>
