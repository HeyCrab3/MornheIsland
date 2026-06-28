import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useStorage } from '@vueuse/core';

export const useThemeStore = defineStore('theme', () => {
  // 主题状态，持久化到localStorage
  const themeMode = useStorage<'light' | 'dark'>('theme_mode', () => {
    // 默认跟随系统偏好
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return 'light';
  });
  const themeColor = useStorage<string>('theme_color', '#165DFF');
  const compactMode = useStorage<boolean>('theme_compact', false);

  // 计算属性
  const isDarkMode = computed(() => themeMode.value === 'dark');
  const isLightMode = computed(() => themeMode.value === 'light');
  const currentThemeColor = computed(() => themeColor.value);
  const isCompactMode = computed(() => compactMode.value);

  // 切换主题模式
  const toggleThemeMode = () => {
    themeMode.value = themeMode.value === 'light' ? 'dark' : 'light';
    applyThemeToDocument();
  };

  // 设置主题模式
  const setThemeMode = (mode: 'light' | 'dark') => {
    themeMode.value = mode;
    applyThemeToDocument();
  };

  // 设置主题颜色
  const setThemeColor = (color: string) => {
    themeColor.value = color;
    applyThemeToDocument();
  };

  // 切换紧凑模式
  const toggleCompactMode = () => {
    compactMode.value = !compactMode.value;
    applyThemeToDocument();
  };

  // 设置紧凑模式
  const setCompactMode = (compact: boolean) => {
    compactMode.value = compact;
    applyThemeToDocument();
  };

  // 重置主题设置
  const resetTheme = () => {
    themeMode.value = 'light';
    themeColor.value = '#165DFF';
    compactMode.value = false;
    applyThemeToDocument();
  };

  // 应用主题到文档
  const applyThemeToDocument = () => {
    const html = document.documentElement;

    // 设置主题模式类
    if (themeMode.value === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
      document.body.setAttribute('arco-theme', 'dark')
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
      document.body.removeAttribute('arco-theme');
    }

    // 设置紧凑模式类
    if (compactMode.value) {
      html.classList.add('compact');
    } else {
      html.classList.remove('compact');
    }

    // 设置主题颜色CSS变量
    html.style.setProperty('--primary-color', themeColor.value);

    // 计算衍生颜色
    const derivedColors = calculateDerivedColors(themeColor.value);
    Object.entries(derivedColors).forEach(([key, value]) => {
      html.style.setProperty(`--${key}`, value);
    });
  };

  // 计算衍生颜色
  const calculateDerivedColors = (primaryColor: string): Record<string, string> => {
    // 这里可以实现更复杂的颜色计算逻辑
    // 暂时返回简单示例
    return {
      'primary-color-light': lightenColor(primaryColor, 20),
      'primary-color-dark': darkenColor(primaryColor, 20),
      'primary-color-hover': lightenColor(primaryColor, 10),
      'primary-color-active': darkenColor(primaryColor, 10),
    };
  };

  // 颜色变亮
  const lightenColor = (color: string, percent: number): string => {
    // 简化实现，实际项目中可以使用颜色处理库
    return color;
  };

  // 颜色变暗
  const darkenColor = (color: string, percent: number): string => {
    // 简化实现，实际项目中可以使用颜色处理库
    return color;
  };

  // 初始化时应用主题
  if (typeof window !== 'undefined') {
    applyThemeToDocument();
  }

  // 监听主题变化并应用到文档
  watch([themeMode, themeColor, compactMode], () => {
    applyThemeToDocument();
  });

  return {
    // 状态
    themeMode,
    themeColor,
    compactMode,

    // 计算属性
    isDarkMode,
    isLightMode,
    currentThemeColor,
    isCompactMode,

    // 动作
    toggleThemeMode,
    setThemeMode,
    setThemeColor,
    toggleCompactMode,
    setCompactMode,
    resetTheme,
    applyThemeToDocument,
  };
});