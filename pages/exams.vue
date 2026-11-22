<template>
  <div>
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">{{ $t('dashboard.examEntry') }}</h1>
        <p class="text-sm text-gray-500">
          {{ $t('pages.exams.extra.saveScope1') }}<b>{{ $t('pages.exams.extra.saveScopeBold') }}</b>{{ $t('pages.exams.extra.saveScope2') }}
        </p>
      </div>
      <div class="flex gap-2">
        <el-button :disabled="!hasPast" @click="cleanPast">{{ $t('pages.exams.extra.cleanPast') }}</el-button>
        <el-button type="primary" :loading="saving" :disabled="!dirty" @click="save">
          {{ $t('pages.subaccounts.save') }}
        </el-button>
      </div>
    </div>

    <el-alert type="info" :closable="false" show-icon class="mb-4 max-w-3xl">
      <template #title>{{ $t('pages.exams.extra.effectiveTitle') }}</template>
      {{ $t('pages.exams.extra.effectiveBody1') }}<b>{{ $t('pages.exams.extra.effectiveBold') }}</b>{{ $t('pages.exams.extra.effectiveBody2') }}
      {{ $t('pages.exams.extra.effectiveBody3') }}
    </el-alert>

    <el-card class="max-w-3xl mb-4">
      <template #header><span class="font-medium">{{ $t('pages.exams.extra.addExam') }}</span></template>
      <div class="flex flex-wrap items-center gap-2">
        <el-date-picker
          v-model="draft.date"
          type="date"
          value-format="YYYY-MM-DD"
          :placeholder="$t('pages.exams.examDate')"
          style="width: 160px"
        />
        <el-input v-model="draft.subject" :placeholder="$t('pages.exams.subjectExample')" style="width: 150px" />
        <el-time-picker
          v-model="draft.start"
          format="HH:mm"
          value-format="HH:mm"
          :placeholder="$t('components.timelayouteditor.start')"
          style="width: 118px"
        />
        <el-time-picker
          v-model="draft.end"
          format="HH:mm"
          value-format="HH:mm"
          :placeholder="$t('components.timelayouteditor.end')"
          style="width: 118px"
        />
        <el-button type="primary" @click="add">{{ $t('pages.exams.extra.add') }}</el-button>
      </div>
    </el-card>

    <el-card v-loading="loading" class="max-w-3xl">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">{{ $t('pages.exams.extra.scheduledPrefix') }} {{ entries.length }} {{ $t('pages.exams.extra.scheduledSuffix') }}</span>
          <span v-if="dirty" class="text-xs" style="color: var(--el-color-warning)">
            {{ $t('pages.exams.extra.unsavedChanges') }}
          </span>
        </div>
      </template>

      <el-table v-if="entries.length" :data="entries" size="small">
        <el-table-column :label="$t('pages.exams.date')" width="180">
          <template #default="{ row }">
            <span :class="{ 'font-semibold': row.date === today }">{{ row.date }}</span>
            <span class="text-xs text-gray-400 ml-2">{{ weekLabel(row.date) }}</span>
            <el-tag v-if="row.date === today" size="small" type="warning" effect="plain" class="ml-1">
              {{ $t('pages.board.today') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="subject" :label="$t('composables.useciresource.subject')" min-width="120" />
        <el-table-column :label="$t('pages.exams.time')" width="140">
          <template #default="{ row }">{{ row.start }} – {{ row.end }}</template>
        </el-table-column>
        <el-table-column width="70" align="right">
          <template #default="{ $index }">
            <el-button size="small" text type="danger" @click="removeAt($index)">{{ $t('components.resourceeditor.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else :description="$t('pages.exams.noExamsScheduled')" :image-size="80" />
    </el-card>

    <div class="max-w-3xl mt-3 text-xs text-gray-400 leading-relaxed">
      {{ $t('pages.exams.extra.syncHint') }}
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "考试安排", protected: true });
const { t } = useI18n();

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
  return [t('components.classplaneditor.sunday'), t('components.classplaneditor.monday'), t('components.classplaneditor.tuesday'), t('components.classplaneditor.wednesday'), t('components.classplaneditor.thursday'), t('components.classplaneditor.friday'), t('components.classplaneditor.saturday')][d.getDay()] || "";
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
    ElMessage.error(t('pages.exams.loadExamsFailed'));
  } finally {
    loading.value = false;
  }
}

function add() {
  const { date, subject, start, end } = draft;
  if (!date) return ElMessage.warning(t('pages.exams.selectExamDate'));
  if (!subject.trim()) return ElMessage.warning(t('pages.exams.enterExamSubject'));
  if (!start || !end) return ElMessage.warning(t('pages.exams.selectStartTimeAndEndTime'));
  if (end <= start) return ElMessage.warning(t('pages.exams.endAfterStart'));

  const dup = entries.value.some(
    (e) => e.date === date && e.start === start && e.end === end && e.subject === subject.trim(),
  );
  if (dup) return ElMessage.warning(t('pages.exams.alreadyExists'));

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
  ElMessage.success(removed ? `已移除 ${removed} 条过期安排，记得保存` : t('pages.exams.noExpiredSchedules'));
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
    ElMessage.success(t('components.resourceeditor.saved'));
    await fetchEntries();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('components.resourceeditor.saveFailed'));
  } finally {
    saving.value = false;
  }
}

onMounted(fetchEntries);
</script>
