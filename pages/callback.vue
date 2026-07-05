<template>
  <div class="login-background">
    <div class="login-container">
      <div class="flex justify-center items-center h-full">
        <div class="w-fit bg-white rounded-lg shadow-lg p-8">
          <div class="cui-loading">
            <div class="cui-loading-spinner"></div>
          </div>
          <p class="text-center mt-4 text-sm text-neutral-600">正在登录</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.login-container {
  height: 100vh;
  background-color: #00000050;
}
.login-background {
  width: 100%;
  height: 100%;
  background-image: url("https://coss.crabapi.cn/crabmtr/public_bg/1408916.png");
  background-size: cover;
  background-position: center;
}
</style>

<script setup lang="ts">
import api from "@/util/api";

const router = useRouter();

const login = async () => {
    try {
        // 静态部署下直接从 URL 读取 query，避免 Nuxt 路由 hydration 时 query 丢失
        const raw = new URLSearchParams(window.location.search);
        const code = raw.get("code") || undefined;
        const state = raw.get("state") || undefined;
        const loginChannel = raw.get("loginChannel") || undefined;

        if (!code || !state || !loginChannel) {
            ElMessageBox.alert("缺少必要参数", "错误", { type: "error" })
              .then(() => router.push("/login"));
            return;
        }
        if (loginChannel !== "1" && loginChannel !== "2") {
            ElMessageBox.alert(`无效的登录渠道：${loginChannel}`, "错误", { type: "error" })
              .then(() => router.push("/login"));
            return;
        }
        // 处理登录
        const result: string = await api.post("/v1/user/sso/login", {
            code,
            state,
            loginChannel,
        })
        if (result) {
            localStorage.setItem("token", result);
            useUserStore().fetchUserData();
            router.push("/");
        }
    } catch (e) {
        ElMessageBox.alert("登录失败，请重试: " + e, "错误", {
            type: "error",
        }).then(() => {
            router.push("/login");
        });
    } finally {
        // 这里屁用都没有
    }
}

// 打开页面就自动call方法
onMounted(() => {
    if (import.meta.client) login();
});

// 页面信息
definePageMeta({
  layout: false,
  title: "登录",
});
</script>
