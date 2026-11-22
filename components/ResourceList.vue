<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-2xl font-semibold mb-1">{{ label }}{{ $t('components.resourcelist.extra.librarySuffix') }}</h1>
        <p class="text-sm text-gray-500">{{ $t('components.resourcelist.extra.descA') }}{{ label }}{{ $t('components.resourcelist.extra.descB') }}</p>
      </div>
      <el-button type="primary" @click="showCreate = true">
        <el-icon class="mr-1"><Plus /></el-icon>{{ $t('components.resourcelist.extra.createPrefix') }}{{ label }}
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
              <div class="flex items-center gap-1.5 min-w-0">
                <div class="font-semibold text-base truncate">{{ item.name }}</div>
                <el-tag v-if="item.isSchoolLevel" size="small" type="success" effect="plain" class="shrink-0">
                  {{ $t('components.resourcelist.extra.schoolShared') }}
                </el-tag>
              </div>
              <div class="text-xs text-gray-400 mt-1">
                v{{ item.version }} · {{ $t('components.resourcelist.extra.updatedAt') }} {{ formatDate(item.updatedAt) }}
                <span v-if="item.isSchoolLevel && !item.editable" class="text-amber-500"> · {{ $t('components.resourcelist.extra.readOnly') }}</span>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-end gap-1.5">
            <el-button size="small" text type="primary" @click.stop="navigateTo(`/${collection}/${item._id}`)">
              {{ item.editable === false ? $t('components.resourcelist.view') : $t('components.resourcelist.edit') }}
            </el-button>
            <template v-if="item.editable !== false">
              <el-button size="small" text @click.stop="rename(item._id, item.name)">
                {{ $t('components.resourcelist.extra.rename') }}
              </el-button>
              <el-popconfirm :title="$t('components.resourcelist.extra.deleteConfirm', { name: item.name })" @confirm="remove(item._id)">
                <template #reference>
                  <el-button size="small" text type="danger" @click.stop>{{ $t('components.resourceeditor.delete') }}</el-button>
                </template>
              </el-popconfirm>
            </template>
          </div>
        </el-card>
      </div>

      <el-empty v-else :image-size="100" :description="$t('components.resourcelist.extra.emptyHint', { label })" />
    </div>

    <el-dialog v-model="showCreate" :title="$t('components.resourcelist.extra.createTitle', { label })" width="400px">
      <el-form @submit.prevent="doCreate">
        <el-form-item :label="$t('components.resourcelist.extra.nameLabel', { label })" required>
          <el-input v-model="newName" :placeholder="$t('components.resourcelist.extra.namePlaceholder', { label })" @keyup.enter="doCreate" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="doCreate">{{ $t('components.resourceeditor.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus, Notebook, Timer, Collection, Lock, Document } from "@element-plus/icons-vue";

const props = defineProps<{ collection: string; label: string }>();
const { t } = useI18n();
const { items, loading, fetchList, createItem, removeItem, renameItem } = useCiResource(props.collection, props.label);
const remove = removeItem;
const rename = renameItem;

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
    ElMessage.success(t('components.resourcelist.extra.created', { label: props.label }));
    showCreate.value = false;
    newName.value = "";
    await fetchList();
  } catch {
    ElMessage.error(t('components.resourcelist.createFailed'));
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
