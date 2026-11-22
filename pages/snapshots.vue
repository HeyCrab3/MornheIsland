<template>
  <div>
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">{{ $t('sidebar.items.snapshots') }}</h1>
        <p class="text-sm text-gray-500">
          {{ $t('pages.snapshots.extra.pageDesc') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <el-button :loading="loading" @click="load">{{ $t('pages.snapshots.extra.refresh') }}</el-button>
      </div>
    </div>

    <el-alert type="info" :closable="false" show-icon class="mb-4 max-w-4xl">
      <template #title>{{ $t('pages.snapshots.extra.alertTitle') }}</template>
      {{ $t('pages.snapshots.extra.alertBody1') }}<b>{{ $t('pages.snapshots.extra.alertBold1') }}</b>{{ $t('pages.snapshots.extra.alertBody2') }}<b>{{ $t('pages.snapshots.extra.alertBold2') }}</b>{{ $t('pages.snapshots.extra.alertBody3') }}<b>{{ $t('pages.snapshots.extra.alertBold3') }}</b>{{ $t('pages.snapshots.extra.alertBody4') }}<b>{{ $t('pages.snapshots.extra.alertBold4') }}</b>{{ $t('pages.snapshots.extra.alertBody5') }}
    </el-alert>

    <div class="flex flex-wrap items-center gap-2 mb-3">
      <el-radio-group v-model="filter" size="small" @change="load">
        <el-radio-button value="">{{ $t('pages.devices.extra.all') }}</el-radio-button>
        <el-radio-button value="ci_classplans">{{ $t('composables.useciresource.plan') }}</el-radio-button>
        <el-radio-button value="ci_timelayouts">{{ $t('components.home.quickstartupguide.timeLayout') }}</el-radio-button>
        <el-radio-button value="ci_subjects">{{ $t('composables.useciresource.subject') }}</el-radio-button>
        <el-radio-button value="ci_settings">{{ $t('composables.useciresource.settings') }}</el-radio-button>
        <el-radio-button value="ci_policies">{{ $t('composables.useciresource.policy') }}</el-radio-button>
      </el-radio-group>
    </div>

    <el-card v-loading="loading" class="max-w-5xl">
      <div v-if="rows.length === 0 && !loading" class="py-8 text-sm text-gray-400 text-center">
        {{ $t('pages.snapshots.extra.empty') }}
      </div>
      <div
        v-for="r in rows"
        :key="r._id"
        class="flex items-center justify-between gap-3 py-3 border-b border-gray-200 dark:border-gray-700 last:border-0 text-sm"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <el-tag size="small" effect="plain" type="info">{{ r.reasonLabel }}</el-tag>
            <span class="font-medium truncate">{{ r.name || $t('components.resourceeditor.untitled') }}</span>
            <el-tag size="small" effect="plain" round>{{ typeLabel(r.collection) }}</el-tag>
            <span v-if="r.version" class="text-xs text-gray-400 font-mono">v{{ r.version }}</span>
          </div>
          <div class="text-xs text-gray-400 mt-1">
            {{ fmt(r.at) }}
            <span v-if="r.detail"> · {{ r.detail }}</span>
          </div>
        </div>
        <el-button size="small" type="primary" text @click="restore(r)">{{ $t('pages.snapshots.extra.restoreToMoment') }}</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "数据恢复", protected: true });

const { t } = useI18n();

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const loading = ref(false);
const filter = ref("");
const rows = ref<any[]>([]);

const TYPE_OF: Record<string, string> = {
  ci_classplans: "classplan",
  ci_timelayouts: "timelayout",
  ci_subjects: "subjects",
  ci_settings: "settings",
  ci_policies: "policy",
};
const LABEL_OF: Record<string, string> = {
  ci_classplans: t('composables.useciresource.plan'),
  ci_timelayouts: t('components.home.quickstartupguide.timeLayout'),
  ci_subjects: t('composables.useciresource.subject'),
  ci_settings: t('composables.useciresource.settings'),
  ci_policies: t('composables.useciresource.policy'),
};

function typeLabel(c: string) {
  return LABEL_OF[c] || c;
}

function fmt(d: string) {
  return d ? new Date(d).toLocaleString("zh-CN") : "-";
}

async function load() {
  loading.value = true;
  try {
    const q = filter.value ? `&collection=${filter.value}` : "";
    const res: any = await $fetch(`/api/v1/console/ci/snapshots/recent?limit=100${q}`, {
      headers: authHeaders(),
    });
    rows.value = res.data || [];
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('pages.snapshots.loadFailed'));
  } finally {
    loading.value = false;
  }
}

async function restore(r: any) {
  const type = TYPE_OF[r.collection];
  if (!type) return ElMessage.error(t('pages.snapshots.unsupportedResourceType'));
  try {
    await ElMessageBox.confirm(
      t('pages.snapshots.extra.restoreConfirm', { name: r.name || t('components.resourceeditor.untitled'), time: fmt(r.at) }) + "\n" +
        t('pages.snapshots.snapshotBeforeRestore'),
      t('pages.snapshots.extra.restoreTitle', { reason: r.reasonLabel }),
      { type: "warning", confirmButtonText: t('components.resourceeditor.restore'), cancelButtonText: t('reauth.cancel') },
    );
  } catch {
    return;
  }
  try {
    const res: any = await $fetch(
      `/api/v1/console/ci/${type}/${r.resourceId}/snapshots/${r._id}/restore`,
      { method: "POST", headers: authHeaders() },
    );
    const recreated = res?.data?.recreated;
    ElMessage.success(recreated ? t('pages.snapshots.resourceRebuilt') : t('pages.snapshots.extra.restoredNewVersion', { version: res?.data?.version }));
    await load();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('pages.snapshots.restoreFailed'));
  }
}

onMounted(load);
</script>
