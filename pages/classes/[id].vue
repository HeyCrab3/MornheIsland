<template>
  <div>
    <div class="flex items-center gap-3 mb-5">
      <el-button circle text @click="navigateTo('/classes')">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <div>
        <h1 class="text-xl font-semibold">{{ cls?.name || cls?.identity || $t('pages.classes.id.classDetails') }}</h1>
        <div class="text-xs text-gray-400 font-mono mt-0.5">{{ cls?.identity }}</div>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <el-button size="small" @click="copyClassId">
          <el-icon class="mr-1"><CopyDocument /></el-icon>{{ $t('pages.classes.id.extra.copyClassId') }}
        </el-button>
        <el-button size="small" type="primary" plain @click="openBoard">
          <el-icon class="mr-1"><Picture /></el-icon>{{ $t('dashboard.viewBoard') }}
        </el-button>
        <el-button size="small" @click="openQr">
          <el-icon class="mr-1"><Cellphone /></el-icon>{{ $t('pages.classes.id.extra.qrNotify') }}
        </el-button>
      </div>
    </div>

    <el-card v-loading="loading" class="max-w-2xl">
      <el-form label-position="top" @submit.prevent="doSave">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('pages.classes.index.className')" required>
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('pages.classes.id.classIdentity')">
              <el-input v-model="form.identity" disabled />
              <span class="text-xs text-gray-400">{{ $t('pages.classes.id.extra.identityImmutable') }}</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">{{ $t('components.resourceeditor.linkedResources') }}</el-divider>

        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" v-for="sel in selectFields" :key="sel.key">
            <el-form-item :label="t(sel.label)" :required="sel.required">
              <el-select
                v-model="form[sel.key]"
                clearable
                :placeholder="sel.required ? $t('pages.classes.id.extra.pleaseSelect') : $t('pages.classes.id.extra.notLinkedOptional')"
                class="w-full"
              >
                <el-option
                  v-for="r in resources[sel.listKey]"
                  :key="r._id"
                  :label="`${r.name}${r.version ? ' (v' + r.version + ')' : ''}`"
                  :value="r._id"
                />
              </el-select>
              <span v-if="!sel.required" class="text-xs text-gray-400">{{ $t('pages.classes.id.extra.optionalUnlinkedHint') }}</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider />
        <el-button type="primary" :loading="saving" @click="doSave">{{ $t('pages.subaccounts.save') }}</el-button>
      </el-form>
    </el-card>

    <!-- 部署下发 -->
    <el-card class="max-w-2xl mt-4" v-if="canDeploy">
      <template #header>
        <span class="font-medium">{{ $t('pages.classes.id.extra.deploy') }}</span>
      </template>

      <el-alert type="info" :closable="false" show-icon class="mb-4">
        <template #title>{{ $t('pages.classes.id.extra.deploySteps') }}</template>
        <ol class="m-0 pl-4 text-sm">
          <li>{{ $t('pages.classes.id.extra.stepSave') }}</li>
          <li>{{ $t('pages.classes.id.extra.stepCopy') }} <code>ManagementPreset.json</code></li>
          <li>{{ $t('pages.classes.id.extra.stepPlace') }}</li>
          <li>{{ $t('pages.classes.id.extra.stepJoin') }}</li>
          <li v-if="bootstrapUrl">
            {{ $t('pages.classes.id.extra.bootstrapIntroBefore') }}<a :href="bootstrapUrl" target="_blank" class="underline">{{ $t('pages.classes.id.extra.bootstrapIntroLink') }}</a>{{ $t('pages.classes.id.extra.bootstrapIntroAfter') }}
          </li>
        </ol>
      </el-alert>

      <!-- 加入模式 -->
      <div class="mb-4">
        <div class="text-sm font-medium mb-2">{{ $t('pages.classes.id.extra.joinMode') }}</div>
        <el-radio-group v-model="presetMode" class="mb-3">
          <el-radio-button value="serverless">{{ $t('pages.classes.id.extra.staticConfig') }}</el-radio-button>
          <el-radio-button value="grpc">{{ $t('pages.classes.id.extra.grpcServer') }}</el-radio-button>
        </el-radio-group>
        <el-tooltip placement="top">
          <template #content>
            <p>{{ $t('pages.classes.id.extra.staticModeDesc') }}</p>
            <p>{{ $t('pages.classes.id.extra.grpcTooltipDesc') }}</p>
          </template>
          <el-text style="margin-left: 15px" class="inline cursor-pointer select-none relative top-1">
            <el-icon><QuestionFilled/></el-icon> {{ $t('pages.classes.id.extra.modeDifference') }}
          </el-text>
        </el-tooltip>
        <div v-if="presetMode === 'serverless'" class="text-xs text-gray-500">
          {{ $t('pages.classes.id.extra.staticModeHint') }}
        </div>
        <div v-else>
          <div class="text-xs text-gray-500 mb-2">
            {{ $t('pages.classes.id.extra.grpcLiveHint') }}
          </div>
          <el-input v-model="grpcAddress" size="small" :placeholder="$t('pages.classes.index.hostUrlExample')">
            <template #prepend>{{ $t('pages.classes.index.extra.grpcAddress') }}</template>
          </el-input>
          <div class="text-xs text-gray-500 mt-2 leading-relaxed">
            {{ $t('pages.classes.id.extra.grpcHint1Before') }}<b>{{ $t('pages.classes.id.extra.grpcHint1Bold') }}</b>{{ $t('pages.classes.id.extra.grpcHint1After') }}
            {{ $t('pages.classes.id.extra.grpcHint2') }}
            {{ $t('pages.classes.id.extra.grpcHint3Before') }} <code>https://域名</code>；
            {{ $t('pages.classes.id.extra.grpcHint4Before') }} <code>public_grpc_address</code>。
          </div>
          <el-alert
            v-if="grpcEndpoint.loaded && !grpcEndpoint.isConfigured"
            type="warning"
            :closable="false"
            show-icon
            class="mt-2"
            :title="$t('pages.classes.id.inferredAddressWarning')"
            :description="$t('pages.classes.id.inferredAddressHint')"
          />
          <GrpcProxyNotice :address="grpcAddress" />
        </div>
      </div>

      <pre class="text-xs bg-gray-50 dark:bg-neutral-700 p-3 rounded overflow-auto max-h-48 mb-3">{{ presetText }}</pre>

      <div class="flex gap-2">
        <el-button type="primary" @click="copyPreset">
          <el-icon class="mr-1"><CopyDocument /></el-icon>{{ $t('pages.classes.id.extra.copyConfig') }}
        </el-button>
        <el-button @click="downloadPreset">
          <el-icon class="mr-1"><Download /></el-icon>{{ $t('pages.classes.index.downloadConfigFile') }}
        </el-button>
      </div>
    </el-card>
    <el-card v-else class="max-w-2xl mt-4">
      <template #header>
        <span class="font-medium">{{ $t('pages.classes.id.extra.deploy') }}</span>
      </template>

      <el-alert type="warning" :closable="false" show-icon>
        <template #title>
          {{ $t('pages.classes.id.extra.linkBeforeDeploy') }}{{ missingRequired.map((s) => t(s.label)).join("、") || $t('pages.classes.id.requiredResources') }}{{ $t('pages.classes.id.extra.linkBeforeDeployAfter') }}
        </template>
        {{ $t('pages.classes.id.extra.requiredFieldsNote') }}
      </el-alert>
    </el-card>

    <Cw2CentralPanel :class-id="id" />
    <NotifyQrDialog v-model="qrVisible" :class-id="id" />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, CopyDocument, Download, Picture, QuestionFilled, Cellphone } from "@element-plus/icons-vue";

definePageMeta({ title: "班级详情", protected: true });

const { t } = useI18n();

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
    () => ElMessage.success(t("pages.classes.id.extra.classIdCopied", { id })),
    () => ElMessage.error(t("components.cw2centralpanel.copyFailed")),
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
 *
 * label 存 i18n key，显示时再 t()，保证 no_prefix 切换语言后标签会更新。
 */
const selectFields = [
  { key: "classplanId", label: "components.home.quickstartupguide.archive", type: "classplan", listKey: "classplans", required: true },
  { key: "timelayoutId", label: "components.home.quickstartupguide.timeLayout", type: "timelayout", listKey: "timelayouts", required: true },
  { key: "subjectsId", label: "components.home.quickstartupguide.subjects", type: "subjects", listKey: "subjects", required: true },
  { key: "policyId", label: "composables.useciresource.policy", type: "policy", listKey: "policies", required: false },
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
    ElMessage.warning(t("pages.classes.id.extra.saveMissingBefore") + missingRequired.value.map((s) => t(s.label)).join("、") + t("pages.classes.id.extra.saveMissingAfter"));
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
    ElMessage.success(t("components.resourceeditor.saved"));
  } catch (e: any) {
    ElMessage.error(t("components.resourceeditor.saveFailed"));
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
