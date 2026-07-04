<template>
  <el-card header="欢迎使用 MornheIsland！" class="mb-6" v-if="!dismiss" shadow="hover">
    <el-tabs v-model="active" :default-active="1">
      <el-tab-pane :name="1" label="欢迎" class="p-4 align-middle">
        <img
          src="https://coss.crabapi.cn/crabmtr/mmexport1782563887148.gif"
          alt="欢迎使用 MornheIsland！"
          class="w-16 mb-4 rounded-lg float-right"
        />
        <h2 class="text-2xl">你终于来了，欢迎使用 MornheIsland · 莫宁岛！</h2>
        <p>
          这是一个非官方的 ClassIsland 集控平台，可以通过这个网页向绑定教室的
          ClassIsland 下发各类型配置资源文件，节省了大面积重复已有配置的时间。
        </p>
        <p>
          对于已经在学校内大面积推广 ClassIsland
          且希望能够更快速配置各班课程的电教主任来讲，这个平台绝对是您的不二之选！
        </p>
        <p>
          对于各班电教委员来讲，这个平台可以让你实现不在班集约化管理，空中下发配置，在班同学收到消息只需重新启动CI即可立即生效更改，不需要在白板前面拖来拖去了！
        </p>
        <el-button type="primary" size="large" class="mt-4" @click="active++"
          >查看平台功能</el-button
        >
        <el-button size="large" class="mt-4 ml-2" @click="$router.push('/classplan')"
          >去资源库看看</el-button
        >
        <el-button size="large" class="mt-4 ml-2" @click="dismissWelcome = true"
          >不再显示本提示</el-button
        >
      </el-tab-pane>
      <el-tab-pane :name="2" label="平台功能">
        <el-tabs v-model="subActive" tab-position="left" class="h-64">
          <el-tab-pane
            v-for="item in platformFeaturesList"
            :key="item.path"
            :label="item.label"
            :name="item.path"
          >
            <el-scrollbar v-if="resources[item.path]" style="height: 280px"
              ><div class="p-4 prose dark:prose-invert max-w-none">
                <ContentRenderer :value="resources[item.path]" /></div
            ></el-scrollbar>
            <div v-else class="text-sm text-gray-400 py-4">加载中...</div>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>
      <el-tab-pane :name="3" label="联系我们">
        欢迎加入我们的QQ群：1048564169<br/>
        或者，点击下面的链接：<a href="https://qm.qq.com/q/rgRifYcGvm" target="_blank" class="text-sky-500">https://qm.qq.com/q/rgRifYcGvm</a>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';

const active = ref(1);
const subActive = ref("/welcome");
const dismiss = useLocalStorage("welcome-banner-dismiss", false);
const dismissWelcome = computed({
  get: () => dismiss.value,
  set: (v) => (dismiss.value = v),
});

const platformFeaturesList = [
  { label: "资源下发", path: "/welcome" },
  { label: "设备追踪", path: "/welcome/track" },
  { label: "一班一策", path: "/welcome/setup" },
];

const resources = reactive<Record<string, any>>({});

// 预加载所有内容
onMounted(async () => {
  for (const item of platformFeaturesList) {
    try {
      const r = await queryCollection("content").path(item.path).first();
      if (r) resources[item.path] = r;
    } catch {
      /* 静默 */
    }
  }
});
</script>
