<template>
  <div>
    <el-page-header @back="navigateTo('/classes')" class="mb-4">
      <template #content>
        <span class="text-lg font-medium">{{ cls?.name || cls?.identity || '班级详情' }}</span>
      </template>
    </el-page-header>

    <el-card v-loading="loading" class="max-w-2xl">
      <el-form label-position="top" @submit.prevent="doSave">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="班级标识" required>
              <el-input v-model="form.identity" disabled />
              <span class="text-xs text-gray-400">创建后不可修改</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="班级名称" required>
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">关联资源</el-divider>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="课表">
              <el-select v-model="form.classplanId" clearable placeholder="不关联" class="w-full">
                <el-option v-for="r in resources.classplans" :key="r._id" :label="`${r.name} (v${r.version})`" :value="r._id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="时间表">
              <el-select v-model="form.timelayoutId" clearable placeholder="不关联" class="w-full">
                <el-option v-for="r in resources.timelayouts" :key="r._id" :label="`${r.name} (v${r.version})`" :value="r._id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="科目">
              <el-select v-model="form.subjectsId" clearable placeholder="不关联" class="w-full">
                <el-option v-for="r in resources.subjects" :key="r._id" :label="`${r.name} (v${r.version})`" :value="r._id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="应用设置">
              <el-select v-model="form.settingsId" clearable placeholder="不关联" class="w-full">
                <el-option v-for="r in resources.settings" :key="r._id" :label="`${r.name} (v${r.version})`" :value="r._id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="策略">
              <el-select v-model="form.policyId" clearable placeholder="不关联" class="w-full">
                <el-option v-for="r in resources.policies" :key="r._id" :label="r.name" :value="r._id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider />
        <el-button type="primary" :loading="saving" @click="doSave">保存</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "班级详情", protected: true });

const route = useRoute();
const id = route.params.id as string;
const loading = ref(false);
const saving = ref(false);
const cls = ref<any>(null);

const form = reactive({
  identity: "",
  name: "",
  classplanId: null as string | null,
  timelayoutId: null as string | null,
  subjectsId: null as string | null,
  settingsId: null as string | null,
  policyId: null as string | null,
});

const resources = reactive<Record<string, any[]>>({
  classplans: [],
  timelayouts: [],
  subjects: [],
  settings: [],
  policies: [],
});

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

async function fetchAll() {
  loading.value = true;
  try {
    // 并行加载班级详情和所有资源列表
    const [classRes, ...resourceResults] = await Promise.all([
      $fetch(`/api/v1/console/ci/class/${id}`, { headers: authHeaders() }),
      ...["classplan", "timelayout", "subjects", "settings", "policy"].map((t) =>
        $fetch(`/api/v1/console/ci/${t}/list`, { headers: authHeaders() }),
      ),
    ]);

    const data = (classRes as any).data;
    cls.value = data;
    form.identity = data.identity;
    form.name = data.name;
    form.classplanId = data.classplan?._id ?? data.classplanId ?? null;
    form.timelayoutId = data.timelayout?._id ?? data.timelayoutId ?? null;
    form.subjectsId = data.subjects?._id ?? data.subjectsId ?? null;
    form.settingsId = data.settings?._id ?? data.settingsId ?? null;
    form.policyId = data.policy?._id ?? data.policyId ?? null;

    const keys = ["classplans", "timelayouts", "subjects", "settings", "policies"];
    resourceResults.forEach((r: any, i: number) => {
      resources[keys[i]] = r.data || [];
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
  } catch {
    ElMessage.error("保存失败");
  } finally {
    saving.value = false;
  }
}

onMounted(fetchAll);
</script>
