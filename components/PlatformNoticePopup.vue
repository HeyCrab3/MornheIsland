<template>
  <el-dialog
    v-model="open"
    width="560px"
    class="notice-popup"
    align-center
    append-to-body
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <el-tag :type="tagType(current?.priority)" size="small" effect="dark">
          {{ priorityLabel(current?.priority) }}
        </el-tag>
        <span class="font-semibold text-base leading-snug">{{ current?.title }}</span>
      </div>
    </template>

    <div v-if="current" class="notice-body">
      <div class="notice-meta">
        发布于 {{ fmtTime(current.publishAt) }}
        <span v-if="pending.length > 1" class="ml-2">· 还有 {{ pending.length - 1 }} 条待查看</span>
      </div>
      <div class="notice-content">{{ current.content }}</div>
    </div>

    <template #footer>
      <el-button type="primary" @click="acknowledge">我知道了</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
/**
 * 中台公告弹窗。
 *
 * 中台发布公告后，控制台在用户下次进入（或 5 分钟内轮询到）时弹窗展示，
 * 每条只弹一次（按公告 _id 记录在 localStorage）。
 *
 * 展示规则（实测中台 priority 取值是 low / medium / high）：
 *  · priority 为 high 的**一律弹**——这就是"紧急公告"通道；
 *  · 其它优先级只在**发布 24 小时内**弹一次。
 *    否则中台里 4 条历史公告会让每个新用户一进来就连弹 4 个窗。
 * 这样无论发布时选的是哪一档，刚发出的公告都能弹出来，又不会被积压的历史刷屏。
 */
const STORAGE_KEY = "mi-dismissed-notices-v1";
const POLL_INTERVAL = 5 * 60 * 1000;
/** 非紧急公告只在这个时间窗口内弹 */
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

const platform = usePlatformStore();
const route = useRoute();

const dismissed = ref<string[]>([]);
const sessionAcked = ref<string[]>([]);
const open = ref(false);

function loadDismissed() {
  if (!import.meta.client) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    dismissed.value = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(dismissed.value)) dismissed.value = [];
  } catch {
    dismissed.value = [];
  }
}

function saveDismissed() {
  if (!import.meta.client) return;
  try {
    // 只保留最近 200 条，避免无限增长
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed.value.slice(-200)));
  } catch {
    /* 无痕模式等场景忽略 */
  }
}

function isHighPriority(p: any): boolean {
  const v = String(p ?? "").toLowerCase();
  return /(urgent|emergency|critical|high|紧急|重要|高)/.test(v);
}

/** 待展示：高优先级，或发布 24 小时内的新公告；且没被确认过 */
const pending = computed<any[]>(() => {
  const list = Array.isArray(platform.notices) ? platform.notices : [];
  const skip = new Set([...dismissed.value, ...sessionAcked.value].map(String));
  const now = Date.now();
  return list
    .filter((n: any) => {
      if (!n?._id || !n.title) return false;
      if (skip.has(String(n._id))) return false;
      if (isHighPriority(n.priority)) {
        // 高优先级：只要到了发布时间就弹
        const t = Date.parse(n.publishAt);
        return Number.isNaN(t) || t <= now;
      }
      const t = Date.parse(n.publishAt);
      return !Number.isNaN(t) && t <= now && now - t <= RECENT_WINDOW_MS;
    })
    .sort((a: any, b: any) => {
      // 高优先级优先，其次新的在前
      const pa = isHighPriority(a.priority) ? 1 : 0;
      const pb = isHighPriority(b.priority) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return (Date.parse(b.publishAt) || 0) - (Date.parse(a.publishAt) || 0);
    });
});

const current = computed<any | null>(() => pending.value[0] ?? null);

/** 看板是壁纸裸页面，弹窗会污染画面；登录页也不该被挡住 */
const suppressed = computed(() => route.path === "/board" || route.path === "/login");

watch(
  [current, suppressed],
  ([c, sup]) => {
    open.value = !!c && !sup;
  },
  { immediate: true },
);

function acknowledge() {
  const id = current.value?._id;
  if (id) {
    sessionAcked.value.push(String(id));
    dismissed.value.push(String(id));
    saveDismissed();
  }
  // 确认后 current 会变成下一条（或 null），由上面的 watcher 决定弹窗开关，
  // 这里不要自己改 open，否则和下一条的展示打架
}

function priorityLabel(p: any): string {
  if (isHighPriority(p)) return "紧急公告";
  const v = String(p ?? "").toLowerCase();
  if (/(medium|normal|中)/.test(v)) return "重要公告";
  return "公告";
}

function tagType(p: any): "danger" | "warning" | "info" | "success" {
  if (isHighPriority(p)) return "danger";
  const v = String(p ?? "").toLowerCase();
  if (/(medium|normal|中)/.test(v)) return "warning";
  return "info";
}

function fmtTime(v: any): string {
  if (!v) return "未知时间";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("zh-CN", { hour12: false });
}

let pollTimer: any;

onMounted(() => {
  loadDismissed();
  // 中台数据由 app.vue 初始化；这里再挂一个轮询，
  // 让「刚发布的紧急公告」不用刷新页面也能弹出来
  pollTimer = setInterval(() => {
    platform.init(true).catch(() => {});
  }, POLL_INTERVAL);
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.notice-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
}
.notice-content {
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 52vh;
  overflow-y: auto;
}
</style>

<style>
/* 弹窗宽度在窄屏上要收住 */
.notice-popup {
  max-width: 92vw;
}
</style>
