<template>
  <div>
    <div class="mb-5">
      <h1 class="text-2xl font-semibold mb-1">配置备份</h1>
      <p class="text-sm text-gray-500">
        把班级、课表、时间表、课程表、设置、策略、插件库与插件配置组导出成一个 JSON 文件，
        便于留存或迁移到另一个账号。
      </p>
    </div>

    <!-- 导出 -->
    <el-card shadow="hover" class="mb-4">
      <template #header><span class="font-medium">导出</span></template>

      <div class="space-y-4">
        <div class="flex items-start gap-3 flex-wrap">
          <el-button type="primary" :loading="exporting === 'full'" @click="exportFull">
            <el-icon class="mr-1"><Download /></el-icon>全量导出
          </el-button>
          <div class="text-xs text-gray-500 leading-relaxed max-w-2xl">
            导出当前账号下的全部资源。插件库只记录来源地址与校验值，<b>不包含插件文件本身</b>——
            那些由上游 CDN 托管，恢复时会按登记的地址重新下载。
          </div>
        </div>

        <el-divider class="!my-2" />

        <div class="flex items-start gap-3 flex-wrap">
          <el-select
            v-model="classId"
            placeholder="选择要导出的班级"
            class="w-64"
            filterable
            :loading="classesLoading"
          >
            <el-option
              v-for="c in classes"
              :key="c._id"
              :label="`${c.name || c.identity}（${c.identity || '无标识'}）`"
              :value="c._id"
            />
          </el-select>
          <el-button :disabled="!classId" :loading="exporting === 'class'" @click="exportClass">
            <el-icon class="mr-1"><Download /></el-icon>导出该班级
          </el-button>
          <div class="text-xs text-gray-500 leading-relaxed max-w-xl">
            只导出这个班级和它引用的资源（含课表里指向的时间表与课程表），适合把单个班迁移到另一账号。
            插件配置组不在单班导出范围内，请用全量导出。
          </div>
        </div>
      </div>
    </el-card>

    <!-- 导入 -->
    <el-card shadow="hover">
      <template #header><span class="font-medium">导入恢复</span></template>

      <div class="space-y-4">
        <div class="flex items-center gap-2 flex-wrap">
          <el-button @click="fileInput?.click()">
            <el-icon class="mr-1"><Upload /></el-icon>选择备份文件
          </el-button>
          <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onFileChange" />
          <span v-if="fileName" class="text-xs text-gray-500 font-mono truncate max-w-md">{{ fileName }}</span>
          <el-button v-if="parsed" text type="danger" @click="clearFile">清除</el-button>
        </div>

        <el-alert v-if="parseError" type="error" :closable="false" show-icon :title="parseError" />

        <template v-if="parsed">
          <div class="bg-gray-50 dark:bg-neutral-800 rounded p-3 text-xs space-y-1">
            <div class="flex justify-between gap-2">
              <span class="text-gray-500">格式</span>
              <span class="font-mono">{{ parsed.format }} v{{ parsed.version }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-gray-500">导出时间</span>
              <span>{{ formatTime(parsed.exportedAt) }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-gray-500">范围</span>
              <span>{{ scopeText }}</span>
            </div>
            <div class="flex justify-between gap-2 items-start">
              <span class="text-gray-500 shrink-0">包含</span>
              <span class="text-right">{{ countsText }}</span>
            </div>
          </div>

          <div>
            <div class="text-sm mb-2">导入方式</div>
            <el-radio-group v-model="importMode">
              <el-radio value="new">新建副本</el-radio>
              <el-radio value="overwrite">覆盖同 id</el-radio>
            </el-radio-group>
            <div class="text-xs text-gray-500 mt-2 leading-relaxed">
              <template v-if="importMode === 'new'">
                <b>推荐。</b>所有内容作为新副本导入，自动重新生成 id 并重映射关联关系，不会覆盖或改动现有数据。
                重复导入同一份备份会产生多份副本。
              </template>
              <template v-else>
                备份里 id 与现有数据相同且属于你的账号时<b>直接覆盖</b>，适合误删后的还原。
                id 被其他账号占用时会退回新建副本。此模式会改动现有数据，请确认后再执行。
              </template>
            </div>
          </div>

          <el-alert
            v-if="importMode === 'overwrite'"
            type="warning"
            :closable="false"
            show-icon
            title="覆盖模式会改动现有数据"
            description="同 id 的班级、课表、时间表等会被备份里的版本替换，请先确认备份文件来源可靠。"
          />

          <div class="flex items-center gap-2">
            <el-button type="primary" :loading="importing" @click="doImport">
              <el-icon class="mr-1"><Upload /></el-icon>开始导入
            </el-button>
            <span class="text-xs text-gray-400">导入不会删除备份里没有的内容</span>
          </div>
        </template>

        <el-empty v-else-if="!parseError" :image-size="80" description="选择一个备份文件以查看内容" />
      </div>
    </el-card>

    <!-- 导入结果 -->
    <ResponsiveDrawer v-model:open="resultVisible" title="导入结果">
      <div v-if="result" class="py-2 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div class="report-stat">
            <div class="report-stat-num">{{ result.totals?.created ?? 0 }}</div>
            <div class="report-stat-label">新建</div>
          </div>
          <div class="report-stat">
            <div class="report-stat-num">{{ result.totals?.updated ?? 0 }}</div>
            <div class="report-stat-label">覆盖</div>
          </div>
        </div>

        <div class="text-xs space-y-1">
          <div v-for="(n, k) in nonZero(result.created)" :key="`c-${k}`" class="flex justify-between gap-2">
            <span class="text-gray-500">{{ LABELS[k as string] || k }}</span>
            <span>新建 {{ n }}</span>
          </div>
          <div v-for="(n, k) in nonZero(result.updated)" :key="`u-${k}`" class="flex justify-between gap-2">
            <span class="text-gray-500">{{ LABELS[k as string] || k }}</span>
            <span>覆盖 {{ n }}</span>
          </div>
        </div>

        <el-alert
          v-if="result.skipped?.length"
          type="warning"
          :closable="false"
          show-icon
          :title="`有 ${result.skipped.length} 条改用了新 id`"
        >
          <div v-for="(s, i) in result.skipped" :key="i" class="text-xs">
            {{ s.name }}：{{ s.reason }}
          </div>
        </el-alert>

        <div class="text-xs text-gray-400">
          导入只新增/覆盖，不会删除现有内容。刷新各页面即可看到结果。
        </div>
      </div>
      <template #footer>
        <el-button @click="resultVisible = false">关闭</el-button>
        <el-button type="primary" @click="reloadAll">刷新数据</el-button>
      </template>
    </ResponsiveDrawer>
  </div>
</template>

<script setup lang="ts">
import { Download, Upload } from "@element-plus/icons-vue";
import ResponsiveDrawer from "@/components/ui/ResponsiveDrawer.vue";

definePageMeta({ title: "配置备份", protected: true });

const LABELS: Record<string, string> = {
  classes: "班级",
  classplans: "课表",
  timelayouts: "时间表",
  subjects: "课程表",
  settings: "设置",
  policies: "策略",
  plugins: "插件",
  pluginProfiles: "插件配置组",
};

function auth() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function downloadJson(obj: any, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatTime(t: string): string {
  if (!t) return "-";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

// ── 导出 ──
const exporting = ref<"" | "full" | "class">("");
const classes = ref<any[]>([]);
const classesLoading = ref(false);
const classId = ref("");

async function fetchClasses() {
  classesLoading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/class/list", { headers: auth() });
    classes.value = res.data || [];
  } catch {
    /* 静默 */
  } finally {
    classesLoading.value = false;
  }
}

async function exportFull() {
  exporting.value = "full";
  try {
    const res: any = await $fetch("/api/v1/console/ci/backup/export", { headers: auth() });
    downloadJson(res.data, `mornheisland-backup-full-${stamp()}.json`);
    ElMessage.success("已开始下载");
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || "导出失败");
  } finally {
    exporting.value = "";
  }
}

async function exportClass() {
  if (!classId.value) return;
  exporting.value = "class";
  try {
    const res: any = await $fetch(`/api/v1/console/ci/backup/export/class/${classId.value}`, {
      headers: auth(),
    });
    const name = res.data?.scope?.className || res.data?.scope?.identity || classId.value;
    downloadJson(res.data, `mornheisland-backup-${name}-${stamp()}.json`);
    ElMessage.success("已开始下载");
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || "导出失败");
  } finally {
    exporting.value = "";
  }
}

// ── 导入 ──
const fileInput = ref<HTMLInputElement | null>(null);
const fileName = ref("");
const parsed = ref<any>(null);
const parseError = ref("");
const importMode = ref<"new" | "overwrite">("new");
const importing = ref(false);
const resultVisible = ref(false);
const result = ref<any>(null);

const scopeText = computed(() => {
  const s = parsed.value?.scope;
  if (!s) return "未标注";
  if (s.type === "full") return "全量";
  if (s.type === "class") return `班级：${s.className || s.identity || s.classId}`;
  return s.type;
});

const countsText = computed(() => {
  const c = parsed.value?.counts || {};
  const parts = Object.entries(c)
    .filter(([, n]) => Number(n) > 0)
    .map(([k, n]) => `${LABELS[k] || k} ${n}`);
  return parts.length ? parts.join(" · ") : "空备份";
});

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  fileName.value = file.name;
  parseError.value = "";
  parsed.value = null;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(String(reader.result || ""));
      if (obj?.format !== "mornheisland-backup") {
        parseError.value = `这不是莫宁岛备份文件（format=${obj?.format ?? "缺失"}）`;
        return;
      }
      if (Number(obj.version) > 1) {
        parseError.value = `备份版本 ${obj.version} 高于当前支持的 1，请先升级平台`;
        return;
      }
      parsed.value = obj;
    } catch (err: any) {
      parseError.value = "无法解析该文件：" + (err?.message || err);
    } finally {
      input.value = "";
    }
  };
  reader.readAsText(file);
}

function clearFile() {
  parsed.value = null;
  fileName.value = "";
  parseError.value = "";
}

function nonZero(obj: Record<string, number> | undefined) {
  if (!obj) return {};
  return Object.fromEntries(Object.entries(obj).filter(([, n]) => Number(n) > 0));
}

async function doImport() {
  if (!parsed.value) return;
  if (importMode.value === "overwrite") {
    try {
      await ElMessageBox.confirm(
        "覆盖模式会用备份里的内容替换现有同 id 数据，且无法撤销。确定继续？",
        "确认覆盖导入",
        { type: "warning", confirmButtonText: "确认导入", cancelButtonText: "取消" },
      );
    } catch {
      return;
    }
  }

  importing.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/backup/import?mode=${importMode.value}`, {
      method: "POST",
      headers: auth(),
      body: { backup: parsed.value },
    });
    result.value = res.data;
    resultVisible.value = true;
    ElMessage.success(`导入完成：新建 ${res.data?.totals?.created ?? 0}，覆盖 ${res.data?.totals?.updated ?? 0}`);
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || "导入失败");
  } finally {
    importing.value = false;
  }
}

function reloadAll() {
  resultVisible.value = false;
  ElMessage.info("请切换到对应页面查看（数据已写入）");
}

onMounted(fetchClasses);
</script>

<style scoped>
.report-stat {
  text-align: center;
  padding: 10px 6px;
  border-radius: var(--mi-radius-md, 10px);
  background: var(--mi-brand-light);
}
.report-stat-num {
  font-size: 20px;
  font-weight: 600;
  color: var(--mi-brand-deep);
  line-height: 1.2;
}
.report-stat-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>
