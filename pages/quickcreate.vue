<template>
  <div class="ai-bg h-full rounded-xl overflow-hidden flex items-center justify-center p-3 sm:p-6" :style="{
    background: `url(${AIBackground}) no-repeat`,
    backgroundSize: '150% 125%',
    backgroundPosition: '50% 50%'
  }">
    <div class="ai-panel w-full max-w-4xl rounded-2xl p-5 sm:p-8">
      <!-- 头部 -->
      <div class="flex items-center gap-3 mb-2">
        <div class="ai-badge">
          <el-icon :size="18"><MagicStick /></el-icon>
        </div>
        <h1 class="text-2xl font-semibold">快速创建资源</h1>
      </div>
      <p class="text-sm text-gray-500 mb-6">上传作息表或课表照片，AI 自动识别并生成可编辑的结构化数据</p>

      <el-steps :active="step" finish-status="success" align-center simple class="mb-7">
        <el-step title="上传图片" />
        <el-step title="确认结果" />
        <el-step title="保存资源" />
      </el-steps>

      <!-- ==================== Step 0: 上传 ==================== -->
      <div v-if="step === 0" class="max-w-lg mx-auto">
        <div class="text-sm font-medium mb-2">创建类型</div>
        <el-radio-group v-model="resourceType" class="mb-4">
          <el-radio-button value="timelayout">作息时间表</el-radio-button>
          <el-radio-button value="classplan">课程表</el-radio-button>
        </el-radio-group>

        <div
          class="drop-zone"
          :class="{ 'drop-active': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="onDrop"
        >
          <template v-if="!previewUrl">
            <el-icon size="30" class="text-gray-300 mb-2"><UploadFilled /></el-icon>
            <p class="text-sm text-gray-400">
              拖拽图片到此处，或
              <label class="text-[var(--mi-brand)] cursor-pointer underline">
                点击选择
                <input type="file" accept="image/*" hidden @change="onFileChange" />
              </label>
            </p>
            <p class="text-xs text-gray-300 mt-1">支持作息表 / 课程表照片</p>
          </template>
          <img v-else :src="previewUrl" class="max-h-56 rounded-lg mx-auto" />
        </div>

        <el-button
          type="primary"
          size="large"
          class="ai-btn w-full mt-4"
          :loading="analyzing"
          :disabled="!imageBase64"
          @click="doAnalyze"
        >
          <el-icon class="mr-1"><MagicStick /></el-icon>开始 AI 识别
        </el-button>
      </div>

      <!-- ==================== Step 1: 确认结果 ==================== -->
      <div v-if="step === 1" v-loading="analyzing">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- 左：原图 + OCR 标注 -->
          <div>
            <div class="text-sm font-medium mb-2 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full" style="background: var(--mi-accent)" />
              原图（AI 识别区域）
            </div>
            <div v-if="previewUrl" class="relative rounded-lg overflow-hidden border dark:border-neutral-700 bg-white">
              <img :src="previewUrl" class="w-full block" />
              <div
                v-for="(b, i) in ocrBlocks"
                :key="i"
                class="ocr-box"
                :style="boxStyle(b)"
                :title="b.text"
              />
            </div>
            <el-collapse class="mt-3">
              <el-collapse-item title="查看 OCR 识别原文">
                <pre class="text-xs whitespace-pre-wrap bg-gray-50 dark:bg-neutral-700 rounded p-3 max-h-48 overflow-auto m-0">{{ result.ocrText }}</pre>
              </el-collapse-item>
            </el-collapse>
          </div>

          <!-- 右：结构化结果 -->
          <div>
            <div class="text-sm font-medium mb-2 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full" style="background: #8B5CF6" />
              AI 结构化结果（可编辑）
            </div>

            <!-- 时间表 -->
            <template v-if="result?.type === 'timelayout'">
              <el-table :data="result.periods || []" stripe size="small">
                <el-table-column label="#" width="50">
                  <template #default="{ $index }">{{ $index + 1 }}</template>
                </el-table-column>
                <el-table-column label="名称" min-width="110">
                  <template #default="{ row }">
                    <el-input v-model="row.name" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="开始" width="110">
                  <template #default="{ row }">
                    <el-input v-model="row.start" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="结束" width="110">
                  <template #default="{ row }">
                    <el-input v-model="row.end" size="small" />
                  </template>
                </el-table-column>
              </el-table>
            </template>

            <!-- 课表 -->
            <template v-if="result?.type === 'classplan'">
              <div class="mb-1 text-xs text-gray-400">识别到的科目</div>
              <div class="flex flex-wrap gap-1 mb-3">
                <el-tag v-for="s in result.subjects" :key="s" size="small">{{ s }}</el-tag>
              </div>
              <div class="text-xs text-gray-400 mb-2">课程表预览（可在创建后进入编辑器调整）</div>
              <div v-for="day in result.days || []" :key="day" class="mb-2">
                <div class="text-xs font-medium mb-1">{{ day }}</div>
                <div class="flex flex-wrap gap-1">
                  <el-tag v-for="(slot, i) in result.schedule?.[day] || []" :key="i" size="small" type="info">
                    {{ Number(i) + 1 }}. {{ slot.subject || '—' }}
                  </el-tag>
                  <span v-if="!result.schedule?.[day]?.length" class="text-xs text-gray-400">—</span>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <el-button @click="step = 0">返回重传</el-button>
          <el-button type="primary" class="ai-btn" @click="step = 2">确认，下一步</el-button>
        </div>
      </div>

      <!-- ==================== Step 2: 保存 ==================== -->
      <div v-if="step === 2" class="max-w-md mx-auto">
        <el-form label-position="top">
          <el-form-item label="资源名称" required>
            <el-input v-model="saveName" placeholder="如：高一标准作息" />
          </el-form-item>
          <el-button type="primary" class="ai-btn w-full" :loading="saving" @click="doSave">
            保存资源
          </el-button>
        </el-form>
        <div v-if="savedId" class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded text-sm">
          资源已保存！
          <el-button size="small" type="primary" class="ml-3" @click="goBind">绑定到班级</el-button>
          <el-button size="small" class="ml-2" @click="navigateTo(resourceType === 'timelayout' ? '/timelayout' : '/classplan')">
            返回资源库
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UploadFilled, MagicStick } from "@element-plus/icons-vue";
import AIBackground from '@/assets/images/ai_background.jpeg'

definePageMeta({ title: "快速创建资源", protected: true });

const step = ref(0);
const resourceType = ref<"timelayout" | "classplan">("timelayout");
const dragOver = ref(false);
const previewUrl = ref("");
const imageBase64 = ref("");
const imageSize = ref({ width: 0, height: 0 });
const analyzing = ref(false);
const saving = ref(false);
const result = ref<any>(null);
const saveName = ref("");
const savedId = ref("");

const ocrBlocks = computed(() => result.value?.ocrBlocks || []);

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
  // 记录原始尺寸，用于 OCR 标注坐标换算
  const img = new Image();
  img.onload = () => {
    imageSize.value = { width: img.naturalWidth, height: img.naturalHeight };
  };
  img.src = previewUrl.value;
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

// OCR 文字块 → 百分比定位（图片缩放时标注自动跟随）
function boxStyle(b: any) {
  const poly = b.polygon || [];
  const w = imageSize.value.width;
  const h = imageSize.value.height;
  if (!poly.length || !w || !h) return { display: "none" };
  const xs = poly.map((p: any) => p.X);
  const ys = poly.map((p: any) => p.Y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    left: (minX / w) * 100 + "%",
    top: (minY / h) * 100 + "%",
    width: ((maxX - minX) / w) * 100 + "%",
    height: ((maxY - minY) / h) * 100 + "%",
  };
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
    const collection = resourceType.value === "timelayout" ? "timelayout" : "classplan";
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
.ai-panel {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.4);
}
.dark .ai-panel {
  background: rgba(30, 30, 40, 0.85);
}
.ai-badge {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px -4px rgba(109, 40, 217, 0.5);
}
.ai-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%) !important;
  border: none !important;
  color: #fff !important;
  box-shadow: 0 8px 20px -6px rgba(109, 40, 217, 0.5);
}
.ai-btn:hover {
  filter: brightness(1.08);
}
.drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 14px;
  padding: 32px 20px;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
  min-height: 130px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.drop-zone.drop-active {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.08);
}
.ocr-box {
  position: absolute;
  border: 1.5px solid rgba(139, 92, 246, 0.85);
  background: rgba(139, 92, 246, 0.14);
  border-radius: 2px;
  pointer-events: none;
  transition: background-color 0.15s;
}
.ocr-box:hover {
  background: rgba(139, 92, 246, 0.28);
}
</style>
