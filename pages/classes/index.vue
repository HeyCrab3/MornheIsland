<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-2xl font-semibold mb-1">班级管理</h1>
        <p class="text-sm text-gray-500">
          管理接入集控的班级，配置资源并下发到设备
        </p>
      </div>
      <el-button type="primary" @click="showCreate = true">
        <el-icon class="mr-1"><Plus /></el-icon>新建班级
      </el-button>
    </div>

    <!-- 同机构班级升级提示（用户主动点击，不做任何自动迁移） -->
    <el-alert
      v-for="c in schoolCandidates"
      :key="c.normalizedName"
      type="info"
      :closable="false"
      show-icon
      class="mb-4 school-hint"
    >
      <template #title>
        「{{ c.orgName }}」下有 {{ c.classCount }} 个班，建议升级为学校维度聚合管理
      </template>
      <div class="text-xs leading-relaxed">
        升级后这 {{ c.classCount }} 个班会归入同一所学校，可统一分配时间表/策略、按校批量下发插件与通知。
        <span v-if="c.sharedResources.length">将自动带入 {{ c.sharedResources.length }} 项它们共享的资源</span>
        <span v-if="c.devices.length">
          、以及 {{ c.devices.length }} 台关联设备（其中 {{ c.onlineDeviceCount }} 台在线，可实时遥控）
        </span>
      </div>
      <div class="mt-2">
        <el-button size="small" type="primary" @click="openUpgrade(c)">查看并升级</el-button>
      </div>
    </el-alert>

    <!-- 班级卡片网格 -->
    <div v-loading="loading" class="min-h-40">
      <div
        v-if="classes.length"
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        <el-card
          v-for="cls in classes"
          :key="cls._id"
          shadow="hover"
          class="class-card"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="class-avatar">
                {{ (cls.name || cls.identity || "?").charAt(0) }}
              </div>
              <div class="min-w-0">
                <div class="font-semibold text-base truncate">
                  {{ cls.name || cls.identity }}
                </div>
                <div class="text-xs text-gray-400 font-mono truncate">
                  {{ cls.identity }}
                </div>
              </div>
            </div>
            <el-tag
              v-if="cls.orgName"
              size="small"
              type="info"
              effect="plain"
              class="shrink-0"
            >
              {{ cls.orgName }}
            </el-tag>
          </div>

          <!-- 资源关联进度 -->
          <div class="mt-4">
            <div
              class="flex items-center justify-between text-xs text-gray-400 mb-1.5"
            >
              <span>必填资源</span>
              <span>{{ requiredLinked(cls) }} / {{ REQUIRED_KEYS.length }}</span>
            </div>
            <el-progress
              :percentage="(requiredLinked(cls) / REQUIRED_KEYS.length) * 100"
              :show-text="false"
              :stroke-width="6"
            />
            <div class="mt-1.5 text-xs text-gray-400">
              {{ cls.policyId ? "已关联策略" : "未关联策略（可选）" }}
            </div>
          </div>

          <div class="mt-4 flex items-center gap-1.5">
            <el-button
              size="small"
              type="primary"
              @click="navigateTo(`/classes/${cls._id}`)"
            >
              管理
            </el-button>
            <template v-if="canDeploy(cls)">
              <el-button size="small" @click="openPreset(cls)">
                <el-icon class="mr-0.5"><Download /></el-icon>部署配置
              </el-button>
            </template>
            <template v-else>
              <el-tooltip
                content="请先关联档案、时间表、课程表后再下发配置（策略可选）"
                placement="top"
              >
                <el-button size="small" disabled>
                  <el-icon class="mr-0.5"><Download /></el-icon>部署配置
                </el-button>
              </el-tooltip>
            </template>
            <el-popconfirm
              title="确定删除该班级？此操作不可恢复！"
              @confirm="remove(cls._id)"
            >
              <template #reference>
                <el-button size="small" text type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </el-card>
      </div>

      <el-empty
        v-else
        :image-size="100"
        description="暂无班级，点击右上角「新建班级」开始"
      />
    </div>

    <!-- 新建班级弹窗 -->
    <el-dialog v-model="showCreate" title="新建班级" width="420px">
      <el-form :model="form" label-position="top">
        <el-form-item label="班级标识（identity）" required>
          <el-input v-model="form.identity" placeholder="如 1-101" />
        </el-form-item>
        <el-form-item label="班级名称" required>
          <el-input v-model="form.name" placeholder="如 高一(1)班" />
        </el-form-item>
        <el-form-item label="所属组织">
          <el-input v-model="form.orgName" placeholder="如 XX中学" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="create"
          >确定</el-button
        >
      </template>
    </el-dialog>

    <!-- 升级为学校维度 -->
    <el-dialog v-model="showUpgrade" title="升级为学校维度聚合管理" width="560px">
      <div v-if="upgradeTarget" class="space-y-3 text-sm">
        <div>
          <div class="text-xs text-gray-400 mb-1">将纳入以下 {{ upgradeTarget.classCount }} 个班</div>
          <div class="flex flex-wrap gap-1">
            <el-tag v-for="c in upgradeTarget.classes" :key="c.id" size="small" effect="plain">
              {{ c.name || c.identity }}
            </el-tag>
          </div>
        </div>

        <div>
          <div class="text-xs text-gray-400 mb-1">
            共享资源（{{ upgradeTarget.sharedResources.length }} 项，升级后提升为学校级，同校其他班可直接选）
          </div>
          <div v-if="upgradeTarget.sharedResources.length" class="space-y-1">
            <div
              v-for="r in upgradeTarget.sharedResources"
              :key="r.type + r.id"
              class="flex items-center justify-between gap-2 text-xs"
            >
              <span class="truncate">{{ r.label }} · {{ r.name }}</span>
              <span class="text-gray-400 shrink-0">{{ r.usedByCount }} 个班在用</span>
            </div>
          </div>
          <div v-else class="text-xs text-gray-400">这几个班没有共享同一份资源。</div>
        </div>

        <div>
          <div class="text-xs text-gray-400 mb-1">
            关联设备（{{ upgradeTarget.devices.length }} 台，在线 {{ upgradeTarget.onlineDeviceCount }} 台可实时遥控）
          </div>
          <div v-if="upgradeTarget.devices.length" class="space-y-1">
            <div
              v-for="d in upgradeTarget.devices"
              :key="d.cuid"
              class="flex items-center justify-between gap-2 text-xs"
            >
              <span class="truncate">{{ d.className || d.identity || d.cuid }}</span>
              <el-tag size="small" :type="d.online ? 'success' : 'info'" effect="plain">
                {{ d.online ? "在线" : "离线" }}
              </el-tag>
            </div>
          </div>
          <div v-else class="text-xs text-gray-400">这几个班还没有关联设备。</div>
        </div>

        <div>
          <div class="text-xs text-gray-400 mb-1">学校名称</div>
          <el-input v-model="upgradeName" placeholder="如 XX中学" />
        </div>

        <div class="text-xs text-gray-400 leading-relaxed">
          只处理你勾选的这几个班，不会动其他班级，也不改动任何设备数据。
          升级后各班的课表仍可单独编辑。
        </div>
      </div>
      <template #footer>
        <el-button @click="showUpgrade = false">取消</el-button>
        <el-button type="primary" :loading="upgrading" @click="doUpgrade">确认升级</el-button>
      </template>
    </el-dialog>

    <!-- 下发配置弹窗 -->
    <ResponsiveDrawer v-model:open="showPreset" :title="`下发配置 - ${currentActiveRow.name}`">
      <div class="py-2">
        <!-- 加入模式 -->
        <div class="mb-4">
          <div class="text-sm font-medium mb-2">加入模式</div>
          <el-radio-group v-model="presetMode" class="mb-3">
            <el-radio-button value="serverless">静态配置</el-radio-button>
            <el-radio-button value="grpc">集控服务器（gRPC）</el-radio-button>
          </el-radio-group>
          <div v-if="presetMode === 'grpc'">
            <el-input v-model="grpcAddress" size="small" placeholder="如 http://your-host:20722">
              <template #prepend>gRPC 地址</template>
            </el-input>
            <div class="text-xs text-gray-400 mt-1">集控服务器模式支持实时通知 / 刷新数据 / 分发插件</div>
            <GrpcProxyNotice :address="grpcAddress" />
          </div>
        </div>

        <!-- 插件分发的前提：先手动装一次引导插件 -->
        <el-alert v-if="bootstrapUrl && presetMode === 'grpc'" type="info" :closable="false" class="my-4">
          <template #title>需要用平台分发插件？先给机器装引导插件</template>
          <div class="text-xs leading-relaxed">
            ClassIsland 不支持由服务端安装插件，每台机器要先手动装一次引导插件，装好后它才收得到分发的插件。
            <div class="flex items-center gap-2 mt-2 flex-wrap">
              <el-input :model-value="bootstrapUrl" size="small" readonly class="max-w-md" />
              <el-button size="small" @click="copyBootstrapUrl">复制</el-button>
              <el-button size="small" type="primary" plain @click="openBootstrapUrl">下载</el-button>
            </div>
          </div>
        </el-alert>

        <p>简单三步，即可让终端应用使用集控配置！</p>
        <el-steps direction="vertical" class="mt-4" style="height: 220px">
          <el-step
            title="下载配置文件"
            :description="`点击下方「下载配置文件」按钮，下载 ${currentActiveRow.name} 的集控配置文件`"
          />
          <el-step
            title="安装到 ClassIsland"
            :description="`打开 ${currentActiveRow.name} 的 ClassIsland 应用设置，点击右上角三个点，选择「加入管理」，选中刚刚下载的配置文件，点击「确定」`"
          />
          <el-step
            title="配置完成"
            description="应用重启后如果看到档案等配置已经从集控拉取并应用即表明配置成功"
          />
        </el-steps>
      </div>
      <template #footer>
        <el-button type="primary" @click="doDownloadPreset">下载配置文件</el-button>
      </template>
    </ResponsiveDrawer>
  </div>
</template>

<script setup lang="ts">
import { Plus, Download } from "@element-plus/icons-vue";
import ResponsiveDrawer from "@/components/ui/ResponsiveDrawer.vue";

definePageMeta({ title: "班级管理", protected: true });

const { downloadPreset, defaultGrpcAddress, loadGrpcEndpoint, grpcEndpoint } = useManagementPreset();
const {
  url: bootstrapUrl,
  loaded: bootstrapLoaded,
  fetchUrl: fetchBootstrapUrl,
  copy: copyBootstrapUrl,
  open: openBootstrapUrl,
} = useBootstrapPlugin();

const currentActiveRow = ref<any>({});
const showPreset = ref(false);
const presetMode = ref<"serverless" | "grpc">("serverless");
const grpcAddress = ref("");

const loading = ref(false);
const creating = ref(false);
const showCreate = ref(false);
const classes = ref<any[]>([]);

const form = reactive({ identity: "", name: "", orgName: "" });

/**
 * 下发前必须关联的资源（和班级详情页的 required 字段保持一致）。
 * 策略可选，不计入门槛。
 *
 * 注意这里刻意不包含 settingsId：详情页没有「设置」入口，只有备份导入会带进来，
 * 而旧代码把它算进 linkedCount、模板却写死 /4 和 ==4，
 * 于是一旦某班从备份恢复了设置，计数变成 5，部署按钮就永久置灰。
 */
const REQUIRED_KEYS = ["classplanId", "timelayoutId", "subjectsId"];

function requiredLinked(cls: any): number {
  return REQUIRED_KEYS.filter((k) => cls[k]).length;
}

function canDeploy(cls: any): boolean {
  return requiredLinked(cls) === REQUIRED_KEYS.length;
}

async function openPreset(cls: any) {
  currentActiveRow.value = cls;
  if (!grpcAddress.value) grpcAddress.value = defaultGrpcAddress();
  if (!bootstrapLoaded.value) fetchBootstrapUrl();
  // 服务端可能配了 public_grpc_address，拿到后刷新默认值
  if (!grpcEndpoint.value.loaded) {
    const initial = grpcAddress.value;
    await loadGrpcEndpoint();
    if (grpcAddress.value === initial) grpcAddress.value = defaultGrpcAddress();
  }
  showPreset.value = true;
}

function doDownloadPreset() {
  downloadPreset(currentActiveRow.value, presetMode.value, grpcAddress.value);
  ElMessage.success("已开始下载");
}

async function fetchClasses() {
  loading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/class/list", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    classes.value = res.data || [];
  } finally {
    loading.value = false;
  }
}

async function create() {
  if (!form.identity || !form.name) {
    ElMessage.warning("请填写班级标识和名称");
    return;
  }
  creating.value = true;
  try {
    await $fetch("/api/v1/console/ci/class", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: { ...form },
    });
    ElMessage.success("创建成功");
    showCreate.value = false;
    form.identity = "";
    form.name = "";
    form.orgName = "";
    await fetchClasses();
  } catch {
    ElMessage.error("创建失败");
  } finally {
    creating.value = false;
  }
}

async function remove(id: string) {
  try {
    await $fetch(`/api/v1/console/ci/class/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    ElMessage.success("已删除");
    await fetchClasses();
  } catch {
    ElMessage.error("删除失败");
  }
}

// ── 同机构班级 → 升级为学校维度（用户主动，不做自动迁移）──
const schoolCandidates = ref<any[]>([]);
const showUpgrade = ref(false);
const upgrading = ref(false);
const upgradeTarget = ref<any>(null);
const upgradeName = ref("");

async function fetchSchoolCandidates() {
  try {
    const res: any = await $fetch("/api/v1/console/ci/schools/candidates", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    schoolCandidates.value = res?.data?.candidates || [];
  } catch {
    // 拿不到就不显示提示，不影响班级管理本身
    schoolCandidates.value = [];
  }
}

function openUpgrade(c: any) {
  upgradeTarget.value = c;
  upgradeName.value = c.orgName || "";
  showUpgrade.value = true;
}

async function doUpgrade() {
  const t = upgradeTarget.value;
  if (!t) return;
  upgrading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/schools/upgrade", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: {
        classIds: t.classes.map((x: any) => x.id),
        schoolName: upgradeName.value.trim() || t.orgName,
      },
    });
    const d = res?.data || {};
    ElMessage.success(
      `已升级为「${d.schoolName}」：${d.linkedClasses} 个班、${d.adoptedResources} 项共享资源、${d.devices} 台设备`,
    );
    showUpgrade.value = false;
    await Promise.all([fetchClasses(), fetchSchoolCandidates()]);
  } catch (e: any) {
    // 409 + needInvite：同名学校已被别人创建，不能用「同名机构」硬并进去
    if (e?.data?.data?.needInvite || e?.data?.code === 409) {
      ElMessageBox.alert(
        e?.data?.msg ||
          "这所学校已经由其他账号创建。请让该校管理员在「学校 → 成员」里生成邀请链接，你加入后再挂班级。",
        "需要邀请链接",
        { type: "warning", confirmButtonText: "知道了" },
      ).catch(() => {});
      return;
    }
    ElMessage.error(e?.data?.msg || "升级失败");
  } finally {
    upgrading.value = false;
  }
}

onMounted(() => {
  fetchClasses();
  fetchSchoolCandidates();
});
</script>

<style scoped>
.class-card {
  border-radius: 12px;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.class-card:hover {
  transform: translateY(-2px);
}
.class-card :deep(.el-card__body) {
  padding: 18px;
}
.class-avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--mi-brand-light);
  color: var(--mi-brand-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
  flex-shrink: 0;
}
</style>
