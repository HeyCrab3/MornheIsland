<template>
  <div class="sa-page">
    <div class="sa-head">
      <div>
        <h2>{{ $t('sidebar.items.subaccounts') }}</h2>
        <p class="sa-sub">
          {{ $t('pages.subaccounts.extra.introBeforeBold') }}<b>{{ $t('pages.subaccounts.extra.introBold') }}</b>{{ $t('pages.subaccounts.extra.introAfterBold') }}
        </p>
      </div>
      <el-button type="primary" @click="openCreate">
        <el-icon class="mr-1"><Plus /></el-icon>{{ $t('pages.subaccounts.extra.createSubaccount') }}
      </el-button>
    </div>

    <el-table :data="list" v-loading="loading" class="sa-table">
      <el-table-column :label="$t('pages.subaccounts.identity')" min-width="200">
        <template #default="{ row }">
          <div class="flex flex-col">
            <span class="font-medium">{{ row.name }}</span>
            <span class="text-xs text-gray-400 font-mono">{{ row.login }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column :label="$t('components.cw2centralpanel.status')" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small" effect="light">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column :label="$t('pages.subaccounts.manageableClasses')" min-width="180">
        <template #default="{ row }">
          <div class="flex flex-wrap gap-1">
            <el-tag v-for="c in row.classes" :key="c._id" size="small" effect="plain">
              {{ c.name }}
            </el-tag>
            <span v-if="!row.classes?.length" class="text-xs text-gray-400">—</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column :label="$t('pages.subaccounts.permissions')" min-width="200">
        <template #default="{ row }">
          <div class="flex flex-wrap gap-1">
            <el-tag
              v-for="c in row.caps"
              :key="c"
              size="small"
              type="info"
              effect="plain"
            >
              {{ capLabel(c) }}
            </el-tag>
            <span v-if="!row.caps?.length" class="text-xs text-gray-400">—</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column :label="$t('pages.subaccounts.expires')" width="150">
        <template #default="{ row }">
          <span class="text-xs text-gray-500">{{ fmt(row.expiresAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column :label="$t('pages.subaccounts.lastLogin')" width="150">
        <template #default="{ row }">
          <span class="text-xs text-gray-500">{{ fmt(row.lastLoginAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column :label="$t('components.subjectseditor.actions')" width="250" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">{{ $t('pages.subaccounts.extra.editPermissions') }}</el-button>
          <el-button link type="primary" @click="doResetPassword(row)">{{ $t('pages.subaccounts.resetPassword') }}</el-button>
          <el-button
            v-if="row.status === 'disabled'"
            link
            type="success"
            @click="doEnable(row)"
            >{{ $t('pages.subaccounts.extra.enable') }}</el-button
          >
          <el-button
            v-else
            link
            type="warning"
            :disabled="row.status === 'revoked'"
            @click="doDisable(row)"
            >{{ $t('pages.subaccounts.extra.disable') }}</el-button
          >
          <el-button link type="danger" @click="doDelete(row)">{{ $t('components.resourceeditor.delete') }}</el-button>
        </template>
      </el-table-column>

      <template #empty>
        <div class="py-8 text-sm text-gray-400">
          {{ $t('pages.subaccounts.extra.noSubaccountsHint') }}
        </div>
      </template>
    </el-table>

    <!-- 创建 / 编辑 -->
    <el-dialog
      v-model="showForm"
      :title="editing ? $t('pages.subaccounts.extra.editPermissionsTitle') : $t('pages.subaccounts.extra.createSubaccount')"
      width="620px"
    >
      <el-form label-position="top">
        <template v-if="!editing">
          <div class="grid grid-cols-2 gap-4">
            <el-form-item :label="$t('pages.subaccounts.displayNameHint')">
              <el-input v-model="form.name" :placeholder="$t('pages.subaccounts.displayNameExample')" maxlength="20" />
            </el-form-item>
            <el-form-item :label="$t('pages.subaccounts.subaccountName')">
              <el-input v-model="form.login" :placeholder="$t('pages.subaccounts.subaccountNameRule')">
                <template #append>@{{ myName || $t('pages.subaccounts.yourAccount') }}</template>
              </el-input>
            </el-form-item>
          </div>
          <el-form-item :label="$t('pages.subaccounts.initialPassword')">
            <el-input v-model="form.password" :placeholder="$t('pages.subaccounts.autoPasswordHint')" show-password />
          </el-form-item>
        </template>

        <el-form-item :label="$t('pages.subaccounts.whichClassesCanManage')">
          <el-select
            v-model="form.classIds"
            multiple
            filterable
            :placeholder="$t('pages.grants.selectClasses')"
            class="w-full"
          >
            <el-option
              v-for="c in myClasses"
              :key="c._id"
              :label="c.name"
              :value="c._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('pages.subaccounts.permissions')">
          <el-checkbox-group v-model="form.caps">
            <el-checkbox v-for="c in caps" :key="c.key" :value="c.key">
              {{ c.label }}
            </el-checkbox>
          </el-checkbox-group>
          <p class="text-xs text-gray-400 mt-1">
            {{ $t('pages.subaccounts.extra.capsHint') }}
          </p>
        </el-form-item>

        <el-form-item :label="$t('pages.grants.validityPeriod')">
          <el-select v-model="form.days" class="w-48">
            <el-option v-for="d in [7, 30, 90, 180, 365]" :key="d" :label="$t('pages.subaccounts.extra.daysLabel', { d })" :value="d" />
          </el-select>
          <span class="text-xs text-gray-400 ml-3">{{ $t('pages.subaccounts.extra.expiresHint') }}</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showForm = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="doSave()">
          {{ editing ? $t('pages.subaccounts.save') : $t('pages.subaccounts.create') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 一次性凭据 -->
    <el-dialog v-model="showCreated" :title="$t('pages.subaccounts.subaccountCreated')" width="560px">
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
        {{ $t('pages.subaccounts.extra.createdIntroBeforeCode') }}
        <code class="px-1 rounded bg-gray-100 dark:bg-gray-800">/login</code>
        {{ $t('pages.subaccounts.extra.createdIntroAfterCodeBeforeBold') }}<b>{{ $t('pages.subaccounts.extra.createdIntroBold') }}</b>{{ $t('pages.subaccounts.extra.createdIntroAfterBold') }}
      </p>
      <div class="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 mb-3 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">{{ $t('pages.subaccounts.extra.loginName') }}</span>
          <span class="font-mono text-sm select-all">{{ createdLogin }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">{{ $t('login.passwordPlaceholder') }}</span>
          <span class="font-mono text-sm select-all">{{ createdPassword }}</span>
        </div>
      </div>
      <el-alert
        type="warning"
        :closable="false"
        :title="$t('pages.subaccounts.doNotSharePassword')"
        :description="$t('pages.subaccounts.subaccountAuditHint')"
      />
      <template #footer>
        <el-button @click="copyCreated">{{ $t('pages.subaccounts.extra.copy') }}</el-button>
        <el-button type="primary" @click="showCreated = false">{{ $t('composables.useciresource.gotIt') }}</el-button>
      </template>
    </el-dialog>

    <!-- 再验证：支持动态码与通行密钥，且浮在表单弹窗之上 -->
    <ReauthDialog ref="reauthRef" />
  </div>
</template>

<script setup lang="ts">
import { Plus } from "@element-plus/icons-vue";

const { t } = useI18n();

definePageMeta({ title: "子账户", protected: true });

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const loading = ref(false);
const saving = ref(false);
const list = ref<any[]>([]);
const myClasses = ref<any[]>([]);
const caps = ref<{ key: string; label: string }[]>([]);

// 子账户的完整登录名是「子账户名@主账号名」，这里把主账号名取出来做后缀提示
const userStore = useUserStore();
const myName = computed(() => userStore.userName || "");

const showForm = ref(false);
const editing = ref<any>(null);
const showCreated = ref(false);
const createdLogin = ref("");
const createdPassword = ref("");

const form = reactive({
  name: "",
  login: "",
  password: "",
  classIds: [] as string[],
  caps: ["view"] as string[],
  days: 30,
});

const STATUS: Record<string, { label: string; type: any }> = {
  active: { label: t('pages.subaccounts.active'), type: "success" },
  disabled: { label: t('components.notifyqrdialog.disabled'), type: "info" },
  expired: { label: t('pages.schools.id.expired'), type: "warning" },
  revoked: { label: t('components.cw2centralpanel.revoked'), type: "danger" },
};
const statusLabel = (s: string) => STATUS[s]?.label || s;
const statusType = (s: string) => STATUS[s]?.type || "info";
const capLabel = (k: string) => caps.value.find((c) => c.key === k)?.label || k;

function fmt(v: any) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("zh-CN", { hour12: false }).slice(0, 16);
}

/**
 * 与 profile/grants 同款：开了 2FA 或绑了通行密钥的账号不必退出重登，
 * 验证一次就能过再验证闸门。弹窗支持动态码 / 恢复码 / 通行密钥，
 * 并且浮在表单弹窗之上（ElMessageBox 会被盖住）。
 */
const reauthRef = ref<any>(null);

async function reauthViaMfa(): Promise<boolean> {
  const ok = await reauthRef.value?.ask(
    t('pages.subaccounts.verifyRequired'),
    t('reauth.title'),
  );
  return ok === true;
}

function handleReauth(e: any) {
  ElMessage.error(e?.data?.msg || t('pages.devices.operationFailed'));
}

async function fetchCaps() {
  try {
    const r: any = await $fetch("/api/v1/console/ci/subaccounts/caps", { headers: authHeaders() });
    caps.value = (r?.data || []).map((c: any) => ({ key: c.id, label: c.label }));
  } catch {
    caps.value = [];
  }
}

async function fetchClasses() {
  try {
    const r: any = await $fetch("/api/v1/console/ci/class/list", { headers: authHeaders() });
    const d = r?.data;
    myClasses.value = Array.isArray(d) ? d : d?.list || [];
  } catch {
    myClasses.value = [];
  }
}

async function fetchList() {
  loading.value = true;
  try {
    const r: any = await $fetch("/api/v1/console/ci/subaccounts", { headers: authHeaders() });
    list.value = r?.data?.list || [];
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t('pages.subaccounts.loadSubaccountsFailed'));
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.name = "";
  form.login = "";
  form.password = "";
  form.classIds = [];
  form.caps = ["view"];
  form.days = 30;
  showForm.value = true;
}

function openEdit(row: any) {
  editing.value = row;
  form.classIds = (row.classes || []).map((c: any) => c._id);
  form.caps = [...(row.caps || [])];
  form.days = 30;
  showForm.value = true;
}

async function doSave(retried = false) {
  if (!form.classIds.length) {
    ElMessage.warning(t('pages.grants.selectAClassFirst'));
    return;
  }
  saving.value = true;
  try {
    if (editing.value) {
      await $fetch(`/api/v1/console/ci/subaccounts/${editing.value._id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: { classIds: form.classIds, caps: form.caps },
      });
      ElMessage.success(t('pages.subaccounts.updated'));
    } else {
      const expiresAt = new Date(Date.now() + form.days * 86400_000).toISOString();
      const res: any = await $fetch("/api/v1/console/ci/subaccounts", {
        method: "POST",
        headers: authHeaders(),
        body: {
          name: form.name.trim(),
          login: form.login.trim().toLowerCase(),
          password: form.password.trim() || undefined,
          classIds: form.classIds,
          caps: form.caps,
          expiresAt,
        },
      });
      const local = res?.data?.login || form.login.trim().toLowerCase();
      createdLogin.value = local.includes("@") ? local : `${local}@${myName.value}`;
      createdPassword.value = res?.data?.password || "";
      showForm.value = false;
      showCreated.value = true;
    }
    await fetchList();
  } catch (e: any) {
    if (!retried && e?.data?.needReauth && (await reauthViaMfa())) {
      saving.value = false;
      return doSave(true);
    }
    handleReauth(e);
  } finally {
    saving.value = false;
  }
}

async function doResetPassword(row: any, retried = false) {
  try {
    await ElMessageBox.confirm(
      t('pages.subaccounts.extra.resetConfirmHint', { name: row.name }),
      t('pages.subaccounts.resetPassword'),
      { confirmButtonText: t('components.notifyqrdialog.reset'), cancelButtonText: t('reauth.cancel'), type: "warning" },
    );
  } catch {
    return;
  }
  try {
    const res: any = await $fetch(`/api/v1/console/ci/subaccounts/${row._id}/password`, {
      method: "POST",
      headers: authHeaders(),
    });
    createdLogin.value = row.login;
    createdPassword.value = res?.data?.password || "";
    showCreated.value = true;
    await fetchList();
  } catch (e: any) {
    if (!retried && e?.data?.needReauth && (await reauthViaMfa())) {
      return doResetPassword(row, true);
    }
    handleReauth(e);
  }
}

async function doDisable(row: any) {
  try {
    await $fetch(`/api/v1/console/ci/subaccounts/${row._id}/disable`, {
      method: "POST",
      headers: authHeaders(),
    });
    ElMessage.success(t('pages.subaccounts.disabledSessionsOffline'));
    await fetchList();
  } catch (e: any) {
    handleReauth(e);
  }
}

async function doEnable(row: any) {
  try {
    await $fetch(`/api/v1/console/ci/subaccounts/${row._id}/enable`, {
      method: "POST",
      headers: authHeaders(),
    });
    ElMessage.success(t('pages.subaccounts.enabled'));
    await fetchList();
  } catch (e: any) {
    handleReauth(e);
  }
}

async function doDelete(row: any, retried = false) {
  try {
    await ElMessageBox.confirm(
      t('pages.subaccounts.extra.deleteConfirmHint', { name: row.name }),
      t('pages.subaccounts.deleteSubaccount'),
      { confirmButtonText: t('components.resourceeditor.delete'), cancelButtonText: t('reauth.cancel'), type: "error" },
    );
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/subaccounts/${row._id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    ElMessage.success(t('components.resourceeditor.deleted'));
    await fetchList();
  } catch (e: any) {
    if (!retried && e?.data?.needReauth && (await reauthViaMfa())) {
      return doDelete(row, true);
    }
    handleReauth(e);
  }
}

async function copyCreated() {
  const text = t('pages.subaccounts.extra.copyText', {
    login: createdLogin.value,
    password: createdPassword.value,
    url: `${location.origin}/login`,
  });
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t('components.resourceeditor.copied'));
  } catch {
    ElMessageBox.alert(text.replace(/\n/g, "<br/>"), t('pages.subaccounts.copyInfoBelow'), {
      dangerouslyUseHTMLString: true,
    });
  }
}

onMounted(async () => {
  await Promise.all([fetchCaps(), fetchClasses()]);
  await fetchList();
});
</script>

<style scoped>
.sa-page {
  padding: 4px 2px;
}
.sa-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.sa-head h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 6px;
}
.sa-sub {
  font-size: 13px;
  line-height: 1.7;
  color: #6b7280;
  max-width: 720px;
}
:deep(.dark) .sa-sub {
  color: #9ca3af;
}
.sa-table {
  border-radius: 12px;
  overflow: hidden;
}
</style>
