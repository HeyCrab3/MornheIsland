<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-semibold mb-1">班级列表</h1>
        <p class="text-sm text-gray-500">管理所有接入集控的班级</p>
      </div>
      <el-button type="primary" @click="showCreate = true">
        <el-icon class="mr-1"><Plus /></el-icon>新建班级
      </el-button>
    </div>

    <el-table :data="classes" stripe v-loading="loading" empty-text="暂无班级">
      <el-table-column prop="identity" label="标识" min-width="120" />
      <el-table-column prop="name" label="班级名称" min-width="160" />
      <el-table-column prop="orgName" label="所属组织" min-width="140" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button text size="small" type="primary" @click="navigateTo(`/classes/${row._id}`)">
            管理
          </el-button>
          <el-popconfirm title="确定删除？关联的课表/策略也会一并删除" @confirm="remove(row._id)">
            <template #reference>
              <el-button text size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

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
  </div>
</template>

<script setup lang="ts">
import { Plus } from "@element-plus/icons-vue";

definePageMeta({ title: "班级列表", protected: true });

const loading = ref(false);
const creating = ref(false);
const showCreate = ref(false);
const classes = ref<any[]>([]);

const form = reactive({ identity: "", name: "", orgName: "" });

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
