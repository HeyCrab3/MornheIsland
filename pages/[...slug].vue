<template>
  <el-result
    :title="$t('pages.slug.notFoundTitle')"
    :sub-title="$t('pages.slug.notFoundDesc')"
  >
    <template #icon>
      <img :src="NotFoundImage" alt="Not Found Image"/>
    </template>
    <template #extra>
      <el-space>
        <el-button type="primary" @click="$router.back()">{{ $t('pages.slug.goHome') }}</el-button>
      </el-space>
    </template>
  </el-result>
</template>

<script setup>
import NotFoundImage from "@/assets/images/not_found.png";

useHead({ title: "404" });
</script>
