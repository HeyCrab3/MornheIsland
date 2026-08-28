<template>
  <NuxtLoadingIndicator color="#A6C2F7" :height="4" :throttle="0" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { usePlatformStore } from '#imports';
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
