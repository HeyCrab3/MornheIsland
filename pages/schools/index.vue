<template>
  <div>
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">{{ $t('pages.schools.index.extra.pageTitle') }}</h1>
        <p class="text-sm text-gray-500">
          同一所学校的班级聚在一起：共享时间表/课程表/设置/策略，设备和通知也能在校内统一处理。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <el-button type="primary" @click="createVisible = true">
          <el-icon class="mr-1"><Plus /></el-icon>{{ $t('pages.schools.index.createSchool') }}
        </el-button>
        <el-button :loading="loading" @click="load">{{ $t('pages.schools.index.extra.refresh') }}</el-button>
      </div>
    </div>

    <el-alert type="info" :closable="false" show-icon class="mb-4 max-w-4xl">
      <template #title>{{ $t('pages.schools.index.extra.howSchoolsWork') }}</template>
      两条路：① 上面直接<b>创建学校</b>（只有 1 个班、或想先建好再挂班都行）；
      ② 在「班级管理」里同机构有 <b>2 个及以上班级</b> 时会出现「建议升级为学校维度聚合管理」的提示，点一下建校并把共享资源带进来。
      <br />
      两种方式都<b>不会按机构名自动合并别人的学校</b>。要进别人已经建好的学校，只有一条路：让该校管理员在「学校 → 成员」里生成<b>邀请链接</b>，你登录后点链接加入。
      没填机构的班级不会被处理，保持个人模式。
    </el-alert>

    <div v-loading="loading" class="min-h-40">
      <div v-if="schools.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <el-card
          v-for="s in schools"
          :key="s.id"
          shadow="hover"
          class="cursor-pointer"
          @click="openSchool(s.id)"
        >
          <div class="flex items-start gap-3">
            <div class="school-icon">
              <el-icon :size="20"><OfficeBuilding /></el-icon>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 min-w-0">
                <div class="font-semibold text-base truncate">{{ s.name }}</div>
                <el-tag size="small" :type="roleType(s.role)" effect="plain" class="shrink-0">
                  {{ roleLabel(s.role) }}
                </el-tag>
              </div>
              <div class="text-xs text-gray-400 mt-1">
                {{ s.classCount }} 个班级 · {{ s.deviceCount }} 台设备
                <span v-if="s.onlineDeviceCount" class="text-emerald-500">
                  （{{ s.onlineDeviceCount }} 在线）
                </span>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <el-empty v-else :image-size="100" :description="$t('pages.schools.index.noSchools')">
        <el-button type="primary" @click="createVisible = true">{{ $t('pages.schools.index.createSchool') }}</el-button>
        <el-button @click="navigateTo('/classes')">{{ $t('pages.schools.index.extra.goToClasses') }}</el-button>
      </el-empty>
    </div>

    <!-- 手动创建学校 -->
    <el-dialog v-model="createVisible" :title="$t('pages.schools.index.createSchool')" width="420px">
      <el-alert type="info" :closable="false" show-icon class="mb-3">
        创建后你就是这所学校的<b>创建者</b>，可以生成邀请链接让其他电教委员加入，
        也能把学校级的资源统一分配给各班。
      </el-alert>
      <el-input
        v-model="createName"
        maxlength="60"
        show-word-limit
        :placeholder="$t('pages.schools.index.schoolFullNameHint')"
        @keyup.enter="doCreate"
      />
      <div class="text-xs text-gray-400 mt-2">
        如果这个名字已经被其他账号建过，会让你走邀请链接加入，不会把两所学校合并。
      </div>
      <template #footer>
        <el-button @click="createVisible = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="creating" :disabled="!createName.trim()" @click="doCreate">
          {{ $t('pages.subaccounts.create') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { OfficeBuilding, Plus } from "@element-plus/icons-vue";

definePageMeta({ title: "学校", protected: true });

const { t } = useI18n();

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const loading = ref(false);
const schools = ref<any[]>([]);

// ── 手动创建 ──
const createVisible = ref(false);
const createName = ref("");
const creating = ref(false);

async function doCreate() {
  const name = createName.value.trim();
  if (!name) return;
  creating.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/schools", {
      method: "POST",
      headers: authHeaders(),
      body: { name },
    });
    ElMessage.success(`已创建「${res?.data?.schoolName}」`);
    createVisible.value = false;
    createName.value = "";
    navigateTo(`/schools/${res?.data?.schoolId}`);
  } catch (e: any) {
    const d = e?.data;
    if (d?.data?.alreadyMember && d?.data?.schoolId) {
      // 名字是我自己的学校 → 直接带过去，不算失败
      ElMessage.info(d.msg);
      createVisible.value = false;
      navigateTo(`/schools/${d.data.schoolId}`);
      return;
    }
    if (d?.data?.needInvite) {
      ElMessageBox.alert(d.msg, t("pages.schools.index.schoolAlreadyExists"), { type: "warning", confirmButtonText: t("composables.useciresource.gotIt") }).catch(() => {});
      return;
    }
    ElMessage.error(d?.msg || t("components.resourcelist.createFailed"));
  } finally {
    creating.value = false;
  }
}

function roleLabel(role: string) {
  return role === "owner" ? t("pages.schools.index.creator") : role === "admin" ? t("pages.schools.index.admin") : t("pages.schools.index.member");
}
function roleType(role: string) {
  return role === "owner" ? "warning" : role === "admin" ? "success" : "info";
}

async function load() {
  loading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/schools", { headers: authHeaders() });
    schools.value = Array.isArray(res?.data) ? res.data : [];
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("pages.schools.index.loadSchoolsFailed"));
  } finally {
    loading.value = false;
  }
}

function openSchool(id: string) {
  navigateTo(`/schools/${id}`);
}

onMounted(load);
</script>

<style scoped>
.school-icon {
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
