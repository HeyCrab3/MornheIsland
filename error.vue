<template>
  <el-result
    class="translate-y-[50%]"
    :title="`页面发生意外错误 ${prop.error?.message || '未知错误'}`"
    :sub-title="'请尝试刷新页面，或点击下方按钮返回首页。'"
  >
    <template #icon>
      <img :src="ServerErrorImage" alt="Error Image"/>
    </template>
    <template #extra>
      <el-space>
        <el-button type="primary" @click="handleError">带我回家！</el-button>
        <el-button @click="refresh">刷新页面</el-button>
      </el-space>
    </template>
  </el-result>
</template>

<script setup>
import ServerErrorImage from "@/assets/images/error.gif";

useHead({ title: "意外错误" });
const prop = defineProps(["error"]);
const handleError = () => {
  clearError({ redirect: "/" });
};
const refresh = () => {
  location.reload();
};
</script>
