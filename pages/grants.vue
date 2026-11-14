<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto">
    <header class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">委托管理</h1>
        <p class="text-sm text-gray-500 mt-1">
          把某个班的运维权临时交给别人：指定<b>能做哪些事</b>、<b>到什么时候为止</b>、<b>最多几个人</b>。
          对方用他自己的账号接受，所以每一步都追得到人；随时可以撤销，撤销即刻生效。
        </p>
      </div>
      <el-button type="primary" @click="openCreate">新建委托</el-button>
    </header>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      class="mb-4"
      title="委托链接等同于钥匙"
      description="拿到链接并登录自己账号的人就能按授权操作这些班级。请只发给真正需要的人，不要发到群里、不要贴到公告栏。"
    />

    <el-tabs v-model="tab" @tab-change="fetchAll">
      <el-tab-pane label="我发出的" name="issued">
        <div v-loading="loading">
          <el-empty v-if="!issued.length" description="还没有发出过委托" />
          <div v-for="g in issued" :key="g._id" class="mb-3 rounded-2xl border p-4"
            :class="g.active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 opacity-60'">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-medium">{{ g.classes.map((c: any) => c.name || c.identity).join('、') }}</span>
                  <el-tag v-if="g.active" type="success" size="small">有效</el-tag>
                  <el-tag v-else-if="g.revokedAt" type="info" size="small">已撤销</el-tag>
                  <el-tag v-else type="warning" size="small">已过期</el-tag>
                  <el-tag v-if="g.allowSharedEdit" type="danger" size="small">允许改共享资源</el-tag>
                  <el-tag v-if="g.delegateEnabled" type="warning" size="small">已开代登录码</el-tag>
                </div>
                <div class="mt-2 flex flex-wrap gap-1">
                  <el-tag v-for="c in g.capLabels" :key="c" size="small" effect="plain">{{ c }}</el-tag>
                </div>
                <div class="mt-2 text-xs text-gray-500">
                  到期 {{ fmt(g.expiresAt) }} · 名额 {{ g.usedCount }}/{{ g.maxUses || '不限' }}
                  <span v-if="g.note"> · 备注：{{ g.note }}</span>
                </div>
                <div v-if="g.members?.length" class="mt-2 text-xs text-gray-500">
                  已接受：
                  <span v-for="m in g.members" :key="m.userId" class="mr-2">
                    {{ m.userName || m.userId }}（{{ fmt(m.acceptedAt) }}）
                  </span>
                </div>
              </div>
              <div class="flex gap-2 shrink-0 flex-wrap">
                <el-button size="small" @click="copyLink(g.token)">复制链接</el-button>
                <el-button
                  v-if="g.active && !g.delegateEnabled"
                  size="small"
                  @click="genDelegateCode(g)"
                >
                  代登录码
                </el-button>
                <el-button
                  v-if="g.active && g.delegateEnabled"
                  size="small"
                  @click="offDelegateCode(g)"
                >
                  停用代登录码
                </el-button>
                <el-button v-if="g.active" size="small" type="danger" plain @click="doRevoke(g)">撤销</el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="别人给我的" name="received">
        <div v-loading="loading">
          <el-empty v-if="!received.length" description="暂时没有别人委托给你的班级" />
          <div v-for="g in received" :key="g._id"
            class="mb-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <div class="font-medium">
                  {{ g.classes.map((c: any) => c.name || c.identity).join('、') }}
                  <span class="text-xs text-gray-500 font-normal">（{{ g.ownerName || '他人' }} 委托）</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-1">
                  <el-tag v-for="c in g.capLabels" :key="c" size="small" effect="plain">{{ c }}</el-tag>
                </div>
                <div class="mt-2 text-xs text-gray-500">到期 {{ fmt(g.expiresAt) }}</div>
              </div>
              <div class="flex gap-2 shrink-0">
                <el-button size="small" type="primary" @click="navigateTo('/classes')">进入班级</el-button>
                <el-button size="small" type="danger" plain @click="doLeave(g)">退出委托</el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showCreate" title="新建委托" width="560px">
      <el-form label-width="110px">
        <el-form-item label="委托哪些班">
          <el-select v-model="form.classIds" multiple filterable placeholder="选择班级" class="w-full">
            <el-option v-for="c in myClasses" :key="c._id" :label="c.name || c.identity" :value="c._id" />
          </el-select>
        </el-form-item>
        <el-form-item label="能做哪些事">
          <el-checkbox-group v-model="form.caps" class="flex flex-col gap-1">
            <el-checkbox v-for="c in caps" :key="c.key" :label="c.key" :disabled="c.key === 'view'">
              {{ c.label }}<span v-if="c.key === 'view'" class="text-xs text-gray-400">（必选）</span>
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="有效期">
          <el-select v-model="form.expiresInHours" class="w-full">
            <el-option label="1 小时" :value="1" />
            <el-option label="6 小时" :value="6" />
            <el-option label="24 小时" :value="24" />
            <el-option label="3 天" :value="72" />
            <el-option label="7 天" :value="168" />
            <el-option label="30 天" :value="720" />
          </el-select>
        </el-form-item>
        <el-form-item label="可用人数">
          <el-input-number v-model="form.maxUses" :min="0" :max="50" />
          <span class="ml-2 text-xs text-gray-500">0 表示不限</span>
        </el-form-item>
        <el-form-item label="允许改共享资源">
          <el-switch v-model="form.allowSharedEdit" />
          <div class="text-xs text-gray-500 mt-1 leading-relaxed">
            默认关闭：如果某个课表/时间表还被委托范围外的班在用，对方就不能改它（避免一改影响一片）。
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" maxlength="60" show-word-limit placeholder="例如：学弟顶班一周" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="() => doCreate()">生成链接</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showLink" title="委托链接已生成" width="560px">
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">
        把这条链接发给对方，对方<b>用自己的账号登录</b>后点「接受委托」即可。
      </p>
      <el-input v-model="createdLink" readonly>
        <template #append>
          <el-button @click="copyLink(createdToken)">复制</el-button>
        </template>
      </el-input>
      <p class="text-xs text-gray-500 mt-2">
        链接请勿外传。撤销委托或到期后，链接立即失效。
      </p>
      <template #footer>
        <el-button type="primary" @click="showLink = false">知道了</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDelegate" title="代登录码" width="520px">
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
        title="只显示这一次"
        description="关闭后就看不到明文了（库里只存哈希）。忘了就停用重发。撤销委托或停用后，已经进去的人立刻掉线。"
      />
      <template #footer>
        <el-button @click="copyText(delegateLink)">复制链接</el-button>
        <el-button @click="copyText(delegateCode)">复制码</el-button>
        <el-button type="primary" @click="showDelegate = false">知道了</el-button>
      </template>
    </el-dialog>

    <!-- 再验证：支持动态码与通行密钥，且浮在表单弹窗之上 -->
    <ReauthDialog ref="reauthRef" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "委托管理", protected: true });

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
    "发出委托等于把一部分操作权交给别人，需要先验证是你本人。",
    "需要重新验证",
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
    ElMessage.warning("先选一个班级");
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
    ElMessage.error(e?.data?.msg || "创建失败");
  } finally {
    creating.value = false;
  }
}

async function copyLink(token: string) {
  const link = `${location.origin}/g/${token}`;
  try {
    await navigator.clipboard.writeText(link);
    ElMessage.success("链接已复制");
  } catch {
    ElMessageBox.alert(link, "复制下面的链接");
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessageBox.alert(text, "复制下面的内容");
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
    ElMessage.error(e?.data?.msg || "生成失败");
  }
}

async function offDelegateCode(g: any) {
  try {
    await ElMessageBox.confirm(
      "停用后，用这个码进来的人会立即掉线；已经用账号接受的委托不受影响。",
      "停用代登录码",
      { type: "warning", confirmButtonText: "停用", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/grants/${g._id}/delegate-code`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    ElMessage.success("已停用");
    await fetchAll();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "停用失败");
  }
}

async function doRevoke(g: any) {  try {
    await ElMessageBox.confirm(
      "撤销后，被授权的人立即失去这些班级的操作权（已登录的会话也会在下次请求时被拒）。",
      "撤销委托",
      { type: "warning", confirmButtonText: "撤销", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/grants/${g._id}/revoke`, {
      method: "POST",
      headers: authHeaders(),
    });
    ElMessage.success("已撤销");
    await fetchAll();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "撤销失败");
  }
}

async function doLeave(g: any) {
  try {
    await ElMessageBox.confirm("退出后你会立即失去这些班级的访问权。", "退出委托", {
      type: "warning",
      confirmButtonText: "退出",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/grants/received/${g._id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    ElMessage.success("已退出");
    await fetchAll();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "操作失败");
  }
}

onMounted(async () => {
  await Promise.all([fetchAll(), fetchMeta()]);
});
</script>

