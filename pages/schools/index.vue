<template>
  <div>
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">学校（机构）</h1>
        <p class="text-sm text-gray-500">
          同一所学校的班级聚在一起：共享时间表/课程表/设置/策略，设备和通知也能在校内统一处理。
        </p>
      </div>
      <el-button :loading="loading" @click="load">刷新</el-button>
    </div>

    <el-alert type="info" :closable="false" show-icon class="mb-4 max-w-4xl">
      <template #title>学校是怎么来的</template>
      不是自动建的，也<b>不会按机构名自动合并别人的学校</b>。在「班级管理」里，同机构有
      <b>2 个及以上班级</b> 时会出现「建议升级为学校维度聚合管理」的提示，点一下才会建出学校并把共享资源带进来。
      <br />
      要进别人已经建好的学校，只有一条路：让该校管理员在「学校 → 成员」里生成<b>邀请链接</b>，你登录后点链接加入。
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

      <el-empty v-else :image-size="100" description="还没有学校。去班级管理看看有没有可以升级的机构">
        <el-button type="primary" @click="navigateTo('/classes')">去班级管理</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { OfficeBuilding } from "@element-plus/icons-vue";

definePageMeta({ title: "学校", protected: true });

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const loading = ref(false);
const schools = ref<any[]>([]);

function roleLabel(role: string) {
  return role === "owner" ? "创建者" : role === "admin" ? "管理员" : "成员";
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
    ElMessage.error(e?.data?.msg || "读取学校列表失败");
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
