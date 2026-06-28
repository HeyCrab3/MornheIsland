<template>
  <el-result
    title="页面未找到"
    sub-title="抱歉，您访问的页面不存在。"
  >
    <template #icon>
      <img :src="NotFoundImage" alt="Not Found Image"/>
    </template>
    <template #extra>
      <el-space>
        <el-button type="primary" @click="$router.back()">带我回家！</el-button>
      </el-space>
    </template>
  </el-result>
</template>

<script setup>
import NotFoundImage from "@/assets/images/not_found.png";

useHead({ title: "404" });
</script>