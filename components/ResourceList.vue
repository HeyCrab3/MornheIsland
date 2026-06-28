<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-semibold mb-1">{{ label }}库</h1>
        <p class="text-sm text-gray-500">管理可复用的{{ label }}资源，创建后可在班级中关联</p>
      </div>
      <el-button type="primary" @click="showCreate = true">
        <el-icon class="mr-1"><Plus /></el-icon>新建{{ label }}
      </el-button>
    </div>

    <el-table :data="items" stripe v-loading="loading" empty-text="暂无资源">
      <el-table-column prop="name" :label="`${label}名称`" min-width="160" />
      <el-table-column label="版本" width="80">
        <template #default="{ row }">v{{ row.version }}</template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" min-width="170">
        <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button text size="small" type="primary" @click="navigateTo(`/${collection}/${row._id}`)">
            编辑
          </el-button>
          <el-popconfirm :title="`确定删除「${row.name}」？`" @confirm="remove(row._id)">
            <template #reference>
              <el-button text size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showCreate" :title="`新建${label}`" width="400px">
      <el-form @submit.prevent="doCreate">
        <el-form-item :label="`${label}名称`" required>
          <el-input v-model="newName" :placeholder="`如「高中标准${label}」`" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="doCreate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus } from "@element-plus/icons-vue";

const props = defineProps<{ collection: string; label: string }>();
const { items, loading, fetchList, createItem, removeItem } = useCiResource(props.collection, props.label);
const remove = removeItem;

const showCreate = ref(false);
const creating = ref(false);
const newName = ref("");

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString("zh-CN") : "-";
}

async function doCreate() {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    await createItem(newName.value.trim());
    ElMessage.success(`${props.label}已创建`);
    showCreate.value = false;
    newName.value = "";
    await fetchList();
  } catch {
    ElMessage.error("创建失败");
  } finally {
    creating.value = false;
  }
}

onMounted(fetchList);
</script>
