<template>
  <div>
    <div class="flex items-center justify-end mb-4">
      <el-button @click="showImport = true">
        <el-icon class="mr-1"><Upload /></el-icon>{{ $t('pages.classplan.index.extra.importCsesFormat') }}
      </el-button>
    </div>

    <ResourceList collection="classplan" :label="$t('components.home.quickstartupguide.archive')" />

    <el-dialog v-model="showImport" :title="$t('pages.classplan.index.importCsesSchedule')" width="560px" :close-on-click-modal="false">
      <p class="text-sm text-gray-500 mb-3">
        {{ $t('pages.classplan.index.extra.importHint') }}
        <br><span class="text-orange-500">{{ $t('pages.classplan.index.extra.importNotice') }}</span>
        <br><span class="text-red-500">{{ $t('pages.classplan.index.extra.importLimit') }}</span>
      </p>

      <!-- 拖拽区域 -->
      <div
        class="drop-zone"
        :class="{ 'drop-active': dragOver }"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <el-icon size="32" class="text-gray-300 mb-2"><UploadFilled /></el-icon>
        <p v-if="!fileName" class="text-sm text-gray-400">
          {{ $t('pages.classplan.index.extra.dropHint') }}
          <label class="upload-link">{{ $t('pages.classplan.index.extra.clickSelect') }}<input type="file" accept=".yaml,.yml" hidden @change="onFileChange" /></label>
        </p>
        <p v-else class="text-sm">
          <el-icon class="mr-1"><Document /></el-icon>
          {{ fileName }}
          <el-button text size="small" type="danger" class="ml-2" @click="clearFile">{{ $t('pages.classplan.index.extra.remove') }}</el-button>
        </p>
      </div>

      <el-input v-model="importName" :placeholder="$t('pages.classplan.index.importNameOptional')" class="mt-3" />

      <template #footer>
        <el-button @click="showImport = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="importing" :disabled="!yamlText" @click="doImport">
          {{ $t('pages.import.import') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Upload, UploadFilled, Document } from "@element-plus/icons-vue";

definePageMeta({ title: "档案库", protected: true });

const { t } = useI18n();

const showImport = ref(false);
const importing = ref(false);
const yamlText = ref("");
const importName = ref("");
const dragOver = ref(false);
const fileName = ref("");

function readFile(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    yamlText.value = (e.target?.result as string) || "";
  };
  reader.readAsText(file);
}

function onDrop(e: DragEvent) {
  dragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  fileName.value = file.name;
  readFile(file);
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  fileName.value = file.name;
  readFile(file);
}

function clearFile() {
  yamlText.value = "";
  fileName.value = "";
}

async function doImport() {
  if (!yamlText.value.trim()) return;
  importing.value = true;
  try {
    await $fetch("/api/v1/console/ci/import/ces", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: { yaml: yamlText.value, name: importName.value },
    });
    ElMessage.success(t('pages.classplan.index.importSuccess'));
    showImport.value = false;
    yamlText.value = "";
    fileName.value = "";
    importName.value = "";
    location.reload();
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.backup.importFailed'));
  } finally {
    importing.value = false;
  }
}
</script>

<style scoped>
.drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 10px;
  padding: 36px 20px;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
}
.drop-zone.drop-active {
  border-color: var(--mi-brand);
  background: var(--mi-brand-light);
}
.upload-link {
  color: var(--mi-brand);
  cursor: pointer;
  text-decoration: underline;
}
</style>
