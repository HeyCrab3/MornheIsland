<template>
  <el-watermark class="h-full" :content="watermarkContent"
    ><div class="h-full flex flex-col overflow-hidden">
      <!-- ==================== Header ==================== -->
      <header
        class="h-14 shrink-0 flex items-center justify-between px-5 border-b border-neutral-200 bg-white"
      >
        <div class="flex items-center gap-3">
          <span
            class="text-lg font-semibold tracking-wide"
            style="color: var(--mi-brand)"
          >
            MornheIsland
          </span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500">{{ userStore.userName }}</span>
          <el-button text size="small" @click="logout">退出登录</el-button>
        </div>
      </header>

      <!-- ==================== Body ==================== -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar -->
        <aside
          class="w-52 shrink-0 border-r border-neutral-200 overflow-y-auto bg-white"
        >
          <el-menu
            :default-active="activeIndex"
            :default-openeds="defaultOpeneds"
            router
            class="border-r-0 h-full"
          >
            <el-menu-item index="/">
              <el-icon><HomeFilled /></el-icon>
              <span>仪表盘</span>
            </el-menu-item>

            <el-sub-menu index="library">
              <template #title>
                <el-icon><Collection /></el-icon>
                <span>资源库</span>
              </template>
              <el-menu-item index="/classplan">
                <el-icon><Notebook /></el-icon>
                <span>课表库</span>
              </el-menu-item>
              <el-menu-item index="/timelayout">
                <el-icon><Timer /></el-icon>
                <span>时间表库</span>
              </el-menu-item>
              <el-menu-item index="/subjects">
                <el-icon><Collection /></el-icon>
                <span>科目库</span>
              </el-menu-item>
              <el-menu-item index="/policy">
                <el-icon><Lock /></el-icon>
                <span>策略库</span>
              </el-menu-item>
            </el-sub-menu>

            <el-sub-menu index="ci">
              <template #title>
                <el-icon><School /></el-icon>
                <span>班级管理</span>
              </template>
              <el-menu-item index="/classes">
                <el-icon><List /></el-icon>
                <span>班级列表</span>
              </el-menu-item>
            </el-sub-menu>

            <el-menu-item index="/devices">
              <el-icon><Monitor /></el-icon>
              <span>设备追踪</span>
            </el-menu-item>

            <el-menu-item index="/org">
              <el-icon><OfficeBuilding /></el-icon>
              <span>组织设置</span>
            </el-menu-item>

            <el-menu-item index="/profile">
              <el-icon><User /></el-icon>
              <span>用户中心</span>
            </el-menu-item>
          </el-menu>
        </aside>

        <!-- Main content -->
        <main
          class="flex-1 overflow-y-auto p-6"
          style="background: var(--mi-bg-page)"
        >
          <slot />
        </main>
      </div>

      <!-- Footer -->
      <footer
        class="h-8 p-4 shrink-0 flex items-center justify-center text-xs text-gray-400 border-t border-neutral-100 bg-white"
      >
        <span>©2019-2026 Crab Studio. All rights reserved.</span>
        <a href="https://beian.miit.gov.cn/" target="_blank" class="text-neutral-400 ml-4">鲁ICP备2020045185号-2</a>
        <span class="ml-4">v{{ runtimeConfig.public.VERSION }} <a target="_blank" :href="`https://github.com/HeyCrab3/MornheIsland/tree/${runtimeConfig.public.COMMIT_REF}`"><img :src="GitHubImage" alt="GitHub" class="inline-block w-4 h-4 mx-1 relative bottom-0.5" />{{ runtimeConfig.public.COMMIT_REF.substring(0,8) }}({{ runtimeConfig.public.COMMIT_DATE }})</a></span>
      </footer>
    </div></el-watermark
  >
</template>

<script setup lang="ts">
import {
  HomeFilled,
  School,
  List,
  Monitor,
  OfficeBuilding,
  Collection,
  Timer,
  Notebook,
  Lock,
  User,
} from "@element-plus/icons-vue";

import GitHubImage from '@/assets/images/github.svg'

const route = useRoute();
const runtimeConfig = useRuntimeConfig();

// ----- 菜单激活状态 -----
const activeIndex = computed(() => route.path);

// 子页面时保持父菜单展开
const defaultOpeneds = computed(() => {
  const opened: string[] = [];
  if (route.path.startsWith("/classes")) opened.push("ci");
  if (/^\/(classplan|timelayout|subjects|policy)/.test(route.path)) opened.push("library");
  return opened;
});

// ----- 用户信息 -----
const userStore = useUserStore();

// 水印内容
const watermarkContent = computed(() => {
  if (!userStore.isLoggedIn) return [];
  return [
    userStore.userName || "",
    userStore.userId || "",
    new Date().toLocaleString("zh-CN", { hour12: false }),
  ];
});

// ----- 退出登录 -----
function logout() {
  userStore.logout();
  navigateTo("/login");
}
</script>
