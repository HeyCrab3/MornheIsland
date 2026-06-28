<template>
  <div class="max-w-xl">
    <div class="flex items-center justify-between mb-4">
      <div class="text-sm text-gray-500">科目列表，点击字段直接编辑</div>
      <el-button size="small" @click="addSubject">
        <el-icon><Plus /></el-icon>添加科目
      </el-button>
    </div>

    <el-table :data="subjects" stripe size="small">
      <el-table-column label="简称" width="70">
        <template #default="{ row }">
          <el-input v-model="row.initial" size="small" class="w-14" maxlength="2" />
        </template>
      </el-table-column>
      <el-table-column label="科目名称" min-width="120">
        <template #default="{ row }">
          <el-input v-model="row.name" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="教师" min-width="100">
        <template #default="{ row }">
          <el-input v-model="row.teacherName" size="small" placeholder="(选填)" />
        </template>
      </el-table-column>
      <el-table-column label="室外" width="70">
        <template #default="{ row }">
          <el-checkbox v-model="row.isOutDoor" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="70">
        <template #default="{ $index }">
          <el-button text size="small" type="danger" @click="subjects.splice($index, 1)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-button type="primary" :loading="saving" class="mt-4" @click="doSave">保存</el-button>
  </div>
</template>

<script setup lang="ts">
import { Plus, Delete } from "@element-plus/icons-vue";
import { generateUUID } from "@/util/uuid";

interface SubjectRow { uuid: string; name: string; initial: string; teacherName: string; isOutDoor: boolean }

const props = defineProps<{ modelValue: any }>();
const emit = defineEmits<{ save: [data: any] }>();
const saving = ref(false);

const subjects = ref<SubjectRow[]>([]);

const DEFAULT_NAMES = [
  "语文", "数学", "英语", "物理", "化学", "生物",
  "政治", "历史", "地理", "音乐", "体育", "美术", "信息技术",
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
        isOutDoor: name === "体育",
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
  // 补默认的 AttachedObjects 等（ClassIsland 需要这些字段）
  Object.values(data).forEach((sub: any) => {
    if (!sub.AttachedObjects) sub.AttachedObjects = {};
  });
  emit("save", data);
}
</script>
