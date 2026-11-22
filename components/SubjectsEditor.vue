<template>
  <div class="max-w-xl">
    <div class="flex items-center justify-between mb-4">
      <div class="text-sm text-gray-500">{{ $t('components.subjectseditor.extra.listHint') }}</div>
      <el-button size="small" @click="addSubject">
        <el-icon><Plus /></el-icon>{{ $t('components.subjectseditor.extra.addSubject') }}
      </el-button>
    </div>

    <el-table :data="subjects" stripe size="small">
      <el-table-column :label="$t('components.subjectseditor.shortName')" width="70">
        <template #default="{ row }">
          <el-input v-model="row.initial" size="small" class="w-14" maxlength="2" />
        </template>
      </el-table-column>
      <el-table-column :label="$t('components.subjectseditor.subjectName')" min-width="120">
        <template #default="{ row }">
          <el-input v-model="row.name" size="small" />
        </template>
      </el-table-column>
      <el-table-column :label="$t('components.subjectseditor.teacher')" min-width="100">
        <template #default="{ row }">
          <el-input v-model="row.teacherName" size="small" :placeholder="$t('components.subjectseditor.optional')" />
        </template>
      </el-table-column>
      <el-table-column :label="$t('components.subjectseditor.outdoor')" width="70">
        <template #default="{ row }">
          <el-checkbox v-model="row.isOutDoor" size="small" />
        </template>
      </el-table-column>
      <el-table-column :label="$t('components.subjectseditor.actions')" width="70">
        <template #default="{ $index }">
          <el-button text size="small" type="danger" @click="subjects.splice($index, 1)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-button type="primary" :loading="saving" class="mt-4" @click="doSave">{{ $t('pages.subaccounts.save') }}</el-button>
  </div>
</template>

<script setup lang="ts">
import { Plus, Delete } from "@element-plus/icons-vue";
import { generateUUID } from "@/util/uuid";

interface SubjectRow { uuid: string; name: string; initial: string; teacherName: string; isOutDoor: boolean }

const props = defineProps<{ modelValue: any }>();
const emit = defineEmits<{ save: [data: any] }>();
const { t } = useI18n();
const saving = ref(false);

const subjects = ref<SubjectRow[]>([]);

const DEFAULT_NAMES = [
  t('components.subjectseditor.chinese'), t('components.subjectseditor.math'), t('components.subjectseditor.english'),
  t('components.subjectseditor.physics'), t('components.subjectseditor.chemistry'), t('components.subjectseditor.biology'),
  t('components.subjectseditor.politics'), t('components.subjectseditor.history'), t('components.subjectseditor.geography'),
  t('components.subjectseditor.music'), t('components.subjectseditor.pe'), t('components.subjectseditor.art'),
  t('components.subjectseditor.informationTech'),
];

function loadSubjects() {
  const raw = props.modelValue || {};
  const list: SubjectRow[] = [];

  // 从 UUID-keyed 格式转为数组
  if (raw && typeof raw === "object") {
    Object.entries(raw).forEach(([uuid, sub]: [string, any]) => {
      if (sub && sub.Name) {
        list.push({
          uuid,
          name: sub.Name,
          initial: sub.Initial || sub.Name?.charAt(0) || "",
          teacherName: sub.TeacherName || "",
          isOutDoor: !!sub.IsOutDoor,
        });
      }
    });
  }

  // 补默认科目
  for (const name of DEFAULT_NAMES) {
    if (!list.find((s) => s.name === name)) {
      list.push({
        uuid: generateUUID(),
        name,
        initial: name.charAt(0),
        teacherName: "",
        isOutDoor: name === t('components.subjectseditor.pe'),
      });
    }
  }

  subjects.value = list;
}

watch(() => props.modelValue, loadSubjects, { immediate: true });

function addSubject() {
  subjects.value.push({ uuid: generateUUID(), name: "", initial: "", teacherName: "", isOutDoor: false });
}

function doSave() {
  const data: Record<string, any> = {};
  for (const s of subjects.value) {
    if (!s.name.trim()) continue;
    data[s.uuid] = {
      Name: s.name.trim(),
      Initial: s.initial || s.name.charAt(0),
      TeacherName: s.teacherName || "",
      IsOutDoor: s.isOutDoor,
    };
  }
  // 补默认字段（ClassIsland 需要）
  Object.values(data).forEach((sub: any) => {
    if (!sub.AttachedObjects) sub.AttachedObjects = {};
    if (sub.IsActive === undefined) sub.IsActive = false;
  });
  emit("save", data);
}
</script>
