import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { LayoutState } from '../types/layout';

export const useLayoutStore = defineStore('layout', () => {
  // 状态
  const sidebarCollapsed = ref(false);
  const mobileSidebarVisible = ref(false);
  const layoutMode = ref<'desktop' | 'mobile'>('desktop');
  const fixedHeader = ref(true);
  const fixedSidebar = ref(true);
  const showFooter = ref(true);

  // 计算属性
  const isSidebarCollapsed = computed(() => sidebarCollapsed.value);
  const isMobileSidebarVisible = computed(() => mobileSidebarVisible.value);
  const currentLayoutMode = computed(() => layoutMode.value);
  const isFixedHeader = computed(() => fixedHeader.value);
  const isFixedSidebar = computed(() => fixedSidebar.value);
  const shouldShowFooter = computed(() => showFooter.value);

  // 动作
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed;
  };

  const toggleMobileSidebar = () => {
    mobileSidebarVisible.value = !mobileSidebarVisible.value;
  };

  const showMobileSidebar = () => {
    mobileSidebarVisible.value = true;
  };

  const hideMobileSidebar = () => {
    mobileSidebarVisible.value = false;
  };

  const setLayoutMode = (mode: 'desktop' | 'mobile') => {
    layoutMode.value = mode;
    // 切换到移动端时自动隐藏侧边栏
    if (mode === 'mobile') {
      sidebarCollapsed.value = true;
    }
  };

  const toggleFixedHeader = () => {
    fixedHeader.value = !fixedHeader.value;
  };

  const toggleFixedSidebar = () => {
    fixedSidebar.value = !fixedSidebar.value;
  };

  const toggleFooter = () => {
    showFooter.value = !showFooter.value;
  };

  // 重置为默认状态
  const reset = () => {
    sidebarCollapsed.value = false;
    mobileSidebarVisible.value = false;
    layoutMode.value = 'desktop';
    fixedHeader.value = true;
    fixedSidebar.value = true;
    showFooter.value = true;
  };

  // 获取完整状态（用于调试或持久化）
  const getState = (): LayoutState => ({
    sidebarCollapsed: sidebarCollapsed.value,
    mobileSidebarVisible: mobileSidebarVisible.value,
    layoutMode: layoutMode.value,
    fixedHeader: fixedHeader.value,
    fixedSidebar: fixedSidebar.value,
    showFooter: showFooter.value,
    theme: {
      mode: 'light',
      color: '#165DFF',
    },
  });

  return {
    // 状态
    sidebarCollapsed,
    mobileSidebarVisible,
    layoutMode,
    fixedHeader,
    fixedSidebar,
    showFooter,

    // 计算属性
    isSidebarCollapsed,
    isMobileSidebarVisible,
    currentLayoutMode,
    isFixedHeader,
    isFixedSidebar,
    shouldShowFooter,

    // 动作
    toggleSidebar,
    setSidebarCollapsed,
    toggleMobileSidebar,
    showMobileSidebar,
    hideMobileSidebar,
    setLayoutMode,
    toggleFixedHeader,
    toggleFixedSidebar,
    toggleFooter,
    reset,
    getState,
  };
});