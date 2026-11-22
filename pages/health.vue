<template>
  <div>
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">{{ $t('sidebar.items.health') }}</h1>
        <p class="text-sm text-gray-500">
          {{ $t('pages.health.extra.pageDesc') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <el-button :loading="fixingAll" @click="fixAllNullGuid">{{ $t('pages.health.batchFixExpiredClassplans') }}</el-button>
        <el-button :loading="loading" @click="load">{{ $t('pages.health.extra.recheck') }}</el-button>
      </div>
    </div>

    <el-alert type="warning" :closable="false" show-icon class="mb-4 max-w-4xl">
      <template #title>{{ $t('pages.health.extra.nullGuidTitle') }}</template>
      {{ $t('pages.health.extra.nullGuidBody1') }} <code>"SubjectId": null</code>{{ $t('pages.health.extra.nullGuidBody2') }}
      （{{ $t('pages.health.extra.nullGuidBody3') }} <code>SubjectId</code>{{ $t('pages.health.extra.nullGuidBody4') }} <code>""</code>{{ $t('pages.health.extra.nullGuidBody5') }}
      {{ $t('pages.health.extra.nullGuidBody6') }} <code>00000000-0000-0000-0000-000000000000</code>{{ $t('pages.health.extra.nullGuidBody7') }}
      {{ $t('pages.health.extra.nullGuidBody8') }}
    </el-alert>

    <el-alert type="info" :closable="false" show-icon class="mb-4 max-w-4xl">
      <template #title>{{ $t('pages.health.extra.whyCheckTitle') }}</template>
      {{ $t('pages.health.extra.whyCheckBody1') }}{{ $t('pages.health.linked') }}{{ $t('pages.health.extra.whyCheckAfterLinked') }}<b>{{ $t('pages.health.extra.whyCheckBodyBold') }}</b>。
      {{ $t('pages.health.extra.whyCheckBody2') }}
      {{ $t('pages.health.extra.whyCheckBody3') }}
    </el-alert>

    <el-alert v-if="schoolName" type="info" :closable="false" show-icon class="mb-4 max-w-4xl">
      <template #title>{{ $t('pages.health.extra.schoolCheckTitlePrefix') }}{{ schoolName }}{{ $t('pages.health.extra.schoolCheckTitleSuffix') }}</template>
      {{ $t('pages.health.extra.schoolCheckBody1') }}<b>{{ $t('pages.health.extra.schoolCheckBodyBold') }}</b>{{ $t('pages.health.extra.schoolCheckBody2') }}
    </el-alert>

    <div v-if="summary" class="flex flex-wrap gap-3 mb-4">
      <div class="stat-card">
        <div class="stat-num">{{ summary.classCount }}</div>
        <div class="stat-label">{{ $t('dashboard.cards.classCount') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" :class="summary.issueClassCount ? 'text-amber-500' : ''">
          {{ summary.issueClassCount }}
        </div>
        <div class="stat-label">{{ $t('pages.health.extra.issueClasses') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" :class="summary.errorCount ? 'text-red-500' : ''">{{ summary.errorCount }}</div>
        <div class="stat-label">{{ $t('pages.health.extra.errors') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" :class="summary.warnCount ? 'text-amber-500' : ''">{{ summary.warnCount }}</div>
        <div class="stat-label">{{ $t('pages.health.warning') }}</div>
      </div>
    </div>

    <el-card v-loading="loading" class="max-w-4xl">
      <template #header>
        <span class="font-medium">{{ $t('pages.health.extra.checkResult') }}</span>
      </template>

      <el-empty
        v-if="!loading && !rows.length"
        :description="failed ? $t('pages.health.extra.checkFailedRetry') : $t('pages.health.extra.allClassesPassed')"
        :image-size="90"
      />

      <div v-for="row in rows" :key="row.classId" class="issue-row">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="min-w-0">
            <div class="font-medium truncate">
              {{ row.className || $t('pages.health.unnamedClass') }}
              <span v-if="row.identity" class="text-xs text-gray-400 ml-1">#{{ row.identity }}</span>
              <el-tag v-if="row.mine === false" size="small" type="info" effect="plain" class="ml-1">
                {{ $t('pages.health.extra.othersClass') }}
              </el-tag>
            </div>
            <ul class="mt-2 space-y-1.5">
              <li v-for="(it, i) in row.issues" :key="i" class="flex items-start gap-2 text-sm">
                <el-tag
                  size="small"
                  :type="it.level === 'error' ? 'danger' : 'warning'"
                  effect="plain"
                  class="shrink-0 mt-0.5"
                >
                  {{ it.level === "error" ? $t('pages.health.extra.errors') : $t('pages.health.warning') }}
                </el-tag>
                <span class="leading-relaxed">{{ it.message }}</span>
              </li>
            </ul>
          </div>
          <el-button
            v-if="row.canFix"
            size="small"
            type="primary"
            plain
            :loading="fixing === row.classId"
            @click="fix(row)"
          >
            {{ $t('pages.health.extra.fix') }}
          </el-button>
        </div>
      </div>
    </el-card>

    <div class="max-w-4xl mt-3 text-xs text-gray-400 leading-relaxed">
      {{ $t('pages.health.extra.autoFix1') }}<b>{{ $t('pages.health.extra.autoFixBold1') }}</b>{{ $t('pages.health.extra.autoFix2') }}
      {{ $t('pages.health.extra.autoFix3') }}
      {{ $t('pages.health.extra.autoFix4') }}<b>{{ $t('pages.health.extra.autoFixBold2') }}</b>{{ $t('pages.health.extra.autoFix5') }}
      {{ $t('pages.health.extra.autoFix6') }}
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "档案体检", protected: true });

const { t } = useI18n();

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const loading = ref(false);
const fixing = ref<string>("");
const fixingAll = ref(false);
const rows = ref<any[]>([]);
const summary = ref<any>(null);
const failed = ref(false);

/**
 * 批量修我名下所有课表资源里的 null Guid。
 * 单独一个入口是因为体检按班级遍历，没挂班级的孤儿课表不会出现在列表里 ——
 * 而线上这类资源不少。
 */
async function fixAllNullGuid() {
  try {
    await ElMessageBox.confirm(
      t('pages.health.nullGuidFixHint') +
        t('pages.health.nullGuidFixConfirm'),
      t('pages.health.batchFixExpiredClassplans'),
      { type: "warning", confirmButtonText: t('pages.health.startFix'), cancelButtonText: t('reauth.cancel') },
    );
  } catch {
    return;
  }
  fixingAll.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/health/fix-null-guid", {
      method: "POST",
      headers: authHeaders(),
    });
    const d = res?.data || {};
    if (!d.fixedFields) {
      ElMessage.success(t('pages.health.extra.noIssuesFound', { plans: d.scannedClassPlans ?? 0, layouts: d.scannedTimeLayouts ?? 0 }));
    } else {
      ElMessage.success(
        t('pages.health.extra.fixSummary', { plans: d.fixedClassPlans, layouts: d.fixedTimeLayouts, fields: d.fixedFields }),
      );
      await load();
    }
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('pages.health.fixFailed'));
  } finally {
    fixingAll.value = false;
  }
}

// 从学校详情页进来时带 ?schoolId=，作用域扩到整所学校
const route = useRoute();
const schoolId = computed(() => String(route.query.schoolId ?? "").trim());
const schoolName = ref("");

async function load() {
  loading.value = true;
  failed.value = false;
  try {
    const res: any = await $fetch("/api/v1/console/ci/health/resources", {
      headers: authHeaders(),
      query: schoolId.value ? { schoolId: schoolId.value } : {},
    });
    rows.value = Array.isArray(res?.data?.classes) ? res.data.classes : [];
    summary.value = res?.data?.summary || null;
    schoolName.value = res?.data?.schoolName || "";
  } catch (e: any) {
    failed.value = true;
    rows.value = [];
    summary.value = null;
    ElMessage.error(e?.data?.msg || t('pages.health.checkFailed'));
  } finally {
    loading.value = false;
  }
}

async function fix(row: any) {
  fixing.value = row.classId;
  try {
    const res: any = await $fetch("/api/v1/console/ci/health/fix", {
      method: "POST",
      headers: authHeaders(),
      body: { classId: row.classId },
    });
    const fixed: string[] = res?.data?.fixed || [];
    if (fixed.length) {
      ElMessage.success(t('pages.health.extra.fixedItems', { items: fixed.join(", ") }));
      await load();
    } else {
      ElMessage.info(res?.data?.message || t('pages.health.nothingToAutoFix'));
    }
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('pages.health.fixFailed'));
  } finally {
    fixing.value = "";
  }
}

onMounted(load);
</script>

<style scoped>
.stat-card {
  min-width: 96px;
  padding: 10px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}
.stat-num {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
}
.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}
.issue-row {
  padding: 14px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.issue-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
</style>
