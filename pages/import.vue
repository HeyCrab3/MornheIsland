<template>
  <div class="max-w-4xl">
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">导入 ClassIsland 档案</h1>
        <p class="text-sm text-gray-500">
          直接导入用户的 <code class="px-1 bg-gray-100 dark:bg-neutral-700 rounded">.cidata</code> 数据包，
          不用手抄课表。时间表、课表、科目、设置、集控策略一次性搬进来。
        </p>
      </div>
    </div>

    <el-alert type="info" :closable="false" show-icon class="mb-4">
      <template #title>导入是「原样搬运」，不会重建结构</template>
      分割线、行动段（含其中的自动动作）、每个时间点的上课提醒/天气提醒/课程显示设置、
      放学提醒、<code>.bak</code> 之外的字段都按原样保留。
      插件（<code>Plugins/</code> 里的 DLL）不会导入 —— 那要在客户端本地装。
    </el-alert>

    <!-- 1. 选文件 -->
    <el-card class="mb-4">
      <template #header><span class="font-medium">第一步：选择 .cidata 文件</span></template>
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
          {{ fileName || "把 .cidata 拖到这里，或点击选择" }}
        </div>
        <div v-if="fileSize" class="text-xs text-gray-400 mt-1">{{ fileSize }}</div>
      </div>
      <input ref="fileInput" type="file" accept=".cidata,.zip" class="hidden" @change="onPick" />
      <div class="flex gap-2 mt-3">
        <el-button type="primary" :loading="previewing" :disabled="!fileBase64" @click="doPreview">
          解析并预览
        </el-button>
        <el-button v-if="fileBase64" @click="reset">重新选择</el-button>
      </div>
    </el-card>

    <!-- 2. 预览结果 -->
    <template v-if="preview">
      <el-card class="mb-4">
        <template #header><span class="font-medium">第二步：确认要导入的内容</span></template>

        <div class="text-sm mb-3">
          这个包里有 {{ preview.availableProfiles.length }} 个档案：
          <el-tag v-for="p in preview.availableProfiles" :key="p" size="small" class="ml-1">{{ p }}</el-tag>
        </div>

        <el-form label-position="top">
          <el-row :gutter="16">
            <el-col :xs="24" :sm="8">
              <el-form-item label="导入哪个档案">
                <el-select v-model="profileName" class="w-full" @change="doPreview">
                  <el-option v-for="p in preview.availableProfiles" :key="p" :label="p" :value="p" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="资源名前缀">
                <el-input v-model="prefix" maxlength="30" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="额外内容">
                <div class="flex flex-col gap-1">
                  <el-checkbox v-model="includeSettings" :disabled="!preview.hasSettings">
                    应用设置（{{ preview.settingsKeys }} 个键）
                  </el-checkbox>
                  <el-checkbox v-model="includePolicy" :disabled="!preview.hasPolicy">
                    集控策略
                  </el-checkbox>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>

        <div v-for="p in preview.importedProfiles" :key="p.profile" class="mb-4">
          <div class="text-sm font-medium mb-2">
            档案「{{ p.profile }}」· {{ p.subjectCount }} 个科目
          </div>

          <div v-for="tl in p.timeLayouts" :key="tl.uuid" class="preview-box mb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium">{{ tl.name }}</span>
              <el-tag size="small" effect="plain">{{ tl.segments }} 段</el-tag>
              <el-tag v-if="tl.class" size="small" type="primary" effect="plain">上课 {{ tl.class }}</el-tag>
              <el-tag v-if="tl.break" size="small" effect="plain">课间 {{ tl.break }}</el-tag>
              <el-tag v-if="tl.divider" size="small" type="warning" effect="plain">分割线 {{ tl.divider }}</el-tag>
              <el-tag v-if="tl.action" size="small" type="danger" effect="plain">行动 {{ tl.action }}</el-tag>
            </div>
            <div v-if="tl.attachedSettings?.length" class="text-xs text-gray-500 mt-1.5">
              带附加设置：{{ tl.attachedSettings.map(attachedName).join("、") }}
            </div>
          </div>

          <div v-for="g in p.classPlans" :key="g.groupId + g.timeLayoutId" class="preview-box">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium">课表群「{{ g.groupName }}」</span>
              <el-tag size="small" effect="plain">{{ g.planCount }} 个计划</el-tag>
              <el-tag size="small" type="success" effect="plain">
                {{ g.weekDays.map((d: number) => ["日","一","二","三","四","五","六"][d] ?? "?").join("/") }}
              </el-tag>
              <span class="text-xs text-gray-400">→ 时间轴「{{ g.timeLayoutName }}」</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">计划名：{{ g.names.join("、") }}</div>
          </div>
        </div>

        <el-alert type="warning" :closable="false" show-icon class="mt-2">
          <template #title>将创建 {{ totalWillCreate }} 份资源</template>
          设置 {{ preview.willCreate.settings }}、策略 {{ preview.willCreate.policy }}、
          科目 {{ preview.willCreate.subjects }}、时间轴 {{ preview.willCreate.timeLayouts }}、
          课表 {{ preview.willCreate.classPlans }}。导入后可以照常改名、删除，不影响已有资源。
        </el-alert>

        <div class="mt-4">
          <el-button type="primary" size="large" :loading="importing" @click="doImport">
            确认导入
          </el-button>
        </div>
      </el-card>
    </template>

    <!-- 3. 结果 -->
    <el-card v-if="result">
      <template #header><span class="font-medium">导入完成</span></template>
      <div class="text-sm mb-3">
        共创建 <b>{{ result.total }}</b> 份资源。
      </div>
      <div v-if="result.created.classPlans.length" class="mb-3">
        <div class="text-xs text-gray-500 mb-1.5">课表（可以直接去班级里关联）</div>
        <div v-for="x in result.created.classPlans" :key="x.id" class="flex items-center gap-2">
          <el-button size="small" text type="primary" @click="navigateTo(`/classplan/${x.id}`)">
            {{ x.name }}
          </el-button>
          <span class="text-xs text-gray-400">{{ x.plans }} 个计划</span>
        </div>
      </div>
      <div v-if="result.created.timeLayouts.length" class="mb-3">
        <div class="text-xs text-gray-500 mb-1.5">时间表</div>
        <div v-for="x in result.created.timeLayouts" :key="x.id" class="flex items-center gap-2">
          <el-button size="small" text type="primary" @click="navigateTo(`/timelayout/${x.id}`)">
            {{ x.name }}
          </el-button>
          <span class="text-xs text-gray-400">{{ x.segments }} 段</span>
        </div>
      </div>
      <div v-if="result.created.subjects.length" class="mb-3">
        <div class="text-xs text-gray-500 mb-1.5">课程表（科目）</div>
        <div v-for="x in result.created.subjects" :key="x.id" class="flex items-center gap-2">
          <el-button size="small" text type="primary" @click="navigateTo(`/subjects/${x.id}`)">
            {{ x.name }}
          </el-button>
          <span class="text-xs text-gray-400">{{ x.count }} 个科目</span>
        </div>
      </div>
      <div class="flex gap-2">
        <el-button @click="navigateTo('/classes')">去班级关联</el-button>
        <el-button @click="reset">再导一个</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from "@element-plus/icons-vue";

definePageMeta({ title: "导入档案", protected: true });

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
const prefix = ref("导入");
const includeSettings = ref(true);
const includePolicy = ref(true);

/** 已知附加设置的 GUID → 中文名（来源：ClassIsland 的 AttachedSettingsControlInfo 特性） */
const ATTACHED_NAMES: Record<string, string> = {
  "08f0d9c3-c770-4093-a3d0-02f3d90c24bc": "上课提醒",
  "8fbc3a26-6d20-44dd-b895-b9411e3ddc51": "放学提醒",
  "7625de96-38aa-4b71-b478-3f156dd9458d": "天气提醒",
  "58e5b69a-764a-472b-bcf7-003b6a8c7fdf": "课程显示",
};
function attachedName(guid: string) {
  return ATTACHED_NAMES[String(guid).toLowerCase()] || String(guid).slice(0, 8);
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
    ElMessage.error("文件太大（上限 64 MB）");
    return;
  }
  fileName.value = f.name;
  fileSize.value = `${(f.size / 1024 / 1024).toFixed(2)} MB`;
  const reader = new FileReader();
  reader.onload = () => {
    // 去掉 data:...;base64, 前缀
    const s = String(reader.result || "");
    fileBase64.value = s.slice(s.indexOf(",") + 1);
    ElMessage.success("文件已读取，点「解析并预览」");
  };
  reader.onerror = () => ElMessage.error("读取文件失败");
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
    ElMessage.error(e?.data?.msg || "解析失败");
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
        prefix: prefix.value || "导入",
        includeSettings: includeSettings.value,
        includePolicy: includePolicy.value,
      },
    });
    result.value = res?.data || null;
    ElMessage.success(`导入完成，共创建 ${result.value?.total ?? 0} 份资源`);
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "导入失败");
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
