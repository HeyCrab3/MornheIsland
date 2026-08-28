<template>
  <div>
    <div class="flex items-center gap-3 mb-5">
      <el-button circle text @click="navigateTo('/classes')">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <div>
        <h1 class="text-xl font-semibold">{{ cls?.name || cls?.identity || '班级详情' }}</h1>
        <div class="text-xs text-gray-400 font-mono mt-0.5">{{ cls?.identity }}</div>
      </div>
    </div>

    <el-card v-loading="loading" class="max-w-2xl">
      <el-form label-position="top" @submit.prevent="doSave">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="班级名称" required>
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="班级标识">
              <el-input v-model="form.identity" disabled />
              <span class="text-xs text-gray-400">创建后不可修改</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">关联资源</el-divider>

        <el-row :gutter="16">
          <el-col :span="12" v-for="sel in selectFields" :key="sel.key">
            <el-form-item :label="sel.label">
              <el-select v-model="form[sel.key]" clearable placeholder="不关联" class="w-full">
                <el-option v-for="r in resources[sel.resKey]" :key="r._id" :label="`${r.name}${r.version ? ' (v'+r.version+')' : ''}`" :value="r._id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider />
        <el-button type="primary" :loading="saving" @click="doSave">保存</el-button>
      </el-form>
    </el-card>

    <!-- 部署下发 -->
    <el-card v-if="cls" class="max-w-2xl mt-4">
      <template #header>
        <span class="font-medium">部署下发</span>
      </template>

      <el-alert type="info" :closable="false" show-icon class="mb-4">
        <template #title>部署步骤</template>
        <ol class="m-0 pl-4 text-sm">
          <li>先保存上方的班级名称与关联资源</li>
          <li>复制或下载下方配置文件，保存为 <code>ManagementPreset.json</code></li>
          <li>将该文件放到教室电脑的 ClassIsland 应用目录下</li>
          <li>启动 ClassIsland → 设置 → 加入管理，即可自动拉取配置</li>
        </ol>
      </el-alert>

      <pre class="text-xs bg-gray-50 dark:bg-neutral-700 p-3 rounded overflow-auto max-h-48 mb-3">{{ presetText }}</pre>

      <div class="flex gap-2">
        <el-button type="primary" @click="copyPreset">
          <el-icon class="mr-1"><CopyDocument /></el-icon>复制配置
        </el-button>
        <el-button @click="downloadPreset">
          <el-icon class="mr-1"><Download /></el-icon>下载配置文件
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, CopyDocument, Download } from "@element-plus/icons-vue";

definePageMeta({ title: "班级详情", protected: true });

const { buildPreset, copyPreset: doCopyPreset, downloadPreset: doDownloadPreset } = useManagementPreset();

const route = useRoute();
const id = route.params.id as string;
const loading = ref(false);
const saving = ref(false);
const cls = ref<any>(null);

const selectFields = [
  { key: "classplanId", label: "档案", resKey: "classplans" as const },
  { key: "timelayoutId", label: "时间表", resKey: "timelayouts" as const },
  { key: "subjectsId", label: "课程表", resKey: "subjects" as const },
  { key: "policyId", label: "策略", resKey: "policies" as const },
] as const;

const form = reactive<Record<string, string>>({
  identity: "", name: "",
  classplanId: "", timelayoutId: "", subjectsId: "", settingsId: "", policyId: "",
});

const resources = reactive<Record<string, any[]>>({
  classplans: [], timelayouts: [], subjects: [], settings: [], policies: [],
});

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

async function fetchAll() {
  loading.value = true;
  try {
    const [classRes, ...resourceResults] = await Promise.all([
      $fetch(`/api/v1/console/ci/class/${id}`, { headers: authHeaders() }),
      ...["classplan", "timelayout", "subjects", "settings", "policy"].map((t) =>
        $fetch(`/api/v1/console/ci/${t}/list`, { headers: authHeaders() }),
      ),
    ]);

    const data = (classRes as any).data;
    cls.value = data;
    form.identity = data.identity || "";
    form.name = data.name || "";

    const resKeys = ["classplans", "timelayouts", "subjects", "settings", "policies"];
    resourceResults.forEach((r: any, i: number) => {
      resources[resKeys[i]] = (r.data || []).map((item: any) => ({ ...item, _id: String(item._id) }));
    });

    // 填充已关联的 ID
    const refKeys = ["classplanId", "timelayoutId", "subjectsId", "settingsId", "policyId"];
    refKeys.forEach((k) => {
      const populated = data[k.replace("Id", "")]; // data.classplan, data.timelayout etc
      const raw = data[k]; // data.classplanId etc
      const rawStr = (() => {
        if (!raw) return "";
        if (typeof raw === "string") return raw;
        if (raw._id) return String(raw._id);
        if (raw.$oid) return raw.$oid;
        return String(raw);
      })();
      form[k] = populated?._id || rawStr;
    });
  } finally {
    loading.value = false;
  }
}

async function doSave() {
  saving.value = true;
  try {
    await $fetch(`/api/v1/console/ci/class/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: {
        name: form.name,
        classplanId: form.classplanId || undefined,
        timelayoutId: form.timelayoutId || undefined,
        subjectsId: form.subjectsId || undefined,
        settingsId: form.settingsId || undefined,
        policyId: form.policyId || undefined,
      },
    });
    ElMessage.success("已保存");
  } catch (e: any) {
    ElMessage.error("保存失败");
  } finally {
    saving.value = false;
  }
}

const presetText = computed(() => (cls.value ? buildPreset(cls.value) : ""));

function copyPreset() {
  if (cls.value) doCopyPreset(cls.value);
}

function downloadPreset() {
  if (cls.value) doDownloadPreset(cls.value);
}

onMounted(fetchAll);
</script>
