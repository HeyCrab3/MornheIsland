<template>
  <ClientOnly>
    <div class="board-root" :class="`theme-${settings.theme}`" :style="rootStyle">
      <!-- 背景遮罩，保证任何背景上文字都可读 -->
      <div class="board-veil" />

      <!-- 时钟 -->
      <div
        v-if="settings.showClock"
        class="el-block"
        :class="{ 'is-editing': editMode }"
        :style="posStyle('clock')"
        @pointerdown="onPointerDown('clock', $event)"
      >
        <div class="clock-time">
          {{ clockText }}<span v-if="settings.showSeconds" class="clock-sec">{{ secondsText }}</span>
        </div>
        <div class="clock-date">{{ dateText }}</div>
      </div>

      <!-- 当前科目 -->
      <div
        v-if="settings.showSubject"
        class="el-block"
        :class="{ 'is-editing': editMode }"
        :style="posStyle('subject')"
        @pointerdown="onPointerDown('subject', $event)"
      >
        <template v-if="identity">
          <template v-if="currentEntry">
            <div class="subject-label">{{ currentEntry.type === "class" ? "正在上" : "当前" }}</div>
            <div class="subject-name">{{ currentMain }}</div>
            <div class="subject-sub">
              <span v-if="currentEntry.name">{{ currentEntry.name }}</span>
              <span v-if="currentEntry.teacher">· {{ currentEntry.teacher }}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progress * 100 + '%' }" />
            </div>
            <div class="subject-sub">还剩 {{ remainMinutes }} 分钟</div>
          </template>
          <template v-else>
            <div class="subject-label">{{ nextEntry ? "下一节" : "今天" }}</div>
            <div class="subject-name">{{ nextEntry ? nextMain : "今天没有课了" }}</div>
            <div v-if="nextEntry" class="subject-sub">
              {{ nextEntry.start }}–{{ nextEntry.end }}
              <span v-if="nextEntry.name"> · {{ nextEntry.name }}</span>
            </div>
          </template>
        </template>
        <div v-else class="subject-label">未设置班级</div>
      </div>

      <!-- 天气 -->
      <div
        v-if="settings.showWeather"
        class="el-block"
        :class="{ 'is-editing': editMode }"
        :style="posStyle('weather')"
        @pointerdown="onPointerDown('weather', $event)"
      >
        <template v-if="weather">
          <div class="weather-row">
            <span class="weather-emoji">{{ weatherEmoji(weather.now.icon) }}</span>
            <span class="weather-temp">{{ weather.now.temp }}°</span>
          </div>
          <div class="weather-text">{{ weather.now.text }}</div>
          <div v-if="weather.today" class="weather-sub">
            {{ weather.today.textDay }} {{ weather.today.tempMin }}° ~ {{ weather.today.tempMax }}°
          </div>
          <div v-if="weather.now.windDir" class="weather-sub">
            {{ weather.now.windDir }} {{ weather.now.windScale }} 级
          </div>
          <div class="weather-credit">
            <a href="https://www.qweather.com/" target="_blank" rel="noopener noreferrer">和风天气</a>
          </div>
        </template>
        <div v-else class="subject-label">天气加载中…</div>
      </div>

      <!-- 公告板 -->
      <div
        v-if="settings.showNotice"
        class="el-block notice-block"
        :class="{ 'is-editing': editMode }"
        :style="posStyle('notice')"
        @pointerdown="onPointerDown('notice', $event)"
      >
        <!-- 安全性：renderMarkdownLite 先整体转义 HTML 再套 Markdown 语法，
             原始 HTML 不会被执行，所以这里的 v-html 是可控的。 -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="md-body" v-html="noticeHtml" />
      </div>

      <!-- 水印 -->
      <a class="board-watermark" :href="consoleUrl" target="_blank" rel="noopener noreferrer">
        由莫宁岛驱动
      </a>

      <!-- 设置入口：平时半透明，鼠标移上去才明显 -->
      <button class="board-gear" title="看板设置（快捷键 E 切换编辑布局）" @click="drawer = true">
        ⚙
      </button>
      <div v-if="editMode" class="board-edithint">布局编辑中：拖动元素调整位置，再按 E 退出</div>
    </div>

    <!-- 设置抽屉 -->
    <el-drawer v-model="drawer" title="看板设置" size="380px" :append-to-body="true">
      <el-form label-position="top" size="small">
        <el-form-item label="班级标识">
          <el-input v-model="settings.identity" placeholder="如 1-101，与班级管理里一致" clearable />
          <div class="hint">填写后显示该班的当前科目；也可用 URL 参数 <code>?identity=1-101</code> 覆盖。</div>
        </el-form-item>

        <el-form-item label="开学日期（用于单双周判定）">
          <el-input v-model="settings.termStart" placeholder="YYYY-MM-DD，可留空" clearable />
          <div class="hint">留空时单双周不做区分，按每周都上处理。</div>
        </el-form-item>

        <el-form-item label="显示项">
          <div class="flex flex-wrap gap-3">
            <el-checkbox v-model="settings.showClock">时间</el-checkbox>
            <el-checkbox v-model="settings.showSubject">科目</el-checkbox>
            <el-checkbox v-model="settings.showWeather">天气</el-checkbox>
            <el-checkbox v-model="settings.showNotice">公告</el-checkbox>
            <el-checkbox v-model="settings.showSeconds">显示秒</el-checkbox>
          </div>
        </el-form-item>

        <el-form-item label="配色">
          <el-radio-group v-model="settings.theme">
            <el-radio-button value="dark">深色文字</el-radio-button>
            <el-radio-button value="light">浅色文字</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="`整体缩放 ${settings.scale}%`">
          <el-slider v-model="settings.scale" :min="60" :max="200" :step="5" />
        </el-form-item>

        <el-form-item label="背景">
          <el-radio-group v-model="settings.bgType" class="mb-2">
            <el-radio-button value="gradient">渐变</el-radio-button>
            <el-radio-button value="image">图片</el-radio-button>
          </el-radio-group>
          <el-input
            v-model="settings.bgValue"
            :placeholder="settings.bgType === 'image' ? '图片 URL' : 'CSS 渐变，留空用默认'"
            clearable
          />
          <div class="hint">
            渐变示例：<code>linear-gradient(135deg,#0f1320,#243b55)</code>；图片建议用 16:9 的直链。
          </div>
        </el-form-item>

        <el-form-item label="公告（支持 Markdown）">
          <el-input v-model="settings.notice" type="textarea" :autosize="{ minRows: 5, maxRows: 12 }" />
          <div class="hint">支持标题、粗体、斜体、列表、引用、代码、链接；出于安全不执行原始 HTML。</div>
        </el-form-item>

        <el-form-item label="嵌入壁纸引擎（iframe）">
          <el-input :model-value="iframeCode" type="textarea" :rows="3" readonly />
          <el-button class="mt-2" size="small" @click="copyIframe">复制嵌入代码</el-button>
          <div class="hint">
            壁纸引擎里选「网页」类型，把上面代码存成本地 html 打开即可；也可直接把看板地址填进去。
          </div>
        </el-form-item>

        <div class="flex gap-2 mt-4">
          <el-button size="small" @click="resetLayout">重置元素位置</el-button>
          <el-button size="small" type="primary" @click="toggleEdit">
            {{ editMode ? "退出布局编辑" : "调整元素位置" }}
          </el-button>
        </div>
        <div class="hint mt-2">设置自动保存在本机浏览器（localStorage），换台机器需重新设置。</div>
      </el-form>
    </el-drawer>
  </ClientOnly>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, title: "看板" });

const STORAGE_KEY = "mi-board-settings-v1";

const DEFAULT_LAYOUT: Record<string, { x: number; y: number }> = {
  clock: { x: 50, y: 26 },
  subject: { x: 50, y: 58 },
  weather: { x: 20, y: 30 },
  notice: { x: 80, y: 32 },
};

function defaultSettings() {
  return {
    identity: "",
    termStart: "",
    showClock: true,
    showSubject: true,
    showWeather: true,
    showNotice: true,
    showSeconds: true,
    theme: "light" as "light" | "dark",
    scale: 100,
    bgType: "gradient" as "gradient" | "image",
    bgValue: "",
    notice: "## 公告\n\n在**看板设置**里写点什么吧～\n\n- 支持 Markdown\n- 内容只存在本机",
    layout: JSON.parse(JSON.stringify(DEFAULT_LAYOUT)) as Record<string, { x: number; y: number }>,
  };
}

const settings = reactive(defaultSettings());
const board = ref<any>(null);
const weather = ref<any>(null);
const now = ref(new Date());
const editMode = ref(false);
const drawer = ref(false);
const consoleUrl = ref("https://mornheisland.heycrab.xyz");

const { renderMarkdownLite } = useMarkdownLite();

// ── 持久化 ──
function loadSettings() {
  if (!import.meta.client) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    const base = defaultSettings();
    Object.assign(settings, { ...base, ...saved });
    settings.layout = { ...base.layout, ...(saved.layout || {}) };
  } catch {
    /* 坏数据就用默认值 */
  }
}
function saveSettings() {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* 无痕模式等场景忽略 */
  }
}

// ── 时间 ──
const pad = (n: number) => String(n).padStart(2, "0");
const clockText = computed(() => `${pad(now.value.getHours())}:${pad(now.value.getMinutes())}`);
const secondsText = computed(() => `:${pad(now.value.getSeconds())}`);
const dateText = computed(() => {
  const w = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.value.getDay()];
  return `${now.value.getFullYear()}年${now.value.getMonth() + 1}月${now.value.getDate()}日 ${w}`;
});
const hhmm = computed(() => clockText.value);

// ── 单双周 ──
const currentWeek = computed<number | null>(() => {
  if (!settings.termStart) return null;
  const start = new Date(`${settings.termStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (days < 0) return null;
  return Math.floor(days / 7) + 1;
});

const identity = computed(() => {
  if (import.meta.client) {
    const q = new URLSearchParams(window.location.search).get("identity");
    if (q) return q;
  }
  return settings.identity;
});

const todayEntries = computed<any[]>(() => {
  if (!board.value?.days) return [];
  const dow = now.value.getDay();
  const week = currentWeek.value;
  const out: any[] = [];
  const seen = new Set<string>();
  for (const day of board.value.days) {
    if (!(day.weekDays || []).includes(dow)) continue;
    const weeks = day.weeks;
    // 没设开学日期时无法判定单双周，按「每周都上」处理（设置里已提示）
    if (Array.isArray(weeks) && week != null && !weeks.includes(week)) continue;
    for (const e of day.entries || []) {
      const key = `${e.start}-${e.end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
  }
  return out.sort((a, b) => String(a.start).localeCompare(String(b.start)));
});

const currentEntry = computed<any | null>(
  () => todayEntries.value.find((e) => e.start <= hhmm.value && hhmm.value < e.end) || null,
);
const nextEntry = computed<any | null>(
  () => todayEntries.value.find((e) => e.start > hhmm.value) || null,
);

const toMin = (t: string) => {
  const [h, m] = String(t).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const progress = computed(() => {
  const e = currentEntry.value;
  if (!e) return 0;
  const s = toMin(e.start);
  const en = toMin(e.end);
  return Math.max(0, Math.min(1, (toMin(hhmm.value) - s) / Math.max(1, en - s)));
});
const remainMinutes = computed(() => {
  const e = currentEntry.value;
  if (!e) return 0;
  return Math.max(0, toMin(e.end) - toMin(hhmm.value) - (now.value.getSeconds() > 0 ? 1 : 0) + 1);
});

const currentMain = computed(() => {
  const e = currentEntry.value;
  if (!e) return "";
  if (e.type === "class") return e.subject || e.name || "上课";
  return e.name || (e.type === "break" ? "课间" : e.type === "activity" ? "活动" : "休息");
});
const nextMain = computed(() => {
  const e = nextEntry.value;
  if (!e) return "";
  if (e.type === "class") return e.subject || e.name || "上课";
  return e.name || (e.type === "break" ? "课间" : "下一节");
});

const noticeHtml = computed(() => renderMarkdownLite(settings.notice || ""));

// ── 布局拖动 ──
function posStyle(key: string) {
  const p = settings.layout[key] || { x: 50, y: 50 };
  return { left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)" };
}
let dragKey: string | null = null;
function onPointerDown(key: string, e: PointerEvent) {
  if (!editMode.value) return;
  dragKey = key;
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  e.preventDefault();
}
function onPointerMove(e: PointerEvent) {
  if (!dragKey) return;
  const x = Math.max(2, Math.min(98, (e.clientX / window.innerWidth) * 100));
  const y = Math.max(2, Math.min(98, (e.clientY / window.innerHeight) * 100));
  settings.layout[dragKey] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}
function onPointerUp() {
  if (!dragKey) return;
  dragKey = null;
  saveSettings();
}
function resetLayout() {
  settings.layout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
  saveSettings();
  ElMessage.success("已重置元素位置");
}
function toggleEdit() {
  editMode.value = !editMode.value;
  drawer.value = false;
}

// ── 背景与缩放 ──
const rootStyle = computed(() => {
  const style: Record<string, string> = { fontSize: `${settings.scale}%` };
  if (settings.bgValue) {
    if (settings.bgType === "image") {
      style.backgroundImage = `url("${settings.bgValue}")`;
      style.backgroundSize = "cover";
      style.backgroundPosition = "center";
      style.backgroundRepeat = "no-repeat";
    } else {
      style.background = settings.bgValue;
    }
  }
  return style;
});

const iframeCode = computed(() => {
  const origin = import.meta.client ? window.location.origin : "https://你的控制台域名";
  const q = settings.identity ? `?identity=${encodeURIComponent(settings.identity)}` : "";
  return `<iframe src="${origin}/board${q}" style="width:100vw;height:100vh;border:0" allow="fullscreen"></iframe>`;
});
async function copyIframe() {
  try {
    await navigator.clipboard.writeText(iframeCode.value);
    ElMessage.success("已复制");
  } catch {
    ElMessage.error("复制失败");
  }
}

// ── 天气图标 ──
function weatherEmoji(code: string): string {
  const n = Number(code);
  if (!n) return "🌡";
  if (n >= 100 && n <= 103) return "☀️";
  if (n === 104) return "⛅";
  if (n >= 150 && n <= 153) return "🌙";
  if (n >= 300 && n <= 399) return "🌧";
  if (n >= 400 && n <= 499) return "❄️";
  if (n >= 500 && n <= 515) return "🌫";
  return "🌤";
}

// ── 数据拉取 ──
async function loadBoard() {
  const id = identity.value;
  if (!id) {
    board.value = null;
    return;
  }
  try {
    const res: any = await $fetch(`/api/v1/ci/${encodeURIComponent(id)}/board.json`);
    board.value = res;
  } catch {
    board.value = null;
  }
}
async function loadWeather() {
  try {
    const res: any = await $fetch("/api/v1/public/weather.json");
    weather.value = res?.now ? res : null;
  } catch {
    /* 天气失败不影响其他元素 */
  }
}

let clockTimer: any, boardTimer: any, weatherTimer: any;

onMounted(() => {
  loadSettings();
  if (import.meta.client) consoleUrl.value = window.location.origin;

  loadBoard();
  loadWeather();

  clockTimer = setInterval(() => {
    now.value = new Date();
  }, 1000);
  // 课表与天气都是低频数据，没必要跟着秒针刷
  boardTimer = setInterval(loadBoard, 5 * 60 * 1000);
  weatherTimer = setInterval(loadWeather, 10 * 60 * 1000);

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  clearInterval(clockTimer);
  clearInterval(boardTimer);
  clearInterval(weatherTimer);
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("keydown", onKeydown);
});

function onKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (e.key === "e" || e.key === "E") {
    e.preventDefault();
    editMode.value = !editMode.value;
  }
}

watch(
  () => settings.identity,
  () => {
    saveSettings();
    loadBoard();
  },
);
watch(() => settings.termStart, saveSettings);
watch(settings, saveSettings, { deep: true });
</script>

<style scoped>
.board-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #0f1320 0%, #1a2238 45%, #243b55 100%);
  color: #f5f7fb;
  font-family:
    "HarmonyOS Sans SC", "Microsoft YaHei", "PingFang SC", system-ui, -apple-system, sans-serif;
  user-select: none;
  cursor: default;
}
.board-root.theme-dark {
  color: #131722;
}
.board-veil {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 40%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.28) 100%);
  pointer-events: none;
}

.el-block {
  position: absolute;
  padding: 0.4em 0.9em;
  border-radius: 0.6em;
  transition: outline-color 0.15s ease;
  outline: 2px dashed transparent;
}
.el-block.is-editing {
  outline-color: rgba(166, 194, 247, 0.85);
  background: rgba(20, 26, 40, 0.35);
  cursor: move;
}

/* 时钟 */
.clock-time {
  font-size: 7em;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}
.clock-sec {
  font-size: 0.36em;
  font-weight: 500;
  opacity: 0.7;
  margin-left: 0.08em;
}
.clock-date {
  font-size: 1.15em;
  opacity: 0.78;
  margin-top: 0.35em;
  text-align: center;
}

/* 科目 */
.subject-label {
  font-size: 1em;
  letter-spacing: 0.32em;
  opacity: 0.72;
  text-transform: uppercase;
}
.subject-name {
  font-size: 3em;
  font-weight: 700;
  line-height: 1.15;
  margin: 0.06em 0;
}
.subject-sub {
  font-size: 1.05em;
  opacity: 0.72;
}
.progress-track {
  height: 0.34em;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  overflow: hidden;
  margin: 0.6em 0 0.4em;
  min-width: 12em;
}
.theme-dark .progress-track {
  background: rgba(0, 0, 0, 0.18);
}
.progress-fill {
  height: 100%;
  background: #a6c2f7;
  border-radius: 999px;
  transition: width 0.6s linear;
}

/* 天气 */
.weather-row {
  display: flex;
  align-items: center;
  gap: 0.3em;
}
.weather-emoji {
  font-size: 2.4em;
  line-height: 1;
}
.weather-temp {
  font-size: 3.2em;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.weather-text {
  font-size: 1.2em;
  opacity: 0.9;
  margin-top: 0.15em;
}
.weather-sub {
  font-size: 0.95em;
  opacity: 0.66;
}
.weather-credit {
  font-size: 0.75em;
  opacity: 0.45;
  margin-top: 0.3em;
}
.weather-credit a {
  color: inherit;
}

/* 公告 */
.notice-block {
  max-width: 24em;
}
.md-body {
  font-size: 1.05em;
  line-height: 1.65;
}
.md-body :deep(h1),
.md-body :deep(h2),
.md-body :deep(h3) {
  font-weight: 700;
  line-height: 1.25;
  margin: 0.5em 0 0.3em;
}
.md-body :deep(h1) {
  font-size: 1.7em;
}
.md-body :deep(h2) {
  font-size: 1.4em;
}
.md-body :deep(h3) {
  font-size: 1.15em;
}
.md-body :deep(p) {
  margin: 0.35em 0;
}
.md-body :deep(ul),
.md-body :deep(ol) {
  padding-left: 1.3em;
  margin: 0.35em 0;
}
.md-body :deep(li) {
  margin: 0.15em 0;
}
.md-body :deep(blockquote) {
  border-left: 0.2em solid currentColor;
  opacity: 0.8;
  padding-left: 0.7em;
  margin: 0.4em 0;
}
.md-body :deep(code) {
  background: rgba(255, 255, 255, 0.16);
  padding: 0.1em 0.32em;
  border-radius: 0.28em;
  font-size: 0.92em;
}
.theme-dark .md-body :deep(code) {
  background: rgba(0, 0, 0, 0.1);
}
.md-body :deep(.md-pre) {
  background: rgba(0, 0, 0, 0.35);
  padding: 0.6em 0.75em;
  border-radius: 0.4em;
  overflow: auto;
  font-size: 0.88em;
}
.md-body :deep(a) {
  color: #a6c2f7;
  text-decoration: underline;
}
.md-body :deep(hr) {
  border: 0;
  border-top: 0.08em solid currentColor;
  opacity: 0.25;
  margin: 0.7em 0;
}

/* 水印 */
.board-watermark {
  position: absolute;
  right: 1.4em;
  bottom: 1.1em;
  font-size: 0.82em;
  letter-spacing: 0.06em;
  color: inherit;
  opacity: 0.38;
  text-decoration: none;
  transition: opacity 0.2s ease;
}
.board-watermark:hover {
  opacity: 0.75;
}

/* 设置按钮 */
.board-gear {
  position: absolute;
  left: 1em;
  bottom: 1em;
  width: 2.2em;
  height: 2.2em;
  border-radius: 50%;
  border: none;
  font-size: 1em;
  color: inherit;
  background: rgba(255, 255, 255, 0.1);
  opacity: 0.18;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.board-gear:hover {
  opacity: 0.9;
}
.board-edithint {
  position: absolute;
  left: 50%;
  top: 1em;
  transform: translateX(-50%);
  font-size: 0.85em;
  padding: 0.3em 0.9em;
  border-radius: 999px;
  background: rgba(166, 194, 247, 0.9);
  color: #10151f;
}

.hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  margin-top: 4px;
}
</style>
