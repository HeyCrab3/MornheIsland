<template>
  <h1 class="text-xl font-semibold">{{ $t('pages.d.extra.delegateModeLogin') }}</h1>
  <p class="text-sm text-gray-500 my-1 mb-4">
    {{ $t('pages.d.extra.delegateLoginIntro') }}
  </p>

  <el-form label-position="top" @submit.prevent>
    <el-form-item :label="$t('pages.d.authorizationCode')">
      <el-input-otp v-model="code" :length="8" :separator="castSeparator"/>
    </el-form-item>

    <el-form-item :label="$t('pages.d.realName')">
      <el-input
        v-model="name"
        :placeholder="$t('pages.d.shownInAuditAndWatermark')"
        maxlength="20"
        show-word-limit
        size="large"
        @keyup.enter="doLogin"
      />
    </el-form-item>

    <div class="text-xs text-gray-500 leading-relaxed -mt-1 mb-3">
      {{ $t('pages.d.extra.realNameHint') }}
    </div>

    <el-alert
      v-if="errorMsg"
      type="error"
      :title="errorMsg"
      :closable="false"
      class="my-2"
    />

    <el-button
      type="primary"
      size="large"
      class="w-full mt-4"
      :loading="loading"
      @click="doLogin"
    >
      {{ $t('pages.d.extra.enter') }}
    </el-button>
  </el-form>

  <p class="text-center text-xs text-gray-400 mt-4">
    {{ $t('pages.d.extra.noDelegateCode') }}
    <NuxtLink to="/login" class="text-blue-500 hover:underline"
      >{{ $t('pages.d.extra.loginWithAccount') }}</NuxtLink
    >
  </p>
</template>

<script setup lang="ts">
definePageMeta({ title: "委托登录", layout: "login" });

const { t } = useI18n();

const castSeparator = (index: number) => {
  return (index / 3) === 1 ? h("span", null, "—") : "";
}

const userStore = useUserStore();

const code = ref("");
const name = ref("");
const loading = ref(false);
const errorMsg = ref("");

async function doLogin() {
  errorMsg.value = "";
  const c = code.value.replace(/[^0-9a-zA-Z]/g, "");
  if (c.length !== 8) {
    errorMsg.value = t("pages.d.delegateCodeFormat");
    return;
  }
  if (!name.value.trim()) {
    errorMsg.value = t("pages.d.enterYourName");
    return;
  }

  if (localStorage.getItem("token")) {
    try {
      await ElMessageBox.confirm(
        t("pages.d.switchAccountWarning"),
        t("pages.d.switchIdentity"),
        {
          type: "warning",
          confirmButtonText: t("pages.d.continue"),
          cancelButtonText: t("reauth.cancel"),
        },
      );
    } catch {
      return;
    }
  }

  loading.value = true;
  try {
    const res: any = await $fetch("/api/v1/public/delegate/login", {
      method: "POST",
      body: { code: c, name: name.value.trim() },
    });
    const token = res?.data?.token;
    if (!token) throw new Error(t("pages.d.serverNoCredential"));

    localStorage.setItem("token", token);
    await userStore.fetchUserData();

    const caps = Array.isArray(res?.data?.caps) ? res.data.caps.join("、") : "";
    ElMessage.success(
      `已进入${res?.data?.ownerName ? ` ${res.data.ownerName} 的` : ""}委托${caps ? `：${caps}` : ""}`,
    );
    navigateTo("/classes");
  } catch (e: any) {
    const status = e?.statusCode || e?.data?.code;
    if (status === 404) errorMsg.value = t("pages.d.incorrectDelegateCode");
    else if (status === 410)
      errorMsg.value = t("pages.d.delegateExpired");
    else if (status === 429) errorMsg.value = t("pages.d.tooManyAttempts");
    else if (status === 409)
      errorMsg.value = e?.data?.msg || t("pages.d.delegateSlotsFull");
    else errorMsg.value = e?.data?.msg || t("login.errors.loginFailed");
  } finally {
    loading.value = false;
  }
}
</script>
