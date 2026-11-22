<template>
  <div class="max-w-xl">
    <div class="flex items-center gap-3 mb-5">
      <el-button circle text @click="navigateTo('/schools')">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <h1 class="text-xl font-semibold">{{ $t('pages.schools.join.token.joinSchool') }}</h1>
    </div>

    <el-card v-loading="loading">
      <template #header>
        <span class="font-medium">{{ $t('pages.schools.join.token.extra.inviteConfirm') }}</span>
      </template>

      <div v-if="state === 'invalid'" class="py-6 text-center">
        <div class="text-red-500 font-medium mb-2">{{ errorMsg }}</div>
        <div class="text-sm text-gray-400 mb-4">
          {{ $t('pages.schools.join.token.extra.invalidHint') }}
        </div>
        <el-button @click="navigateTo('/schools')">{{ $t('pages.schools.join.token.extra.backToSchools') }}</el-button>
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
          <template #title>{{ $t('pages.schools.join.token.extra.alreadyMemberTitle') }}</template>
          {{ $t('pages.schools.join.token.extra.currentRolePrefix') }}{{ roleLabel(info.myRole) }}{{ $t('pages.schools.join.token.extra.attachOwnClassesHint') }}
        </el-alert>

        <el-alert v-else type="warning" :closable="false" show-icon class="mb-4">
          <template #title>{{ $t('pages.schools.join.token.extra.confirmBeforeJoin') }}</template>
          {{ $t('pages.schools.join.token.extra.joinBenefits') }}
          <b v-if="info.role === 'member'">{{ $t('pages.schools.join.token.extra.memberReadOnly') }}</b>{{ $t('pages.schools.join.token.extra.memberReadOnlySuffix') }}
          {{ $t('pages.schools.join.token.extra.doNotShareLink') }}
        </el-alert>

        <div v-if="classes.length" class="mb-4">
          <div class="text-sm font-medium mb-2">{{ $t('pages.schools.join.token.extra.attachOwnClasses') }}</div>
          <el-checkbox-group v-model="selected" class="flex flex-col gap-2">
            <el-checkbox v-for="c in classes" :key="c.id" :value="c.id" class="!mr-0">
              {{ c.name || $t('pages.schools.join.token.unnamed') }}
              <span class="text-xs text-gray-400 ml-1">#{{ c.identity }}</span>
            </el-checkbox>
          </el-checkbox-group>
        </div>
        <div v-else class="text-sm text-gray-400 mb-4">
          {{ $t('pages.schools.join.token.extra.noClassesToAttach') }}
        </div>

        <div class="flex gap-2">
          <el-button type="primary" :loading="accepting" @click="accept">
            {{ info.alreadyMember ? $t('pages.schools.join.token.attachClass') : $t('pages.schools.join.token.join') }}
          </el-button>
          <el-button @click="navigateTo('/schools')">{{ $t('reauth.cancel') }}</el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, OfficeBuilding } from "@element-plus/icons-vue";

definePageMeta({ title: "加入学校", protected: true });

const { t } = useI18n();

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
  return role === "owner" ? t("pages.schools.index.creator") : role === "admin" ? t("pages.schools.index.admin") : t("pages.schools.index.member");
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
    errorMsg.value = e?.data?.msg || t("pages.schools.join.token.invalidInviteLink");
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
    ElMessage.error(e?.data?.msg || t("pages.schools.join.token.joinFailed"));
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
