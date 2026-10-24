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

    <!-- 导航（两级） -->
    <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
      <div v-for="group in menuGroups" :key="group.key">
        <!-- 不可折叠的组：标题 + 直接铺项 -->
        <template v-if="!group.collapsible">
          <div class="group-label">{{ group.label }}</div>
          <div class="space-y-0.5">
            <NuxtLink
              v-for="item in group.items"
              :key="item.path"
              :to="item.path"
              :target="item.target"
              :rel="item.target ? 'noopener noreferrer' : undefined"
              class="nav-item text-gray-400 dark:text-gray-300"
              :class="{ active: isActive(item) }"
              @click="onNavClick"
            >
              <el-icon :size="17"><component :is="item.icon" /></el-icon>
              <span>{{ item.label }}</span>
              <span v-if="item.target" class="text-[10px] opacity-50 ml-auto">↗</span>
            </NuxtLink>
          </div>
        </template>

        <!-- 可折叠的组 -->
        <template v-else>
          <button
            type="button"
            class="nav-item nav-group-toggle text-gray-400 dark:text-gray-300"
            :class="{ 'has-active': groupHasActive(group) }"
            :aria-expanded="isOpen(group.key)"
            @click="toggleGroup(group.key)"
          >
            <el-icon :size="17"><component :is="group.icon" /></el-icon>
            <span>{{ group.label }}</span>
            <!-- 收起时如果当前页在这个组里，留个点提示位置 -->
            <span
              v-if="!isOpen(group.key) && groupHasActive(group)"
              class="active-dot"
            ></span>
            <el-icon :size="12" class="chevron ml-auto" :class="{ open: isOpen(group.key) }">
              <CaretRight />
            </el-icon>
          </button>

          <el-collapse-transition>
            <div v-show="isOpen(group.key)" class="nav-children">
              <NuxtLink
                v-for="item in group.items"
                :key="item.path"
                :to="item.path"
                class="nav-item nav-child text-gray-400 dark:text-gray-300"
                :class="{ active: isActive(item) }"
                @click="onNavClick"
              >
                <el-icon :size="15"><component :is="item.icon" /></el-icon>
                <span>{{ item.label }}</span>
              </NuxtLink>
            </div>
          </el-collapse-transition>
        </template>
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
  OfficeBuilding,
  Monitor,
  FirstAidKit,
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
  Picture,
  Calendar,
  Setting,
  CaretRight,
} from "@element-plus/icons-vue";

const dark = useDarkMode();
const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const userStore = useUserStore();
const layoutStore = useLayoutStore();

interface NavItem {
  path: string;
  label: string;
  icon: any;
  /** 传了就在新标签页打开（用于看板这种裸页面） */
  target?: string;
}

interface NavGroup {
  key: string;
  label: string;
  icon?: any;
  items: NavItem[];
  collapsible: boolean;
}

/**
 * 侧边栏从「15 项平铺」改成两级折叠。
 *
 * 约定：
 *  · 一级里只有「概览」常驻展开 —— 高频且只有 3 项；
 *  · 其余按使用场景分组，手风琴式（同时只开一个），
 *    这样任何时刻最多十来行，不用一直滚动；
 *  · 当前页面所在的组会自动展开，收起时组标题右侧留个点，
 *    避免"我在哪"丢失（原来平铺时靠 active 高亮一眼就能看出来）。
 */
const menuGroups: NavGroup[] = [
  {
    key: "overview",
    label: "概览",
    collapsible: false,
    items: [
      { path: "/", label: "仪表盘", icon: HomeFilled },
      { path: "/quickcreate", label: "快速创建", icon: MagicStick },
      // 看板是裸页面（layout: false），新标签页打开，不会把控制台顶掉
      { path: "/board", label: "大屏看板", icon: Picture, target: "_blank" },
    ],
  },
  {
    key: "resources",
    label: "教学资源",
    icon: Notebook,
    collapsible: true,
    items: [
      { path: "/classplan", label: "档案库", icon: Notebook },
      { path: "/timelayout", label: "时间表库", icon: Timer },
      { path: "/subjects", label: "课程表库", icon: Collection },
      { path: "/policy", label: "策略库", icon: Lock },
      { path: "/exams", label: "考试安排", icon: Calendar },
    ],
  },
  {
    key: "org",
    label: "组织",
    icon: School,
    collapsible: true,
    items: [
      { path: "/classes", label: "班级管理", icon: School },
      { path: "/schools", label: "学校", icon: OfficeBuilding },
    ],
  },
  {
    key: "ops",
    label: "集控运维",
    icon: Monitor,
    collapsible: true,
    items: [
      { path: "/devices", label: "设备追踪", icon: Monitor },
      { path: "/plugins", label: "插件管理", icon: Grid },
      { path: "/health", label: "档案体检", icon: FirstAidKit },
    ],
  },
  {
    key: "system",
    label: "系统",
    icon: Setting,
    collapsible: true,
    items: [
      { path: "/backup", label: "配置备份", icon: Download },
      { path: "/profile", label: "用户中心", icon: User },
    ],
  },
];

const OPEN_KEY = "mi-sidebar-open-group-v1";

function isActive(item: { path: string }): boolean {
  if (item.path === "/") return route.path === "/";
  return route.path === item.path || route.path.startsWith(item.path + "/");
}

function groupHasActive(group: NavGroup): boolean {
  return group.items.some((it) => isActive(it));
}

/**
 * 初始展开组必须**在 setup 阶段同步算出来**（SSR 时 route 已经可用）。
 * 放到 onMounted 里算的话，首屏会先渲染成全部收起、再突然展开，
 * 侧边栏会跳一下。
 */
const initialHit = menuGroups.find((g) => g.collapsible && groupHasActive(g));

/** 当前只允许一个组展开；null 表示全收起 */
const openKey = ref<string | null>(initialHit?.key ?? null);

function isOpen(key: string): boolean {
  return openKey.value === key;
}

function toggleGroup(key: string) {
  openKey.value = isOpen(key) ? null : key;
  if (import.meta.client) {
    try {
      localStorage.setItem(OPEN_KEY, openKey.value ?? "");
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }
  }
}

/** 路由变了就把当前页所在的组打开，别让人找不到自己 */
function syncOpenWithRoute() {
  const hit = menuGroups.find((g) => g.collapsible && groupHasActive(g));
  if (hit) openKey.value = hit.key;
}

onMounted(() => {
  // 首屏没有命中（比如在仪表盘）才去恢复上次展开的组
  if (initialHit) return;
  if (!import.meta.client) return;
  try {
    const saved = localStorage.getItem(OPEN_KEY);
    openKey.value = saved && menuGroups.some((g) => g.key === saved && g.collapsible) ? saved : null;
  } catch {
    openKey.value = null;
  }
});

watch(() => route.path, syncOpenWithRoute);

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
.group-label {
  padding: 0 12px;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--el-text-color-secondary);
}

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

/* 折叠组标题：长得像 nav-item，但它是按钮 */
.nav-group-toggle {
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.nav-group-toggle.has-active {
  color: var(--mi-brand-deep);
}

.chevron {
  transition: transform 0.18s ease;
  opacity: 0.55;
}
.chevron.open {
  transform: rotate(90deg);
}

.active-dot {
  width: 5px;
  height: 5px;
  margin-left: 6px;
  border-radius: 50%;
  background: var(--el-color-primary);
  flex-shrink: 0;
}

/* 子项：左侧一条引导线，和父级视觉上从属 */
.nav-children {
  margin-top: 2px;
  margin-left: 21px;
  padding-left: 6px;
  border-left: 1px solid var(--el-border-color-lighter);
}

.nav-child {
  padding: 7px 10px;
  font-size: 13.5px;
}
</style>
