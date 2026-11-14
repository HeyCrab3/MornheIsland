<template>
  <h1 class="text-xl font-semibold">委托模式登录</h1>
  <p class="text-sm text-gray-500 my-1 mb-4">
    别人把班级的运维权委托给了你？输入授权码即可临时登录，免注册。
  </p>

  <el-form label-position="top" @submit.prevent>
    <el-form-item label="授权码">
      <el-input-otp v-model="code" :length="8" :separator="castSeparator"/>
    </el-form-item>

    <el-form-item label="真实姓名">
      <el-input
        v-model="name"
        placeholder="会显示在操作记录和页面水印上"
        maxlength="20"
        show-word-limit
        size="large"
        @keyup.enter="doLogin"
      />
    </el-form-item>

    <div class="text-xs text-gray-500 leading-relaxed -mt-1 mb-3">
      填真实名字（例如「张三」）。委托期间你做的每一处修改都会记在这个名字下，
      这也是委托人信任你的前提。
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
      进入
    </el-button>
  </el-form>

  <p class="text-center text-xs text-gray-400 mt-4">
    没有代登录码？
    <NuxtLink to="/login" class="text-blue-500 hover:underline"
      >用账号登录</NuxtLink
    >
  </p>
</template>

<script setup lang="ts">
definePageMeta({ title: "委托登录", layout: "login" });

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
    errorMsg.value = "代登录码是 8 位字母数字";
    return;
  }
  if (!name.value.trim()) {
    errorMsg.value = "请填写你的名字";
    return;
  }

  if (localStorage.getItem("token")) {
    try {
      await ElMessageBox.confirm(
        "你当前已登录另一个账号。继续会切换到代登录身份，原来的账号需要重新登录才能回来。",
        "切换身份",
        {
          type: "warning",
          confirmButtonText: "继续",
          cancelButtonText: "取消",
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
    if (!token) throw new Error("服务器没有返回登录凭证");

    localStorage.setItem("token", token);
    await userStore.fetchUserData();

    const caps = Array.isArray(res?.data?.caps) ? res.data.caps.join("、") : "";
    ElMessage.success(
      `已进入${res?.data?.ownerName ? ` ${res.data.ownerName} 的` : ""}委托${caps ? `：${caps}` : ""}`,
    );
    navigateTo("/classes");
  } catch (e: any) {
    const status = e?.statusCode || e?.data?.code;
    if (status === 404) errorMsg.value = "代登录码不正确，或这条委托已被撤销";
    else if (status === 410)
      errorMsg.value = "这条委托已过期，请联系委托人重新委托";
    else if (status === 429) errorMsg.value = "尝试太频繁了，请等几分钟再试";
    else if (status === 409)
      errorMsg.value = e?.data?.msg || "这份委托的代登录名额已满";
    else errorMsg.value = e?.data?.msg || "登录失败，请稍后再试";
  } finally {
    loading.value = false;
  }
}
</script>
