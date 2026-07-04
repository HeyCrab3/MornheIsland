<template>
  <el-card shadow="hover" class="mb-4" v-if="stepsActive < 5">
    <el-collapse v-model="collapseActive">
      <el-collapse-item name="guide">
        <template #title>
          <div class="flex items-center justify-between w-full pr-4">
            <span class="font-medium">快速上手指南</span>
            <el-tag size="small" type="warning">{{ stepsActive }} / 5 步已完成</el-tag>
          </div>
        </template>

        <el-steps :active="stepsActive" finish-status="success" class="mb-6" simple>
          <el-step title="时间表" />
          <el-step title="课程表" />
          <el-step title="档案" />
          <el-step title="班级" />
          <el-step title="设备" />
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
          <span class="text-xs text-gray-400 ml-3">完成后刷新此页面继续下一步</span>
        </div>
      </el-collapse-item>
    </el-collapse>
  </el-card>

  <!-- 全部完成后：折叠的完成提示 -->
  <el-card class="mb-4" shadow="hover" v-else>
    <el-collapse v-model="collapseActive">
      <el-collapse-item name="guide">
        <template #title>
          <div class="flex items-center justify-between w-full pr-4">
            <span class="font-medium">快速上手指南</span>
            <el-tag size="small" type="success">恭喜，已全部完成</el-tag>
          </div>
        </template>
        <div class="text-center py-4">
          <div class="text-green-500 text-lg font-medium mb-1">全部完成！</div>
          <div class="text-sm text-gray-400">可以开始下发配置了</div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </el-card>
</template>

<script setup lang="ts">
const collapseActive = ref<string[]>([]);

const guideSteps = [
  {
    title: "创建时间表",
    desc: "时间表定义了每天的作息时段（如早读、第一节、第二节等），是课表运行的骨架。",
    tips: [
      "进入时间表编辑页，点击「添加时段」新建一段作息",
      "拖拽时段调整顺序，设置每段的开始和结束时间",
      "可选：关联课程表后为每段配置默认科目",
      "保存后记下时间表名称，创建档案时会用到",
    ],
    action: "开始创建时间表",
    link: "/timelayout",
  },
  {
    title: "创建课程表",
    desc: "课程表（科目库）定义了你学校有哪些课程，档案（课表）会引用这里的科目。",
    tips: [
      "新建课程表会自动预填 13 门标准科目（语数外等）",
      "在列表中可以修改科目名称、简称、教师、是否为室外课",
      "如需添加其他科目，点击「添加科目」即可",
      "保存后记下课程表名称，创建档案时会用到",
    ],
    action: "开始创建课程表",
    link: "/subjects",
  },
  {
    title: "创建档案",
    desc: "档案就是 ClassIsland 中的课表，它把时间表和课程表结合起来，按星期排课。",
    tips: [
      "新建档案后，先选择「时间表」和「课程表」",
      "左侧点击科目名选中，再点右侧格子填入",
      "每格对应一个时段，不同时段可以排不同课程",
      "保存后档案就绪，可以关联到班级了",
    ],
    action: "开始创建档案",
    link: "/classplan",
  },
  {
    title: "创建班级并关联资源",
    desc: "班级是资源下发的基本单位，每个班级可以关联独立的档案、时间表、策略。",
    tips: [
      "新建班级，填写班级名称（如「高一(1)班」）",
      "在下拉框中选择「档案」「时间表」「课程表」「策略」",
      "如果前面都创建好了，这里应该都能选到",
      "保存后班级就关联好了，可以生成下发配置",
    ],
    action: "开始创建班级",
    link: "/classes",
  },
  {
    title: "下发到设备",
    desc: "最后一步：生成配置文件，放到 ClassIsland 设备上即可自动加载。",
    tips: [
      "进入「组织设置」页面，找到刚创建的班级",
      "复制该班级的配置文件内容（ManagementPreset.json）",
      "将配置文件放到教室电脑的 ClassIsland 应用目录下",
      "启动 ClassIsland，在设置中点击「加入管理」即可生效",
    ],
    action: "去生成配置",
    link: "/org",
  },
];

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
