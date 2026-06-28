<template>
  <div class="max-w-3xl" v-loading="loading">
    <div class="mb-4 flex items-center gap-4">
      <span class="text-sm font-medium">关联课程表：</span>
      <el-select v-model="selectedSubjectsId" placeholder="选择课程表（可选）" clearable @change="onSubjectsChange" class="w-52">
        <el-option v-for="s in subjectsList" :key="s._id" :label="s.name" :value="s._id" />
      </el-select>
    </div>

    <div class="flex items-center justify-between mb-4">
      <div class="text-sm text-gray-500">拖拽排序修改时间，保存后自动生成 ClassIsland 格式</div>
      <el-button size="small" @click="addPeriod">
        <el-icon><Plus /></el-icon>添加时段
      </el-button>
    </div>

    <div ref="listRef">
      <div
        v-for="(p, index) in periods"
        :key="p.id"
        draggable="true"
        class="flex items-center gap-2 mb-2 bg-white rounded border p-3 cursor-default flex-wrap"
        :class="{ 'opacity-40': dragIndex === index }"
        @dragstart="onDragStart($event, index)"
        @dragover.prevent="onDragOver($event, index)"
        @dragend="onDragEnd"
        @drop="onDrop($event, index)"
      >
        <el-icon class="cursor-grab text-gray-400"><Rank /></el-icon>
        <span class="text-xs text-gray-400 w-6">{{ index + 1 }}</span>
        <el-input v-model="p.name" placeholder="名称" size="small" class="flex-1 min-w-24" />
        <el-time-picker v-model="p.startVal" placeholder="开始" size="small" format="HH:mm:ss" value-format="HH:mm:ss" style="width:110px" />
        <span class="text-gray-300 text-xs">—</span>
        <el-time-picker v-model="p.endVal" placeholder="结束" size="small" format="HH:mm:ss" value-format="HH:mm:ss" style="width:110px" />
        <el-select
          v-model="p.defaultSubject"
          :placeholder="selectedSubjectsId ? '默认科目' : '请先关联课程表'"
          :disabled="!selectedSubjectsId"
          size="small" clearable style="width:130px"
        >
          <el-option v-for="sn in subjectNames" :key="sn" :label="sn" :value="sn" />
        </el-select>
        <el-button text size="small" type="danger" @click="periods.splice(index, 1)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>

    <el-button type="primary" :loading="saving" class="mt-4" @click="doSave">保存</el-button>
  </div>
</template>

<script setup lang="ts">
import { Plus, Rank, Delete } from "@element-plus/icons-vue";
import { generateUUID } from "@/util/uuid";

const props = defineProps<{ modelValue: any }>();
const emit = defineEmits<{ save: [data: any] }>();
const saving = ref(false);
const loading = ref(false);

const periods = ref<any[]>([]);
const dragIndex = ref(-1);
const subjectsList = ref<any[]>([]);
const selectedSubjectsId = ref("");
const subjectNames = ref<string[]>([]);

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

async function fetchSubjectsList() {
  try {
    const res: any = await $fetch("/api/v1/console/ci/subjects/list", { headers: authHeaders() });
    subjectsList.value = res.data || [];
  } catch { /* */ }
}

function onSubjectsChange() {
  const sub = subjectsList.value.find((s: any) => s._id === selectedSubjectsId.value);
  if (!sub?.data) { subjectNames.value = []; return; }
  const names: string[] = [];
  const data = sub.data;
  if (typeof data === "object") {
    Object.values(data).forEach((s: any) => {
      if (s?.Name) names.push(s.Name);
    });
  }
  subjectNames.value = names;
}

function loadPeriods() {
  // ClassIsland 格式 { "uuid": { Name, TimePoints: [...] } }
  const raw = props.modelValue || {};
  const entries = Object.entries(raw);
  let timePoints: any[] = [];
  let layoutUuid = "";

  if (entries.length > 0) {
    const [uuid, layout]: [string, any] = entries[0] as any;
    layoutUuid = uuid;
    timePoints = layout.TimePoints || [];
    selectedSubjectsId.value = layout.subjectsId || "";
  }

  periods.value = timePoints.map((tp: any, i: number) => ({
    id: i,
    name: tp.TimePointName || "",
    startVal: tp.Start || "",
    endVal: tp.End || "",
    defaultSubject: tp.defaultSubject || "",
  }));

  // 保存 UUID 供保存时使用
  (periods as any)._layoutUuid = layoutUuid;

  if (selectedSubjectsId.value) onSubjectsChange();
}

watch(() => props.modelValue, loadPeriods, { immediate: true });

function addPeriod() {
  periods.value.push({ id: Date.now(), name: "", startVal: "", endVal: "", defaultSubject: "" });
}

function onDragStart(_e: DragEvent, index: number) {
  dragIndex.value = index;
  if (_e.dataTransfer) {
    _e.dataTransfer.effectAllowed = "move";
    _e.dataTransfer.setData("text/plain", String(index));
  }
}
function onDragOver(_e: DragEvent, index: number) {
  if (dragIndex.value < 0 || dragIndex.value === index) return;
  const items = [...periods.value];
  const [moved] = items.splice(dragIndex.value, 1);
  items.splice(index, 0, moved);
  periods.value = items;
  dragIndex.value = index;
}
function onDrop(_e: DragEvent, _index: number) { _e.preventDefault(); }
function onDragEnd() { dragIndex.value = -1; }

function doSave() {
  const uuid = (periods as any)._layoutUuid || generateUUID();
  const data: any = {
    [uuid]: {
      Name: "",
      TimePoints: periods.value.map((p) => ({
        Start: p.startVal || "00:00:00",
        End: p.endVal || "00:00:00",
        TimePointName: p.name,
        defaultSubject: p.defaultSubject || undefined,
      })),
    },
  };
  if (selectedSubjectsId.value) data[uuid].subjectsId = selectedSubjectsId.value;
  emit("save", data);
}

onMounted(() => { fetchSubjectsList(); loadPeriods(); });
</script>
