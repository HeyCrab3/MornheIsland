<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-2xl font-semibold mb-1">{{ label }}库</h1>
        <p class="text-sm text-gray-500">管理可复用的{{ label }}资源，创建后可在班级中关联</p>
      </div>
      <el-button type="primary" @click="showCreate = true">
        <el-icon class="mr-1"><Plus /></el-icon>新建{{ label }}
      </el-button>
    </div>

    <div v-loading="loading" class="min-h-40">
      <div v-if="items.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <el-card
          v-for="item in items"
          :key="item._id"
          shadow="hover"
          class="res-card cursor-pointer"
          @click="navigateTo(`/${collection}/${item._id}`)"
        >
          <div class="flex items-start gap-3">
            <div class="res-icon">
              <el-icon :size="20"><component :is="icon" /></el-icon>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-base truncate">{{ item.name }}</div>
              <div class="text-xs text-gray-400 mt-1">
                v{{ item.version }} · 更新于 {{ formatDate(item.updatedAt) }}
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-end gap-1.5">
            <el-button size="small" text type="primary" @click.stop="navigateTo(`/${collection}/${item._id}`)">
              编辑
            </el-button>
            <el-popconfirm :title="`确定删除「${item.name}」？`" @confirm="remove(item._id)">
              <template #reference>
                <el-button size="small" text type="danger" @click.stop>删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </el-card>
      </div>

      <el-empty v-else :image-size="100" :description="`暂无${label}，点击右上角「新建${label}」开始`" />
    </div>

    <el-dialog v-model="showCreate" :title="`新建${label}`" width="400px">
      <el-form @submit.prevent="doCreate">
        <el-form-item :label="`${label}名称`" required>
          <el-input v-model="newName" :placeholder="`如「高中标准${label}」`" @keyup.enter="doCreate" />
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
import { Plus, Notebook, Timer, Collection, Lock, Document } from "@element-plus/icons-vue";

const props = defineProps<{ collection: string; label: string }>();
const { items, loading, fetchList, createItem, removeItem } = useCiResource(props.collection, props.label);
const remove = removeItem;

const ICONS: Record<string, any> = {
  classplan: Notebook,
  timelayout: Timer,
  subjects: Collection,
  policy: Lock,
};
const icon = computed(() => ICONS[props.collection] || Document);

const showCreate = ref(false);
const creating = ref(false);
const newName = ref("");

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString("zh-CN") : "-";
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

<style scoped>
.res-card {
  border-radius: var(--mi-radius-lg);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.res-card:hover {
  transform: translateY(-2px);
}
.res-card :deep(.el-card__body) {
  padding: 18px;
}
.res-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--mi-brand-light);
  color: var(--mi-brand-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
