<template>
  <div class="h-full flex flex-col">
    <!-- 品牌区 -->
    <div class="flex items-center gap-3 px-5 h-16 shrink-0">
      <img
        src="https://coss.crabapi.cn/crabmtr/mmexport1782563887148.gif"
        alt="MornheIsland"
        class="w-9 h-9 rounded-xl"
      />
      <div class="leading-tight">
        <div class="font-semibold tracking-wide">MornheIsland</div>
        <div class="text-xs text-gray-400">莫宁岛 · 集控平台</div>
      </div>
    </div>

    <!-- 导航 -->
    <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      <div v-for="group in menuGroups" :key="group.label">
        <div class="px-3 mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-300">
          {{ group.label }}
        </div>
        <div class="space-y-0.5">
          <NuxtLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="nav-item text-gray-400 dark:text-gray-300"
            :class="{ active: isActive(item) }"
            @click="onNavClick"
          >
            <el-icon :size="17"><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- 用户区 + 版权 -->
    <div class="border-t border-neutral-200 dark:border-neutral-800 p-3 space-y-2 shrink-0">
      <div class="flex items-center gap-2.5 px-1.5">
        <el-avatar
          :size="34"
          class="shrink-0 font-semibold"
          style="background: var(--mi-gradient); color: #fff"
        >
          {{ (userStore.userName || '?').charAt(0).toUpperCase() }}
        </el-avatar>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ userStore.userName || '未登录' }}</div>
          <div class="text-xs text-gray-400 font-mono truncate">{{ userStore.userId }}</div>
        </div>
        <el-button circle text size="small" title="切换主题" @click="dark.toggle">
          <el-icon><Sunny v-if="dark.isDark.value" /><Moon v-else /></el-icon>
        </el-button>
        <el-button circle text size="small" title="退出登录" @click="logout">
          <el-icon><SwitchButton /></el-icon>
        </el-button>
      </div>
      <div class="text-[11px] text-gray-400 text-center leading-relaxed">
        ©2019-2026 Crab Studio · 鲁ICP备2020045185号-2<br />
        v{{ runtimeConfig.public.VERSION }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  HomeFilled,
  School,
  Monitor,
  Collection,
  Timer,
  Notebook,
  Lock,
  User,
  Sunny,
  Moon,
  MagicStick,
  SwitchButton,
  Grid,
  Download,
} from "@element-plus/icons-vue";

const dark = useDarkMode();
const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const userStore = useUserStore();
const layoutStore = useLayoutStore();

const menuGroups = [
  {
    label: "概览",
    items: [
      { path: "/", label: "仪表盘", icon: HomeFilled },
      { path: "/quickcreate", label: "快速创建", icon: MagicStick },
    ],
  },
  {
    label: "资源库",
    items: [
      { path: "/classplan", label: "档案库", icon: Notebook },
      { path: "/timelayout", label: "时间表库", icon: Timer },
      { path: "/subjects", label: "课程表库", icon: Collection },
      { path: "/policy", label: "策略库", icon: Lock },
    ],
  },
  {
    label: "管理",
    items: [
      { path: "/classes", label: "班级管理", icon: School },
      { path: "/devices", label: "设备追踪", icon: Monitor },
      { path: "/plugins", label: "插件管理", icon: Grid },
      { path: "/backup", label: "配置备份", icon: Download },
      { path: "/profile", label: "用户中心", icon: User },
    ],
  },
];

function isActive(item: { path: string }): boolean {
  if (item.path === "/") return route.path === "/";
  return route.path === item.path || route.path.startsWith(item.path + "/");
}

// 移动端抽屉里点击导航后收起抽屉
function onNavClick() {
  layoutStore.hideMobileSidebar();
}

function logout() {
  userStore.logout();
  navigateTo("/login");
}
</script>

<style scoped>
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--mi-radius-md);
  font-size: 14px;
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.nav-item:hover {
  background: var(--mi-brand-light);
  color: var(--mi-brand-deep);
}
.nav-item.active {
  background: var(--mi-brand-light);
  color: var(--mi-brand-deep);
  font-weight: 600;
}
</style>
