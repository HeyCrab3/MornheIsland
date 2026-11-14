<template>
  <div>
    <div class="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">档案体检</h1>
        <p class="text-sm text-gray-500">
          检查每个班级的「班级 → 课表 → 时间表 → 科目」引用链是否自洽，把界面上看不出来的问题暴露出来。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <el-button :loading="fixingAll" @click="fixAllNullGuid">批量修复过期课表</el-button>
        <el-button :loading="loading" @click="load">重新检查</el-button>
      </div>
    </div>

    <el-alert type="warning" :closable="false" show-icon class="mb-4 max-w-4xl">
      <template #title>课表里的 null Guid 会让客户端直接崩</template>
      空课时如果存成 <code>"SubjectId": null</code>，ClassIsland 反序列化时会抛异常
      （它的 <code>SubjectId</code> 是非空 Guid，转换器只容忍 <code>""</code>）。
      正确的空值应该是 <code>00000000-0000-0000-0000-000000000000</code>。
      下面按班级体检能发现并修复；没有挂到班级上的孤儿课表用右上角「批量修复过期课表」处理。
    </el-alert>

    <el-alert type="info" :closable="false" show-icon class="mb-4 max-w-4xl">
      <template #title>为什么需要体检</template>
      档案库里显示"已关联"的，看的是班级自己的字段；而客户端真正读的是<b>课表资源里记录的那一份</b>。
      两者指向不同资源时，界面一切正常，但 ClassIsland 会报「未配置时间表」或者下发一份空白时间表。
      这类问题只能靠比对引用链发现。
    </el-alert>

    <el-alert v-if="schoolName" type="info" :closable="false" show-icon class="mb-4 max-w-4xl">
      <template #title>正在检查学校「{{ schoolName }}」的全部班级</template>
      这里能看到同校其他账号的班级，但<b>只有自己创建的班</b>才给「修复」按钮 ——
      别人的班只能提示问题，修复要由那位同学的账号来做。
    </el-alert>

    <div v-if="summary" class="flex flex-wrap gap-3 mb-4">
      <div class="stat-card">
        <div class="stat-num">{{ summary.classCount }}</div>
        <div class="stat-label">班级总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" :class="summary.issueClassCount ? 'text-amber-500' : ''">
          {{ summary.issueClassCount }}
        </div>
        <div class="stat-label">有问题</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" :class="summary.errorCount ? 'text-red-500' : ''">{{ summary.errorCount }}</div>
        <div class="stat-label">错误</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" :class="summary.warnCount ? 'text-amber-500' : ''">{{ summary.warnCount }}</div>
        <div class="stat-label">警告</div>
      </div>
    </div>

    <el-card v-loading="loading" class="max-w-4xl">
      <template #header>
        <span class="font-medium">检查结果</span>
      </template>

      <el-empty
        v-if="!loading && !rows.length"
        :description="failed ? '检查失败，请重试' : '全部班级体检通过，引用链没有问题'"
        :image-size="90"
      />

      <div v-for="row in rows" :key="row.classId" class="issue-row">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="min-w-0">
            <div class="font-medium truncate">
              {{ row.className || "（未命名班级）" }}
              <span v-if="row.identity" class="text-xs text-gray-400 ml-1">#{{ row.identity }}</span>
              <el-tag v-if="row.mine === false" size="small" type="info" effect="plain" class="ml-1">
                别人的班
              </el-tag>
            </div>
            <ul class="mt-2 space-y-1.5">
              <li v-for="(it, i) in row.issues" :key="i" class="flex items-start gap-2 text-sm">
                <el-tag
                  size="small"
                  :type="it.level === 'error' ? 'danger' : 'warning'"
                  effect="plain"
                  class="shrink-0 mt-0.5"
                >
                  {{ it.level === "error" ? "错误" : "警告" }}
                </el-tag>
                <span class="leading-relaxed">{{ it.message }}</span>
              </li>
            </ul>
          </div>
          <el-button
            v-if="row.canFix"
            size="small"
            type="primary"
            plain
            :loading="fixing === row.classId"
            @click="fix(row)"
          >
            修复
          </el-button>
        </div>
      </div>
    </el-card>

    <div class="max-w-4xl mt-3 text-xs text-gray-400 leading-relaxed">
      自动修复只会把两边统一到<b>真正有内容的那一份</b>（空壳永远不会被选成目标），
      并且同时改班级字段和课表内部的引用，改完再体检一次就干净了。
      时间表本身是空壳、科目被删、课时数对不上这类属于<b>数据内容</b>问题，需要回到档案库重做，
      自动改只会把错的内容下发得更整齐。
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "档案体检", protected: true });

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const loading = ref(false);
const fixing = ref<string>("");
const fixingAll = ref(false);
const rows = ref<any[]>([]);
const summary = ref<any>(null);
const failed = ref(false);

/**
 * 批量修我名下所有课表资源里的 null Guid。
 * 单独一个入口是因为体检按班级遍历，没挂班级的孤儿课表不会出现在列表里 ——
 * 而线上这类资源不少。
 */
async function fixAllNullGuid() {
  try {
    await ElMessageBox.confirm(
      "会把我名下所有课表资源里的 null Guid 统一修成 00000000-0000-0000-0000-000000000000，" +
        "并同时检查时间表。这个操作是幂等的，不会改动其它字段。继续？",
      "批量修复过期课表",
      { type: "warning", confirmButtonText: "开始修复", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  fixingAll.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/health/fix-null-guid", {
      method: "POST",
      headers: authHeaders(),
    });
    const d = res?.data || {};
    if (!d.fixedFields) {
      ElMessage.success(`检查了 ${d.scannedClassPlans ?? 0} 份课表、${d.scannedTimeLayouts ?? 0} 份时间表，没有发现问题`);
    } else {
      ElMessage.success(
        `已修复：课表 ${d.fixedClassPlans} 份、时间表 ${d.fixedTimeLayouts} 份，共 ${d.fixedFields} 处`,
      );
      await load();
    }
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "修复失败");
  } finally {
    fixingAll.value = false;
  }
}

// 从学校详情页进来时带 ?schoolId=，作用域扩到整所学校
const route = useRoute();
const schoolId = computed(() => String(route.query.schoolId ?? "").trim());
const schoolName = ref("");

async function load() {
  loading.value = true;
  failed.value = false;
  try {
    const res: any = await $fetch("/api/v1/console/ci/health/resources", {
      headers: authHeaders(),
      query: schoolId.value ? { schoolId: schoolId.value } : {},
    });
    rows.value = Array.isArray(res?.data?.classes) ? res.data.classes : [];
    summary.value = res?.data?.summary || null;
    schoolName.value = res?.data?.schoolName || "";
  } catch (e: any) {
    failed.value = true;
    rows.value = [];
    summary.value = null;
    ElMessage.error(e?.data?.msg || "体检失败");
  } finally {
    loading.value = false;
  }
}

async function fix(row: any) {
  fixing.value = row.classId;
  try {
    const res: any = await $fetch("/api/v1/console/ci/health/fix", {
      method: "POST",
      headers: authHeaders(),
      body: { classId: row.classId },
    });
    const fixed: string[] = res?.data?.fixed || [];
    if (fixed.length) {
      ElMessage.success(`已修复：${fixed.join(", ")}`);
      await load();
    } else {
      ElMessage.info(res?.data?.message || "没有可自动修复的项");
    }
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "修复失败");
  } finally {
    fixing.value = "";
  }
}

onMounted(load);
</script>

<style scoped>
.stat-card {
  min-width: 96px;
  padding: 10px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}
.stat-num {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
}
.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}
.issue-row {
  padding: 14px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.issue-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
</style>
