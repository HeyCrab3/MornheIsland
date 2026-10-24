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
      <div class="ml-auto flex items-center gap-2">
        <el-button size="small" @click="copyClassId">
          <el-icon class="mr-1"><CopyDocument /></el-icon>复制班级 ID
        </el-button>
        <el-button size="small" type="primary" plain @click="openBoard">
          <el-icon class="mr-1"><Picture /></el-icon>查看看板
        </el-button>
        <el-button size="small" @click="openQr">
          <el-icon class="mr-1"><Cellphone /></el-icon>发通知二维码
        </el-button>
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
            <el-form-item :label="sel.label" :required="sel.required">
              <el-select
                v-model="form[sel.key]"
                clearable
                :placeholder="sel.required ? '请选择' : '不关联（可选）'"
                class="w-full"
              >
                <el-option
                  v-for="r in resources[sel.listKey]"
                  :key="r._id"
                  :label="`${r.name}${r.version ? ' (v' + r.version + ')' : ''}`"
                  :value="r._id"
                />
              </el-select>
              <span v-if="!sel.required" class="text-xs text-gray-400">可选，空着就不下发该资源</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider />
        <el-button type="primary" :loading="saving" @click="doSave">保存</el-button>
      </el-form>
    </el-card>

    <!-- 部署下发 -->
    <el-card class="max-w-2xl mt-4" v-if="canDeploy">
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
          <div class="text-xs text-gray-500 mt-2 leading-relaxed">
            客户端会<b>直连</b>这个地址建长连接，它不走 443、也不经过 /api 代理。
            只放行 443 的环境下客户端连不上，集控模式下连「加入」都会失败。
            若已用 nginx 把 gRPC 反代到 443 并上了 TLS，请填 <code>https://域名</code>；
            想在所有班级统一改，可在后端 config 里设 <code>public_grpc_address</code>。
          </div>
          <el-alert
            v-if="grpcEndpoint.loaded && !grpcEndpoint.isConfigured"
            type="warning"
            :closable="false"
            show-icon
            class="mt-2"
            title="当前用的是推断地址（控制台域名 + 端口），不一定可达"
            description="这只是按控制台域名推出来的。请确认该端口对教室网络放行，否则改用 nginx 反代 443 并在 config 里配置 public_grpc_address。"
          />
          <GrpcProxyNotice :address="grpcAddress" />
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
        <template #title>
          请先关联{{ missingRequired.map((s) => s.label).join("、") || "必填资源" }}后再下发配置
        </template>
        档案、时间表、课程表是必填项；策略可选，不关联就不会下发策略。
      </el-alert>
    </el-card>

    <Cw2CentralPanel :class-id="id" />
    <NotifyQrDialog v-model="qrVisible" :class-id="id" />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, CopyDocument, Download, Picture, QuestionFilled, Cellphone } from "@element-plus/icons-vue";

definePageMeta({ title: "班级详情", protected: true });

const { buildPreset, copyPreset: doCopyPreset, downloadPreset: doDownloadPreset, defaultGrpcAddress, loadGrpcEndpoint, grpcEndpoint } = useManagementPreset();
const {
  url: bootstrapUrl,
  fetchUrl: fetchBootstrapUrl,
} = useBootstrapPlugin();

const route = useRoute();
const id = route.params.id as string;

/** 看板要的是班级 ID，这里直接给出去，省得用户自己去地址栏抠 */
function copyClassId() {
  navigator.clipboard.writeText(id).then(
    () => ElMessage.success(`已复制班级 ID：${id}`),
    () => ElMessage.error("复制失败"),
  );
}

function openBoard() {
  if (!import.meta.client) return;
  window.open(`/board?id=${encodeURIComponent(id)}`, "_blank", "noopener");
}


// 扫码发通知：具体逻辑在 NotifyQrDialog 里，这里只负责开关
const qrVisible = ref(false);
function openQr() {
  qrVisible.value = true;
}
const loading = ref(false);
const saving = ref(false);
const cls = ref<any>({
  classplanId: null,
  timelayoutId: null,
  subjectsId: null,
  policyId: null,
});

/**
 * 关联资源字段。type 同时决定「拉哪个 list 接口」和「结果写进哪个 key」，
 * 两者共用一个声明，避免下标对不上。
 *
 * 之前这里是手写下标映射：请求了 5 个资源类型（含 settings）却只有 4 个 key，
 * 于是「设置」的列表被写进了 policies，「策略」下拉框里显示的其实是设置；
 * 真正的策略列表被写到了 resources[undefined]，页面上根本读不到。
 *
 * required 决定「部署下发」的门槛，也是表单上的必填标记；策略可选。
 */
const selectFields = [
  { key: "classplanId", label: "档案", type: "classplan", listKey: "classplans", required: true },
  { key: "timelayoutId", label: "时间表", type: "timelayout", listKey: "timelayouts", required: true },
  { key: "subjectsId", label: "课程表", type: "subjects", listKey: "subjects", required: true },
  { key: "policyId", label: "策略", type: "policy", listKey: "policies", required: false },
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
      ...selectFields.map((s) =>
        $fetch(`/api/v1/console/ci/${s.type}/list`, { headers: authHeaders() }),
      ),
    ]);

    const data = (classRes as any).data;
    cls.value = data;
    form.identity = data.identity || "";
    form.name = data.name || "";

    resourceResults.forEach((r: any, i: number) => {
      resources[selectFields[i].listKey] = (r.data || []).map((item: any) => ({ ...item, _id: String(item._id) }));
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
  if (missingRequired.value.length) {
    ElMessage.warning(`请先关联：${missingRequired.value.map((s) => s.label).join("、")}（策略可选）`);
    return;
  }
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

const missingRequired = computed(() =>
  selectFields.filter((s) => s.required && !form[s.key]),
);

/** 必填资源（档案 / 时间表 / 课程表）齐了才允许下发配置；策略可选 */
const canDeploy = computed(() => missingRequired.value.length === 0);

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

onMounted(async () => {
  grpcAddress.value = defaultGrpcAddress();
  const initial = grpcAddress.value;
  fetchAll();
  fetchBootstrapUrl();
  await loadGrpcEndpoint();
  // 拿到服务端配置后再刷新一次，但不要覆盖用户已经手改过的值
  if (grpcAddress.value === initial) grpcAddress.value = defaultGrpcAddress();
});
</script>
