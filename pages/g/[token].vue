<template>
  <div class="min-h-[70vh] flex items-start justify-center py-10 px-4">
    <div class="w-full max-w-xl rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <div v-if="loading" class="py-10 text-center text-gray-400">{{ $t('pages.g.token.extra.loadingInfo') }}</div>

      <template v-else-if="error">
        <el-result icon="warning" :title="error.title" :sub-title="error.detail">
          <template #extra>
            <el-button type="primary" @click="navigateTo('/classes')">{{ $t('pages.g.token.extra.backToClasses') }}</el-button>
          </template>
        </el-result>
      </template>

      <template v-else-if="info">
        <h2 class="text-lg font-semibold mb-1">{{ $t('pages.g.token.extra.classGrantTitle') }}</h2>
        <p class="text-sm text-gray-500 mb-4">
          <b>{{ info.ownerName || $t('pages.g.token.someUser') }}</b> {{ $t('pages.g.token.extra.inviteHint') }}
        </p>

        <div class="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 mb-4">
          <div class="text-xs text-gray-500 mb-1">{{ $t('pages.g.token.extra.grantedClasses') }}</div>
          <div class="flex flex-wrap gap-1">
            <el-tag v-for="c in info.classes" :key="c._id">{{ c.name || c.identity }}</el-tag>
          </div>
        </div>

        <div class="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 mb-4">
          <div class="text-xs text-gray-500 mb-1">{{ $t('pages.g.token.extra.allowedActions') }}</div>
          <ul class="text-sm space-y-0.5">
            <li v-for="c in info.capLabels" :key="c">· {{ c }}</li>
          </ul>
        </div>

        <div class="text-xs text-gray-500 mb-4">
          {{ $t('pages.g.token.extra.validUntil') }} {{ fmt(info.expiresAt) }} · {{ $t('pages.g.token.extra.acceptedCount') }} {{ info.usedCount }}/{{ info.maxUses || $t('pages.g.token.unlimited') }} {{ $t('pages.g.token.extra.personUnit') }}
          <span v-if="info.note"> · {{ $t('pages.g.token.extra.noteLabel') }}{{ info.note }}</span>
        </div>

        <div v-if="info.isMine" class="text-sm text-amber-600 mb-3">
          {{ $t('pages.g.token.extra.ownGrantHint') }}
        </div>

        <el-alert
          type="info"
          :closable="false"
          show-icon
          class="mb-4"
          :title="$t('pages.g.token.acceptAsAuditIdentity')"
          :description="$t('pages.g.token.changesUnderYourName')"
        />

        <div class="flex gap-2 justify-end">
          <el-button @click="navigateTo('/classes')">{{ $t('pages.g.token.extra.notNow') }}</el-button>
          <el-button
            v-if="!info.isMine"
            type="primary"
            :loading="accepting"
            @click="doAccept"
          >
            {{ info.accepted ? $t('pages.g.token.acceptedGoToClass') : $t('pages.g.token.acceptGrant') }}
          </el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "接受委托", protected: true });

const { t } = useI18n();

const route = useRoute();
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const loading = ref(true);
const accepting = ref(false);
const info = ref<any>(null);
const error = ref<{ title: string; detail: string } | null>(null);

const token = computed(() => String(route.params.token || "").trim().toLowerCase());

function fmt(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return t("pages.g.token.extra.dateFormat", {
    year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  });
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/grants/preview`, {
      headers: authHeaders(),
      query: { token: token.value },
    });
    info.value = res?.data || null;
    if (!info.value) {
      error.value = { title: t("pages.g.token.grantNotFound"), detail: t("pages.g.token.linkPossiblyExpired") };
    }
  } catch (e: any) {
    const code = e?.data?.code || e?.statusCode;
    if (code === 404) {
      error.value = { title: t("pages.g.token.grantNotFound"), detail: t("pages.g.token.linkPossiblyDeleted") };
    } else if (code === 410) {
      error.value = { title: t("pages.g.token.grantExpired"), detail: t("pages.g.token.grantExpiredOrRevoked") };
    } else if (code === 400) {
      error.value = { title: t("pages.g.token.invalidLinkFormat"), detail: t("pages.g.token.checkLinkTruncated") };
    } else {
      error.value = { title: t("pages.g.token.loadFailed"), detail: e?.data?.msg || t("pages.g.token.retryLater") };
    }
  } finally {
    loading.value = false;
  }
}

async function doAccept() {
  if (info.value?.accepted) {
    return navigateTo("/classes");
  }
  accepting.value = true;
  try {
    await $fetch("/api/v1/console/ci/grants/accept", {
      method: "POST",
      headers: authHeaders(),
      body: { token: token.value },
    });
    ElMessage.success(t("pages.g.token.grantAccepted"));
    navigateTo("/classes");
  } catch (e: any) {
    const code = e?.data?.code;
    if (code === 410) {
      error.value = { title: t("pages.g.token.grantExpired"), detail: t("pages.g.token.grantExpiredOrRevoked") };
    } else if (code === 409) {
      ElMessage.error(e?.data?.msg || t("pages.g.token.slotsFull"));
    } else if (code === 400) {
      ElMessage.warning(e?.data?.msg || t("pages.g.token.cannotAcceptGrant"));
    } else {
      ElMessage.error(e?.data?.msg || t("pages.g.token.acceptFailed"));
    }
  } finally {
    accepting.value = false;
  }
}

onMounted(load);
</script>
