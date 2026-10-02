<template>
  <div v-loading="loading">
    <el-alert
      v-if="mobile"
      type="info"
      :closable="false"
      show-icon
      class="mb-4"
      title="课表网格编辑在手机上体验有限，以下为只读预览，请在电脑上编辑。"
    />
    <div v-if="!mobile" class="mb-4 flex items-center gap-4 flex-wrap">
      <span class="text-sm font-medium">时间表：</span>
      <el-select v-model="selectedTimelayoutId" placeholder="必选" @change="onTimelayoutChange" class="w-48">
        <el-option v-for="t in timelayouts" :key="t._id" :label="t.name" :value="t._id" />
      </el-select>
      <span class="text-sm font-medium ml-4">课程表：</span>
      <el-select v-model="selectedSubjectsId" placeholder="必选" @change="onSubjectsChange" class="w-48">
        <el-option v-for="s in subjectsList" :key="s._id" :label="s.name" :value="s._id" />
      </el-select>
    </div>

    <!-- 周次轮换：每周 / 单周 / 双周 -->
    <div v-if="!mobile" class="mb-4 flex items-center gap-3">
      <span class="text-sm font-medium">周次：</span>
      <el-radio-group v-model="activeWeekDiv" @change="forceRender++">
        <el-radio-button v-for="t in WEEK_TABS" :key="t.value" :value="t.value">
          {{ t.label }}
        </el-radio-button>
      </el-radio-group>
      <el-dropdown @command="copyWeekTo">
        <el-button size="small" text type="primary">
          复制当前周到…<el-icon class="ml-1"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="opt in otherWeeks" :key="opt.value" :command="opt.value">
              {{ opt.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <span class="text-xs text-gray-400">每周 = 不轮换；单周 + 双周 = 两周轮换</span>
    </div>

    <template v-if="timePoints.length > 0 && subjectPool.length > 0">
      <div v-if="!mobile" class="mb-3 flex items-center gap-2">
        <span class="text-sm text-gray-500">上课日：</span>
        <el-checkbox-group v-model="activeDays" size="small" :options="DAYS" @change="forceRender++"/>
      </div>

      <div class="flex gap-4">
        <div v-if="!mobile" class="w-32 shrink-0">
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

      <el-button v-if="!mobile" type="primary" :loading="saving" class="mt-4" @click="doSave">保存课表</el-button>
    </template>

    <el-empty v-else :description="!timePoints.length ? '请先选择时间表' : '请先选择课程表'" />
  </div>
</template>

<script setup lang="ts">
import { generateUUID } from "@/util/uuid";
import { ArrowDown } from "@element-plus/icons-vue";
import isMobile from "@/util/is-mobile";

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

// 周次三档：0=每周, 1=单周, 2=双周
const WEEK_TABS = [
  { value: 0, label: "每周" },
  { value: 1, label: "单周" },
  { value: 2, label: "双周" },
] as const;

const activeDays = ref(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);

const timelayouts = ref<any[]>([]);
const subjectsList = ref<any[]>([]);
const selectedTimelayoutId = ref("");
const selectedSubjectsId = ref("");
const timePoints = ref<TimePoint[]>([]);
const subjectPool = ref<SubEntry[]>([]);
const pickedSubject = ref("");
const mobile = ref(false);

// 当前编辑的周次
const activeWeekDiv = ref<0 | 1 | 2>(0);

// 三套 grid：grids[weekDiv][dayKey] = [科目 uuid per 节次]
const grids = reactive<Record<0 | 1 | 2, Record<string, (string | null)[]>>>({ 0: {}, 1: {}, 2: {} });

// 已有 entry 的 uuid：existingUuids[weekDiv][dayKey] = uuid
const existingUuids = reactive<Record<0 | 1 | 2, Record<string, string>>>({ 0: {}, 1: {}, 2: {} });

const otherWeeks = computed(() => WEEK_TABS.filter((t) => t.value !== activeWeekDiv.value));

function currentGrid(): Record<string, (string | null)[]> {
  return grids[activeWeekDiv.value];
}

function weekLabel(v: number): string {
  return v === 0 ? "每周" : v === 1 ? "单周" : "双周";
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

async function fetchResources() {
  loading.value = true;
  try {
    activeDays.value = [];
    // 重置三周数据，避免切换资源时残留旧数据
    grids[0] = {}; grids[1] = {}; grids[2] = {};
    existingUuids[0] = {}; existingUuids[1] = {}; existingUuids[2] = {};

    const [tlRes, sjRes] = await Promise.all([
      $fetch("/api/v1/console/ci/timelayout/list", { headers: authHeaders() }),
      $fetch("/api/v1/console/ci/subjects/list", { headers: authHeaders() }),
    ]);
    timelayouts.value = (tlRes as any).data || [];
    subjectsList.value = (sjRes as any).data || [];

    if (props.modelValue) {
      selectedTimelayoutId.value = props.modelValue.timelayoutId || "";
      selectedSubjectsId.value = props.modelValue.subjectsId || "";

      // 恢复已有 grid 数据（按 WeekCountDiv 分到 每周/单周/双周）
      const entries = Object.entries(props.modelValue.classPlans || props.modelValue || {});
      for (const [uuid, entry] of entries as [string, any][]) {
        if (!entry?.TimeRule || !entry?.Classes) continue;
        const dayKey = DAYS.find((d) => d.weekDay === entry.TimeRule.WeekDay)?.value;
        if (!dayKey) continue;
        if (!activeDays.value.includes(dayKey)) activeDays.value.push(dayKey);

        const wd = entry.TimeRule.WeekCountDiv as number;
        const div: 0 | 1 | 2 = (wd === 1 || wd === 2) ? wd : 0;
        existingUuids[div][dayKey] = uuid;
        if (!grids[div][dayKey]) grids[div][dayKey] = [];
        entry.Classes.forEach((cls: any, i: number) => {
          grids[div][dayKey][i] = cls?.SubjectId || null;
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
    const layout = entries[0][1] as any;
    const layouts = layout.Layouts || layout.TimePoints || [];
    timePoints.value = layouts
    .filter((tp: any) => tp.TimeType === 0 || tp.TimeType === undefined)
    .map((tp: any) => ({
      Start: tp.StartTime || tp.Start || "",
      End: tp.EndTime || tp.End || "",
      TimePointName: tp.TimePointName || "",
      defaultSubject: tp.defaultSubject || "",
    }));
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
  return currentGrid()[dayKey]?.[tpi] || null;
}

function getCellSubjectName(dayKey: string, tpi: number): string {
  const uuid = getCellSubject(dayKey, tpi);
  if (!uuid) return "";
  return subjectPool.value.find((s) => s.uuid === uuid)?.name || "";
}

function setCell(dayKey: string, tpi: number) {
  if (mobile.value) return;
  const grid = currentGrid();
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

// 某周某天是否有填课（用于决定是否生成该条目）
function isDayFilled(div: 0 | 1 | 2, dayKey: string): boolean {
  const arr = grids[div]?.[dayKey] || [];
  return arr.some((x) => x != null && x !== "");
}

// 复制当前周到目标周
function copyWeekTo(dst: number) {
  const src = activeWeekDiv.value;
  const target = dst as 0 | 1 | 2;
  for (const d of activeDays.value) {
    grids[target][d] = [...(grids[src]?.[d] || [])];
  }
  // 清空目标周 uuid，保存时重新生成，避免与源周共享 uuid
  existingUuids[target] = {};
  ElMessage.success(`已将「${weekLabel(src)}」复制到「${weekLabel(target)}」`);
  forceRender.value++;
}

function doSave() {
  if (!selectedTimelayoutId.value) return ElMessage.warning("请先选择时间表");
  if (!selectedSubjectsId.value) return ElMessage.warning("请先选择课程表");
  if (!activeDays.value.length) return ElMessage.warning("请至少选择一个上课日");

  const classPlans: Record<string, any> = {};
  const tlUuid = (() => {
    const tl = timelayouts.value.find((t: any) => t._id === selectedTimelayoutId.value);
    if (tl?.data) return Object.keys(tl.data)[0] || "";
    return "";
  })();

  for (const d of activeDays.value) {
    const dayInfo = DAYS.find((x) => x.value === d)!;
    for (const div of [0, 1, 2] as const) {
      // 该周该天没填 → 不生成条目（ClassIsland 会回退到「每周」或显示无课）
      if (!isDayFilled(div, d)) continue;

      const uuid = existingUuids[div][d] || generateUUID();
      existingUuids[div][d] = uuid;
      const g = grids[div][d] || [];
      const classes = [];
      for (let i = 0; i < timePoints.value.length; i++) {
        const subUuid = g[i] || null;
        classes.push(subUuid
          ? { SubjectId: subUuid, IsChangedClass: false, IsEnabled: true, AttachedObjects: {}, IsActive: false }
          : { SubjectId: null, IsChangedClass: false, IsEnabled: false, AttachedObjects: {}, IsActive: false }
        );
      }
      classPlans[uuid] = {
        TimeLayoutId: tlUuid,
        TimeRule: { WeekDay: dayInfo.weekDay, WeekCountDiv: div, WeekCountDivTotal: 2, IsActive: false },
        Classes: classes,
        Name: `${dayInfo.label}·${weekLabel(div)}`,
        IsOverlay: false,
        OverlaySourceId: null,
        OverlaySetupTime: new Date().toISOString(),
        IsEnabled: true,
        AssociatedGroup: "00000000-0000-0000-0000-000000000000",
        AttachedObjects: {},
        IsActive: false,
      };
    }
  }

  if (Object.keys(classPlans).length === 0) {
    return ElMessage.warning("课表为空，请先填入课程");
  }

  const data: any = { classPlans, timelayoutId: selectedTimelayoutId.value, subjectsId: selectedSubjectsId.value };
  emit("save", data);
}

onMounted(() => {
  mobile.value = !!isMobile();
  fetchResources();
});
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
