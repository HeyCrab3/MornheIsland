<template>
  <div class="login-bg">
    <div class="login-wrapper">
      <!-- 左侧：产品介绍 -->
      <div class="hero bg-white dark:bg-neutral-700">
        <h1 class="hero-title">
          <span class="text-[var(--mi-brand)]">Mornhe</span>Island · 莫宁岛
        </h1>
        <p class="hero-sub text-gray-500 dark:text-gray-400">{{ $t('login.extra.heroSubtitle') }}</p>
        <p class="hero-desc text-gray-500 dark:text-gray-400">
          {{ $t('login.extra.heroDescription') }}
        </p>

        <div class="features mt-8">
          <div class="feature-item">
            <div class="feature-icon bg-[var(--mi-brand-light)]">
              <el-icon size="22"><Notebook /></el-icon>
            </div>
            <div>
              <div class="font-medium text-sm">{{ $t('login.extra.feature1Title') }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ $t('login.extra.feature1Desc') }}</div>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon bg-[var(--mi-brand-light)]">
              <el-icon size="22"><Monitor /></el-icon>
            </div>
            <div>
              <div class="font-medium text-sm">{{ $t('login.extra.feature2Title') }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ $t('login.extra.feature2Desc') }}</div>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon bg-[var(--mi-brand-light)]">
              <el-icon size="22"><Lock /></el-icon>
            </div>
            <div>
              <div class="font-medium text-sm">{{ $t('login.extra.feature3Title') }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ $t('login.extra.feature3Desc') }}</div>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon bg-[var(--mi-brand-light)]">
              <el-icon size="22"><Clock /></el-icon>
            </div>
            <div>
              <div class="font-medium text-sm">{{ $t('login.extra.feature4Title') }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ $t('login.extra.feature4Desc') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：登录卡片 -->
      <div class="login-card bg-white dark:bg-neutral-700">
        <slot/>
      </div>
    </div>

    <!-- 语言切换 -->
    <el-select
      :model-value="locale"
      size="small"
      class="!fixed top-4 right-16 z-10 w-28"
      @change="(v: string) => setLocale(v)"
    >
      <el-option v-for="l in locales" :key="l.code" :label="l.name" :value="l.code" />
    </el-select>

    <!-- 暗色切换 -->
    <el-button class="!fixed top-4 right-4 z-10" circle size="small" @click="dark.toggle">
      <el-icon><Sunny v-if="dark.isDark.value" /><Moon v-else /></el-icon>
    </el-button>

    <!-- 底部 -->
    <div class="login-footer">
      ©2019-2026 Crab Studio
    </div>
  </div>
</template>

<style scoped>
.login-bg {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  position: relative;
  overflow: hidden;
}
.login-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("https://coss.crabapi.cn/crabmtr/public_bg/1408916.png");
  background-size: cover;
  background-position: center;
  opacity: 0.3;
  pointer-events: none;
}
.dark .login-bg::before {
  opacity: 0.12;
}

.login-wrapper {
  display: flex;
  max-width: 960px;
  width: 100%;
  gap: 60px;
  align-items: center;
  position: relative;
  z-index: 1;
}

.hero {
  flex: 1;
  padding: 32px;
  border-radius: 12px;
}

.hero-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 4px;
}

.hero-sub {
  font-size: 16px;
  margin-bottom: 16px;
}

.hero-desc {
  font-size: 14px;
  line-height: 1.7;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.feature-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--mi-brand-deep);
  flex-shrink: 0;
}

.login-card {
  width: 360px;
  flex-shrink: 0;
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}
.dark .login-card {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.login-footer {
  margin-top: 40px;
  font-size: 12px;
  color: var(--mi-text-placeholder);
  position: fixed;
  bottom: 12px;
  z-index: 1;
}
.dark .login-footer {
  color: var(--mi-text-secondary);
}

@media (max-width: 768px) {
  .login-wrapper {
    flex-direction: column;
    gap: 32px;
  }
  .login-card {
    width: 100%;
    max-width: 400px;
  }
  .hero {
    text-align: center;
  }
  .features {
    display: none;
  }
}
</style>

<script setup lang="ts">
import { Notebook, Monitor, Lock, Clock, Sunny, Moon } from "@element-plus/icons-vue";

const { locale, setLocale, locales } = useI18n();
const dark = useDarkMode();
</script>
