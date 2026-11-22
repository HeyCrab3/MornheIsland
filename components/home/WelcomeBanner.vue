<template>
  <el-card :header="$t('components.home.welcomebanner.welcomeTitle')" class="mb-6" v-if="!dismiss" shadow="hover">
    <el-tabs v-model="active" :default-active="1">
      <el-tab-pane :name="1" :label="$t('components.home.welcomebanner.welcomeShort')" class="p-4 align-middle">
        <img
          src="https://coss.crabapi.cn/crabmtr/mmexport1782563887148.gif"
          :alt="$t('components.home.welcomebanner.welcomeTitle')"
          class="w-16 mb-4 rounded-lg float-right"
        />
        <h2 class="text-2xl">{{ $t('components.home.welcomebanner.extra.heroTitle') }}</h2>
        <p>
          {{ $t('components.home.welcomebanner.extra.introP1') }}
        </p>
        <p>
          {{ $t('components.home.welcomebanner.extra.introP2') }}
        </p>
        <p>
          {{ $t('components.home.welcomebanner.extra.introP3') }}
        </p>
        <el-button type="primary" size="large" class="mt-4" @click="active++"
          >{{ $t('components.home.welcomebanner.extra.viewFeatures') }}</el-button
        >
        <el-button size="large" class="mt-4 ml-2" @click="$router.push('/classplan')"
          >{{ $t('components.home.welcomebanner.extra.goResources') }}</el-button
        >
        <el-button size="large" class="mt-4 ml-2" @click="dismissWelcome = true"
          >{{ $t('components.home.welcomebanner.extra.dontShowAgain') }}</el-button
        >
      </el-tab-pane>
      <el-tab-pane :name="2" :label="$t('components.home.welcomebanner.platformFeatures')">
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
            <div v-else class="text-sm text-gray-400 py-4">{{ $t('components.home.welcomebanner.extra.loading') }}</div>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>
      <el-tab-pane :name="3" :label="$t('components.home.welcomebanner.contactUs')">
        {{ $t('components.home.welcomebanner.extra.qqGroupPrefix') }}1048564169<br/>
        {{ $t('components.home.welcomebanner.extra.orLinkPrefix') }}<a href="https://qm.qq.com/q/rgRifYcGvm" target="_blank" class="text-sky-500">https://qm.qq.com/q/rgRifYcGvm</a>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';

const { t } = useI18n();

const active = ref(1);
const subActive = ref("/welcome");
const dismiss = useLocalStorage("welcome-banner-dismiss", false);
const dismissWelcome = computed({
  get: () => dismiss.value,
  set: (v) => (dismiss.value = v),
});

const platformFeaturesList = [
  { label: t('components.home.welcomebanner.resourceDispatch'), path: "/welcome" },
  { label: t('sidebar.items.devices'), path: "/welcome/track" },
  { label: t('components.home.welcomebanner.classPolicy'), path: "/welcome/setup" },
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
