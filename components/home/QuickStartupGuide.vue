<template>
  <el-card shadow="hover" class="mb-4" v-if="stepsActive < 5">
    <el-collapse v-model="collapseActive">
      <el-collapse-item name="guide">
        <template #title>
          <div class="flex items-center justify-between w-full pr-4">
            <span class="font-medium">{{ $t('components.home.quickstartupguide.extra.guideTitle') }}</span>
            <el-tag size="small" type="warning">{{ stepsActive }} / 5 {{ $t('components.home.quickstartupguide.extra.stepsDone') }}</el-tag>
          </div>
        </template>

        <el-steps :active="stepsActive" finish-status="success" class="mb-6" simple>
          <el-step :title="$t('components.home.quickstartupguide.timeLayout')" />
          <el-step :title="$t('components.home.quickstartupguide.subjects')" />
          <el-step :title="$t('components.home.quickstartupguide.archive')" />
          <el-step :title="$t('dashboard.cards.classes')" />
          <el-step :title="$t('dashboard.cards.devices')" />
        </el-steps>

        <div class="current-step p-4 rounded-lg" :style="{ background: 'var(--mi-brand-light)', border: '1px solid var(--mi-brand)' }">
          <div class="flex items-center gap-2 mb-3">
            <span class="step-badge">{{ stepsActive + 1 }}</span>
            <span class="text-lg font-medium">{{ guideSteps[stepsActive].title }}</span>
          </div>
          <p class="text-sm mb-4" style="color: var(--mi-text-secondary)">{{ guideSteps[stepsActive].desc }}</p>

          <div class="bg-white dark:bg-gray-700 rounded p-3 mb-4 text-sm space-y-2">
            <div v-for="(tip, ti) in guideSteps[stepsActive].tips" :key="ti" class="flex items-start gap-2">
              <span class="text-xs font-mono mt-0.5 shrink-0">{{ ti + 1 }}.</span>
              <span>{{ tip }}</span>
            </div>
          </div>

          <el-button type="primary" @click="navigateTo(guideSteps[stepsActive].link)">
            {{ guideSteps[stepsActive].action }}
          </el-button>
          <span class="text-xs text-gray-400 ml-3">{{ $t('components.home.quickstartupguide.extra.refreshHint') }}</span>
        </div>
      </el-collapse-item>
    </el-collapse>
  </el-card>
</template>

<script setup lang="ts">
const { t } = useI18n();
const collapseActive = ref<string[]>([]);

const guideSteps = computed(() => [
  {
    title: t('components.home.quickstartupguide.createTimeLayout'),
    desc: t('components.home.quickstartupguide.timeLayoutIntro'),
    tips: [
      t('components.home.quickstartupguide.timeLayoutStepAdd'),
      t('components.home.quickstartupguide.timeLayoutStepReorder'),
      t('components.home.quickstartupguide.timeLayoutStepSubjects'),
      t('components.home.quickstartupguide.timeLayoutStepSave'),
    ],
    action: t('components.home.quickstartupguide.startCreateTimeLayout'),
    link: "/timelayout",
  },
  {
    title: t('components.home.quickstartupguide.createSubjects'),
    desc: t('components.home.quickstartupguide.subjectsIntro'),
    tips: [
      t('components.home.quickstartupguide.subjectsStepPreset'),
      t('components.home.quickstartupguide.subjectsStepEdit'),
      t('components.home.quickstartupguide.subjectsStepAdd'),
      t('components.home.quickstartupguide.subjectsStepSave'),
    ],
    action: t('components.home.quickstartupguide.startCreateSubjects'),
    link: "/subjects",
  },
  {
    title: t('components.home.quickstartupguide.createArchive'),
    desc: t('components.home.quickstartupguide.archiveIntro'),
    tips: [
      t('components.home.quickstartupguide.archiveStepSelect'),
      t('components.home.quickstartupguide.archiveStepFill'),
      t('components.home.quickstartupguide.archiveStepSlots'),
      t('components.home.quickstartupguide.archiveStepSave'),
    ],
    action: t('components.home.quickstartupguide.startCreateArchive'),
    link: "/classplan",
  },
  {
    title: t('components.home.quickstartupguide.createClassAndLink'),
    desc: t('components.home.quickstartupguide.classIntro'),
    tips: [
      t('components.home.quickstartupguide.classStepCreate'),
      t('components.home.quickstartupguide.classStepLink'),
      t('components.home.quickstartupguide.classStepHint'),
      t('components.home.quickstartupguide.classStepSave'),
    ],
    action: t('components.home.quickstartupguide.startCreateClass'),
    link: "/classes",
  },
  {
    title: t('components.home.quickstartupguide.dispatchToDevice'),
    desc: t('components.home.quickstartupguide.dispatchIntro'),
    tips: [
      t('components.home.quickstartupguide.dispatchStepList'),
      t('components.home.quickstartupguide.dispatchStepDetail'),
      t('components.home.quickstartupguide.dispatchStepPlace'),
      t('components.home.quickstartupguide.dispatchStepJoin'),
    ],
    action: t('components.home.quickstartupguide.goDispatch'),
    link: "/classes",
  },
]);

const stepsActive = ref(0);

function auth() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

onMounted(async () => {
  try {
    const [tlRes, sjRes, cpRes, clsRes, devRes] = await Promise.all([
      $fetch("/api/v1/console/ci/timelayout/list", { headers: auth() }),
      $fetch("/api/v1/console/ci/subjects/list", { headers: auth() }),
      $fetch("/api/v1/console/ci/classplan/list", { headers: auth() }),
      $fetch("/api/v1/console/ci/class/list", { headers: auth() }),
      $fetch("/api/v1/console/ci/has-devices", { headers: auth() }).catch(() => ({ data: { hasDevices: false } })),
    ]);

    const hasTL = ((tlRes as any)?.data || []).length > 0;
    const hasSJ = ((sjRes as any)?.data || []).length > 0;
    const hasCP = ((cpRes as any)?.data || []).length > 0;
    const classes: any[] = (clsRes as any)?.data || [];
    const hasClass = classes.length > 0;
    const hasDevice = (devRes as any)?.data?.hasDevices || false;

    let step = 0;
    if (hasTL) step = 1;
    if (hasSJ) step = 2;
    if (hasCP) step = 3;
    if (hasClass) step = 4;
    if (hasDevice) step = 5;
    stepsActive.value = step;

    // 未完成时默认展开，全部完成时折叠
    if (step < 5) collapseActive.value = ["guide"];
  } catch { /* */ }
});
</script>

<style scoped>
.step-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--mi-brand);
}
</style>
