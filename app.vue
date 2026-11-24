<template>
  <el-config-provider :locale="elementLocale">
    <NuxtLoadingIndicator color="#A6C2F7" :height="4" :throttle="0" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- 中台公告弹窗：全局挂一次，看板/登录页会自动抑制 -->
    <ClientOnly>
      <PlatformNoticePopup />
    </ClientOnly>
  </el-config-provider>
</template>

<script setup lang="ts">
import { usePlatformStore } from '#imports';
import zhCn from 'element-plus/es/locale/lang/zh-cn.mjs';
import zhTw from 'element-plus/es/locale/lang/zh-tw.mjs';
import en from 'element-plus/es/locale/lang/en.mjs';

const { locale: appLocale } = useI18n();
const elementLocale = computed(() => {
  if (appLocale.value === 'zh-TW') return zhTw;
  if (appLocale.value === 'en') return en;
  return zhCn;
});

onMounted(() => {
  if (typeof window !== "undefined") {
    usePlatformStore().init()
    .then(() => console.log('中台数据初始化完成 '))
    .catch((e) => console.error('中台初始化失败'))
    const token = localStorage.getItem("token");
    if (token) {
      useUserStore().fetchUserData();
    }
  }
})
</script>
