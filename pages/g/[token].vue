<template>
  <div class="min-h-[70vh] flex items-start justify-center py-10 px-4">
    <div class="w-full max-w-xl rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <div v-if="loading" class="py-10 text-center text-gray-400">正在读取委托信息…</div>

      <template v-else-if="error">
        <el-result icon="warning" :title="error.title" :sub-title="error.detail">
          <template #extra>
            <el-button type="primary" @click="navigateTo('/classes')">返回班级管理</el-button>
          </template>
        </el-result>
      </template>

      <template v-else-if="info">
        <h2 class="text-lg font-semibold mb-1">班级运维委托</h2>
        <p class="text-sm text-gray-500 mb-4">
          <b>{{ info.ownerName || "某位用户" }}</b> 邀请你协助管理下面的班级。
        </p>

        <div class="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 mb-4">
          <div class="text-xs text-gray-500 mb-1">委托的班级</div>
          <div class="flex flex-wrap gap-1">
            <el-tag v-for="c in info.classes" :key="c._id">{{ c.name || c.identity }}</el-tag>
          </div>
        </div>

        <div class="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 mb-4">
          <div class="text-xs text-gray-500 mb-1">你可以做的事</div>
          <ul class="text-sm space-y-0.5">
            <li v-for="c in info.capLabels" :key="c">· {{ c }}</li>
          </ul>
        </div>

        <div class="text-xs text-gray-500 mb-4">
          有效至 {{ fmt(info.expiresAt) }} · 已接受 {{ info.usedCount }}/{{ info.maxUses || "不限" }} 人
          <span v-if="info.note"> · 备注：{{ info.note }}</span>
        </div>

        <div v-if="info.isMine" class="text-sm text-amber-600 mb-3">
          这是你自己发出的委托，把链接发给需要的人即可。
        </div>

        <el-alert
          type="info"
          :closable="false"
          show-icon
          class="mb-4"
          title="接受后你就是操作记录上的那个人"
          description="你对这些班级做的每一次修改都会记在你的账号名下。请勿把本链接转发给他人。"
        />

        <div class="flex gap-2 justify-end">
          <el-button @click="navigateTo('/classes')">暂不接受</el-button>
          <el-button
            v-if="!info.isMine"
            type="primary"
            :loading="accepting"
            @click="doAccept"
          >
            {{ info.accepted ? "已接受，前往班级" : "接受委托" }}
          </el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "接受委托", protected: true });

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
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
      error.value = { title: "委托不存在", detail: "链接可能已失效，请让邀请你的人重新生成。" };
    }
  } catch (e: any) {
    const code = e?.data?.code || e?.statusCode;
    if (code === 404) {
      error.value = { title: "委托不存在", detail: "链接可能已被删除，请让邀请你的人重新生成。" };
    } else if (code === 410) {
      error.value = { title: "委托已失效", detail: "这份委托已过期或被撤销。" };
    } else if (code === 400) {
      error.value = { title: "链接格式不正确", detail: "请检查链接是否被聊天软件截断。" };
    } else {
      error.value = { title: "读取失败", detail: e?.data?.msg || "请稍后重试。" };
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
    ElMessage.success("已接受委托，现在可以在班级管理里看到这些班");
    navigateTo("/classes");
  } catch (e: any) {
    const code = e?.data?.code;
    if (code === 410) {
      error.value = { title: "委托已失效", detail: "这份委托已过期或被撤销。" };
    } else if (code === 409) {
      ElMessage.error(e?.data?.msg || "名额已满");
    } else if (code === 400) {
      ElMessage.warning(e?.data?.msg || "无法接受这份委托");
    } else {
      ElMessage.error(e?.data?.msg || "接受失败");
    }
  } finally {
    accepting.value = false;
  }
}

onMounted(load);
</script>
