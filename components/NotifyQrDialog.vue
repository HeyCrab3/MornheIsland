<template>
  <el-dialog
    :model-value="modelValue"
    title="扫码发通知"
    width="420px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div v-loading="loading" class="qr-body">
      <div v-if="url" class="qr-img-wrap">
        <QrcodeVue :value="url" :size="200" level="M" render-as="svg" />
      </div>

      <div v-if="url" class="qr-meta">
        <span :class="['qr-dot', online ? 'is-on' : 'is-off']"></span>
        {{ online ? `${online} 台设备在线` : "当前没有设备在线" }}
        <span class="text-gray-400">/ 共 {{ deviceCount }} 台</span>
      </div>

      <el-input v-if="url" :model-value="url" readonly size="small" class="mt-3">
        <template #append>
          <el-button @click="copyUrl">复制</el-button>
        </template>
      </el-input>

      <el-alert type="warning" :closable="false" show-icon class="mt-3">
        <template #title>二维码请勿外传</template>
        拿到二维码的人不登录也能给本班大屏发通知。外传可能干扰正常教学秩序；
        怀疑泄露了就点「重置二维码」，旧码立刻失效。
      </el-alert>

      <el-alert v-if="!url && !loading" type="info" :closable="false" show-icon>
        <template #title>还没有二维码</template>
        生成后打印张贴在班牌上即可。
      </el-alert>
    </div>

    <template #footer>
      <el-button v-if="url" type="danger" plain @click="revoke">停用</el-button>
      <el-button v-if="url" :loading="rotating" @click="rotate">重置二维码</el-button>
      <el-button type="primary" @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import QrcodeVue from "qrcode.vue";

const props = defineProps<{ modelValue: boolean; classId: string; className?: string }>();
const emit = defineEmits<{ "update:modelValue": [boolean] }>();

const loading = ref(false);
const rotating = ref(false);
const url = ref("");
const online = ref(0);
const deviceCount = ref(0);

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

function apply(data: any) {
  url.value = data?.url || "";
  online.value = Number(data?.online) || 0;
  deviceCount.value = Number(data?.deviceCount) || 0;
}

async function load() {
  if (!props.classId) return;
  loading.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/notify-link/${props.classId}`, {
      headers: authHeaders(),
    });
    apply(res?.data);
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "获取二维码失败");
  } finally {
    loading.value = false;
  }
}

// 每次打开都重新拉一遍，顺便刷新在线设备数
watch(
  () => props.modelValue,
  (v) => {
    if (v) load();
  },
);

function copyUrl() {
  if (!url.value) return;
  navigator.clipboard.writeText(url.value).then(
    () => ElMessage.success("已复制链接"),
    () => ElMessage.error("复制失败"),
  );
}

async function rotate() {
  try {
    await ElMessageBox.confirm(
      "重置后旧二维码立刻失效，已经贴出去的码就扫不了了。确定要重置吗？",
      "重置二维码",
      { type: "warning", confirmButtonText: "重置", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  rotating.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/notify-link/${props.classId}/rotate`, {
      method: "POST",
      headers: authHeaders(),
    });
    apply(res?.data);
    ElMessage.success("已重置，请重新打印张贴");
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "重置失败");
  } finally {
    rotating.value = false;
  }
}

async function revoke() {
  try {
    await ElMessageBox.confirm(
      "停用后这个二维码变成无效页，需要时再重新生成。确定停用吗？",
      "停用二维码",
      { type: "warning", confirmButtonText: "停用", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/notify-link/${props.classId}/revoke`, {
      method: "POST",
      headers: authHeaders(),
    });
    url.value = "";
    online.value = 0;
    deviceCount.value = 0;
    ElMessage.success("已停用");
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "停用失败");
  }
}
</script>

<style scoped>
.qr-body {
  min-height: 80px;
}
.qr-img-wrap {
  display: flex;
  justify-content: center;
  padding: 6px 0 12px;
  background: #fff;
  border-radius: 10px;
}
.qr-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.qr-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.qr-dot.is-on {
  background: #10b981;
}
.qr-dot.is-off {
  background: #ef4444;
}
</style>
