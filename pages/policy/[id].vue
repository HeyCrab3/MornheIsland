<template>
  <ResourceEditor collection="policy" :label="$t('composables.useciresource.policy')">
    <template #default="{ doc, save, saving }">
      <div v-if="doc" v-loading="!doc" class="w-full">
        <el-row class="w-full">
          <el-col :span="10">
            <!-- 图形化开关 -->
            <el-card :header="$t('pages.policy.id.visualConfig')" class="mb-4">
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
                {{ $t('pages.policy.id.extra.jsonSyncHint') }}
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-button type="primary" :loading="saving" @click="doSave"
          >{{ $t('pages.policy.id.extra.savePolicy') }}</el-button
        >
      </div>
    </template>
  </ResourceEditor>
</template>

<script setup lang="ts">
definePageMeta({ title: "编辑策略", protected: true });

const { t } = useI18n();

const policyFields = [
  {
    key: "DisableProfileClassPlanEditing",
    label: t('pages.policy.id.disableClassplanEditing'),
    desc: t('pages.policy.id.disableClassplanEditingHint'),
  },
  {
    key: "DisableProfileTimeLayoutEditing",
    label: t('pages.policy.id.disableTimeLayoutEditing'),
    desc: t('pages.policy.id.disableTimeLayoutEditingHint'),
  },
  {
    key: "DisableProfileSubjectsEditing",
    label: t('pages.policy.id.disableSubjectEditing'),
    desc: t('pages.policy.id.disableSubjectEditingHint'),
  },
  {
    key: "DisableProfileEditing",
    label: t('pages.policy.id.disableArchiveEditing'),
    desc: t('pages.policy.id.disableArchiveEditingHint'),
  },
  {
    key: "DisableSettingsEditing",
    label: t('pages.policy.id.disableSettingsChanges'),
    desc: t('pages.policy.id.disableSettingsChangesHint'),
  },
  {
    key: "DisableSplashCustomize",
    label: t('pages.policy.id.disableCustomSplash'),
    desc: t('pages.policy.id.clearCustomSplash'),
  },
  {
    key: "DisableDebugMenu",
    label: t('pages.policy.id.disableDebugMenu'),
    desc: t('pages.policy.id.disableDebugMenuHint'),
  },
  {
    key: "AllowExitManagement",
    label: t('pages.policy.id.allowExitCentralControl'),
    desc: t('pages.policy.id.allowExitCentralControlHint'),
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
    ElMessage.error(t('components.resourceeditor.invalidJson'));
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
    ElMessage.success(t('pages.policy.id.policySavedRestartRequired'));
    syncJsonFromSwitches();
  } catch {
    ElMessage.error(t('components.resourceeditor.saveFailed'));
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
