<template>
  <el-watermark
    class="h-full"
    :content="watermarkContent"
    :font="{
      color: dark.isDark.value ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.15)',
    }"
  >
    <div class="h-full flex overflow-hidden">
      <!-- ==================== 桌面端侧边栏（>= lg） ==================== -->
      <aside
        class="hidden lg:flex w-60 shrink-0 flex-col border-r dark:border-neutral-800 border-neutral-200"
      >
        <LayoutsAppSidebar />
      </aside>

      <!-- ==================== 主区域 ==================== -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- 移动端顶栏（< lg） -->
        <header
          class="lg:hidden h-14 shrink-0 flex items-center gap-2 px-4 border-b border-neutral-200 dark:border-neutral-800"
        >
          <el-button circle text @click="layoutStore.showMobileSidebar()">
            <el-icon :size="20"><Menu /></el-icon>
          </el-button>
          <img
            src="https://coss.crabapi.cn/crabmtr/mmexport1782563887148.gif"
            alt="MornheIsland"
            class="w-7 h-7 rounded-lg"
          />
          <span class="font-semibold">MornheIsland</span>
          <el-button circle text class="ml-auto" @click="dark.toggle">
            <el-icon><Sunny v-if="dark.isDark.value" /><Moon v-else /></el-icon>
          </el-button>
        </header>

        <main class="flex-1 overflow-y-auto p-4 lg:p-8">
          <slot />
        </main>
      </div>
    </div>

    <!-- 移动端抽屉侧边栏 -->
    <el-drawer
      v-model="layoutStore.mobileSidebarVisible"
      direction="ltr"
      size="280px"
      :with-header="false"
    >
      <LayoutsAppSidebar />
    </el-drawer>

    <!-- 帮助按钮 -->
    <div class="fixed bottom-6 right-6">
      <ClientOnly><LayoutsHelpButtons /></ClientOnly>
    </div>
  </el-watermark>
</template>

<script setup lang="ts">
import { Menu, Sunny, Moon } from "@element-plus/icons-vue";

const dark = useDarkMode();
const runtimeConfig = useRuntimeConfig();
const userStore = useUserStore();
const layoutStore = useLayoutStore();

// 水印内容
const watermarkContent = computed(() => {
  if (!userStore.isLoggedIn) return [];
  return [
    userStore.userName || "",
    userStore.userId || "",
    new Date().toLocaleString("zh-CN", { hour12: false }),
  ];
});
</script>
