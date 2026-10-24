<template>
  <div class="max-w-xl">
    <div class="flex items-center gap-3 mb-5">
      <el-button circle text @click="navigateTo('/schools')">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <h1 class="text-xl font-semibold">加入学校</h1>
    </div>

    <el-card v-loading="loading">
      <template #header>
        <span class="font-medium">邀请确认</span>
      </template>

      <div v-if="state === 'invalid'" class="py-6 text-center">
        <div class="text-red-500 font-medium mb-2">{{ errorMsg }}</div>
        <div class="text-sm text-gray-400 mb-4">
          邀请链接可能已过期、被吊销或用完使用次数。请联系该校管理员重新生成。
        </div>
        <el-button @click="navigateTo('/schools')">返回学校列表</el-button>
      </div>

      <template v-else-if="info">
        <div class="flex items-center gap-3 mb-4">
          <div class="join-icon">
            <el-icon :size="20"><OfficeBuilding /></el-icon>
          </div>
          <div class="min-w-0">
            <div class="font-semibold truncate">{{ info.school.name }}</div>
            <div class="text-xs text-gray-400 mt-0.5">
              已有 {{ info.classCount }} 个班级 ·
              加入后身份为 <b>{{ roleLabel(info.role) }}</b>
            </div>
          </div>
        </div>

        <el-alert v-if="info.alreadyMember" type="info" :closable="false" show-icon class="mb-4">
          <template #title>你已经是这所学校的成员</template>
          当前身份：{{ roleLabel(info.myRole) }}。可以用下面的选项把自己的班级挂进来。
        </el-alert>

        <el-alert v-else type="warning" :closable="false" show-icon class="mb-4">
          <template #title>加入前请确认</template>
          加入后你能使用学校共享的时间表/课程表/设置/策略。
          <b v-if="info.role === 'member'">普通成员只能只读使用这些资源</b>，不能修改别人共享的内容。
          邀请链接不要外传，拿到它的人都能进来。
        </el-alert>

        <div v-if="classes.length" class="mb-4">
          <div class="text-sm font-medium mb-2">把自己的班级一并挂进来（可选）</div>
          <el-checkbox-group v-model="selected" class="flex flex-col gap-2">
            <el-checkbox v-for="c in classes" :key="c.id" :value="c.id" class="!mr-0">
              {{ c.name || "（未命名）" }}
              <span class="text-xs text-gray-400 ml-1">#{{ c.identity }}</span>
            </el-checkbox>
          </el-checkbox-group>
        </div>
        <div v-else class="text-sm text-gray-400 mb-4">
          你名下没有可以挂入的班级（没填机构或已在其他学校）。
        </div>

        <div class="flex gap-2">
          <el-button type="primary" :loading="accepting" @click="accept">
            {{ info.alreadyMember ? "挂入班级" : "加入" }}
          </el-button>
          <el-button @click="navigateTo('/schools')">取消</el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, OfficeBuilding } from "@element-plus/icons-vue";

definePageMeta({ title: "加入学校", protected: true });

const route = useRoute();
const token = String(route.params.token ?? "");
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const loading = ref(false);
const accepting = ref(false);
const state = ref<"ok" | "invalid">("ok");
const errorMsg = ref("");
const info = ref<any>(null);
const classes = ref<any[]>([]);
const selected = ref<string[]>([]);

function roleLabel(role: string) {
  return role === "owner" ? "创建者" : role === "admin" ? "管理员" : "成员";
}

async function load() {
  loading.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/school-invites/${token}`, {
      headers: authHeaders(),
    });
    info.value = res?.data || null;
    await loadMyClasses();
  } catch (e: any) {
    state.value = "invalid";
    errorMsg.value = e?.data?.msg || "邀请链接无效";
  } finally {
    loading.value = false;
  }
}

async function loadMyClasses() {
  try {
    const res: any = await $fetch("/api/v1/console/ci/class/list", { headers: authHeaders() });
    const list: any[] = Array.isArray(res?.data) ? res.data : [];
    classes.value = list
      .filter((c) => !c.schoolId)
      .map((c) => ({ id: String(c._id), name: c.name || "", identity: c.identity || "" }));
  } catch {
    classes.value = [];
  }
}

async function accept() {
  accepting.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/school-invites/${token}/accept`, {
      method: "POST",
      headers: authHeaders(),
      body: { classIds: selected.value },
    });
    const d = res?.data;
    ElMessage.success(
      `${d?.alreadyMember ? "已挂入" : "已加入"}「${d?.schoolName || "学校"}」` +
        (d?.linked ? `，挂入 ${d.linked} 个班级` : ""),
    );
    navigateTo(`/schools/${d?.schoolId}`);
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "加入失败");
  } finally {
    accepting.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.join-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
  flex-shrink: 0;
}
</style>
