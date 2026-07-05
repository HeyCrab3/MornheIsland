<template>
  <ResourceEditor collection="policy" label="策略">
    <template #default="{ doc, save, saving }">
      <div v-if="doc" v-loading="!doc" class="w-full">
        <el-row class="w-full">
          <el-col :span="10">
            <!-- 图形化开关 -->
            <el-card header="可视化配置" class="mb-4">
              <el-row :gutter="16">
                <el-col :span="12" v-for="f in policyFields" :key="f.key">
                  <div
                    class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700"
                  >
                    <div>
                      <div class="text-sm">{{ f.label }}</div>
                      <div class="text-xs text-gray-400">{{ f.desc }}</div>
                    </div>
                    <el-switch
                      v-model="policyData[f.key]"
                      @change="onSwitchChange"
                    />
                  </div>
                </el-col>
              </el-row>
            </el-card>
          </el-col>
          <el-col :span="1"></el-col>
          <el-col :span="10">
            <!-- JSON 面板 -->
            <el-card header="JSON" class="mb-4">
              <el-input
                v-model="jsonText"
                type="textarea"
                :rows="10"
                class="font-mono text-xs"
                @input="onJsonChange"
              />
              <div class="text-xs text-gray-400 mt-1">
                修改 JSON 后开关自动同步，保存时以 JSON 内容为准
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-button type="primary" :loading="saving" @click="doSave"
          >保存策略</el-button
        >
      </div>
    </template>
  </ResourceEditor>
</template>

<script setup lang="ts">
definePageMeta({ title: "编辑策略", protected: true });

const policyFields = [
  {
    key: "DisableProfileClassPlanEditing",
    label: "禁止编辑课表",
    desc: "禁用课表创建、删除、编辑和Excel导入",
  },
  {
    key: "DisableProfileTimeLayoutEditing",
    label: "禁止编辑时间表",
    desc: "禁用时间表创建、删除、编辑和Excel导入",
  },
  {
    key: "DisableProfileSubjectsEditing",
    label: "禁止编辑科目",
    desc: "禁用科目的创建、删除和编辑",
  },
  {
    key: "DisableProfileEditing",
    label: "禁止编辑档案",
    desc: "禁用档案内所有内容的编辑（不影响主页面编辑，开启此选项后可以关闭剩下三个禁止编辑）",
  },
  {
    key: "DisableSettingsEditing",
    label: "禁止修改设置",
    desc: "用户无法调整应用设置（包括主页面布局，不推荐开启）",
  },
  {
    key: "DisableSplashCustomize",
    label: "禁止自定义启动图",
    desc: "清除已有的启动界面自定义设置",
  },
  {
    key: "DisableDebugMenu",
    label: "禁用调试菜单",
    desc: "用户无法进入调试页面（就算曾启用过调试页面也无法再次进入）",
  },
  {
    key: "AllowExitManagement",
    label: "允许退出集控",
    desc: "关闭后用户无法自行退出集控",
  },
];

const policyData = reactive<Record<string, boolean>>({
  DisableProfileClassPlanEditing: false,
  DisableProfileTimeLayoutEditing: false,
  DisableProfileSubjectsEditing: false,
  DisableProfileEditing: false,
  DisableSettingsEditing: false,
  DisableSplashCustomize: false,
  DisableDebugMenu: false,
  AllowExitManagement: true,
});

const jsonText = ref("");
let syncing = false; // 防循环

function syncJsonFromSwitches() {
  syncing = true;
  jsonText.value = JSON.stringify({ ...policyData }, null, 2);
  setTimeout(() => {
    syncing = false;
  }, 0);
}

function onSwitchChange() {
  syncJsonFromSwitches();
}

function onJsonChange() {
  if (syncing) return;
  try {
    const parsed = JSON.parse(jsonText.value);
    for (const f of policyFields) {
      if (typeof parsed[f.key] === "boolean") {
        policyData[f.key] = parsed[f.key];
      }
    }
  } catch {
    /* 用户在输入中，忽略解析错误 */
  }
}

function doSave() {
  try {
    const data = JSON.parse(jsonText.value);
    // 验证所有字段
    for (const f of policyFields) {
      if (typeof data[f.key] !== "boolean") {
        ElMessage.warning(`字段 ${f.key} 缺失或类型错误`);
        return;
      }
    }
    // 通过 ResourceEditor 的 save
    const event = new CustomEvent("save", { detail: data });
    (document.querySelector("[data-save-trigger]") as any)?.dispatchEvent?.(
      event,
    );
    // fallback: 直接调 API
    saveViaApi(data);
  } catch {
    ElMessage.error("JSON 格式错误");
  }
}

async function saveViaApi(data: any) {
  const route = useRoute();
  const id = route.params.id as string;
  try {
    await $fetch(`/api/v1/console/ci/policy/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: { data },
    });
    ElMessage.success("策略已保存，请重启CI以使更改生效");
    syncJsonFromSwitches();
  } catch {
    ElMessage.error("保存失败");
  }
}

// 从已加载的 doc 同步数据
const route = useRoute();
const id = route.params.id as string;

watchEffect(async () => {
  if (!id) return;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/policy/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res?.data?.data) {
      Object.assign(policyData, res.data.data);
      syncJsonFromSwitches();
    }
  } catch {
    /* */
  }
});
</script>
