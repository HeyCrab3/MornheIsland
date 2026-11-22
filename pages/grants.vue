<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto">
    <header class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ $t('pages.grants.extra.pageTitle') }}</h1>
        <p class="text-sm text-gray-500 mt-1">
          把某个班的运维权临时交给别人：指定<b>能做哪些事</b>、<b>到什么时候为止</b>、<b>最多几个人</b>。
          对方用他自己的账号接受，所以每一步都追得到人；随时可以撤销，撤销即刻生效。
        </p>
      </div>
      <el-button type="primary" @click="openCreate">{{ $t('pages.grants.createGrant') }}</el-button>
    </header>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      class="mb-4"
      :title="$t('pages.grants.grantLinkIsKey')"
      :description="$t('pages.grants.grantLinkWarning')"
    />

    <el-tabs v-model="tab" @tab-change="fetchAll">
      <el-tab-pane :label="$t('pages.grants.grantedByMe')" name="issued">
        <div v-loading="loading">
          <el-empty v-if="!issued.length" :description="$t('pages.grants.noGrantsSent')" />
          <div v-for="g in issued" :key="g._id" class="mb-3 rounded-2xl border p-4"
            :class="g.active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 opacity-60'">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-medium">{{ g.classes.map((c: any) => c.name || c.identity).join('、') }}</span>
                  <el-tag v-if="g.active" type="success" size="small">{{ $t('pages.grants.extra.active') }}</el-tag>
                  <el-tag v-else-if="g.revokedAt" type="info" size="small">{{ $t('components.cw2centralpanel.revoked') }}</el-tag>
                  <el-tag v-else type="warning" size="small">{{ $t('pages.schools.id.expired') }}</el-tag>
                  <el-tag v-if="g.allowSharedEdit" type="danger" size="small">{{ $t('pages.grants.allowEditSharedResources') }}</el-tag>
                  <el-tag v-if="g.delegateEnabled" type="warning" size="small">{{ $t('pages.grants.extra.delegateCodeEnabled') }}</el-tag>
                </div>
                <div class="mt-2 flex flex-wrap gap-1">
                  <el-tag v-for="c in g.capLabels" :key="c" size="small" effect="plain">{{ c }}</el-tag>
                </div>
                <div class="mt-2 text-xs text-gray-500">
                  到期 {{ fmt(g.expiresAt) }} · 名额 {{ g.usedCount }}/{{ g.maxUses || $t('pages.g.token.unlimited') }}
                  <span v-if="g.note"> · 备注：{{ g.note }}</span>
                </div>
                <div v-if="g.members?.length" class="mt-2 text-xs text-gray-500">
                  {{ $t('pages.grants.extra.acceptedLabel') }}
                  <span v-for="m in g.members" :key="m.userId" class="mr-2">
                    {{ m.userName || m.userId }}（{{ fmt(m.acceptedAt) }}）
                  </span>
                </div>
              </div>
              <div class="flex gap-2 shrink-0 flex-wrap">
                <el-button size="small" @click="copyLink(g.token)">{{ $t('pages.grants.extra.copyLink') }}</el-button>
                <el-button
                  v-if="g.active && !g.delegateEnabled"
                  size="small"
                  @click="genDelegateCode(g)"
                >
                  {{ $t('pages.grants.delegateCode') }}
                </el-button>
                <el-button
                  v-if="g.active && g.delegateEnabled"
                  size="small"
                  @click="offDelegateCode(g)"
                >
                  {{ $t('pages.grants.disableDelegateCode') }}
                </el-button>
                <el-button v-if="g.active" size="small" type="danger" plain @click="doRevoke(g)">{{ $t('pages.grants.revoke') }}</el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="$t('pages.grants.grantedToMe')" name="received">
        <div v-loading="loading">
          <el-empty v-if="!received.length" :description="$t('pages.grants.noClassesGrantedToMe')" />
          <div v-for="g in received" :key="g._id"
            class="mb-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <div class="font-medium">
                  {{ g.classes.map((c: any) => c.name || c.identity).join('、') }}
                  <span class="text-xs text-gray-500 font-normal">（{{ g.ownerName || $t('pages.grants.others') }} 委托）</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-1">
                  <el-tag v-for="c in g.capLabels" :key="c" size="small" effect="plain">{{ c }}</el-tag>
                </div>
                <div class="mt-2 text-xs text-gray-500">到期 {{ fmt(g.expiresAt) }}</div>
              </div>
              <div class="flex gap-2 shrink-0">
                <el-button size="small" type="primary" @click="navigateTo('/classes')">{{ $t('pages.grants.extra.enterClasses') }}</el-button>
                <el-button size="small" type="danger" plain @click="doLeave(g)">{{ $t('pages.grants.quitGrant') }}</el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showCreate" :title="$t('pages.grants.createGrant')" width="560px">
      <el-form label-width="110px">
        <el-form-item :label="$t('pages.grants.whichClasses')">
          <el-select v-model="form.classIds" multiple filterable :placeholder="$t('pages.grants.selectClasses')" class="w-full">
            <el-option v-for="c in myClasses" :key="c._id" :label="c.name || c.identity" :value="c._id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('pages.grants.allowedActions')">
          <el-checkbox-group v-model="form.caps" class="flex flex-col gap-1">
            <el-checkbox v-for="c in caps" :key="c.key" :label="c.key" :disabled="c.key === 'view'">
              {{ c.label }}<span v-if="c.key === 'view'" class="text-xs text-gray-400">{{ $t('pages.grants.extra.mandatory') }}</span>
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item :label="$t('pages.grants.validityPeriod')">
          <el-select v-model="form.expiresInHours" class="w-full">
            <el-option :label="$t('pages.grants.oneHour')" :value="1" />
            <el-option :label="$t('pages.grants.sixHours')" :value="6" />
            <el-option :label="$t('pages.grants.twentyFourHours')" :value="24" />
            <el-option :label="$t('pages.grants.threeDays')" :value="72" />
            <el-option :label="$t('pages.grants.sevenDays')" :value="168" />
            <el-option :label="$t('pages.grants.thirtyDays')" :value="720" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('pages.grants.availableSlots')">
          <el-input-number v-model="form.maxUses" :min="0" :max="50" />
          <span class="ml-2 text-xs text-gray-500">{{ $t('pages.grants.extra.zeroMeansUnlimited') }}</span>
        </el-form-item>
        <el-form-item :label="$t('pages.grants.allowEditSharedResources')">
          <el-switch v-model="form.allowSharedEdit" />
          <div class="text-xs text-gray-500 mt-1 leading-relaxed">
            {{ $t('pages.grants.extra.sharedEditWarning') }}
          </div>
        </el-form-item>
        <el-form-item :label="$t('pages.grants.note')">
          <el-input v-model="form.note" maxlength="60" show-word-limit :placeholder="$t('pages.grants.noteExample')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="() => doCreate()">{{ $t('pages.grants.extra.generateLink') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showLink" :title="$t('pages.grants.grantLinkCreated')" width="560px">
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">
        把这条链接发给对方，对方<b>用自己的账号登录</b>后点「接受委托」即可。
      </p>
      <el-input v-model="createdLink" readonly>
        <template #append>
          <el-button @click="copyLink(createdToken)">{{ $t('pages.grants.extra.copy') }}</el-button>
        </template>
      </el-input>
      <p class="text-xs text-gray-500 mt-2">
        {{ $t('pages.grants.extra.doNotShareLink') }}
      </p>
      <template #footer>
        <el-button type="primary" @click="showLink = false">{{ $t('composables.useciresource.gotIt') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDelegate" :title="$t('pages.grants.delegateCode')" width="520px">
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
        给<b>没有账号</b>的人用（学弟、家长、临时帮忙的人）。他打开
        <code class="px-1 rounded bg-gray-100 dark:bg-gray-800">/d</code>
        输入这串码和自己的名字就能进来 —— 不做注册，但每一步都记在他填的名字下。
      </p>
      <div class="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 text-center mb-3">
        <div class="text-2xl font-mono tracking-[0.3em] select-all">{{ delegateCode }}</div>
        <div class="text-xs text-gray-500 mt-2">{{ delegateLink }}</div>
      </div>
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        :title="$t('pages.grants.shownOnlyOnce')"
        :description="$t('pages.grants.delegateCodeHint')"
      />
      <template #footer>
        <el-button @click="copyText(delegateLink)">{{ $t('pages.grants.extra.copyLink') }}</el-button>
        <el-button @click="copyText(delegateCode)">{{ $t('pages.grants.extra.copyCode') }}</el-button>
        <el-button type="primary" @click="showDelegate = false">{{ $t('composables.useciresource.gotIt') }}</el-button>
      </template>
    </el-dialog>

    <!-- 再验证：支持动态码与通行密钥，且浮在表单弹窗之上 -->
    <ReauthDialog ref="reauthRef" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "委托管理", protected: true });

const { t } = useI18n();

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const tab = ref<"issued" | "received">("issued");
const loading = ref(false);
const creating = ref(false);
const issued = ref<any[]>([]);
const received = ref<any[]>([]);
const caps = ref<{ key: string; label: string }[]>([]);
const myClasses = ref<any[]>([]);

const showCreate = ref(false);
const showLink = ref(false);
const createdLink = ref("");
const createdToken = ref("");

const showDelegate = ref(false);
const reauthRef = ref<any>(null);
const delegateCode = ref("");
const delegateLink = ref("");

const form = reactive({
  classIds: [] as string[],
  caps: ["view"] as string[],
  expiresInHours: 24,
  maxUses: 1,
  allowSharedEdit: false,
  note: "",
});

function fmt(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function reauthViaMfa(): Promise<boolean> {
  const ok = await reauthRef.value?.ask(
    t("pages.grants.grantNeedsVerification"),
    t("reauth.title"),
  );
  return ok === true;
}

async function fetchAll() {
  loading.value = true;
  try {
    const [a, b] = await Promise.all([
      $fetch<any>("/api/v1/console/ci/grants", { headers: authHeaders() }),
      $fetch<any>("/api/v1/console/ci/grants/received", { headers: authHeaders() }),
    ]);
    issued.value = a?.data || [];
    received.value = b?.data || [];
  } finally {
    loading.value = false;
  }
}

async function fetchMeta() {
  const [c, k] = await Promise.all([
    $fetch<any>("/api/v1/console/ci/grants/caps", { headers: authHeaders() }),
    $fetch<any>("/api/v1/console/ci/class/list", { headers: authHeaders() }),
  ]);
  caps.value = c?.data || [];
  myClasses.value = (k?.data || []).filter((x: any) => !x.viaGrant);
}

async function openCreate() {
  if (!caps.value.length) await fetchMeta();
  Object.assign(form, {
    classIds: [],
    caps: ["view"],
    expiresInHours: 24,
    maxUses: 1,
    allowSharedEdit: false,
    note: "",
  });
  showCreate.value = true;
}

async function doCreate(retried = false) {
  if (!form.classIds.length) {
    ElMessage.warning(t("pages.grants.selectAClassFirst"));
    return;
  }
  creating.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/grants", {
      method: "POST",
      headers: authHeaders(),
      body: { ...form },
    });
    createdToken.value = res?.data?.token || "";
    createdLink.value = `${location.origin}/g/${createdToken.value}`;
    showCreate.value = false;
    showLink.value = true;
    await fetchAll();
  } catch (e: any) {
    if (!retried && e?.data?.needReauth && (await reauthViaMfa())) {
      creating.value = false;
      return doCreate(true);
    }
    ElMessage.error(e?.data?.msg || t("components.resourcelist.createFailed"));
  } finally {
    creating.value = false;
  }
}

async function copyLink(token: string) {
  const link = `${location.origin}/g/${token}`;
  try {
    await navigator.clipboard.writeText(link);
    ElMessage.success(t("pages.grants.linkCopied"));
  } catch {
    ElMessageBox.alert(link, t("pages.grants.copyLinkBelow"));
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t("components.resourceeditor.copied"));
  } catch {
    ElMessageBox.alert(text, t("pages.grants.copyContentBelow"));
  }
}

async function genDelegateCode(g: any, retried = false) {
  try {
    const res: any = await $fetch(`/api/v1/console/ci/grants/${g._id}/delegate-code`, {
      method: "POST",
      headers: authHeaders(),
    });
    delegateCode.value = res?.data?.code || "";
    delegateLink.value = `${location.origin}/d`;
    showDelegate.value = true;
    await fetchAll();
  } catch (e: any) {
    if (!retried && e?.data?.needReauth && (await reauthViaMfa())) {
      return genDelegateCode(g, true);
    }
    ElMessage.error(e?.data?.msg || t("pages.grants.generateFailed"));
  }
}

async function offDelegateCode(g: any) {
  try {
    await ElMessageBox.confirm(
      t("pages.grants.disableCodeHint"),
      t("pages.grants.disableDelegateCode"),
      { type: "warning", confirmButtonText: t("components.notifyqrdialog.disable"), cancelButtonText: t("reauth.cancel") },
    );
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/grants/${g._id}/delegate-code`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    ElMessage.success(t("components.notifyqrdialog.disabled"));
    await fetchAll();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("components.notifyqrdialog.disableFailed"));
  }
}

async function doRevoke(g: any) {  try {
    await ElMessageBox.confirm(
      t("pages.grants.revokeGrantHint"),
      t("pages.grants.revokeGrant"),
      { type: "warning", confirmButtonText: t("pages.grants.revoke"), cancelButtonText: t("reauth.cancel") },
    );
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/grants/${g._id}/revoke`, {
      method: "POST",
      headers: authHeaders(),
    });
    ElMessage.success(t("components.cw2centralpanel.revoked"));
    await fetchAll();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("components.cw2centralpanel.revokeFailed"));
  }
}

async function doLeave(g: any) {
  try {
    await ElMessageBox.confirm(t("pages.grants.quitGrantHint"), t("pages.grants.quitGrant"), {
      type: "warning",
      confirmButtonText: t("pages.grants.quit"),
      cancelButtonText: t("reauth.cancel"),
    });
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/grants/received/${g._id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    ElMessage.success(t("pages.grants.quitSucceeded"));
    await fetchAll();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("pages.devices.operationFailed"));
  }
}

onMounted(async () => {
  await Promise.all([fetchAll(), fetchMeta()]);
});
</script>

