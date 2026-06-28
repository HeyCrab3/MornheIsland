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
        const { code, state, loginChannel } = router.currentRoute.value.query as {
          code?: string | string[];
          state?: string | string[];
          loginChannel?: string | string[];
        };

        if (!code || !state || !loginChannel) {
            // 处理登录缺参数
            ElMessageBox.alert("缺少必要参数", "错误", {
                type: "error",
            }).then(() => {
                router.push("/login");
            });
            // 直接返回
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
    login();
});

// 页面信息
definePageMeta({
  layout: false,
  title: "登录",
});
</script>
