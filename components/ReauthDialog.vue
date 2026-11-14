<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="440px"
    append-to-body
    modal-class="reauth-overlay"
    :close-on-click-modal="false"
    class="reauth-dialog"
    @closed="onClosed"
  >
    <div class="reauth-body">
      <p class="reauth-reason">{{ reason }}</p>

      <template v-if="!ready">
        <p class="reauth-hint">正在读取你的安全设置…</p>
      </template>

      <template v-else-if="!canVerify">
        <el-alert type="warning" :closable="false" show-icon>
          <template #title>这一步需要重新验证身份</template>
          你的账号还没有开启两步验证，也没有绑定通行密钥。
          请退出后重新登录（登录后 10 分钟内可以直接通过），或在「账号安全」里先开启两步验证。
        </el-alert>
      </template>

      <template v-else>
        <template v-if="methods.totp">
          <el-input
            ref="codeInput"
            v-model="code"
            size="large"
            maxlength="20"
            placeholder="6 位动态码，或一枚恢复码"
            autocomplete="one-time-code"
            @keyup.enter="submitCode"
          />
        </template>

        <div v-if="methods.totp && methods.passkey" class="reauth-or">
          <span>或者</span>
        </div>

        <el-button
          v-if="methods.passkey"
          class="reauth-passkey"
          size="large"
          :loading="passkeyLoading"
          @click="submitPasskey"
        >
          <el-icon class="mr-1"><Key /></el-icon>
          用通行密钥验证
        </el-button>

        <p v-if="error" class="reauth-error">{{ error }}</p>
      </template>
    </div>

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button
        v-if="canVerify && methods.totp"
        type="primary"
        :loading="submitting"
        :disabled="!code.trim()"
        @click="submitCode"
      >
        验证
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Key } from "@element-plus/icons-vue";
import api from "@/util/api";

/**
 * 敏感操作的「再验证」弹窗。
 *
 * 为什么不用 ElMessageBox.prompt：
 * 1. 它只支持一种验证方式（动态码），绑了通行密钥的人用不了；
 * 2. 它是 Element Plus 的 MessageBox，从 el-dialog 里弹出时层级会被父级遮罩盖住。
 * 这里用 el-dialog + append-to-body + 显式高 z-index，保证浮在最上层。
 */

const emit = defineEmits<{ (e: "verified"): void }>();

const visible = ref(false);
const ready = ref(false);
const submitting = ref(false);
const passkeyLoading = ref(false);
const code = ref("");
const error = ref("");
const reason = ref("");
const title = ref("需要重新验证");
const methods = reactive({ totp: false, passkey: false });

const canVerify = computed(() => methods.totp || methods.passkey);
const codeInput = ref<any>(null);

let resolver: ((ok: boolean) => void) | null = null;

/** 打开弹窗并等待结果；true 表示身份已复核通过 */
async function ask(text?: string, heading?: string): Promise<boolean> {
  reason.value = text || "这个操作会影响账号权限，需要先验证是你本人。";
  title.value = heading || "需要重新验证";
  code.value = "";
  error.value = "";
  ready.value = false;
  methods.totp = false;
  methods.passkey = false;

  // 上一次还没关闭就再问一次：先把旧的当作取消
  finish(false);
  visible.value = true;

  try {
    const ov: any = await api.get("/v1/user/security/overview");
    // mfaEnabled 是「任一方式可用」的总开关，具体有没有动态码要看 totpEnabled：
    // 只绑了通行密钥的账号不该出现一个永远填不对的动态码输入框。
    methods.totp = !!ov?.totpEnabled;
    methods.passkey = Number(ov?.passkeyCount || 0) > 0;
  } catch {
    methods.totp = false;
    methods.passkey = false;
  }
  ready.value = true;

  if (methods.totp) nextTick(() => codeInput.value?.focus?.());

  return await new Promise<boolean>((resolve) => {
    resolver = resolve;
  });
}

function finish(ok: boolean) {
  const r = resolver;
  resolver = null;
  if (r) r(ok);
}

function onClosed() {
  // 点右上角 × 或遮罩以外关闭
  finish(false);
}

function cancel() {
  visible.value = false;
  finish(false);
}

async function submitCode() {
  if (!methods.totp || submitting.value) return;
  const value = code.value.trim();
  if (!value) return;
  submitting.value = true;
  error.value = "";
  try {
    await api.post("/v1/user/security/mfa/verify", { code: value });
  } catch (e: any) {
    error.value = e?.data?.msg || e?.message || "验证失败";
    submitting.value = false;
    return;
  }
  submitting.value = false;
  visible.value = false;
  emit("verified");
  finish(true);
}

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

async function submitPasskey() {
  if (!methods.passkey || passkeyLoading.value) return;
  passkeyLoading.value = true;
  error.value = "";
  try {
    const opt: any = await api.post("/v1/user/security/webauthn/auth-options", {});
    const publicKey: PublicKeyCredentialRequestOptions = {
      ...opt,
      challenge: b64uToBuf(opt.challenge),
      allowCredentials: (opt.allowCredentials || []).map((c: any) => ({
        ...c,
        id: b64uToBuf(c.id),
      })),
    } as PublicKeyCredentialRequestOptions;
    const cred: any = await navigator.credentials.get({ publicKey });
    if (!cred) {
      error.value = "没有拿到通行密钥的响应";
      passkeyLoading.value = false;
      return;
    }
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
  } catch (e: any) {
    error.value = e?.data?.msg || e?.message || "通行密钥验证失败";
    passkeyLoading.value = false;
    return;
  }
  passkeyLoading.value = false;
  visible.value = false;
  emit("verified");
  finish(true);
}

defineExpose({ ask });
</script>

<style>
/* 必须是全局样式：弹窗 append-to-body 后挂在 body 上，scoped 选择器够不到遮罩层。
   层级要比页面上任何 el-dialog（默认从 2000 起递增）都高，否则会被表单弹窗盖住。 */
.el-overlay.reauth-overlay {
  z-index: 3200 !important;
}
.el-overlay.reauth-overlay .el-overlay-dialog {
  z-index: 3200;
}
</style>

<style scoped>
.reauth-body {
  padding: 2px 0 4px;
}
.reauth-reason {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}
.reauth-hint {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.reauth-or {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
.reauth-or::before,
.reauth-or::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--el-border-color-lighter);
}
.reauth-passkey {
  width: 100%;
}
.reauth-error {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--el-color-danger);
}
</style>
