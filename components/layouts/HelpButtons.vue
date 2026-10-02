<template>
  <Transition name="slide-up">
    <template v-if="showExtra">
      <div class="fixed bottom-20 right-10">
        <div class="help-list">
          <el-button
            round
            type="primary"
            size="large"
            class="help-btn"
            style="margin-left: 0"
            @click="
              openExternalLink('https://github.com/HeyCrab3/MornheIsland')
            "
          >
            <el-icon class="mr-2"><Star /></el-icon>
            给我们来颗 Star
          </el-button>
          <el-button
            round
            size="large"
            class="help-btn"
            style="margin-left: 0"
            @click="
              showDialog = true;
              showExtra = false;
              getData()
            "
          >
            <el-icon class="mr-2"><Tools /></el-icon>
            诊断信息
          </el-button>
          <el-button
            @click="openExternalLink('https://qm.qq.com/q/rgRifYcGvm')"
            round
            size="large"
            class="help-btn"
            style="margin-left: 0"
          >
            <el-icon class="mr-2"><ChatDotRound /></el-icon>
            QQ 群
          </el-button>
          <el-button
            @click="
              openExternalLink(
                'https://my.feishu.cn/wiki/BSvhwVQBdi3KxwkDxRuco1XRnQf?from=from_copylink',
              )
            "
            round
            size="large"
            class="help-btn"
            style="margin-left: 0"
          >
            <el-icon class="mr-2"><Help /></el-icon>
            帮助中心
          </el-button>
          <el-button
            @click="openExternalLink('https://1087.3cx.cloud/crab')"
            round
            size="large"
            class="help-btn"
            style="margin-left: 0"
          >
            <el-icon class="mr-2"><Service /></el-icon>
            客户支持
          </el-button>
        </div>
      </div>
    </template>
  </Transition>
  <el-button circle size="large" type="primary" @click="showExtra = !showExtra">
    <el-icon><Transition name="fade"><More v-if="!showExtra" /><Close v-else /></Transition></el-icon>
  </el-button>
  <el-dialog title="诊断信息" v-model="showDialog">
    <el-alert
      title="数据含有您的浏览器指纹等敏感信息，请不要在非反馈页面上输入这些信息。"
      show-icon
      type="warning"
      class="mb-2"
    />
    <el-alert v-if="error" type="error" show-icon :title='`获取设备指纹信息失败：${error}`' class="mb-2"/>
    <p class="my-2">访客 ID: {{data?.visitor_id}}</p>
    <p class="my-2">会话 ID: {{data?.event_id}}</p>
    <p class="my-2">用户代理: {{diagnosedData.userAgent}}</p>
    <p class="my-2">平台: {{diagnosedData.platform}}</p>
    <p class="my-2">用户 ID: {{diagnosedData.userId}}</p>
    <p class="my-2">时间: {{diagnosedData.time}}</p>
  </el-dialog>
</template>

<style>
.help-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  white-space: nowrap;
}
.help-btn {
  display: inline-flex;
  margin-left: 0;
}
</style>

<script setup lang="ts">
import {
  Service,
  More,
  Close,
  Help,
  ChatDotRound,
  Star,
  Tools,
} from "@element-plus/icons-vue";
import { ref } from "vue";
import { useUserStore } from "@/stores/user";
import { useVisitorData } from "@fingerprint/vue";

const store = useUserStore();
const showExtra = ref(false);
const showDialog = ref(false);
const diagnosedData = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    userId: store.user_data.userId,
    time: new Date().toISOString(),
}

const openExternalLink = (url: string) => {
  window.open(url, "_blank");
  showExtra.value = false;
};

const { data, error, isLoading, getData } = useVisitorData({
  immediate: false,
});
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 200ms ease;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
.slide-up-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.slide-up-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
