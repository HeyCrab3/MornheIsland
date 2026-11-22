<template>
  <div class="max-w-md">
    <h1 class="text-2xl font-semibold mb-6">{{ $t('sidebar.items.profile') }}</h1>

    <el-card>
      <!-- 用户信息 -->
      <div class="flex items-center gap-4 mb-6">
        <el-avatar :size="56" class="text-xl font-bold" style="background: var(--mi-brand)">
          {{ userStore.userName?.charAt(0)?.toUpperCase() || '?' }}
        </el-avatar>
        <div>
          <div class="text-lg font-medium">{{ userStore.userName || $t('api.notLoggedIn') }}</div>
          <div class="text-sm text-gray-400 font-mono">UID: {{ userStore.userId }}</div>
        </div>
      </div>

      <el-divider />

      <!-- 操作 -->
      <div class="space-y-3">
        <el-button class="w-full" @click="navigateTo('/security')">
          <el-icon class="mr-1"><Key /></el-icon>{{ $t('pages.profile.extra.securityEntry') }}
        </el-button>

        <el-button class="w-full" @click="doLogout">
          <el-icon class="mr-1"><SwitchButton /></el-icon>{{ $t('sidebar.logout') }}
        </el-button>

        <el-button class="w-full" type="danger" plain @click="startDeleteAccount">
          <el-icon class="mr-1"><WarningFilled /></el-icon>{{ $t('pages.profile.extra.deleteService') }}
        </el-button>
      </div>

      <el-divider />

      <!-- 法律链接 -->
      <div class="space-y-2 text-sm">
        <a
          href="https://crabcity.heycrab.xyz/terms"
          target="_blank"
          class="flex items-center justify-between text-gray-600 hover:text-[var(--mi-brand)] no-underline"
        >
          {{ $t('sidebar.userAgreement') }}
          <el-icon><Link /></el-icon>
        </a>
        <a
          href="https://crabcity.heycrab.xyz/privacy"
          target="_blank"
          class="flex items-center justify-between text-gray-600 hover:text-[var(--mi-brand)] no-underline"
        >
          {{ $t('sidebar.privacyPolicy') }}
          <el-icon><Link /></el-icon>
        </a>
      </div>
    </el-card>

    <!-- 注销账号前的再验证：支持动态码与通行密钥 -->
    <ReauthDialog ref="reauthRef" />
  </div>
</template>

<script setup lang="ts">
import { SwitchButton, WarningFilled, Link, Key } from "@element-plus/icons-vue";

definePageMeta({ title: "用户中心", protected: true });

const { t } = useI18n();

const userStore = useUserStore();
const reauthRef = ref<any>(null);

function doLogout() {
  userStore.logout();
  localStorage.removeItem("token");
  navigateTo("/login");
}

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

/**
 * 开了二步验证的账号，注销时不必退出重登：输一次动态码就能过再验证闸门。
 * 没开 2FA 的账号返回 false，走「重新登录」那条路。
 */
async function reauthViaMfa(): Promise<boolean> {
  const ok = await reauthRef.value?.ask(
    t('pages.profile.deleteAccountWarning'),
    t('reauth.title'),
  );
  return ok === true;
}

async function submitDelete(confirmValue: string, retried = false): Promise<void> {
  try {
    await $fetch("/api/v1/user/delete", {
      method: "DELETE",
      headers: authHeaders(),
      body: { confirm: confirmValue },
    });
  } catch (e: any) {
    if (!retried && e?.data?.needReauth && (await reauthViaMfa())) {
      return submitDelete(confirmValue, true);
    }
    throw e;
  }
}

async function startDeleteAccount() {
  // ── 三重确认（取消就整体退出，不要走后面的请求）──
  try {
    await ElMessageBox.confirm(
      t('pages.profile.deleteAccountDataLoss'),
      t('pages.profile.deleteAccount'),
      { confirmButtonText: t('pages.profile.acknowledged'), cancelButtonText: t('reauth.cancel'), type: "warning" },
    );
    await ElMessageBox.confirm(
      t('pages.profile.deleteAccountChannelHint'),
      t('pages.profile.confirmAgain'),
      { confirmButtonText: t('pages.profile.continueDelete'), cancelButtonText: t('reauth.cancel'), type: "warning" },
    );
    // 第三次：把账号名原样输一遍（服务端也会比对，前端先拦一道）
    const { value } = await ElMessageBox.prompt(
      t('pages.profile.extra.confirmDeleteHint', { name: userStore.userName || "" }),
      t('pages.profile.finalConfirm'),
      {
        confirmButtonText: t('pages.profile.confirmDelete'),
        cancelButtonText: t('reauth.cancel'),
        type: "error",
        inputPlaceholder: userStore.userName || "",
      },
    );
    if (String(value ?? "").trim() !== String(userStore.userName ?? "")) {
      ElMessage.warning(t('pages.profile.accountNameMismatch'));
      return;
    }

    // ── 请求（再验证由服务端把关：新鲜登录，或刚通过一次二步验证）──
    await submitDelete(value);
    ElMessage.success(t('pages.profile.accountDeleted'));
    userStore.logout();
    localStorage.removeItem("token");
    navigateTo("/login");
  } catch (e: any) {
    // 用户取消（ElMessageBox 以字符串 reject）
    if (e === "cancel" || e === "close") return;

    if (e?.data?.needReauth || e?.data?.code === 401) {
      try {
        await ElMessageBox.confirm(
          e?.data?.code === 401
            ? t('pages.profile.loginExpired')
            : t('pages.profile.reverifyRequired'),
          t('reauth.title'),
          { confirmButtonText: t('pages.profile.goReLogin'), cancelButtonText: t('pages.profile.later'), type: "warning" },
        );
        userStore.logout();
        localStorage.removeItem("token");
        navigateTo("/login");
      } catch {
        /* 用户选择稍后 */
      }
      return;
    }
    ElMessage.error(e?.data?.msg || t('pages.profile.deleteFailed'));
  }
}
</script>
