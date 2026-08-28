<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-2xl font-semibold mb-1">班级管理</h1>
        <p class="text-sm text-gray-500">管理接入集控的班级，配置资源并下发到设备</p>
      </div>
      <el-button type="primary" @click="showCreate = true">
        <el-icon class="mr-1"><Plus /></el-icon>新建班级
      </el-button>
    </div>

    <!-- 班级卡片网格 -->
    <div v-loading="loading" class="min-h-40">
      <div v-if="classes.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <el-card v-for="cls in classes" :key="cls._id" shadow="hover" class="class-card">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="class-avatar">{{ (cls.name || cls.identity || '?').charAt(0) }}</div>
              <div class="min-w-0">
                <div class="font-semibold text-base truncate">{{ cls.name || cls.identity }}</div>
                <div class="text-xs text-gray-400 font-mono truncate">{{ cls.identity }}</div>
              </div>
            </div>
            <el-tag v-if="cls.orgName" size="small" type="info" effect="plain" class="shrink-0">
              {{ cls.orgName }}
            </el-tag>
          </div>

          <!-- 资源关联进度 -->
          <div class="mt-4">
            <div class="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span>资源关联</span>
              <span>{{ linkedCount(cls) }} / 5</span>
            </div>
            <el-progress :percentage="linkedCount(cls) * 20" :show-text="false" :stroke-width="6" />
          </div>

          <div class="mt-4 flex items-center gap-1.5">
            <el-button size="small" type="primary" @click="navigateTo(`/classes/${cls._id}`)">
              管理
            </el-button>
            <el-button size="small" @click="openPreset(cls)">
              <el-icon class="mr-0.5"><Download /></el-icon>部署配置
            </el-button>
            <el-popconfirm title="确定删除该班级？此操作不可恢复！" @confirm="remove(cls._id)">
              <template #reference>
                <el-button size="small" text type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </el-card>
      </div>

      <el-empty v-else :image-size="100" description="暂无班级，点击右上角「新建班级」开始" />
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
        <el-button type="primary" :loading="creating" @click="create">确定</el-button>
      </template>
    </el-dialog>

    <!-- 下发配置弹窗 -->
    <el-dialog v-model="showPreset" :title="`下发配置 - ${currentActiveRow.name}`">
      <p>简单三步，即可让终端应用使用集控配置！</p>
      <el-steps direction="vertical" class="mt-4" style="height: 250px">
        <el-step
          title="下载配置文件"
          :description="`点击提示框最底部的「下载配置文件」按钮，下载 ${currentActiveRow.name} 的集控配置文件`"
        />
        <el-step
          title="安装到 ClassIsland"
          :description="`打开 ${currentActiveRow.name} 的 ClassIsland 应用设置，点击右上角三个点，选择「加入管理」，选中刚刚下载的配置文件，点击「确定」`"
        />
        <el-step
          title="配置完成"
          description="应用重启后如果看到档案等配置已经从集控拉取并应用即表明配置成功，此后每次 CI 启动时都会检查集控数据是否有更新，无需再手动重新配置"
        />
      </el-steps>
      <template #footer>
        <el-button type="primary" @click="downloadPreset(currentActiveRow); ElMessage.success('已开始下载')">
          下载配置文件
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus, Download } from "@element-plus/icons-vue";

definePageMeta({ title: "班级管理", protected: true });

const { downloadPreset } = useManagementPreset();

const currentActiveRow = ref<any>({});
const showPreset = ref(false);

const loading = ref(false);
const creating = ref(false);
const showCreate = ref(false);
const classes = ref<any[]>([]);

const form = reactive({ identity: "", name: "", orgName: "" });

const RESOURCE_KEYS = ["classplanId", "timelayoutId", "subjectsId", "settingsId", "policyId"];

function linkedCount(cls: any): number {
  return RESOURCE_KEYS.filter((k) => cls[k]).length;
}

function openPreset(cls: any) {
  currentActiveRow.value = cls;
  showPreset.value = true;
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

onMounted(fetchClasses);
</script>

<style scoped>
.class-card {
  border-radius: 12px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
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
