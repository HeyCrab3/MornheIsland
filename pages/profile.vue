<template>
  <div class="max-w-md">
    <h1 class="text-2xl font-semibold mb-6">用户中心</h1>

    <el-card>
      <!-- 用户信息 -->
      <div class="flex items-center gap-4 mb-6">
        <el-avatar :size="56" class="text-xl font-bold" style="background: var(--mi-brand)">
          {{ userStore.userName?.charAt(0)?.toUpperCase() || '?' }}
        </el-avatar>
        <div>
          <div class="text-lg font-medium">{{ userStore.userName || '未登录' }}</div>
          <div class="text-sm text-gray-400 font-mono">UID: {{ userStore.userId }}</div>
        </div>
      </div>

      <el-divider />

      <!-- 操作 -->
      <div class="space-y-3">
        <el-button class="w-full" @click="doLogout">
          <el-icon class="mr-1"><SwitchButton /></el-icon>退出登录
        </el-button>

        <br/>

        <el-button class="w-full" type="danger" plain @click="startDeleteAccount">
          <el-icon class="mr-1"><WarningFilled /></el-icon>注销服务
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
          用户协议
          <el-icon><Link /></el-icon>
        </a>
        <a
          href="https://crabcity.heycrab.xyz/privacy"
          target="_blank"
          class="flex items-center justify-between text-gray-600 hover:text-[var(--mi-brand)] no-underline"
        >
          隐私政策
          <el-icon><Link /></el-icon>
        </a>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { SwitchButton, WarningFilled, Link } from "@element-plus/icons-vue";

definePageMeta({ title: "用户中心", protected: true });

const userStore = useUserStore();

function doLogout() {
  userStore.logout();
  localStorage.removeItem("token");
  navigateTo("/login");
}

async function startDeleteAccount() {
  try {
    // 第一次确认
    await ElMessageBox.confirm(
      "您在本服务下的数据将被完全删除且无法恢复，但不会删除您的 CrabCity Passport 或 STCN 账号。",
      "注销账户",
      { confirmButtonText: "我已知晓", cancelButtonText: "取消", type: "warning" },
    );
    // 第二次确认
    await ElMessageBox.confirm(
      "您登陆 MornheIsland 的账户根据登录渠道不同注销方式不同，具体请联系您的身份服务提供商。确认继续注销吗？",
      "再次确认",
      { confirmButtonText: "继续注销", cancelButtonText: "取消", type: "warning" },
    );
    // 第三次确认 — 输入验证
    const { value } = await ElMessageBox.prompt(
      '请输入"确认注销"以继续：',
      "最终确认",
      { confirmButtonText: "确认", cancelButtonText: "取消", type: "error", inputPattern: /^确认注销$/g, inputErrorMessage: "请输入「确认注销」" },
    );
    if (value !== "确认注销") return;

    await $fetch("/api/v1/user/delete", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    ElMessage.success("账户已注销");
    userStore.logout();
    localStorage.removeItem("token");
    navigateTo("/login");
  } catch {
    // 用户取消
  }
}
</script>
