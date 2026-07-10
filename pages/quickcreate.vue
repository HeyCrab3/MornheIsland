<template>
  <div
    class="bg-container h-full rounded-lg flex flex-col justify-center"
    :style="{
      background: `url(${AIBackground}) no-repeat`,
      backgroundPositionY: 'bottom',
      backgroundSize: '150% 125%',
      backgroundPositionX: 'center',
    }"
  >
    <div
      class="text-center bg-neutral-200/50 dark:bg-neutral-800/50 transition h-fit w-3/4 rounded-lg m-auto backdrop-blur-md p-8 shadow shadow-neutral-300/50 dark:shadow-neutral-900/50"
    >
      <el-scrollbar height="650px">
        <div>
          <h1 class="text-2xl font-semibold mb-1">快速创建资源</h1>
          <p class="text-sm text-gray-500 mb-6 dark:text-gray-200">
            上传作息表或课表照片，AI 自动识别并生成可编辑的结构化数据
          </p>

          <!-- Step 指示器 -->
          <el-steps :active="step" finish-status="success" class="mb-8" simple>
            <el-step title="上传图片" />
            <el-step title="确认结果" />
            <el-step title="保存资源" />
          </el-steps>

          <!-- Step 0: 上传 -->
          <el-card v-if="step === 0">
            <el-form label-position="top" class="max-w-md">
              <el-form-item label="创建类型" required>
                <el-radio-group v-model="resourceType">
                  <el-radio value="timelayout" size="large"
                    >作息时间表</el-radio
                  >
                  <el-radio value="classplan" size="large">课程表</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="上传图片">
                <div
                  class="drop-zone"
                  :class="{ 'drop-active': dragOver }"
                  @dragover.prevent="dragOver = true"
                  @dragleave="dragOver = false"
                  @drop.prevent="onDrop"
                >
                  <template v-if="!previewUrl">
                    <el-icon size="28" class="text-gray-300 mb-2"
                      ><UploadFilled
                    /></el-icon>
                    <p class="text-sm text-gray-400">
                      拖拽图片到此处，或
                      <label class="text-(--mi-brand) cursor-pointer underline"
                        >点击选择
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          @change="onFileChange"
                        />
                      </label>
                    </p>
                  </template>
                  <img v-else :src="previewUrl" class="max-h-48 rounded" />
                </div>
              </el-form-item>
              <el-form-item
                ><el-button
                  type="primary"
                  size="large"
                  :loading="analyzing"
                  :disabled="!imageBase64"
                  @click="doAnalyze"
                >
                  <el-icon class="mr-1"><MagicStick /></el-icon>开始识别
                </el-button></el-form-item
              >
            </el-form>
          </el-card>

          <!-- Step 1: 确认结果 -->
          <el-card v-if="step === 1" v-loading="analyzing">
            <div class="mb-4 text-sm text-gray-500">
              AI 已分析完成，请检查以下结果。如有偏差可手动编辑后继续。
            </div>

            <!-- 时间表预览 -->
            <template v-if="result?.type === 'timelayout'">
              <el-table
                :data="result.periods || []"
                stripe
                size="small"
                class="max-w-lg mb-4"
              >
                <el-table-column label="序号" width="60">
                  <template #default="{ $index }">{{ $index + 1 }}</template>
                </el-table-column>
                <el-table-column label="名称" min-width="120">
                  <template #default="{ row }">
                    <el-input v-model="row.name" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="开始" width="120">
                  <template #default="{ row }">
                    <el-input v-model="row.start" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="结束" width="120">
                  <template #default="{ row }">
                    <el-input v-model="row.end" size="small" />
                  </template>
                </el-table-column>
              </el-table>
            </template>

            <!-- 课表预览 -->
            <template v-if="result?.type === 'classplan'">
              <div class="mb-2 text-sm">识别到的科目：</div>
              <div class="flex flex-wrap gap-1 mb-4">
                <el-tag v-for="s in result.subjects" :key="s" size="small">{{
                  s
                }}</el-tag>
              </div>
              <div class="text-sm text-gray-400">
                课程表网格预览（可在创建后进入编辑器调整）：
              </div>
              <div v-for="day in result.days || []" :key="day" class="mb-2">
                <div class="text-xs font-medium mb-1">{{ day }}</div>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="(slot, i) in result.schedule?.[day] || []"
                    :key="i"
                    size="small"
                    type="info"
                  >
                    {{ Number(i) + 1 }}. {{ slot.subject || "—" }}
                  </el-tag>
                  <span
                    v-if="!result.schedule?.[day]?.length"
                    class="text-xs text-gray-400"
                    >—</span
                  >
                </div>
              </div>
            </template>

            <div class="flex gap-3 mt-4">
              <el-button @click="step = 0">返回重传</el-button>
              <el-button type="primary" @click="step = 2"
                >确认，下一步</el-button
              >
            </div>
          </el-card>

          <!-- Step 2: 保存 -->
          <el-card v-if="step === 2" class="max-w-md">
            <el-form label-position="top">
              <el-form-item label="资源名称" required>
                <el-input v-model="saveName" placeholder="如：高一标准作息" />
              </el-form-item>
              <el-button type="primary" :loading="saving" @click="doSave"
                >保存资源</el-button
              >
            </el-form>
            <div
              v-if="savedId"
              class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded text-sm"
            >
              资源已保存！
              <el-button
                size="small"
                type="primary"
                class="ml-3"
                @click="goBind"
                >绑定到班级</el-button
              >
              <el-button
                size="small"
                class="ml-2"
                @click="
                  navigateTo(
                    resourceType === 'timelayout'
                      ? '/timelayout'
                      : '/classplan',
                  )
                "
              >
                返回资源库
              </el-button>
            </div>
          </el-card>
        </div></el-scrollbar
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { UploadFilled, MagicStick } from "@element-plus/icons-vue";
import AIBackground from "@/assets/images/ai_background.jpeg";

definePageMeta({ title: "快速创建资源", protected: true });

const step = ref(0);
const resourceType = ref<"timelayout" | "classplan">("timelayout");
const dragOver = ref(false);
const previewUrl = ref("");
const imageBase64 = ref("");
const analyzing = ref(false);
const saving = ref(false);
const result = ref<any>(null);
const saveName = ref("");
const savedId = ref("");

function auth() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function toBase64(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) =>
      resolve((e.target?.result as string)?.split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

function readFile(file: File) {
  previewUrl.value = URL.createObjectURL(file);
  toBase64(file).then((b64) => {
    imageBase64.value = b64;
  });
}

function onDrop(e: DragEvent) {
  dragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) readFile(file);
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) readFile(file);
}

async function doAnalyze() {
  analyzing.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/quick-create", {
      method: "POST",
      headers: auth(),
      body: {
        imageBase64: imageBase64.value,
        resourceType: resourceType.value,
      },
    });
    result.value = res.data;
    step.value = 1;
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || "识别失败");
  } finally {
    analyzing.value = false;
  }
}

async function doSave() {
  if (!saveName.value.trim()) {
    ElMessage.warning("请输入资源名称");
    return;
  }
  saving.value = true;
  try {
    const collection =
      resourceType.value === "timelayout" ? "timelayout" : "classplan";
    const res: any = await $fetch(`/api/v1/console/ci/${collection}`, {
      method: "POST",
      headers: auth(),
      body: { name: saveName.value, data: result.value.data },
    });
    savedId.value = res.data._id;
    ElMessage.success("资源已创建");
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || "保存失败");
  } finally {
    saving.value = false;
  }
}

function goBind() {
  navigateTo(`/classes`);
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
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.drop-zone.drop-active {
  border-color: var(--mi-brand);
  background: var(--mi-brand-light);
}
</style>
