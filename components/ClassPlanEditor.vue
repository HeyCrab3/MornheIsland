<template>
  <div v-loading="loading">
    <div class="mb-4 flex items-center gap-4">
      <span class="text-sm font-medium">时间表：</span>
      <el-select v-model="selectedTimelayoutId" placeholder="必选" @change="onTimelayoutChange" class="w-48">
        <el-option v-for="t in timelayouts" :key="t._id" :label="t.name" :value="t._id" />
      </el-select>
      <span class="text-sm font-medium ml-4">课程表：</span>
      <el-select v-model="selectedSubjectsId" placeholder="必选" @change="onSubjectsChange" class="w-48">
        <el-option v-for="s in subjectsList" :key="s._id" :label="s.name" :value="s._id" />
      </el-select>
    </div>

    <template v-if="timePoints.length > 0 && subjectPool.length > 0">
      <div class="mb-3 flex items-center gap-2">
        <span class="text-sm text-gray-500">上课日：</span>
        <el-checkbox-group v-model="activeDays" size="small" :options="DAYS" @change="forceRender++"/>
      </div>

      <div class="flex gap-4">
        <div class="w-32 shrink-0">
          <div class="text-sm font-medium mb-2">科目</div>
          <div class="space-y-1">
            <div
              v-for="s in subjectPool"
              :key="s.uuid"
              class="subject-chip"
              :class="{ 'ring-1 ring-(--mi-brand)': s.name === pickedSubject }"
              @click="pickedSubject = s.name"
            >
              {{ s.name }}
            </div>
          </div>
          <div class="text-xs text-gray-400 mt-2">点击科目后点格子填入</div>
        </div>

        <div class="flex-1 overflow-x-auto" :key="forceRender">
          <table class="border-collapse w-full">
            <thead>
              <tr>
                <th class="border p-2 bg-gray-50 dark:bg-gray-600 text-sm w-24">节次</th>
                <th v-for="d in activeDays" :key="d" class="border p-2 bg-gray-50 dark:bg-gray-600 text-sm min-w-28">
                  {{ DAYS.find(x => x.value === d)?.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(tp, tpi) in timePoints" :key="tpi">
                <td class="border p-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-600 align-top">
                  <div class="font-medium">{{ tp.TimePointName }}</div>
                  <div class="text-gray-400">{{ tp.Start }}-{{ tp.End }}</div>
                </td>
                <td v-for="d in activeDays" :key="d" class="border p-1 align-top">
                  <div
                    class="cell"
                    :class="{ filled: getCellSubject(d, tpi), hover: pickedSubject }"
                    @click="setCell(d, tpi)"
                  >
                    {{ getCellSubjectName(d, tpi) || '—' }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <el-button type="primary" :loading="saving" class="mt-4" @click="doSave">保存课表</el-button>
    </template>

    <el-empty v-else :description="!timePoints.length ? '请先选择时间表' : '请先选择课程表'" />
  </div>
</template>

<script setup lang="ts">
import { generateUUID } from "@/util/uuid";

interface SubEntry { uuid: string; name: string }
interface TimePoint { Start: string; End: string; TimePointName: string; defaultSubject?: string }

const props = defineProps<{ modelValue: any }>();
const emit = defineEmits<{ save: [data: any] }>();
const saving = ref(false);
const loading = ref(false);
const forceRender = ref(0);

const DAYS = [
  { value: "Monday", label: "周一", weekDay: 1 },
  { value: "Tuesday", label: "周二", weekDay: 2 },
  { value: "Wednesday", label: "周三", weekDay: 3 },
  { value: "Thursday", label: "周四", weekDay: 4 },
  { value: "Friday", label: "周五", weekDay: 5 },
  { value: "Saturday", label: "周六", weekDay: 6 },
  { value: "Sunday", label: "周日", weekDay: 0 },
];
const activeDays = ref(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);

const timelayouts = ref<any[]>([]);
const subjectsList = ref<any[]>([]);
const selectedTimelayoutId = ref("");
const selectedSubjectsId = ref("");
const timePoints = ref<TimePoint[]>([]);
const subjectPool = ref<SubEntry[]>([]);
const pickedSubject = ref("");

// grid: { "Monday": ["uuid1", null, "uuid2", ...] } — index = timePoint index
const grid = reactive<Record<string, (string | null)[]>>({});

// UUID map for existing classplan entries
const existingUuids: Record<string, string> = {};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

async function fetchResources() {
  loading.value = true;
  try {
    const [tlRes, sjRes] = await Promise.all([
      $fetch("/api/v1/console/ci/timelayout/list", { headers: authHeaders() }),
      $fetch("/api/v1/console/ci/subjects/list", { headers: authHeaders() }),
    ]);
    timelayouts.value = (tlRes as any).data || [];
    subjectsList.value = (sjRes as any).data || [];

    if (props.modelValue) {
      selectedTimelayoutId.value = props.modelValue.timelayoutId || "";
      selectedSubjectsId.value = props.modelValue.subjectsId || "";

      // 恢复已有 grid 数据
      const entries = Object.entries(props.modelValue.classPlans || props.modelValue || {});
      for (const [uuid, entry] of entries as [string, any][]) {
        if (!entry?.TimeRule || !entry?.Classes) continue;
        const dayKey = DAYS.find((d) => d.weekDay === entry.TimeRule.WeekDay)?.value;
        if (!dayKey) continue;
        existingUuids[dayKey] = uuid;
        if (!grid[dayKey]) grid[dayKey] = [];
        entry.Classes.forEach((cls: any, i: number) => {
          grid[dayKey][i] = cls?.SubjectId || null;
        });
      }

      if (props.modelValue.timelayoutId) {
        const tl = timelayouts.value.find((t: any) => t._id === props.modelValue.timelayoutId);
        if (tl?.data) loadTimePoints(tl.data);
      }
      if (props.modelValue.subjectsId) onSubjectsChange();
    }
  } finally {
    loading.value = false;
  }
}

function loadTimePoints(data: any) {
  const entries = Object.entries(data);
  if (entries.length > 0) {
    timePoints.value = (entries[0][1] as any).TimePoints || [];
  }
}

function onTimelayoutChange() {
  const tl = timelayouts.value.find((t: any) => t._id === selectedTimelayoutId.value);
  if (tl?.data) loadTimePoints(tl.data);
  forceRender.value++;
}

function onSubjectsChange() {
  subjectPool.value = [];
  const sub = subjectsList.value.find((s: any) => s._id === selectedSubjectsId.value);
  if (!sub?.data) return;
  const data = sub.data;
  if (typeof data === "object") {
    Object.entries(data).forEach(([uuid, s]: [string, any]) => {
      if (s?.Name) subjectPool.value.push({ uuid, name: s.Name });
    });
  }
}

function getCellSubject(dayKey: string, tpi: number): string | null {
  return grid[dayKey]?.[tpi] || null;
}

function getCellSubjectName(dayKey: string, tpi: number): string {
  const uuid = getCellSubject(dayKey, tpi);
  if (!uuid) return "";
  return subjectPool.value.find((s) => s.uuid === uuid)?.name || "";
}

function setCell(dayKey: string, tpi: number) {
  if (!pickedSubject.value) {
    // 清除
    if (grid[dayKey]) grid[dayKey][tpi] = null;
    return;
  }
  const sub = subjectPool.value.find((s) => s.name === pickedSubject.value);
  if (!sub) return;
  if (!grid[dayKey]) grid[dayKey] = [];
  grid[dayKey][tpi] = sub.uuid;
}

function doSave() {
  if (!selectedTimelayoutId.value) return ElMessage.warning("请先选择时间表");
  if (!selectedSubjectsId.value) return ElMessage.warning("请先选择课程表");

  const classPlans: Record<string, any> = {};
  const tlUuid = (() => {
    const tl = timelayouts.value.find((t: any) => t._id === selectedTimelayoutId.value);
    if (tl?.data) return Object.keys(tl.data)[0] || "";
    return "";
  })();

  for (const d of activeDays.value) {
    const dayInfo = DAYS.find((x) => x.value === d)!;
    const uuid = existingUuids[d] || generateUUID();
    const classes = [];
    for (let i = 0; i < timePoints.value.length; i++) {
      const subUuid = grid[d]?.[i] || null;
      classes.push(subUuid ? { SubjectId: subUuid } : null);
    }
    classPlans[uuid] = {
      TimeLayoutId: tlUuid,
      TimeRule: { WeekDay: dayInfo.weekDay, WeekCountDiv: 0 },
      Classes: classes,
      Name: dayInfo.label,
      IsOverlay: false,
      IsEnabled: true,
    };
  }

  const data: any = { classPlans, timelayoutId: selectedTimelayoutId.value, subjectsId: selectedSubjectsId.value };
  emit("save", data);
}

onMounted(fetchResources);
</script>

<style scoped>
.subject-chip {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
}
.subject-chip:hover {
  border-color: var(--mi-brand);
}
.cell {
  min-height: 32px;
  padding: 2px 6px;
  border: 1px dashed #e5e7eb;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #ccc;
  cursor: pointer;
  transition: all 0.15s;
}
.cell.filled {
  color: #333;
  background: #e8f0fe;
  border-color: #90b4f0;
}
.cell.hover:hover {
  border-color: var(--mi-brand);
  background: var(--mi-brand-light);
}
</style>
