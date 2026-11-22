<template>
  <div class="max-w-4xl" v-loading="loading">
    <el-alert
      v-if="viewOnly"
      type="info"
      :closable="false"
      show-icon
      class="mb-4"
      :title="$t('components.timelayouteditor.sharedLayoutReadOnlyNotice')"
    />
    <el-alert
      v-else-if="mobile"
      type="info"
      :closable="false"
      show-icon
      class="mb-4"
      :title="$t('components.timelayouteditor.desktopEditNotice')"
    />

    <div v-if="!mobile" class="mb-4 flex items-center gap-4 flex-wrap">
      <span class="text-sm font-medium">{{ $t('components.timelayouteditor.extra.linkedSubjects') }}</span>
      <el-select
        v-model="selectedSubjectsId"
        :placeholder="$t('components.timelayouteditor.selectSubjectsOptional')"
        clearable
        :disabled="viewOnly"
        @change="onSubjectsChange"
        class="w-52"
      >
        <el-option v-for="s in subjectsList" :key="s._id" :label="s.name" :value="s._id" />
      </el-select>
    </div>

    <el-alert type="warning" :closable="false" show-icon class="mb-4">
      <template #title>{{ $t('components.timelayouteditor.extra.aboutDividerBreak') }}</template>
      {{ $t('components.timelayouteditor.extra.dividerNoticeA') }}<b>{{ $t('components.timelayouteditor.extra.separatelyEdited') }}</b>{{ $t('components.timelayouteditor.extra.dividerNoticeB') }}
    </el-alert>

    <div v-if="!mobile" class="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div class="text-sm text-gray-500">{{ $t('components.timelayouteditor.extra.dragHint') }}</div>
      <div v-if="!viewOnly" class="flex gap-2">
        <el-button size="small" @click="addSeg(0)">
          <el-icon><Plus /></el-icon>{{ $t('components.timelayouteditor.extra.addPeriod') }}
        </el-button>
        <el-button size="small" @click="addSeg(1)">
          <el-icon><Plus /></el-icon>{{ $t('components.timelayouteditor.extra.addBreak') }}
        </el-button>
        <el-button size="small" @click="addSeg(2)">{{ $t('components.timelayouteditor.extra.addDivider') }}</el-button>
        <el-button size="small" @click="addSeg(3)">{{ $t('components.timelayouteditor.extra.addAction') }}</el-button>
      </div>
    </div>

    <div v-if="warnings.length" class="mb-3">
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>{{ $t('components.timelayouteditor.extra.warnA') }} {{ warnings.length }} {{ $t('components.timelayouteditor.extra.warnB') }}</template>
        <div v-for="(w, i) in warnings" :key="i" class="text-xs leading-relaxed">{{ w }}</div>
      </el-alert>
    </div>

    <div>
      <div
        v-for="(p, index) in segs"
        :key="p._id"
        class="seg-row"
        :class="{
          'is-break': p.TimeType === 1,
          'is-marker': p.TimeType === 2 || p.TimeType === 3,
          'opacity-40': dragIndex === index,
        }"
        :draggable="!mobile && !viewOnly"
        @dragstart="onDragStart($event, index)"
        @dragover.prevent="onDragOver($event, index)"
        @dragend="onDragEnd"
        @drop="onDrop($event, index)"
      >
        <el-icon class="cursor-grab text-gray-400 shrink-0"><Rank /></el-icon>
        <span class="text-xs text-gray-400 w-5 text-center shrink-0">{{ index + 1 }}</span>

        <el-select
          v-model="p.TimeType"
          size="small"
          class="shrink-0"
          style="width: 86px"
          :disabled="viewOnly"
        >
          <el-option :value="0" :label="$t('components.timelayouteditor.classPeriod')" />
          <el-option :value="1" :label="$t('components.timelayouteditor.break')" />
          <el-option :value="2" :label="$t('components.timelayouteditor.divider')" />
          <el-option :value="3" :label="$t('components.timelayouteditor.action')" />
        </el-select>

        <!-- 分割线和行动都是"零长度时间点"：只需要一个时刻，不需要结束时间 -->
        <el-input
          v-if="p.TimeType !== 2 && p.TimeType !== 3"
          v-model="p.name"
          size="small"
          class="flex-1 min-w-24"
          :placeholder="p.TimeType === 1 ? $t('components.timelayouteditor.extra.breakNamePlaceholder') : $t('components.timelayouteditor.extra.periodNamePlaceholder')"
          :disabled="mobile || viewOnly"
        />
        <div v-else class="flex-1 min-w-24 text-xs text-gray-400">
          {{ p.TimeType === 2 ? $t('components.timelayouteditor.dividerHint') : $t('components.timelayouteditor.actionHint') }}
        </div>

        <el-time-picker
          v-model="p.start"
          :placeholder="$t('components.timelayouteditor.start')"
          size="small"
          format="HH:mm"
          value-format="HH:mm:ss"
          style="width: 104px"
          :disabled="mobile || viewOnly"
        />
        <template v-if="p.TimeType !== 2 && p.TimeType !== 3">
          <span class="text-gray-300 text-xs">—</span>
          <el-time-picker
            v-model="p.end"
            :placeholder="$t('components.timelayouteditor.end')"
            size="small"
            format="HH:mm"
            value-format="HH:mm:ss"
            style="width: 104px"
            :disabled="mobile || viewOnly"
          />
        </template>
        <span v-else class="text-xs text-gray-300">{{ $t('components.timelayouteditor.extra.zeroLength') }}</span>

        <el-select
          v-if="p.TimeType === 0"
          v-model="p.defaultSubject"
          :placeholder="selectedSubjectsId ? $t('components.timelayouteditor.extra.defaultSubject') : $t('components.timelayouteditor.extra.noSubjectsLinked')"
          :disabled="!selectedSubjectsId || mobile || viewOnly"
          size="small"
          clearable
          style="width: 120px"
        >
          <el-option v-for="sn in subjectNames" :key="sn" :label="sn" :value="sn" />
        </el-select>

        <el-tooltip :content="$t('components.timelayouteditor.hideInClient')" placement="top">
          <el-checkbox v-model="p.hideDefault" size="small" :disabled="mobile || viewOnly">
            {{ $t('components.timelayouteditor.extra.hide') }}
          </el-checkbox>
        </el-tooltip>

        <el-badge
          v-if="hasActions(p)"
          is-dot
          type="warning"
          class="shrink-0"
        >
          <el-button size="small" text @click="toggleActions(p)">
            {{ $t('components.timelayouteditor.extra.actionShort') }}
          </el-button>
        </el-badge>
        <el-button v-else size="small" text @click="toggleActions(p)">{{ $t('components.timelayouteditor.extra.actionShort') }}</el-button>

        <el-button
          v-if="!mobile && !viewOnly"
          text
          size="small"
          type="danger"
          @click="segs.splice(index, 1)"
        >
          <el-icon><Delete /></el-icon>
        </el-button>

        <!-- 这一刻的「更多选项」：附加设置（提醒/显示/天气）+ 行动 -->
        <div v-if="actionOpenId === p._id" class="action-panel">
          <div class="text-xs text-gray-500 leading-relaxed mb-3">
            {{ $t('components.timelayouteditor.extra.attachDescA') }}<b>{{ $t('components.timelayouteditor.extra.attachSettings') }}</b>{{ $t('components.timelayouteditor.extra.attachDescB') }}
          </div>

          <div v-for="def in ATTACHED_DEFS" :key="def.key" class="attach-block">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm font-medium">{{ def.label }}</span>
                <el-tag v-if="getAttached(p, def)" size="small" type="success" effect="plain">{{ $t('components.timelayouteditor.extra.set') }}</el-tag>
                <el-tag v-else size="small" type="info" effect="plain">{{ $t('components.timelayouteditor.extra.followGlobal') }}</el-tag>
              </div>
              <div class="flex gap-1">
                <el-button
                  v-if="!getAttached(p, def)"
                  size="small"
                  text
                  type="primary"
                  :disabled="viewOnly"
                  @click="addAttached(p, def)"
                >{{ $t('components.timelayouteditor.extra.add') }}</el-button>
                <el-button
                  v-else
                  size="small"
                  text
                  type="danger"
                  :disabled="viewOnly"
                  @click="removeAttached(p, def)"
                >{{ $t('components.timelayouteditor.extra.remove') }}</el-button>
              </div>
            </div>

            <template v-if="getAttached(p, def)">
              <div class="attach-body">
                <el-checkbox
                  :model-value="!!getAttached(p, def).IsAttachSettingsEnabled"
                  :disabled="viewOnly"
                  @change="(v: any) => setAttachedField(p, def, 'IsAttachSettingsEnabled', !!v)"
                >
                  {{ $t('components.timelayouteditor.extra.enableAttach') }}
                </el-checkbox>
                <div class="flex flex-wrap gap-x-5 gap-y-1 mt-1">
                  <el-checkbox
                    v-for="t in def.toggles || []"
                    :key="t.key"
                    :model-value="!!getAttached(p, def)[t.key]"
                    :disabled="viewOnly || !getAttached(p, def).IsAttachSettingsEnabled"
                    @change="(v: any) => setAttachedField(p, def, t.key, !!v)"
                  >
                    {{ t.label }}
                  </el-checkbox>
                </div>
                <div v-for="n in def.numbers || []" :key="n.key" class="flex items-center gap-2 mt-1.5">
                  <span class="text-xs text-gray-500 w-28 shrink-0">{{ n.label }}</span>
                  <el-input-number
                    :model-value="Number(getAttached(p, def)[n.key] ?? n.fallback)"
                    :min="n.min"
                    :max="n.max"
                    :step="n.step || 1"
                    size="small"
                    :disabled="viewOnly || !getAttached(p, def).IsAttachSettingsEnabled"
                    @update:model-value="(v: any) => setAttachedField(p, def, n.key, Number(v ?? 0))"
                  />
                </div>
                <div v-for="m in def.modes || []" :key="m.key" class="flex items-center gap-2 mt-1.5">
                  <span class="text-xs text-gray-500 w-28 shrink-0">{{ m.label }}</span>
                  <el-select
                    :model-value="Number(getAttached(p, def)[m.key] ?? 2)"
                    size="small"
                    style="width: 160px"
                    :disabled="viewOnly || !getAttached(p, def).IsAttachSettingsEnabled"
                    @update:model-value="(v: any) => setAttachedField(p, def, m.key, Number(v))"
                  >
                    <el-option :value="0" :label="$t('components.timelayouteditor.disabled')" />
                    <el-option :value="1" :label="$t('components.timelayouteditor.forceEnable')" />
                    <el-option :value="2" :label="$t('components.timelayouteditor.inheritGlobal')" />
                  </el-select>
                </div>
                <div v-for="t in def.texts || []" :key="t.key" class="mt-1.5">
                  <div class="text-xs text-gray-500 mb-1">{{ t.label }}</div>
                  <el-input
                    :model-value="String(getAttached(p, def)[t.key] ?? '')"
                    size="small"
                    :disabled="viewOnly || !getAttached(p, def).IsAttachSettingsEnabled"
                    @update:model-value="(v: string) => setAttachedField(p, def, t.key, v)"
                  />
                </div>
              </div>
            </template>
          </div>

          <div class="attach-block">
            <div class="text-sm font-medium mb-1">{{ $t('components.timelayouteditor.extra.actionSet') }}</div>
            <div class="text-xs text-gray-500 leading-relaxed mb-2">
              {{ $t('components.timelayouteditor.extra.actionDescA') }}
              {{ $t('components.timelayouteditor.extra.actionDescB') }}
            </div>
            <div class="flex items-center gap-3 mb-2 flex-wrap">
              <el-checkbox
                :model-value="!p.actionsCleared"
                :disabled="viewOnly"
                @change="(v: any) => setActionsCleared(p, !v)"
              >
                {{ $t('components.timelayouteditor.extra.keepOriginalActions') }}
              </el-checkbox>
              <span class="text-xs text-gray-400">
                {{ p.raw?.ActionSet ? $t('components.timelayouteditor.extra.originalActionBytes', { count: JSON.stringify(p.raw.ActionSet).length }) : $t('components.timelayouteditor.originallyAbsent') }}
              </span>
            </div>
            <el-input
              :model-value="actionsText(p)"
              type="textarea"
              :rows="3"
              :disabled="viewOnly || p.actionsCleared"
              :placeholder="$t('components.timelayouteditor.blankMeansNull')"
              @update:model-value="(v: string) => (p.actionsText = v)"
            />
          </div>
        </div>
      </div>
    </div>

    <el-empty
      v-if="!loading && !segs.length"
      :image-size="80"
      :description="$t('components.timelayouteditor.noPeriodsHint')"
    />

    <el-button
      v-if="!mobile && !viewOnly"
      type="primary"
      :loading="saving"
      class="mt-4"
      @click="doSave"
    >
      {{ $t('pages.subaccounts.save') }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { Plus, Rank, Delete } from "@element-plus/icons-vue";
import { generateUUID } from "@/util/uuid";
import isMobile from "@/util/is-mobile";

const props = defineProps<{ modelValue: any; name?: string; viewOnly?: boolean }>();
const emit = defineEmits<{ save: [data: any] }>();
const { t } = useI18n();
const saving = ref(false);
const loading = ref(false);
const mobile = ref(false);

/**
 * 一段（上课或课间）。
 *
 * `raw` 保存原始对象：保存时以它为基底再覆盖我们认识的字段，
 * 这样 ClassIsland 里那些我们不编辑的东西（ActionSet / AttachedObjects /
 * DefaultClassId / StartSecond …）不会被顺手抹掉。
 */
interface Seg {
  _id: string;
  /** 0 上课 / 1 课间 / 2 分割线 / 3 行动（后两者为零长度时间点） */
  TimeType: 0 | 1 | 2 | 3;
  name: string;
  start: string;
  end: string;
  defaultSubject: string;
  hideDefault: boolean;
  raw: any;
  /** 用户主动关闭了此时刻的所有动作（提醒） */
  actionsCleared: boolean;
  /** 动作 JSON 的当前文本（编辑中） */
  actionsText: string;
  /** 载入时的原始文本，用来判断用户有没有真改过 */
  actionsTextOrigin: string;
  /** 附加设置 AttachedObjects 的工作副本（键 = 设置类型 GUID） */
  attached: Record<string, any>;
}

const segs = ref<Seg[]>([]);
const dragIndex = ref(-1);
const subjectsList = ref<any[]>([]);
const selectedSubjectsId = ref("");
const subjectNames = ref<string[]>([]);

/** 时间表文档里被编辑的那个时间轴的原始对象（保留 Name 之外的字段） */
let layoutBase: any = null;
/** 那个时间轴的 uuid key */
let layoutUuid = "";
/** data 里其它时间轴（原本就存在多个时不能丢） */
let otherLayouts: Record<string, any> = {};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

/** "07:30" / "07:30:00" / "" → "HH:mm:ss" */
function normTime(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return s;
  return `${m[1].padStart(2, "0")}:${m[2]}:${m[3] ?? "00"}`;
}

/**
 * ClassIsland 的 TimeLayoutItem.TimeType 取值
 * （源码：ClassIsland.Shared/Models/Profile/TimeLayoutItem.cs）
 *   0 上课 / 1 课间 / 2 分割线 / 3 行动
 * 以前这里只认 0 和 1，其余一律当 0 —— 等于把用户的分割线/行动悄悄改成上课。
 */
function clampTimeType(v: any): 0 | 1 | 2 | 3 {
  const n = Number(v);
  return n === 1 || n === 2 || n === 3 ? n : 0;
}

async function fetchSubjectsList() {
  try {
    const res: any = await $fetch("/api/v1/console/ci/subjects/list", { headers: authHeaders() });
    subjectsList.value = res.data || [];
  } catch {
    /* 没登录时忽略 */
  }
}

function onSubjectsChange() {
  const sub = subjectsList.value.find((s: any) => s._id === selectedSubjectsId.value);
  if (!sub?.data) {
    subjectNames.value = [];
    return;
  }
  const names: string[] = [];
  Object.values(sub.data).forEach((s: any) => {
    if (s?.Name) names.push(s.Name);
  });
  subjectNames.value = names;
}

function loadPeriods() {
  const raw = props.modelValue || {};
  const entries = Object.entries(raw) as [string, any][];
  layoutBase = null;
  otherLayouts = {};
  segs.value = [];

  if (entries.length > 0) {
    const [uuid, layout] = entries[0];
    layoutUuid = uuid;
    layoutBase = { ...layout };
    selectedSubjectsId.value = layout?.subjectsId || "";
    for (const [k, v] of entries.slice(1)) otherLayouts[k] = v;

    const layouts: any[] = Array.isArray(layout?.Layouts)
      ? layout.Layouts
      : Array.isArray(layout?.TimePoints)
        ? layout.TimePoints
        : [];

    segs.value = layouts.map((l: any, i: number) => {
      const actText = l?.ActionSet ? JSON.stringify(l.ActionSet, null, 0) : "";
      return {
        _id: `s${i}`,
        TimeType: clampTimeType(l?.TimeType),
        name: String(l?.TimePointName || l?.BreakName || ""),
        start: normTime(l?.StartTime || l?.Start),
        end: normTime(l?.EndTime || l?.End),
        defaultSubject: String(l?.defaultSubject || ""),
        hideDefault: !!l?.IsHideDefault,
        raw: { ...l },
        actionsCleared: false,
        actionsText: actText,
        actionsTextOrigin: actText,
        // 深拷贝一份，避免直接改到 raw（raw 是原样回写的基底）
        attached: JSON.parse(JSON.stringify(l?.AttachedObjects || {})),
      };
    });
  }

  if (selectedSubjectsId.value) onSubjectsChange();
}

watch(() => props.modelValue, loadPeriods, { immediate: true });

function addSeg(type: 0 | 1 | 2 | 3) {
  segs.value.push({
    _id: `n${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    TimeType: type,
    name: "",
    start: "",
    end: "",
    defaultSubject: "",
    hideDefault: false,
    raw: {},
    actionsCleared: false,
    actionsText: "",
    actionsTextOrigin: "",
    attached: {},
  });
}

// ── 各时刻的附加设置（ClassIsland 的「更多选项」）──
//
// 来源（ClassIsland 源码，均为实测取得，不是猜的）：
//   GUID 在 ClassIsland/Controls/AttachedSettingsControls/*.axaml.cs 的
//   [AttachedSettingsControlInfo("…")] 上；字段与默认值在
//   ClassIsland/Models/AttachedSettings/*.cs 里。
// 时间点上的 AttachedObjects 是 Dictionary<Guid, object>，
// 不写某个 GUID = 该设置跟随全局。
interface AttachedDef {
  key: string;
  guid: string;
  label: string;
  /** 新增时写入的最小字段集合（含把总开关打开） */
  defaults: Record<string, any>;
  toggles?: { key: string; label: string }[];
  numbers?: { key: string; label: string; min: number; max: number; step?: number; fallback: number }[];
  modes?: { key: string; label: string }[];
  texts?: { key: string; label: string }[];
}

const ATTACHED_DEFS = computed<AttachedDef[]>(() => [
  {
    key: "classNotification",
    guid: "08F0D9C3-C770-4093-A3D0-02F3D90C24BC",
    label: t('components.timelayouteditor.classReminderSettings'),
    defaults: {
      IsAttachSettingsEnabled: true,
      IsClassOnNotificationEnabled: true,
      IsClassOnPreparingNotificationEnabled: true,
      IsClassOffNotificationEnabled: true,
      ClassPreparingDeltaTime: 60,
    },
    toggles: [
      { key: "IsClassOnNotificationEnabled", label: t('components.timelayouteditor.classReminder') },
      { key: "IsClassOnPreparingNotificationEnabled", label: t('components.timelayouteditor.prepBellReminder') },
      // 用户最常要关的就是这个
      { key: "IsClassOffNotificationEnabled", label: t('components.timelayouteditor.dismissReminder') },
    ],
    numbers: [
      { key: "ClassPreparingDeltaTime", label: t('components.timelayouteditor.prepAdvanceSeconds'), min: 0, max: 600, step: 10, fallback: 60 },
    ],
  },
  {
    key: "afterSchool",
    guid: "8FBC3A26-6D20-44DD-B895-B9411E3DDC51",
    label: t('components.timelayouteditor.dismissalReminderSettings'),
    defaults: {
      IsAttachSettingsEnabled: true,
      IsEnabled: true,
      NotificationMsg: t('components.timelayouteditor.schoolDismissalMessage'),
    },
    toggles: [{ key: "IsEnabled", label: t('components.timelayouteditor.dismissalReminder') }],
    texts: [{ key: "NotificationMsg", label: t('components.timelayouteditor.reminderContent') }],
  },
  {
    key: "weather",
    guid: "7625DE96-38AA-4B71-B478-3F156DD9458D",
    label: t('components.timelayouteditor.weatherReminderSettings'),
    defaults: { IsAttachSettingsEnabled: true, AlertShowMode: 2, ForecastShowMode: 2 },
    modes: [
      { key: "AlertShowMode", label: t('components.timelayouteditor.weatherAlertReminder') },
      { key: "ForecastShowMode", label: t('components.timelayouteditor.weatherForecastReminder') },
    ],
  },
  {
    key: "lessonControl",
    guid: "58e5b69a-764a-472b-bcf7-003b6a8c7fdf",
    label: t('components.timelayouteditor.courseDisplaySettings'),
    defaults: {
      IsAttachSettingsEnabled: true,
      ShowExtraInfoOnTimePoint: true,
      IsCountdownEnabled: true,
      CountdownSeconds: 60,
    },
    toggles: [
      { key: "ShowExtraInfoOnTimePoint", label: t('components.timelayouteditor.showExtraInfo') },
      { key: "IsCountdownEnabled", label: t('components.timelayouteditor.showCountdown') },
    ],
    numbers: [{ key: "CountdownSeconds", label: t('components.timelayouteditor.countdownSeconds'), min: 0, max: 3600, step: 10, fallback: 60 }],
  },
]);

/** 在 AttachedObjects 里按 GUID 找键（JSON 键可能是任意大小写） */
function findAttachedKey(obj: Record<string, any> | undefined, guid: string): string | undefined {
  if (!obj) return undefined;
  const target = guid.toLowerCase();
  return Object.keys(obj).find((k) => k.toLowerCase() === target);
}

function getAttached(p: Seg, def: AttachedDef): any | null {
  const key = findAttachedKey(p.attached, def.guid);
  if (!key) return null;
  const v = p.attached[key];
  return v && typeof v === "object" ? v : null;
}

function addAttached(p: Seg, def: AttachedDef) {
  const key = findAttachedKey(p.attached, def.guid);
  // 保留原键的大小写风格；没有就用 GUID 小写（与 .NET 序列化一致）
  const finalKey = key || def.guid.toLowerCase();
  p.attached[finalKey] = { ...(p.attached[finalKey] || {}), ...def.defaults };
}

function removeAttached(p: Seg, def: AttachedDef) {
  const key = findAttachedKey(p.attached, def.guid);
  if (key) delete p.attached[key];
}

function setAttachedField(p: Seg, def: AttachedDef, field: string, value: any) {
  const key = findAttachedKey(p.attached, def.guid);
  if (!key) return;
  p.attached[key] = { ...(p.attached[key] || {}), [field]: value };
}

// ── 各时刻的动作（ActionSet）──
const actionOpenId = ref("");

function toggleActions(p: Seg) {
  actionOpenId.value = actionOpenId.value === p._id ? "" : p._id;
}

function hasActions(p: Seg): boolean {
  const hasActionSet = !!p.raw?.ActionSet && Object.keys(p.raw.ActionSet || {}).length > 0;
  return hasActionSet || Object.keys(p.attached || {}).length > 0;
}

function actionsText(p: Seg): string {
  if (p.actionsCleared) return "";
  return p.actionsText ?? "";
}

function setActionsCleared(p: Seg, cleared: boolean) {
  p.actionsCleared = cleared;
}

function attachedSummary(p: Seg): string {
  const a = p.raw?.AttachedObjects;
  if (!a || typeof a !== "object") return t('components.timelayouteditor.none');
  const n = Object.keys(a).length;
  return n ? t('components.timelayouteditor.extra.itemCountKept', { count: n }) : t('components.timelayouteditor.none');
}

/** 时间轴一致性检查：结束早于开始、跟前一段重叠、倒序 */
const warnings = computed(() => {
  const out: string[] = [];
  let prevEnd = "";
  let prevLabel = "";
  segs.value.forEach((s, i) => {
    const label =
      t('components.timelayouteditor.extra.segmentLabel', { index: i + 1 }) +
      (s.name ? t('components.timelayouteditor.extra.segmentNameSuffix', { name: s.name }) : '');
    const zeroLen = s.TimeType === 2 || s.TimeType === 3;
    if (!zeroLen && s.start && s.end && s.end <= s.start) {
      out.push(t('components.timelayouteditor.extra.endBeforeStart', { label }));
    }
    if (prevEnd && s.start && s.start < prevEnd) {
      out.push(t('components.timelayouteditor.extra.overlapPrev', { label, prevLabel, prevEnd }));
    }
    if (s.end) {
      prevEnd = s.end;
      prevLabel = label;
    }
  });
  return out;
});

function onDragStart(e: DragEvent, index: number) {
  dragIndex.value = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }
}
function onDragOver(_e: DragEvent, index: number) {
  if (dragIndex.value < 0 || dragIndex.value === index) return;
  const items = [...segs.value];
  const [moved] = items.splice(dragIndex.value, 1);
  items.splice(index, 0, moved);
  segs.value = items;
  dragIndex.value = index;
}
function onDrop(e: DragEvent, _index: number) {
  e.preventDefault();
}
function onDragEnd() {
  dragIndex.value = -1;
}

function doSave() {
  const uuid = layoutUuid || generateUUID();

  // 先把动作 JSON 全部校验一遍，任何一段有语法错误就整体不保存
  const parsedActions = new Map<string, any>();
  for (const s of segs.value) {
    if (s.actionsCleared) continue;
    const rawText = String(s.actionsText ?? "").trim();
    if (!rawText || rawText === s.actionsTextOrigin) continue;
    try {
      parsedActions.set(s._id, JSON.parse(rawText));
    } catch {
      ElMessage.error(t('components.timelayouteditor.extra.actionJsonError', { name: s.name || t('components.timelayouteditor.extra.segmentLabel', { index: segs.value.indexOf(s) + 1 }) }));
      actionOpenId.value = s._id;
      return;
    }
  }

  // 以原始条目为基底，只覆盖我们编辑的字段 —— 不重建对象
  const layouts = segs.value.map((s) => {
    const out: any = { ...(s.raw || {}) };
    out.StartSecond = out.StartSecond ?? "";
    out.EndSecond = out.EndSecond ?? "";
    out.StartTime = s.start || "";
    out.EndTime = s.end || "";
    out.TimeType = s.TimeType;
    out.IsHideDefault = !!s.hideDefault;
    out.DefaultClassId = out.DefaultClassId || "00000000-0000-0000-0000-000000000000";
    // 附加设置：以工作副本为准（未触碰的项原样保留）
    out.AttachedObjects = { ...(s.attached || {}) };
    out.IsActive = out.IsActive ?? false;

    // 动作：默认原样保留；只有"显式关闭"或"用户真改过文本"才动它
    if (s.actionsCleared) {
      out.ActionSet = null;
    } else if (parsedActions.has(s._id)) {
      out.ActionSet = parsedActions.get(s._id);
    } else if (out.ActionSet === undefined) {
      out.ActionSet = null;
    }

    // 分割线(2) / 行动(3) 是零长度时间点：EndTime 恒等于 StartTime
    if (s.TimeType === 2 || s.TimeType === 3) {
      out.EndTime = out.StartTime;
      out.TimePointName = "";
      out.BreakName = "";
      delete out.defaultSubject;
      // 行动要执行的动作组就在 ActionSet 里，上面已经处理过
    } else if (s.TimeType === 1) {
      out.BreakName = s.name || "";
      out.TimePointName = "";
      if (s.defaultSubject) out.defaultSubject = s.defaultSubject;
    } else {
      // 关键修复：以前只写自定义的 _name，不写 TimePointName，
      // 导致每保存一次，客户端里这个课时的名字就没了。
      out.TimePointName = s.name || "";
      out.BreakName = "";
      if (s.defaultSubject) out.defaultSubject = s.defaultSubject;
      else delete out.defaultSubject;
    }
    delete out._name;
    return out;
  });

  const layoutObj: any = { ...(layoutBase || {}) };
  layoutObj.Name = layoutBase?.Name || props.name || t('components.home.quickstartupguide.timeLayout');
  layoutObj.Layouts = layouts;
  if (selectedSubjectsId.value) layoutObj.subjectsId = selectedSubjectsId.value;
  else delete layoutObj.subjectsId;
  delete layoutObj.TimePoints; // 旧格式字段，写了 Layouts 之后就不该再留

  // 原本就存在多个时间轴的，一起带上，不丢
  const data: any = { ...otherLayouts, [uuid]: layoutObj };

  emit("save", data);
}

onMounted(() => {
  mobile.value = !!isMobile();
  fetchSubjectsList();
  loadPeriods();
});
</script>

<style scoped>
.seg-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  flex-wrap: wrap;
}
.seg-row.is-break {
  background: var(--el-fill-color-light);
  border-style: dashed;
}
/* 分割线 / 行动：零长度时间点，视觉上做成"标记"而不是时间段 */
.seg-row.is-marker {
  background: repeating-linear-gradient(
    45deg,
    var(--el-fill-color-light),
    var(--el-fill-color-light) 8px,
    transparent 8px,
    transparent 16px
  );
  border-style: dashed;
  border-color: var(--el-color-warning-light-5);
}
.attach-block {
  padding: 8px 10px;
  margin-bottom: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
}
.attach-body {
  margin-top: 6px;
  padding-left: 4px;
}
.action-panel {
  flex-basis: 100%;
  width: 100%;
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
}
</style>
