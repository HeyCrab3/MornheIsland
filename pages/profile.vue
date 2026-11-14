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
        <el-button class="w-full" @click="navigateTo('/security')">
          <el-icon class="mr-1"><Key /></el-icon>账号安全（二步验证 / 登录记录）
        </el-button>

        <el-button class="w-full" @click="doLogout">
          <el-icon class="mr-1"><SwitchButton /></el-icon>退出登录
        </el-button>

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

    <!-- 注销账号前的再验证：支持动态码与通行密钥 -->
    <ReauthDialog ref="reauthRef" />
  </div>
</template>

<script setup lang="ts">
import { SwitchButton, WarningFilled, Link, Key } from "@element-plus/icons-vue";

definePageMeta({ title: "用户中心", protected: true });

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
    "注销账号会删除你名下所有班级、课表与设备绑定，需要先验证是你本人。",
    "需要重新验证",
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
      "您在本服务下的数据将被完全删除且无法恢复，但不会删除您的 CrabCity Passport 或 STCN 账号。",
      "注销账户",
      { confirmButtonText: "我已知晓", cancelButtonText: "取消", type: "warning" },
    );
    await ElMessageBox.confirm(
      "您登陆 MornheIsland 的账户根据登录渠道不同注销方式不同，具体请联系您的身份服务提供商。确认继续注销吗？",
      "再次确认",
      { confirmButtonText: "继续注销", cancelButtonText: "取消", type: "warning" },
    );
    // 第三次：把账号名原样输一遍（服务端也会比对，前端先拦一道）
    const { value } = await ElMessageBox.prompt(
      `请输入你的账号名「${userStore.userName || ""}」以确认注销：`,
      "最终确认",
      {
        confirmButtonText: "确认注销",
        cancelButtonText: "取消",
        type: "error",
        inputPlaceholder: userStore.userName || "",
      },
    );
    if (String(value ?? "").trim() !== String(userStore.userName ?? "")) {
      ElMessage.warning("账号名不匹配，已取消注销");
      return;
    }

    // ── 请求（再验证由服务端把关：新鲜登录，或刚通过一次二步验证）──
    await submitDelete(value);
    ElMessage.success("账户已注销");
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
            ? "登录状态已失效，请重新登录后再注销。"
            : "注销需要重新验证账户。为了确认是本人操作，请先退出并重新登录一次，然后回到本页再次注销。",
          "需要重新验证",
          { confirmButtonText: "去重新登录", cancelButtonText: "稍后再说", type: "warning" },
        );
        userStore.logout();
        localStorage.removeItem("token");
        navigateTo("/login");
      } catch {
        /* 用户选择稍后 */
      }
      return;
    }
    ElMessage.error(e?.data?.msg || "注销失败");
  }
}
</script>
