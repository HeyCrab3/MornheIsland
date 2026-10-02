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
          <el-col :xs="24" :sm="12">
            <el-form-item label="班级名称" required>
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="班级标识">
              <el-input v-model="form.identity" disabled />
              <span class="text-xs text-gray-400">创建后不可修改</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">关联资源</el-divider>

        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" v-for="sel in selectFields" :key="sel.key">
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
    <el-card class="max-w-2xl mt-4" v-if="allResourcesLinked">
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
          <li v-if="bootstrapUrl">
            如需平台分发插件，先在该机器上安装<a :href="bootstrapUrl" target="_blank" class="underline">引导插件</a>（ClassIsland
            不支持由服务端安装插件，每台机器需手动装一次）
          </li>
        </ol>
      </el-alert>

      <!-- 加入模式 -->
      <div class="mb-4">
        <div class="text-sm font-medium mb-2">加入模式</div>
        <el-radio-group v-model="presetMode" class="mb-3">
          <el-radio-button value="serverless">静态配置</el-radio-button>
          <el-radio-button value="grpc">集控服务器（gRPC）</el-radio-button>
        </el-radio-group>
        <el-tooltip placement="top">
          <template #content>
            <p>静态配置模式下，应用每次启动拉取配置，不能实时同步集控端更改，适合只使用平台管理课程表、时间表等基础功能的用户。</p>
            <p>集控服务器（gRPC）模式下，客户端与集控服务器保持长连接，支持实时下发通知、刷新数据和分发插件，适合需要更高扩展能力或大规模批量部署的用户。</p>
          </template>
          <el-text style="margin-left: 15px" class="inline cursor-pointer select-none relative top-1">
            <el-icon><QuestionFilled/></el-icon> 模式之间有什么区别？
          </el-text>
        </el-tooltip>
        <div v-if="presetMode === 'serverless'" class="text-xs text-gray-500">
          客户端轮询静态清单拉取配置；改动后需等客户端下次检查才生效（有延迟）。
        </div>
        <div v-else>
          <div class="text-xs text-gray-500 mb-2">
            客户端与集控服务器保持 gRPC 长连接，支持实时下发通知 / 刷新数据 / 分发插件。
          </div>
          <el-input v-model="grpcAddress" size="small" placeholder="如 http://your-host:20722">
            <template #prepend>gRPC 地址</template>
          </el-input>
        </div>
      </div>

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
    <el-card v-else class="max-w-2xl mt-4">
      <template #header>
        <span class="font-medium">部署下发</span>
      </template>

      <el-alert type="warning" :closable="false" show-icon>
        <template #title>请先关联所有资源后再下发配置，否则将导致一些意想不到的错误</template>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, CopyDocument, Download, QuestionFilled } from "@element-plus/icons-vue";

definePageMeta({ title: "班级详情", protected: true });

const { buildPreset, copyPreset: doCopyPreset, downloadPreset: doDownloadPreset, defaultGrpcAddress } = useManagementPreset();
const {
  url: bootstrapUrl,
  fetchUrl: fetchBootstrapUrl,
} = useBootstrapPlugin();

const route = useRoute();
const id = route.params.id as string;
const loading = ref(false);
const saving = ref(false);
const cls = ref<any>({
  classplanId: null,
  timelayoutId: null,
  subjectsId: null,
  policyId: null,
});

const selectFields = [
  { key: "classplanId", label: "档案", resKey: "classplans" as const },
  { key: "timelayoutId", label: "时间表", resKey: "timelayouts" as const },
  { key: "subjectsId", label: "课程表", resKey: "subjects" as const },
  { key: "policyId", label: "策略", resKey: "policies" as const },
] as const;

const form = reactive<Record<string, string>>({
  identity: "", name: "",
  classplanId: "", timelayoutId: "", subjectsId: "", policyId: "",
});

const resources = reactive<Record<string, any[]>>({
  classplans: [], timelayouts: [], subjects: [], policies: [],
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

    const resKeys = ["classplans", "timelayouts", "subjects", "policies"];
    resourceResults.forEach((r: any, i: number) => {
      resources[resKeys[i]] = (r.data || []).map((item: any) => ({ ...item, _id: String(item._id) }));
    });

    // 填充已关联的 ID
    const refKeys = ["classplanId", "timelayoutId", "subjectsId", "policyId"];
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

const allResourcesLinked = computed(
  () =>
    !!form.classplanId &&
    !!form.timelayoutId &&
    !!form.subjectsId &&
    !!form.policyId,
);

// 加入模式：serverless（静态清单）/ grpc（集控服务器）
const presetMode = ref<"serverless" | "grpc">("serverless");
const grpcAddress = ref("");

const presetText = computed(() =>
  cls.value ? buildPreset(cls.value, presetMode.value, grpcAddress.value) : ""
);

function copyPreset() {
  if (cls.value) doCopyPreset(cls.value, presetMode.value, grpcAddress.value);
}

function downloadPreset() {
  if (cls.value) doDownloadPreset(cls.value, presetMode.value, grpcAddress.value);
}

onMounted(() => {
  grpcAddress.value = defaultGrpcAddress();
  fetchAll();
  fetchBootstrapUrl();
});
</script>
