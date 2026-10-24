<template>
  <div>
    <div class="flex items-center gap-3 mb-5 flex-wrap">
      <el-button circle text @click="navigateTo('/schools')">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-semibold truncate">{{ school?.name || "学校" }}</h1>
          <el-tag v-if="data" size="small" :type="roleType(data.myRole)" effect="plain">
            {{ roleLabel(data.myRole) }}
          </el-tag>
        </div>
        <div v-if="school?.aliases?.length" class="text-xs text-gray-400 mt-0.5 truncate">
          历史名称：{{ school.aliases.join(" · ") }}
        </div>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <el-button v-if="data?.canManage" size="small" @click="openRename">改名</el-button>
        <el-button :loading="loading" size="small" @click="load">刷新</el-button>
      </div>
    </div>

    <div v-if="data" class="flex flex-wrap gap-3 mb-5">
      <div class="stat-card">
        <div class="stat-num">{{ data.summary.classCount }}</div>
        <div class="stat-label">班级</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" :class="data.summary.unconfiguredCount ? 'text-amber-500' : ''">
          {{ data.summary.unconfiguredCount }}
        </div>
        <div class="stat-label">资源没配全的班</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ data.summary.memberCount }}</div>
        <div class="stat-label">成员</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" :class="data.summary.onlineDeviceCount ? 'text-emerald-500' : ''">
          {{ data.summary.onlineDeviceCount }}<span class="text-sm text-gray-400">/{{ data.summary.deviceCount }}</span>
        </div>
        <div class="stat-label">在线设备</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ data.summary.schoolResourceCount }}</div>
        <div class="stat-label">学校级资源</div>
      </div>
    </div>

    <el-tabs v-model="tab" class="max-w-5xl">
      <!-- ── 班级 ── -->
      <el-tab-pane label="班级" name="classes">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-gray-500">这里列出挂在当前学校的班级</span>
          <el-button v-if="data?.canManage" size="small" type="primary" plain @click="openLinkClasses">
            挂入更多班级
          </el-button>
        </div>
        <el-table :data="data?.classes || []" size="small" empty-text="还没有班级">
          <el-table-column prop="name" label="班级" min-width="140" show-overflow-tooltip />
          <el-table-column prop="identity" label="标识" width="110" show-overflow-tooltip />
          <el-table-column label="资源" min-width="150">
            <template #default="{ row }">
              <el-tag v-if="!row.missing.length" size="small" type="success" effect="plain">完整</el-tag>
              <span v-else class="text-xs text-amber-500">缺 {{ row.missing.join("、") }}</span>
            </template>
          </el-table-column>
          <el-table-column label="设备" width="100">
            <template #default="{ row }">
              <span :class="row.onlineCount ? 'text-emerald-500' : 'text-gray-400'">
                {{ row.onlineCount }}/{{ row.deviceCount }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170" align="right">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="navigateTo(`/classes/${row.id}`)">详情</el-button>
              <el-button size="small" text @click="openQr(row)">二维码</el-button>
              <el-button
                v-if="data?.canManage"
                size="small"
                text
                type="danger"
                @click="unlink(row)"
              >移出</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ── 资源 ── -->
      <el-tab-pane label="资源" name="resources">
        <div class="text-sm text-gray-500 mb-3">
          学校级资源全校班级都能选；仍是个人资源的，只有创建者能改，建议共享给学校统一管理。
        </div>
        <el-table :data="data?.resources || []" size="small" empty-text="还没有资源">
          <el-table-column prop="label" label="类型" width="90" />
          <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
          <el-table-column label="归属" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.schoolLevel ? 'success' : 'info'" effect="plain">
                {{ row.schoolLevel ? "学校" : "个人" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="使用班级" width="90">
            <template #default="{ row }">{{ row.usedByCount }}</template>
          </el-table-column>
          <el-table-column prop="version" label="版本" width="70" />
          <el-table-column label="操作" width="110" align="right">
            <template #default="{ row }">
              <el-button
                v-if="!row.schoolLevel && data?.canManage"
                size="small"
                text
                type="primary"
                @click="shareResource(row)"
              >共享</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ── 设备 ── -->
      <el-tab-pane label="设备" name="devices">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span class="text-sm text-gray-500">
            这些设备是通过班级归属自动聚合的，不额外写数据；只有在线设备能实时下发。
          </span>
          <div class="flex gap-2">
            <el-button
              size="small"
              :disabled="!selectedOnline.length"
              @click="notifyVisible = true"
            >批量推送通知{{ selectedOnline.length ? `（${selectedOnline.length}）` : "" }}</el-button>
            <el-button size="small" @click="selectAllOnline">全选在线</el-button>
          </div>
        </div>
        <el-table
          ref="deviceTable"
          :data="data?.devices || []"
          size="small"
          empty-text="还没有设备"
          @selection-change="onSelectionChange"
        >
          <el-table-column type="selection" width="42" :selectable="(row: any) => row.online" />
          <el-table-column label="设备" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="font-mono text-xs">{{ row.cuid.slice(0, 8) }}…</span>
            </template>
          </el-table-column>
          <el-table-column prop="className" label="班级" min-width="120" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.online ? 'success' : 'info'" effect="plain">
                {{ row.online ? "在线" : "离线" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lastSeen" label="最后在线" width="170" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>

      <!-- ── 成员 ── -->
      <el-tab-pane label="成员" name="members">
        <div class="text-sm text-gray-500 mb-3">
          学校有多人时，<b>创建者和管理员</b>能改学校级资源，普通成员只读 —— 免得统一的时间表被随手改掉。
        </div>

        <div v-if="data?.canManage" class="invite-box">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div class="font-medium text-sm">邀请链接</div>
              <div class="text-xs text-gray-500 mt-0.5">
                对方登录后点链接即可加入。<b>不要公开发出去</b> —— 拿到链接的人都能进校。
              </div>
            </div>
            <div class="flex items-center gap-2">
              <el-select v-model="inviteRole" size="small" style="width: 100px">
                <el-option label="成员" value="member" />
                <el-option v-if="data?.myRole === 'owner'" label="管理员" value="admin" />
              </el-select>
              <el-button size="small" type="primary" :loading="inviteCreating" @click="createInvite">
                生成链接
              </el-button>
            </div>
          </div>

          <div v-if="invites.length" class="mt-3 flex flex-col gap-2">
            <div v-for="inv in invites" :key="inv.id" class="invite-row">
              <div class="min-w-0 flex-1">
                <div class="text-xs font-mono truncate">{{ inv.url }}</div>
                <div class="text-[11px] text-gray-400 mt-0.5">
                  {{ roleLabel(inv.role) }} ·
                  用 {{ inv.uses }}/{{ inv.maxUses }} 次 ·
                  {{ inv.expired ? "已过期" : `到期 ${inv.expiresAt?.slice(0, 16).replace("T", " ")}` }}
                  <span v-if="inv.revoked" class="text-red-400"> · 已吊销</span>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <el-button v-if="inv.usable" size="small" text type="primary" @click="copyInvite(inv.url)">
                  复制
                </el-button>
                <el-button
                  v-if="!inv.revoked"
                  size="small"
                  text
                  type="danger"
                  @click="revokeInvite(inv)"
                >吊销</el-button>
              </div>
            </div>
          </div>
          <el-empty v-else :image-size="50" description="还没有邀请链接" class="!py-2" />
        </div>

        <el-table :data="data?.members || []" size="small" empty-text="还没有成员" class="mt-3">
          <el-table-column label="账号" min-width="160">
            <template #default="{ row }">
              {{ row.userName }}
              <el-tag v-if="row.isMe" size="small" effect="plain" class="ml-1">我</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="角色" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="roleType(row.role)" effect="plain">{{ roleLabel(row.role) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="classCount" label="班级数" width="90" />
          <el-table-column
            v-if="data?.myRole === 'owner'"
            label="操作"
            width="110"
            align="right"
          >
            <template #default="{ row }">
              <el-dropdown v-if="!row.isMe && row.role !== 'owner'" @command="(r: string) => setRole(row, r)">
                <el-button size="small" text type="primary">改角色</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="admin">设为管理员</el-dropdown-item>
                    <el-dropdown-item command="member">设为成员</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 改名 -->
    <el-dialog v-model="renameVisible" title="修改学校名称" width="400px">
      <el-input v-model="renameDraft" maxlength="60" show-word-limit placeholder="学校名称" />
      <div class="text-xs text-gray-400 mt-2">
        改名不会影响任何班级和资源，只是换个显示名；旧名字会留作历史名称。
      </div>
      <template #footer>
        <el-button @click="renameVisible = false">取消</el-button>
        <el-button type="primary" :loading="renaming" @click="doRename">保存</el-button>
      </template>
    </el-dialog>

    <!-- 挂入班级 -->
    <el-dialog v-model="linkVisible" title="挂入更多班级" width="480px">
      <div class="text-sm text-gray-500 mb-3">只列出你名下、且还没有加入其他学校的班级。</div>
      <el-checkbox-group v-model="linkSelected" class="flex flex-col gap-2">
        <el-checkbox v-for="c in linkableClasses" :key="c.id" :value="c.id" class="!mr-0">
          {{ c.name || "（未命名）" }}
          <span class="text-xs text-gray-400 ml-1">#{{ c.identity }}</span>
        </el-checkbox>
      </el-checkbox-group>
      <el-empty v-if="!linkable && !linkLoading" :image-size="60" description="没有可挂入的班级" />
      <template #footer>
        <el-button @click="linkVisible = false">取消</el-button>
        <el-button type="primary" :loading="linking" :disabled="!linkSelected.length" @click="doLink">
          挂入
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量推送通知 -->
    <el-dialog v-model="notifyVisible" title="批量推送通知" width="440px">
      <el-input
        v-model="notifyMessage"
        type="textarea"
        :rows="3"
        maxlength="200"
        show-word-limit
        placeholder="通知内容"
      />
      <div class="flex items-center gap-4 mt-3">
        <el-checkbox v-model="notifyEmergency">紧急</el-checkbox>
        <el-checkbox v-model="notifyTopmost">置顶</el-checkbox>
        <el-checkbox v-model="notifySound">提示音</el-checkbox>
      </div>
      <div class="flex items-center gap-3 mt-3">
        <span class="text-[13px] text-gray-500 shrink-0">显示时长</span>
        <el-slider v-model="notifyDuration" :min="0" :max="120" :step="10" class="flex-1" />
        <span class="text-[13px] text-gray-600 w-16 text-right">
          {{ notifyDuration ? `${notifyDuration} 秒` : "不关闭" }}
        </span>
      </div>
      <div class="text-xs text-gray-400 mt-2">将发给已选中的 {{ selectedOnline.length }} 台在线设备。</div>
      <template #footer>
        <el-button @click="notifyVisible = false">取消</el-button>
        <el-button type="primary" :loading="notifying" :disabled="!notifyMessage.trim()" @click="doNotify">
          发送
        </el-button>
      </template>
    </el-dialog>

    <NotifyQrDialog v-model="qrVisible" :class-id="qrClassId" />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft } from "@element-plus/icons-vue";

definePageMeta({ title: "学校详情", protected: true });

const route = useRoute();
const id = String(route.params.id ?? "");

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const loading = ref(false);
const data = ref<any>(null);
const tab = ref("classes");

const school = computed(() => data.value?.school || null);

function roleLabel(role: string) {
  return role === "owner" ? "创建者" : role === "admin" ? "管理员" : "成员";
}
function roleType(role: string) {
  return role === "owner" ? "warning" : role === "admin" ? "success" : "info";
}

async function load() {
  if (!id) return;
  loading.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/schools/${id}/overview`, {
      headers: authHeaders(),
    });
    data.value = res?.data || null;
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "读取学校信息失败");
  } finally {
    loading.value = false;
  }
}

// ── 改名 ──
const renameVisible = ref(false);
const renameDraft = ref("");
const renaming = ref(false);

function openRename() {
  renameDraft.value = school.value?.name || "";
  renameVisible.value = true;
}

async function doRename() {
  const name = renameDraft.value.trim();
  if (!name) return ElMessage.warning("请填写学校名称");
  renaming.value = true;
  try {
    await $fetch(`/api/v1/console/ci/schools/${id}/rename`, {
      method: "POST",
      headers: authHeaders(),
      body: { name },
    });
    renameVisible.value = false;
    ElMessage.success("已改名");
    await load();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "改名失败");
  } finally {
    renaming.value = false;
  }
}

// ── 挂入班级 ──
const linkVisible = ref(false);
const linkLoading = ref(false);
const linkable = ref(false);
const linkableClasses = ref<any[]>([]);
const linkSelected = ref<string[]>([]);
const linking = ref(false);

async function openLinkClasses() {
  linkVisible.value = true;
  linkLoading.value = true;
  linkSelected.value = [];
  try {
    const res: any = await $fetch("/api/v1/console/ci/class/list", { headers: authHeaders() });
    const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    const inSchool = new Set((data.value?.classes || []).map((c: any) => c.id));
    linkableClasses.value = list
      .filter((c) => !c.schoolId && !inSchool.has(String(c._id)))
      .map((c) => ({ id: String(c._id), name: c.name || "", identity: c.identity || "" }));
    linkable.value = linkableClasses.value.length > 0;
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "读取班级失败");
  } finally {
    linkLoading.value = false;
  }
}

async function doLink() {
  linking.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/schools/${id}/classes`, {
      method: "POST",
      headers: authHeaders(),
      body: { classIds: linkSelected.value },
    });
    ElMessage.success(`已挂入 ${res?.data?.linked ?? 0} 个班级`);
    linkVisible.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "挂入失败");
  } finally {
    linking.value = false;
  }
}

async function unlink(row: any) {
  try {
    await ElMessageBox.confirm(
      `把「${row.name || row.identity}」移出学校？班级会退回个人模式，资源和设备数据都不动。`,
      "移出班级",
      { type: "warning", confirmButtonText: "移出", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/schools/${id}/unlink`, {
      method: "POST",
      headers: authHeaders(),
      body: { classId: row.id },
    });
    ElMessage.success("已移出");
    await load();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "移出失败");
  }
}

// ── 共享资源 ──
const SHARE_ALIAS: Record<string, string> = {
  ci_classplans: "classplan",
  ci_timelayouts: "timelayout",
  ci_subjects: "subjects",
  ci_settings: "settings",
  ci_policies: "policy",
};

async function shareResource(row: any) {
  try {
    await ElMessageBox.confirm(
      `把${row.label}「${row.name}」共享给这个学校？之后同校的管理员都能修改，全校班级都能选用。`,
      "共享到学校",
      { type: "info", confirmButtonText: "共享", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/${SHARE_ALIAS[row.type]}/${row.id}/share`, {
      method: "POST",
      headers: authHeaders(),
      body: { schoolId: id },
    });
    ElMessage.success("已共享给学校");
    await load();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "共享失败");
  }
}

// ── 二维码 ──
const qrVisible = ref(false);
const qrClassId = ref("");
function openQr(row: any) {
  qrClassId.value = row.id;
  qrVisible.value = true;
}

// ── 设备批量通知 ──
const deviceTable = ref<any>(null);
const selectedDevices = ref<any[]>([]);
const selectedOnline = computed(() => selectedDevices.value.filter((d) => d.online));

function onSelectionChange(rows: any[]) {
  selectedDevices.value = rows;
}

// 全选在线：走表格自己的 toggleRowSelection，否则勾选框不会跟着变
function selectAllOnline() {
  const table = deviceTable.value;
  const devices: any[] = data.value?.devices || [];
  if (!table) return;
  table.clearSelection?.();
  let n = 0;
  for (const d of devices) {
    if (!d.online) continue;
    table.toggleRowSelection?.(d, true);
    n++;
  }
  if (!n) ElMessage.info("当前没有在线设备");
}

const notifyVisible = ref(false);
const notifying = ref(false);
const notifyMessage = ref("");
const notifyEmergency = ref(false);
const notifyTopmost = ref(false);
const notifySound = ref(true);
const notifyDuration = ref(10);

async function doNotify() {
  const text = notifyMessage.value.trim();
  if (!text) return;
  notifying.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/grpc/notification", {
      method: "POST",
      headers: authHeaders(),
      body: {
        messageContent: text,
        cuids: selectedOnline.value.map((d) => d.cuid),
        isEmergency: notifyEmergency.value,
        isTopmost: notifyTopmost.value,
        isSoundEnabled: notifySound.value,
        durationSeconds: notifyDuration.value,
      },
    });
    ElMessage.success(`已发送到 ${res?.data?.sent ?? 0} 台设备`);
    notifyVisible.value = false;
    notifyMessage.value = "";
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "发送失败");
  } finally {
    notifying.value = false;
  }
}

// ── 邀请链接 ──
//
// 安全背景：学校**不能**按机构名自动合并（那等于凭猜名字接管别人的学校）。
// 别人要进来只有一条路：校内 owner/admin 生成邀请链接，对方登录后点链接加入。
const invites = ref<any[]>([]);
const inviteRole = ref("member");
const inviteCreating = ref(false);

async function loadInvites() {
  if (!data.value?.canManage) {
    invites.value = [];
    return;
  }
  try {
    const res: any = await $fetch(`/api/v1/console/ci/schools/${id}/invites`, {
      headers: authHeaders(),
    });
    invites.value = Array.isArray(res?.data) ? res.data : [];
  } catch {
    invites.value = [];
  }
}

async function createInvite() {
  inviteCreating.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/schools/${id}/invites`, {
      method: "POST",
      headers: authHeaders(),
      body: { role: inviteRole.value },
    });
    await loadInvites();
    const url = res?.data?.url;
    if (url) copyInvite(url);
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "生成失败");
  } finally {
    inviteCreating.value = false;
  }
}

function copyInvite(url: string) {
  navigator.clipboard.writeText(url).then(
    () => ElMessage.success("链接已复制，发给对方即可（请注意不要外传）"),
    () => ElMessage.error("复制失败，请手动选中复制"),
  );
}

async function revokeInvite(inv: any) {
  try {
    await ElMessageBox.confirm(
      "吊销后这条邀请链接立刻失效，已经发出去的也点不进来了。确定吊销？",
      "吊销邀请",
      { type: "warning", confirmButtonText: "吊销", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/schools/${id}/invites/${inv.id}/revoke`, {
      method: "POST",
      headers: authHeaders(),
    });
    ElMessage.success("已吊销");
    await loadInvites();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "吊销失败");
  }
}

async function setRole(row: any, role: string) {
  try {
    await $fetch(`/api/v1/console/ci/schools/${id}/members/${row.userId}/role`, {
      method: "POST",
      headers: authHeaders(),
      body: { role },
    });
    ElMessage.success(`已设为${roleLabel(role)}`);
    await load();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || "修改失败");
  }
}

onMounted(async () => {
  await load();
  await loadInvites();
});
</script>

<style scoped>
.stat-card {
  min-width: 100px;
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
.invite-box {
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}
.invite-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
}
</style>
