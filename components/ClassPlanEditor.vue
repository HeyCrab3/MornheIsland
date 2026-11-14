<template>
  <div v-loading="loading">
    <el-alert
      v-if="viewOnly"
      type="info"
      :closable="false"
      show-icon
      class="mb-4"
      title="这份课表是学校共享的，你只有查看权限；需要修改请找学校管理员，或复制一份成自己的。"
    />
    <el-alert
      v-else-if="mobile"
      type="info"
      :closable="false"
      show-icon
      class="mb-4"
      title="课表网格编辑在手机上体验有限，以下为只读预览，请在电脑上编辑。"
    />

    <div v-if="!mobile" class="mb-4 flex items-center gap-4 flex-wrap">
      <span class="text-sm font-medium">时间表：</span>
      <el-select
        v-model="selectedTimelayoutId"
        placeholder="必选"
        :disabled="viewOnly"
        @change="onTimelayoutChange"
        class="w-48"
      >
        <el-option v-for="t in timelayouts" :key="t._id" :label="t.name" :value="t._id" />
      </el-select>
      <span class="text-sm font-medium ml-4">课程表：</span>
      <el-select
        v-model="selectedSubjectsId"
        placeholder="必选"
        :disabled="viewOnly"
        @change="onSubjectsChange"
        class="w-48"
      >
        <el-option v-for="s in subjectsList" :key="s._id" :label="s.name" :value="s._id" />
      </el-select>
    </div>

    <!-- 周次轮换：每周 / 单周 / 双周 -->
    <div v-if="!mobile" class="mb-4 flex items-center gap-3 flex-wrap">
      <span class="text-sm font-medium">周次：</span>
      <el-radio-group v-model="activeWeekDiv" @change="forceRender++">
        <el-radio-button v-for="t in WEEK_TABS" :key="t.value" :value="t.value">
          {{ t.label }}
        </el-radio-button>
      </el-radio-group>
      <el-dropdown v-if="!viewOnly" @command="copyWeekTo">
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

    <el-alert type="info" :closable="false" show-icon class="mb-3">
      <template #title>和 ClassIsland 对齐的两条规则</template>
      ① 每个课时有独立的<b>启用</b>开关：取消勾选就是"这节课不上"（比如自习、考试占场），
      跟"有没有科目"无关；② 一天里<b>最后一个启用的课时之后视为放学</b>，后面的课时会自动按未启用处理。
    </el-alert>

    <template v-if="timePoints.length > 0 && subjectPool.length > 0">
      <div v-if="!mobile" class="mb-3 flex items-center gap-2 flex-wrap">
        <span class="text-sm text-gray-500">上课日：</span>
        <el-checkbox-group
          v-model="activeDays"
          size="small"
          :disabled="viewOnly"
          :options="DAYS"
          @change="forceRender++"
        />
      </div>

      <div class="flex gap-4">
        <div v-if="!mobile" class="w-32 shrink-0">
          <div class="text-sm font-medium mb-2">科目</div>
          <div class="space-y-1">
            <div
              v-for="s in subjectPool"
              :key="s.uuid"
              class="subject-chip"
              :class="{ picked: s.name === pickedSubject }"
              @click="pickedSubject = pickedSubject === s.name ? '' : s.name"
            >
              {{ s.name }}
            </div>
          </div>
          <div class="text-xs text-gray-400 mt-2 leading-relaxed">
            选中科目后点格子填入；再点一次取消选择，此时点格子会清空科目。
          </div>
        </div>

        <div class="flex-1 overflow-x-auto" :key="forceRender">
          <table class="border-collapse w-full">
            <thead>
              <tr>
                <th class="th-cell w-24">节次</th>
                <th v-for="d in activeDays" :key="d" class="th-cell min-w-32">
                  {{ DAYS.find((x) => x.value === d)?.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(tp, tpi) in timePoints" :key="tpi">
                <td class="border p-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-600 align-top">
                  <div class="font-medium">{{ tp.TimePointName || `第${tpi + 1}节` }}</div>
                  <div class="text-gray-400">{{ tp.Start }}-{{ tp.End }}</div>
                </td>
                <td
                  v-for="d in activeDays"
                  :key="d"
                  class="border p-1 align-top"
                  :class="{ 'border-t-2 border-t-amber-400': isAfterSchoolStart(d, tpi) }"
                >
                  <div
                    class="cell"
                    :class="{
                      filled: isEnabled(d, tpi),
                      'has-sub': !!getCellSubject(d, tpi),
                      hover: pickedSubject && !viewOnly,
                    }"
                    @click="setCell(d, tpi)"
                  >
                    <span class="cell-subject">
                      {{ getCellSubjectName(d, tpi) || (isEnabled(d, tpi) ? "空课" : "—") }}
                    </span>
                    <el-checkbox
                      :model-value="isEnabled(d, tpi)"
                      size="small"
                      :disabled="mobile || viewOnly"
                      class="cell-check"
                      @click.stop
                      @change="(v: any) => setEnabled(d, tpi, !!v)"
                    />
                  </div>
                  <div v-if="isAfterSchoolStart(d, tpi)" class="text-[10px] text-amber-500 text-center">
                    放学
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-3 text-xs text-gray-400">
        当前周次「{{ weekLabel(activeWeekDiv) }}」的放学线：
        <span class="text-gray-500">
          {{ activeDays.map((d) => `${DAYS.find((x) => x.value === d)?.label}第${lastEnabled(d) + 1}节`).join(" · ") }}
        </span>
      </div>

      <el-button
        v-if="!mobile && !viewOnly"
        type="primary"
        :loading="saving"
        class="mt-4"
        @click="doSave"
      >
        保存课表
      </el-button>
    </template>

    <el-empty v-else :description="!timePoints.length ? '请先选择时间表' : '请先选择课程表'" />
  </div>
</template>

<script setup lang="ts">
import { generateUUID } from "@/util/uuid";
import { ArrowDown } from "@element-plus/icons-vue";
import isMobile from "@/util/is-mobile";

interface SubEntry {
  uuid: string;
  name: string;
}
interface TimePoint {
  Start: string;
  End: string;
  TimePointName: string;
  defaultSubject?: string;
}

const props = defineProps<{ modelValue: any; viewOnly?: boolean }>();
const emit = defineEmits<{ save: [data: any] }>();
const saving = ref(false);
const loading = ref(false);
const forceRender = ref(0);

/** ClassIsland 里 Guid.Empty 的字符串形态：空课时/空引用都要写它，不能写 null */
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

const DAYS = [
  { value: "Monday", label: "周一", weekDay: 1 },
  { value: "Tuesday", label: "周二", weekDay: 2 },
  { value: "Wednesday", label: "周三", weekDay: 3 },
  { value: "Thursday", label: "周四", weekDay: 4 },
  { value: "Friday", label: "周五", weekDay: 5 },
  { value: "Saturday", label: "周六", weekDay: 6 },
  { value: "Sunday", label: "周日", weekDay: 0 },
];

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
const activeWeekDiv = ref<0 | 1 | 2>(0);

/** grids[weekDiv][day][节次] = 科目 uuid */
const grids = reactive<Record<0 | 1 | 2, Record<string, (string | null)[]>>>({ 0: {}, 1: {}, 2: {} });
/** enabledFlag[weekDiv][day][节次] = 启用（独立于有没有科目） */
const enabledFlag = reactive<Record<0 | 1 | 2, Record<string, boolean[]>>>({ 0: {}, 1: {}, 2: {} });
const existingUuids = reactive<Record<0 | 1 | 2, Record<string, string>>>({ 0: {}, 1: {}, 2: {} });

const otherWeeks = computed(() => WEEK_TABS.filter((t) => t.value !== activeWeekDiv.value));

function weekLabel(v: number): string {
  return v === 0 ? "每周" : v === 1 ? "单周" : "双周";
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function resetAll() {
  grids[0] = {};
  grids[1] = {};
  grids[2] = {};
  enabledFlag[0] = {};
  enabledFlag[1] = {};
  enabledFlag[2] = {};
  existingUuids[0] = {};
  existingUuids[1] = {};
  existingUuids[2] = {};
}

async function fetchResources() {
  loading.value = true;
  try {
    activeDays.value = [];
    resetAll();

    const [tlRes, sjRes] = await Promise.all([
      $fetch("/api/v1/console/ci/timelayout/list", { headers: authHeaders() }),
      $fetch("/api/v1/console/ci/subjects/list", { headers: authHeaders() }),
    ]);
    timelayouts.value = (tlRes as any).data || [];
    subjectsList.value = (sjRes as any).data || [];

    if (props.modelValue) {
      selectedTimelayoutId.value = props.modelValue.timelayoutId || "";
      selectedSubjectsId.value = props.modelValue.subjectsId || "";

      const entries = Object.entries(props.modelValue.classPlans || props.modelValue || {});
      for (const [uuid, entry] of entries as [string, any][]) {
        if (!entry?.TimeRule || !entry?.Classes) continue;
        const dayKey = DAYS.find((d) => d.weekDay === entry.TimeRule.WeekDay)?.value;
        if (!dayKey) continue;
        if (!activeDays.value.includes(dayKey)) activeDays.value.push(dayKey);

        const wd = entry.TimeRule.WeekCountDiv as number;
        const div: 0 | 1 | 2 = wd === 1 || wd === 2 ? wd : 0;
        existingUuids[div][dayKey] = uuid;
        if (!grids[div][dayKey]) grids[div][dayKey] = [];
        if (!enabledFlag[div][dayKey]) enabledFlag[div][dayKey] = [];
        entry.Classes.forEach((cls: any, i: number) => {
          grids[div][dayKey][i] = cls?.SubjectId || null;
          // 真实数据里 IsEnabled 与「有没有科目」一直是等价的，但语义上要分开读：
          // 显式 false 就是没启用；没写这个字段的老数据按"有科目即启用"兜底。
          enabledFlag[div][dayKey][i] =
            cls?.IsEnabled === undefined ? !!cls?.SubjectId : cls.IsEnabled === true;
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
  Object.entries(sub.data).forEach(([uuid, s]: [string, any]) => {
    if (s?.Name) subjectPool.value.push({ uuid, name: s.Name });
  });
}

function getCellSubject(dayKey: string, tpi: number): string | null {
  return grids[activeWeekDiv.value]?.[dayKey]?.[tpi] || null;
}

function getCellSubjectName(dayKey: string, tpi: number): string {
  const uuid = getCellSubject(dayKey, tpi);
  if (!uuid) return "";
  return subjectPool.value.find((s) => s.uuid === uuid)?.name || "";
}

function isEnabled(dayKey: string, tpi: number): boolean {
  return !!enabledFlag[activeWeekDiv.value]?.[dayKey]?.[tpi];
}

function setEnabled(dayKey: string, tpi: number, v: boolean) {
  const div = activeWeekDiv.value;
  if (!enabledFlag[div][dayKey]) enabledFlag[div][dayKey] = [];
  enabledFlag[div][dayKey][tpi] = v;
}

function setCell(dayKey: string, tpi: number) {
  if (mobile.value || props.viewOnly) return;
  const grid = grids[activeWeekDiv.value];
  if (!grid[dayKey]) grid[dayKey] = [];

  if (!pickedSubject.value) {
    // 没选科目 → 清空这一格（同时取消启用）
    grid[dayKey][tpi] = null;
    setEnabled(dayKey, tpi, false);
    return;
  }
  const sub = subjectPool.value.find((s) => s.name === pickedSubject.value);
  if (!sub) return;
  grid[dayKey][tpi] = sub.uuid;
  // 填科目时自动勾上启用 —— 符合直觉，也少一步操作
  setEnabled(dayKey, tpi, true);
}

/** 该周该天最后一个启用的课时下标（-1 表示一节都没启用） */
function lastEnabled(dayKey: string): number {
  const flags = enabledFlag[activeWeekDiv.value]?.[dayKey] || [];
  let last = -1;
  for (let i = 0; i < timePoints.value.length; i++) if (flags[i]) last = i;
  return last;
}

/** 这一格是不是"放学线的第一格"（用来画分隔线和标签） */
function isAfterSchoolStart(dayKey: string, tpi: number): boolean {
  const last = lastEnabled(dayKey);
  if (last < 0) return tpi === 0 && !mobile.value;
  return tpi === last + 1 && last + 1 < timePoints.value.length;
}

function isDayTouched(div: 0 | 1 | 2, dayKey: string): boolean {
  const flags = enabledFlag[div]?.[dayKey] || [];
  const g = grids[div]?.[dayKey] || [];
  return flags.some(Boolean) || g.some((x) => x != null && x !== "");
}

function copyWeekTo(dst: number) {
  const src = activeWeekDiv.value;
  const target = dst as 0 | 1 | 2;
  for (const d of activeDays.value) {
    grids[target][d] = [...(grids[src]?.[d] || [])];
    enabledFlag[target][d] = [...(enabledFlag[src]?.[d] || [])];
  }
  existingUuids[target] = {};
  ElMessage.success(`已将「${weekLabel(src)}」复制到「${weekLabel(target)}」`);
  forceRender.value++;
}

function doSave() {
  if (!selectedTimelayoutId.value) return ElMessage.warning("请先选择时间表");
  if (!selectedSubjectsId.value) return ElMessage.warning("请先选择课程表");
  if (!activeDays.value.length) return ElMessage.warning("请至少选择一个上课日");

  const classPlans: Record<string, any> = {};
  const tl = timelayouts.value.find((t: any) => t._id === selectedTimelayoutId.value);
  const tlUuid = tl?.data ? Object.keys(tl.data)[0] || "" : "";
  if (!tlUuid) return ElMessage.warning("这份时间表里没有可用的时间轴，请先修时间表");

  for (const d of activeDays.value) {
    const dayInfo = DAYS.find((x) => x.value === d)!;
    for (const div of [0, 1, 2] as const) {
      if (!isDayTouched(div, d)) continue;

      const uuid = existingUuids[div][d] || generateUUID();
      existingUuids[div][d] = uuid;
      const g = grids[div][d] || [];
      const flags = enabledFlag[div][d] || [];

      // 最后一个启用课时之后一律按未启用写（放学语义）
      let lastOn = -1;
      for (let i = 0; i < timePoints.value.length; i++) if (flags[i]) lastOn = i;

      const classes = [];
      for (let i = 0; i < timePoints.value.length; i++) {
        const on = i <= lastOn && !!flags[i];
        // ⚠ 空课时必须写 Guid.Empty 字符串，不能写 null。
        // 客户端的 SubjectId 是非空 Guid，且转换器在遇到 null 时直接抛异常，
        // 会让整个档案反序列化失败（课表直接炸）。这是线上踩过的真实事故。
        classes.push({
          SubjectId: g[i] || EMPTY_GUID,
          IsChangedClass: false,
          // 明确写入启用位，而不是靠"有没有科目"推断
          IsEnabled: on,
          AttachedObjects: {},
          IsActive: false,
        });
      }

      // 保留原有条目的其它字段（叠课信息等），别重建
      const prev = props.modelValue?.classPlans?.[uuid] || {};
      classPlans[uuid] = {
        ...prev,
        TimeLayoutId: tlUuid,
        // 保留 TimeRule 的其它字段（RestrictsEnableRange / RangeStart / RangeEnd …），
        // 只覆盖我们真正编辑的这几项。以前整体重建，ClassIsland 导入的
        // 生效范围设置会被一次保存抹掉。
        TimeRule: {
          ...(prev.TimeRule || {}),
          WeekDay: dayInfo.weekDay,
          WeekCountDiv: div,
          WeekCountDivTotal: prev.TimeRule?.WeekCountDivTotal ?? 2,
          IsActive: prev.TimeRule?.IsActive ?? false,
        },
        Classes: classes,
        Name: `${dayInfo.label}·${weekLabel(div)}`,
        IsOverlay: prev.IsOverlay ?? false,
        OverlaySourceId: prev.OverlaySourceId ?? null,
        OverlaySetupTime: prev.OverlaySetupTime ?? new Date().toISOString(),
        IsEnabled: prev.IsEnabled ?? true,
        AssociatedGroup: prev.AssociatedGroup ?? "00000000-0000-0000-0000-000000000000",
        AttachedObjects: prev.AttachedObjects ?? {},
        IsActive: prev.IsActive ?? false,
      };
    }
  }

  if (Object.keys(classPlans).length === 0) {
    return ElMessage.warning("课表为空，请先填入课程或勾选启用");
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
.subject-chip.picked {
  border-color: var(--mi-brand);
  background: var(--mi-brand-light);
  font-weight: 600;
}
.th-cell {
  border: 1px solid var(--el-border-color);
  padding: 8px;
  background: var(--el-fill-color-light);
  font-size: 13px;
}
.cell {
  min-height: 34px;
  padding: 2px 4px 2px 8px;
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  transition: all 0.15s;
}
.cell-subject {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-check {
  flex-shrink: 0;
  margin-right: 0;
}
.cell.filled {
  color: var(--el-text-color-primary);
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
  border-style: solid;
}
.cell.has-sub {
  font-weight: 500;
}
.cell.hover:hover {
  border-color: var(--mi-brand);
  background: var(--mi-brand-light);
}
</style>
