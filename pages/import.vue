<template>
  <div class="max-w-4xl">
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">{{ $t('pages.import.extra.pageTitle') }}</h1>
        <p class="text-sm text-gray-500">
          {{ $t('pages.import.extra.pageDesc1') }} <code class="px-1 bg-gray-100 dark:bg-neutral-700 rounded">.cidata</code> {{ $t('pages.import.extra.pageDesc2') }}
        </p>
      </div>
    </div>

    <el-alert type="info" :closable="false" show-icon class="mb-4">
      <template #title>{{ $t('pages.import.extra.alertTitle') }}</template>
      {{ $t('pages.import.extra.alertBody1') }}
      {{ $t('pages.import.extra.alertBeforeBak') }}<code>.bak</code>{{ $t('pages.import.extra.alertAfterBak') }}
      {{ $t('pages.import.extra.alertBeforePlugins') }}<code>Plugins/</code>{{ $t('pages.import.extra.alertAfterPlugins') }}
    </el-alert>

    <!-- 1. 选文件 -->
    <el-card class="mb-4">
      <template #header><span class="font-medium">{{ $t('pages.import.extra.step1') }}</span></template>
      <div
        class="drop-zone"
        :class="{ dragging: dragging }"
        @dragenter.prevent="dragging = true"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
        @click="pickFile"
      >
        <el-icon :size="28" class="text-gray-400"><UploadFilled /></el-icon>
        <div class="text-sm mt-2">
          {{ fileName || $t('pages.import.dropCidataHere') }}
        </div>
        <div v-if="fileSize" class="text-xs text-gray-400 mt-1">{{ fileSize }}</div>
      </div>
      <input ref="fileInput" type="file" accept=".cidata,.zip" class="hidden" @change="onPick" />
      <div class="flex gap-2 mt-3">
        <el-button type="primary" :loading="previewing" :disabled="!fileBase64" @click="doPreview">
          {{ $t('pages.import.extra.parsePreview') }}
        </el-button>
        <el-button v-if="fileBase64" @click="reset">{{ $t('pages.import.extra.reselect') }}</el-button>
      </div>
    </el-card>

    <!-- 2. 预览结果 -->
    <template v-if="preview">
      <el-card class="mb-4">
        <template #header><span class="font-medium">{{ $t('pages.import.extra.step2') }}</span></template>

        <div class="text-sm mb-3">
          {{ $t('pages.import.extra.profilesIntroPrefix') }} {{ preview.availableProfiles.length }} {{ $t('pages.import.extra.profilesIntroSuffix') }}
          <el-tag v-for="p in preview.availableProfiles" :key="p" size="small" class="ml-1">{{ p }}</el-tag>
        </div>

        <el-form label-position="top">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="8">
              <el-form-item :label="$t('pages.import.whichArchiveToImport')">
                <el-select v-model="profileName" class="w-full" @change="doPreview">
                  <el-option v-for="p in preview.availableProfiles" :key="p" :label="p" :value="p" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item :label="$t('pages.import.resourceNamePrefix')">
                <el-input v-model="prefix" maxlength="30" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item :label="$t('pages.import.extraContent')">
                <div class="flex flex-col gap-1">
                  <el-checkbox v-model="includeSettings" :disabled="!preview.hasSettings">
                    {{ $t('pages.import.extra.applySettings') }}（{{ preview.settingsKeys }} {{ $t('pages.import.extra.keys') }}）
                  </el-checkbox>
                  <el-checkbox v-model="includePolicy" :disabled="!preview.hasPolicy">
                    {{ $t('pages.import.extra.centralPolicy') }}
                  </el-checkbox>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>

        <div v-for="p in preview.importedProfiles" :key="p.profile" class="mb-4">
          <div class="text-sm font-medium mb-2">
            {{ $t('pages.import.extra.archiveLabelPrefix') }}{{ p.profile }}{{ $t('pages.import.extra.archiveLabelSuffix') }} {{ p.subjectCount }} {{ $t('pages.import.extra.subjectsUnit') }}
          </div>

          <div v-for="tl in p.timeLayouts" :key="tl.uuid" class="preview-box mb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium">{{ tl.name }}</span>
              <el-tag size="small" effect="plain">{{ tl.segments }} {{ $t('pages.import.extra.segments') }}</el-tag>
              <el-tag v-if="tl.class" size="small" type="primary" effect="plain">{{ $t('components.timelayouteditor.classPeriod') }} {{ tl.class }}</el-tag>
              <el-tag v-if="tl.break" size="small" effect="plain">{{ $t('components.timelayouteditor.break') }} {{ tl.break }}</el-tag>
              <el-tag v-if="tl.divider" size="small" type="warning" effect="plain">{{ $t('components.timelayouteditor.divider') }} {{ tl.divider }}</el-tag>
              <el-tag v-if="tl.action" size="small" type="danger" effect="plain">{{ $t('components.timelayouteditor.action') }} {{ tl.action }}</el-tag>
            </div>
            <div v-if="tl.attachedSettings?.length" class="text-xs text-gray-500 mt-1.5">
              {{ $t('pages.import.extra.withAttachedSettings') }}：{{ tl.attachedSettings.map(attachedName).join("、") }}
            </div>
          </div>

          <div v-for="g in p.classPlans" :key="g.groupId + g.timeLayoutId" class="preview-box">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium">{{ $t('pages.import.extra.planGroupPrefix') }}{{ g.groupName }}{{ $t('pages.import.extra.planGroupSuffix') }}</span>
              <el-tag size="small" effect="plain">{{ g.planCount }} {{ $t('pages.import.extra.plans') }}</el-tag>
              <el-tag size="small" type="success" effect="plain">
                {{ g.weekDays.map((d: number) => [$t('pages.import.day'),$t('pages.import.mondayShort'),$t('pages.import.tuesdayShort'),$t('pages.import.wednesdayShort'),$t('pages.import.thursdayShort'),$t('pages.import.fridayShort'),$t('pages.import.saturdayShort')][d] ?? "?").join("/") }}
              </el-tag>
              <span class="text-xs text-gray-400">→ {{ $t('pages.import.extra.timelinePrefix') }}{{ g.timeLayoutName }}{{ $t('pages.import.extra.timelineSuffix') }}</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">{{ $t('pages.import.extra.planNames') }}：{{ g.names.join("、") }}</div>
          </div>
        </div>

        <el-alert type="warning" :closable="false" show-icon class="mt-2">
          <template #title>{{ $t('pages.import.extra.willCreatePrefix') }} {{ totalWillCreate }} {{ $t('pages.import.extra.willCreateSuffix') }}</template>
          {{ $t('pages.import.extra.settingsLabel') }} {{ preview.willCreate.settings }}、{{ $t('pages.import.extra.policyLabel') }} {{ preview.willCreate.policy }}、
          {{ $t('pages.import.extra.subjectsLabel') }} {{ preview.willCreate.subjects }}、{{ $t('pages.import.extra.timeLayoutsLabel') }} {{ preview.willCreate.timeLayouts }}、
          {{ $t('pages.import.extra.classPlansLabel') }} {{ preview.willCreate.classPlans }}。{{ $t('pages.import.extra.willCreateHint') }}
        </el-alert>

        <div class="mt-4">
          <el-button type="primary" size="large" :loading="importing" @click="doImport">
            {{ $t('pages.backup.confirmImport') }}
          </el-button>
        </div>
      </el-card>
    </template>

    <!-- 3. 结果 -->
    <el-card v-if="result">
      <template #header><span class="font-medium">{{ $t('pages.import.extra.importDone') }}</span></template>
      <div class="text-sm mb-3">
        {{ $t('pages.import.extra.createdPrefix') }} <b>{{ result.total }}</b> {{ $t('pages.import.extra.createdSuffix') }}。
      </div>
      <div v-if="result.created.classPlans.length" class="mb-3">
        <div class="text-xs text-gray-500 mb-1.5">{{ $t('pages.import.extra.classPlansHint') }}</div>
        <div v-for="x in result.created.classPlans" :key="x.id" class="flex items-center gap-2">
          <el-button size="small" text type="primary" @click="navigateTo(`/classplan/${x.id}`)">
            {{ x.name }}
          </el-button>
          <span class="text-xs text-gray-400">{{ x.plans }} {{ $t('pages.import.extra.plans') }}</span>
        </div>
      </div>
      <div v-if="result.created.timeLayouts.length" class="mb-3">
        <div class="text-xs text-gray-500 mb-1.5">{{ $t('components.home.quickstartupguide.timeLayout') }}</div>
        <div v-for="x in result.created.timeLayouts" :key="x.id" class="flex items-center gap-2">
          <el-button size="small" text type="primary" @click="navigateTo(`/timelayout/${x.id}`)">
            {{ x.name }}
          </el-button>
          <span class="text-xs text-gray-400">{{ x.segments }} {{ $t('pages.import.extra.segments') }}</span>
        </div>
      </div>
      <div v-if="result.created.subjects.length" class="mb-3">
        <div class="text-xs text-gray-500 mb-1.5">{{ $t('pages.import.extra.subjectsWithParentheses') }}</div>
        <div v-for="x in result.created.subjects" :key="x.id" class="flex items-center gap-2">
          <el-button size="small" text type="primary" @click="navigateTo(`/subjects/${x.id}`)">
            {{ x.name }}
          </el-button>
          <span class="text-xs text-gray-400">{{ x.count }} {{ $t('pages.import.extra.subjectsUnit') }}</span>
        </div>
      </div>
      <div class="flex gap-2">
        <el-button @click="navigateTo('/classes')">{{ $t('pages.import.extra.goLinkClasses') }}</el-button>
        <el-button @click="reset">{{ $t('pages.import.extra.importAnother') }}</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from "@element-plus/icons-vue";

definePageMeta({ title: "导入档案", protected: true });

const { t } = useI18n();

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const fileInput = ref<HTMLInputElement | null>(null);
const dragging = ref(false);
const fileName = ref("");
const fileSize = ref("");
const fileBase64 = ref("");

const previewing = ref(false);
const importing = ref(false);
const preview = ref<any>(null);
const result = ref<any>(null);

const profileName = ref("");
const prefix = ref(t('pages.import.import'));
const includeSettings = ref(true);
const includePolicy = ref(true);

/** 已知附加设置的 GUID → i18n key（来源：ClassIsland 的 AttachedSettingsControlInfo 特性）；显示时再 t()，切换语言后标签会更新 */
const ATTACHED_NAMES: Record<string, string> = {
  "08f0d9c3-c770-4093-a3d0-02f3d90c24bc": 'components.timelayouteditor.classReminder',
  "8fbc3a26-6d20-44dd-b895-b9411e3ddc51": 'pages.import.dismissalReminder',
  "7625de96-38aa-4b71-b478-3f156dd9458d": 'pages.import.weatherReminder',
  "58e5b69a-764a-472b-bcf7-003b6a8c7fdf": 'pages.import.courseDisplay',
};
function attachedName(guid: string) {
  const key = ATTACHED_NAMES[String(guid).toLowerCase()];
  return key ? t(key) : String(guid).slice(0, 8);
}

const totalWillCreate = computed(() => {
  const w = preview.value?.willCreate;
  if (!w) return 0;
  return (w.settings || 0) + (w.policy || 0) + (w.subjects || 0) + (w.timeLayouts || 0) + (w.classPlans || 0);
});

function pickFile() {
  fileInput.value?.click();
}

function readFile(f: File) {
  if (f.size > 64 * 1024 * 1024) {
    ElMessage.error(t('pages.import.fileTooLarge'));
    return;
  }
  fileName.value = f.name;
  fileSize.value = `${(f.size / 1024 / 1024).toFixed(2)} MB`;
  const reader = new FileReader();
  reader.onload = () => {
    // 去掉 data:...;base64, 前缀
    const s = String(reader.result || "");
    fileBase64.value = s.slice(s.indexOf(",") + 1);
    ElMessage.success(t('pages.import.fileReadClickParse'));
  };
  reader.onerror = () => ElMessage.error(t('pages.import.readFileFailed'));
  reader.readAsDataURL(f);
}

function onPick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) readFile(f);
}

function onDrop(e: DragEvent) {
  dragging.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (f) readFile(f);
}

async function doPreview() {
  if (!fileBase64.value) return;
  previewing.value = true;
  result.value = null;
  try {
    const res: any = await $fetch("/api/v1/console/ci/import/cidata", {
      method: "POST",
      headers: authHeaders(),
      body: {
        fileBase64: fileBase64.value,
        fileName: fileName.value,
        profileName: profileName.value || undefined,
        preview: true,
        includeSettings: includeSettings.value,
        includePolicy: includePolicy.value,
      },
    });
    preview.value = res?.data || null;
    if (!profileName.value && preview.value?.importedProfiles?.length) {
      profileName.value = preview.value.importedProfiles[0].profile;
    }
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('pages.import.parseFailed'));
  } finally {
    previewing.value = false;
  }
}

async function doImport() {
  importing.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/import/cidata", {
      method: "POST",
      headers: authHeaders(),
      body: {
        fileBase64: fileBase64.value,
        fileName: fileName.value,
        profileName: profileName.value || undefined,
        prefix: prefix.value || t('pages.import.import'),
        includeSettings: includeSettings.value,
        includePolicy: includePolicy.value,
      },
    });
    result.value = res?.data || null;
    ElMessage.success(t('pages.import.extra.importCompleted', { total: result.value?.total ?? 0 }));
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('pages.backup.importFailed'));
  } finally {
    importing.value = false;
  }
}

function reset() {
  fileName.value = "";
  fileSize.value = "";
  fileBase64.value = "";
  preview.value = null;
  result.value = null;
  profileName.value = "";
  if (fileInput.value) fileInput.value.value = "";
}
</script>

<style scoped>
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 16px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--el-fill-color-blank);
}
.drop-zone:hover,
.drop-zone.dragging {
  border-color: var(--mi-brand);
  background: var(--mi-brand-light);
}
.preview-box {
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}
</style>
