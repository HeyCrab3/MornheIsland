<template>
  <div class="sa-page">
    <div class="sa-head">
      <div>
        <h2>子账户</h2>
        <p class="sa-sub">
          给老师或电教委员开一个<b>能独立登录</b>的身份：有自己的登录名和密码、可以单独开两步验证，
          只能碰你指定的班级和功能，到期自动失效。撤销或停用时，它已经登录的会话立刻掉线。
        </p>
      </div>
      <el-button type="primary" @click="openCreate">
        <el-icon class="mr-1"><Plus /></el-icon>创建子账户
      </el-button>
    </div>

    <el-table :data="list" v-loading="loading" class="sa-table">
      <el-table-column label="身份" min-width="200">
        <template #default="{ row }">
          <div class="flex flex-col">
            <span class="font-medium">{{ row.name }}</span>
            <span class="text-xs text-gray-400 font-mono">{{ row.login }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small" effect="light">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="可管理的班级" min-width="180">
        <template #default="{ row }">
          <div class="flex flex-wrap gap-1">
            <el-tag v-for="c in row.classes" :key="c._id" size="small" effect="plain">
              {{ c.name }}
            </el-tag>
            <span v-if="!row.classes?.length" class="text-xs text-gray-400">—</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="能做什么" min-width="200">
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

      <el-table-column label="到期" width="150">
        <template #default="{ row }">
          <span class="text-xs text-gray-500">{{ fmt(row.expiresAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="最后登录" width="150">
        <template #default="{ row }">
          <span class="text-xs text-gray-500">{{ fmt(row.lastLoginAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">改权限</el-button>
          <el-button link type="primary" @click="doResetPassword(row)">重置密码</el-button>
          <el-button
            v-if="row.status === 'disabled'"
            link
            type="success"
            @click="doEnable(row)"
            >启用</el-button
          >
          <el-button
            v-else
            link
            type="warning"
            :disabled="row.status === 'revoked'"
            @click="doDisable(row)"
            >停用</el-button
          >
          <el-button link type="danger" @click="doDelete(row)">删除</el-button>
        </template>
      </el-table-column>

      <template #empty>
        <div class="py-8 text-sm text-gray-400">
          还没有子账户。点右上角「创建子账户」，把这个班交给一位老师试试。
        </div>
      </template>
    </el-table>

    <!-- 创建 / 编辑 -->
    <el-dialog
      v-model="showForm"
      :title="editing ? '修改子账户权限' : '创建子账户'"
      width="620px"
    >
      <el-form label-position="top">
        <template v-if="!editing">
          <div class="grid grid-cols-2 gap-4">
            <el-form-item label="显示名（会出现在水印和操作记录里）">
              <el-input v-model="form.name" placeholder="如：高一(1)班 电教委员" maxlength="20" />
            </el-form-item>
            <el-form-item label="子账户名">
              <el-input v-model="form.login" placeholder="3-24 位小写字母/数字/下划线">
                <template #append>@{{ myName || "你的账号" }}</template>
              </el-input>
            </el-form-item>
          </div>
          <el-form-item label="初始密码（留空自动生成一个）">
            <el-input v-model="form.password" placeholder="留空则自动生成 12 位随机密码" show-password />
          </el-form-item>
        </template>

        <el-form-item label="可以管理哪些班级">
          <el-select
            v-model="form.classIds"
            multiple
            filterable
            placeholder="选择班级"
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

        <el-form-item label="能做什么">
          <el-checkbox-group v-model="form.caps">
            <el-checkbox v-for="c in caps" :key="c.key" :value="c.key">
              {{ c.label }}
            </el-checkbox>
          </el-checkbox-group>
          <p class="text-xs text-gray-400 mt-1">
            只能看不能改的账号，只勾「查看」就够了。设备相关的三项只在有受托班级设备时才生效。
          </p>
        </el-form-item>

        <el-form-item label="有效期">
          <el-select v-model="form.days" class="w-48">
            <el-option v-for="d in [7, 30, 90, 180, 365]" :key="d" :label="`${d} 天`" :value="d" />
          </el-select>
          <span class="text-xs text-gray-400 ml-3">到期后自动失效，不需要手动清理</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doSave()">
          {{ editing ? "保存" : "创建" }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 一次性凭据 -->
    <el-dialog v-model="showCreated" title="子账户已创建" width="560px">
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
        把这组信息发给对方，他打开
        <code class="px-1 rounded bg-gray-100 dark:bg-gray-800">/login</code>
        选「子账号登录」即可。<b>密码只显示这一次</b>，关掉就没法再看到了
        （忘了可以重置）。
      </p>
      <div class="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 mb-3 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">登录名</span>
          <span class="font-mono text-sm select-all">{{ createdLogin }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">密码</span>
          <span class="font-mono text-sm select-all">{{ createdPassword }}</span>
        </div>
      </div>
      <el-alert
        type="warning"
        :closable="false"
        title="请勿把密码贴在班级群里"
        description="子账户的操作会记在它的显示名下。如果密码泄露，重置一次即可让旧密码和已登录的会话同时失效。"
      />
      <template #footer>
        <el-button @click="copyCreated">复制</el-button>
        <el-button type="primary" @click="showCreated = false">知道了</el-button>
      </template>
    </el-dialog>

    <!-- 再验证：支持动态码与通行密钥，且浮在表单弹窗之上 -->
    <ReauthDialog ref="reauthRef" />
  </div>
</template>

<script setup lang="ts">
import { Plus } from "@element-plus/icons-vue";

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
  active: { label: "生效中", type: "success" },
  disabled: { label: "已停用", type: "info" },
  expired: { label: "已过期", type: "warning" },
  revoked: { label: "已撤销", type: "danger" },
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
    "创建或修改子账户等于把一部分操作权交出去，需要先验证是你本人。",
    "需要重新验证",
  );
  return ok === true;
}

function handleReauth(e: any) {
  ElMessage.error(e?.data?.msg || "操作失败");
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
    ElMessage.error(e?.data?.msg || "读取子账户失败");
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
    ElMessage.warning("先选一个班级");
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
      ElMessage.success("已更新");
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
      `重置后「${row.name}」已登录的会话会立刻失效，旧密码也不能再用。`,
      "重置密码",
      { confirmButtonText: "重置", cancelButtonText: "取消", type: "warning" },
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
    ElMessage.success("已停用，会话已下线");
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
    ElMessage.success("已启用");
    await fetchList();
  } catch (e: any) {
    handleReauth(e);
  }
}

async function doDelete(row: any, retried = false) {
  try {
    await ElMessageBox.confirm(
      `删除「${row.name}」会撤销它名下的权限、把已登录的会话踢下线，账号本身也会删掉。这个操作不可恢复。`,
      "删除子账户",
      { confirmButtonText: "删除", cancelButtonText: "取消", type: "error" },
    );
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/subaccounts/${row._id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    ElMessage.success("已删除");
    await fetchList();
  } catch (e: any) {
    if (!retried && e?.data?.needReauth && (await reauthViaMfa())) {
      return doDelete(row, true);
    }
    handleReauth(e);
  }
}

async function copyCreated() {
  const text = `登录名：${createdLogin.value}\n密码：${createdPassword.value}\n登录地址：${location.origin}/login`;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessageBox.alert(text.replace(/\n/g, "<br/>"), "复制下面的信息", {
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
