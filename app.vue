<template>
  <NuxtLoadingIndicator color="#A6C2F7" :height="4" :throttle="0" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
onMounted(() => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      useUserStore().fetchUserData();
    }
  }
})
</script>
