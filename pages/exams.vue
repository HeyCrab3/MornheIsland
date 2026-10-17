<template>
  <div>
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">考试安排</h1>
        <p class="text-sm text-gray-500">
          按<b>账号</b>保存，该账号下所有班级的看板共用这一份，不用每个班重复录入。
        </p>
      </div>
      <div class="flex gap-2">
        <el-button :disabled="!hasPast" @click="cleanPast">清理过期</el-button>
        <el-button type="primary" :loading="saving" :disabled="!dirty" @click="save">
          保存
        </el-button>
      </div>
    </div>

    <el-alert type="info" :closable="false" show-icon class="mb-4 max-w-3xl">
      <template #title>生效规则</template>
      与考试时间<b>重合</b>的标准课时会被考试整段替换，不重合的课时照常显示。
      考试只在看板上生效，不会改动下发给 ClassIsland 的课表。
    </el-alert>

    <el-card class="max-w-3xl mb-4">
      <template #header><span class="font-medium">添加考试</span></template>
      <div class="flex flex-wrap items-center gap-2">
        <el-date-picker
          v-model="draft.date"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="考试日期"
          style="width: 160px"
        />
        <el-input v-model="draft.subject" placeholder="科目，如 数学" style="width: 150px" />
        <el-time-picker
          v-model="draft.start"
          format="HH:mm"
          value-format="HH:mm"
          placeholder="开始"
          style="width: 118px"
        />
        <el-time-picker
          v-model="draft.end"
          format="HH:mm"
          value-format="HH:mm"
          placeholder="结束"
          style="width: 118px"
        />
        <el-button type="primary" @click="add">添加</el-button>
      </div>
    </el-card>

    <el-card v-loading="loading" class="max-w-3xl">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">已安排 {{ entries.length }} 场</span>
          <span v-if="dirty" class="text-xs" style="color: var(--el-color-warning)">
            有未保存的修改
          </span>
        </div>
      </template>

      <el-table v-if="entries.length" :data="entries" size="small">
        <el-table-column label="日期" width="180">
          <template #default="{ row }">
            <span :class="{ 'font-semibold': row.date === today }">{{ row.date }}</span>
            <span class="text-xs text-gray-400 ml-2">{{ weekLabel(row.date) }}</span>
            <el-tag v-if="row.date === today" size="small" type="warning" effect="plain" class="ml-1">
              今天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="subject" label="科目" min-width="120" />
        <el-table-column label="时间" width="140">
          <template #default="{ row }">{{ row.start }} – {{ row.end }}</template>
        </el-table-column>
        <el-table-column width="70" align="right">
          <template #default="{ $index }">
            <el-button size="small" text type="danger" @click="removeAt($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="还没有安排考试" :image-size="80" />
    </el-card>

    <div class="max-w-3xl mt-3 text-xs text-gray-400 leading-relaxed">
      提示：看板每 10 分钟同步一次，保存后最多等这么久生效；想立刻看到就刷新看板页面。
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "考试安排", protected: true });

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const loading = ref(false);
const saving = ref(false);
const entries = ref<Array<{ date: string; subject: string; start: string; end: string }>>([]);
const dirty = ref(false);

const draft = reactive({ date: "", subject: "", start: "", end: "" });

const pad2 = (n: number) => String(n).padStart(2, "0");
const today = computed(() => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
});

const hasPast = computed(() => entries.value.some((e) => e.date < today.value));

function weekLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()] || "";
}

function sortEntries() {
  entries.value.sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
}

async function fetchEntries() {
  loading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/exams", { headers: authHeaders() });
    entries.value = Array.isArray(res?.data?.entries) ? res.data.entries : [];
    dirty.value = false;
  } catch {
    ElMessage.error("读取考试安排失败");
  } finally {
    loading.value = false;
  }
}

function add() {
  const { date, subject, start, end } = draft;
  if (!date) return ElMessage.warning("请选择考试日期");
  if (!subject.trim()) return ElMessage.warning("请填写考试科目");
  if (!start || !end) return ElMessage.warning("请选择起止时间");
  if (end <= start) return ElMessage.warning("结束时间要晚于开始时间");

  const dup = entries.value.some(
    (e) => e.date === date && e.start === start && e.end === end && e.subject === subject.trim(),
  );
  if (dup) return ElMessage.warning("这条已经存在了");

  entries.value.push({ date, subject: subject.trim(), start, end });
  sortEntries();
  dirty.value = true;
  // 保留日期，方便同一天连续添加多场
  draft.subject = "";
  draft.start = "";
  draft.end = "";
}

function removeAt(index: number) {
  entries.value.splice(index, 1);
  dirty.value = true;
}

function cleanPast() {
  const before = entries.value.length;
  entries.value = entries.value.filter((e) => e.date >= today.value);
  const removed = before - entries.value.length;
  if (removed) dirty.value = true;
  ElMessage.success(removed ? `已移除 ${removed} 条过期安排，记得保存` : "没有过期的安排");
}

async function save() {
  saving.value = true;
  try {
    await $fetch("/api/v1/console/ci/exams", {
      method: "PUT",
      headers: authHeaders(),
      body: { entries: entries.value },
    });
    dirty.value = false;
    ElMessage.success("已保存");
    await fetchEntries();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "保存失败");
  } finally {
    saving.value = false;
  }
}

onMounted(fetchEntries);
</script>
