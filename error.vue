<template>
  <el-result
    class="translate-y-[50%]"
    :title="`${$t('error.extra.pageErrorPrefix')} ${prop.error?.message || $t('error.extra.unknownError')}`"
    :sub-title="$t('error.extra.errorHint')"
  >
    <template #icon>
      <img :src="ServerErrorImage" alt="Error Image"/>
    </template>
    <template #extra>
      <el-space>
        <el-button type="primary" @click="handleError">{{ $t('error.extra.takeMeHome') }}</el-button>
        <el-button @click="refresh">{{ $t('error.extra.refreshPage') }}</el-button>
      </el-space>
    </template>
  </el-result>
</template>

<script setup>
import ServerErrorImage from "@/assets/images/error.gif";

const { t } = useI18n();
useHead({ title: t('error.unexpectedError') });
const prop = defineProps(["error"]);
const handleError = () => {
  clearError({ redirect: "/" });
};
const refresh = () => {
  location.reload();
};
</script>
