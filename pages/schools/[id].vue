<template>
  <div>
    <div class="flex items-center gap-3 mb-5 flex-wrap">
      <el-button circle text @click="navigateTo('/schools')">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-semibold truncate">{{ school?.name || $t('sidebar.items.schools') }}</h1>
          <el-tag v-if="data" size="small" :type="roleType(data.myRole)" effect="plain">
            {{ roleLabel(data.myRole) }}
          </el-tag>
        </div>
        <div v-if="school?.aliases?.length" class="text-xs text-gray-400 mt-0.5 truncate">
          {{ $t('pages.schools.id.extra.formerNames') }}{{ school.aliases.join(" · ") }}
        </div>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <el-button v-if="data?.canManage" size="small" @click="openRename">{{ $t('pages.schools.id.extra.rename') }}</el-button>
        <el-dropdown v-if="data?.myRole === 'owner'" trigger="click" placement="bottom-end">
          <el-button size="small" text>
            {{ $t('pages.schools.id.extra.more') }}<el-icon class="ml-1"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="openMerge">{{ $t('pages.schools.id.extra.mergeIntoOther') }}</el-dropdown-item>
              <el-dropdown-item divided @click="doDeleteSchool">
                <span class="text-red-500">{{ $t('pages.schools.id.extra.deleteThisSchool') }}</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button :loading="loading" size="small" @click="load">{{ $t('pages.schools.index.extra.refresh') }}</el-button>
      </div>
    </div>

    <div v-if="data" class="flex flex-wrap gap-3 mb-5">
      <div class="stat-card">
        <div class="stat-num">{{ data.summary.classCount }}</div>
        <div class="stat-label">{{ $t('dashboard.cards.classes') }}</div>
      </div>
      <div
        class="stat-card"
        :class="{ 'cursor-pointer hover:border-amber-400': data.summary.unconfiguredCount }"
        :title="data.summary.unconfiguredCount ? $t('pages.schools.id.extra.healthHint') : ''"
        @click="data.summary.unconfiguredCount && navigateTo(`/health?schoolId=${id}`)"
      >
        <div class="stat-num" :class="data.summary.unconfiguredCount ? 'text-amber-500' : ''">
          {{ data.summary.unconfiguredCount }}
        </div>
        <div class="stat-label">
          {{ $t('pages.schools.id.extra.unconfiguredClasses') }}<span v-if="data.summary.unconfiguredCount" class="text-amber-500"> ›</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ data.summary.memberCount }}</div>
        <div class="stat-label">{{ $t('pages.schools.index.member') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" :class="data.summary.onlineDeviceCount ? 'text-emerald-500' : ''">
          {{ data.summary.onlineDeviceCount }}<span class="text-sm text-gray-400">/{{ data.summary.deviceCount }}</span>
        </div>
        <div class="stat-label">{{ $t('pages.schools.id.extra.onlineDevices') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ data.summary.schoolResourceCount }}</div>
        <div class="stat-label">{{ $t('pages.schools.id.extra.schoolResources') }}</div>
      </div>
    </div>

    <el-tabs v-model="tab" class="max-w-5xl">
      <!-- ── 班级 ── -->
      <el-tab-pane :label="$t('dashboard.cards.classes')" name="classes">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-gray-500">{{ $t('pages.schools.id.extra.classListHint') }}</span>
          <el-button v-if="data?.canManage" size="small" type="primary" plain @click="openLinkClasses">
            {{ $t('pages.schools.id.attachMoreClasses') }}
          </el-button>
        </div>
        <el-table :data="data?.classes || []" size="small" :empty-text="$t('pages.schools.id.noClasses')">
          <el-table-column prop="name" :label="$t('dashboard.cards.classes')" min-width="140" show-overflow-tooltip />
          <el-table-column prop="identity" :label="$t('pages.schools.id.identifier')" width="110" show-overflow-tooltip />
          <el-table-column :label="$t('pages.schools.id.resources')" min-width="150">
            <template #default="{ row }">
              <el-tag v-if="!row.missing.length" size="small" type="success" effect="plain">{{ $t('pages.schools.id.extra.complete') }}</el-tag>
              <span v-else class="text-xs text-amber-500">{{ $t('pages.schools.id.extra.missing') }} {{ row.missing.join("、") }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('dashboard.cards.devices')" width="100">
            <template #default="{ row }">
              <span :class="row.onlineCount ? 'text-emerald-500' : 'text-gray-400'">
                {{ row.onlineCount }}/{{ row.deviceCount }}
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('components.subjectseditor.actions')" width="170" align="right">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="navigateTo(`/classes/${row.id}`)">{{ $t('pages.schools.id.extra.details') }}</el-button>
              <el-button size="small" text @click="openQr(row)">{{ $t('pages.schools.id.extra.qrCode') }}</el-button>
              <el-button
                v-if="data?.canManage"
                size="small"
                text
                type="danger"
                @click="unlink(row)"
              >{{ $t('pages.schools.id.remove') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ── 资源 ── -->
      <el-tab-pane :label="$t('pages.schools.id.resources')" name="resources">
        <div class="text-sm text-gray-500 mb-3">
          {{ $t('pages.schools.id.extra.resourceTabHint') }}
        </div>
        <el-table :data="data?.resources || []" size="small" :empty-text="$t('pages.schools.id.noResources')">
          <el-table-column prop="label" :label="$t('pages.schools.id.type')" width="90" />
          <el-table-column prop="name" :label="$t('components.cw2centralpanel.name')" min-width="160" show-overflow-tooltip />
          <el-table-column :label="$t('pages.schools.id.ownership')" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.schoolLevel ? 'success' : 'info'" effect="plain">
                {{ row.schoolLevel ? $t('sidebar.items.schools') : $t('pages.schools.id.personal') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('pages.schools.id.usingClasses')" width="90">
            <template #default="{ row }">{{ row.usedByCount }}</template>
          </el-table-column>
          <el-table-column prop="version" :label="$t('common.version')" width="70" />
          <el-table-column :label="$t('components.subjectseditor.actions')" width="110" align="right">
            <template #default="{ row }">
              <el-button
                v-if="!row.schoolLevel && data?.canManage"
                size="small"
                text
                type="primary"
                @click="shareResource(row)"
              >{{ $t('pages.schools.id.share') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ── 设备 ── -->
      <el-tab-pane :label="$t('dashboard.cards.devices')" name="devices">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span class="text-sm text-gray-500">
            {{ $t('pages.schools.id.extra.deviceTabHint') }}
          </span>
          <div class="flex gap-2">
            <el-button
              size="small"
              :disabled="!selectedOnline.length"
              @click="notifyVisible = true"
            >{{ $t('pages.schools.id.batchPushNotification') }}{{ selectedOnline.length ? `（${selectedOnline.length}）` : "" }}</el-button>
            <el-button
              size="small"
              :loading="refreshing"
              :disabled="!selectedOnline.length"
              @click="refreshDevices"
            >{{ $t('pages.schools.id.extra.refreshData') }}</el-button>
            <el-button
              size="small"
              :disabled="!data?.summary?.onlineDeviceCount"
              @click="openPluginDeliver"
            >{{ $t('pages.schools.id.distributePlugin') }}</el-button>
            <el-button size="small" @click="selectAllOnline">{{ $t('pages.schools.id.extra.selectAllOnline') }}</el-button>
          </div>
        </div>
        <el-table
          ref="deviceTable"
          :data="data?.devices || []"
          size="small"
          :empty-text="$t('pages.schools.id.noDevices')"
          @selection-change="onSelectionChange"
        >
          <el-table-column type="selection" width="42" :selectable="(row: any) => row.online" />
          <el-table-column :label="$t('dashboard.cards.devices')" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="font-mono text-xs">{{ row.cuid.slice(0, 8) }}…</span>
            </template>
          </el-table-column>
          <el-table-column prop="className" :label="$t('dashboard.cards.classes')" min-width="120" show-overflow-tooltip />
          <el-table-column :label="$t('components.cw2centralpanel.status')" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.online ? 'success' : 'info'" effect="plain">
                {{ row.online ? $t('dashboard.online') : $t('dashboard.offline') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lastSeen" :label="$t('pages.schools.id.lastOnline')" width="170" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>

      <!-- ── 成员 ── -->
      <el-tab-pane :label="$t('pages.schools.index.member')" name="members">
        <div class="text-sm text-gray-500 mb-3">
          学校有多人时，<b>创建者和管理员</b>能改学校级资源，普通成员只读 —— 免得统一的时间表被随手改掉。
        </div>

        <div v-if="data?.canManage" class="invite-box">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div class="font-medium text-sm">{{ $t('pages.schools.id.extra.inviteLink') }}</div>
              <div class="text-xs text-gray-500 mt-0.5">
                对方登录后点链接即可加入。<b>不要公开发出去</b> —— 拿到链接的人都能进校。
              </div>
            </div>
            <div class="flex items-center gap-2">
              <el-select v-model="inviteRole" size="small" style="width: 100px">
                <el-option :label="$t('pages.schools.index.member')" value="member" />
                <el-option v-if="data?.myRole === 'owner'" :label="$t('pages.schools.index.admin')" value="admin" />
              </el-select>
              <el-button size="small" type="primary" :loading="inviteCreating" @click="createInvite">
                 {{ $t('pages.schools.id.extra.generateLink') }}
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
                  {{ inv.expired ? $t('pages.schools.id.expired') : `到期 ${inv.expiresAt?.slice(0, 16).replace("T", " ")}` }}
                  <span v-if="inv.revoked" class="text-red-400"> · {{ $t('pages.schools.id.revoked') }}</span>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <el-button v-if="inv.usable" size="small" text type="primary" @click="copyInvite(inv.url)">
                   {{ $t('pages.schools.id.extra.copy') }}
                </el-button>
                <el-button
                  v-if="!inv.revoked"
                  size="small"
                  text
                  type="danger"
                  @click="revokeInvite(inv)"
                >{{ $t('pages.schools.id.revoke') }}</el-button>
              </div>
            </div>
          </div>
          <el-empty v-else :image-size="50" :description="$t('pages.schools.id.noInviteLinks')" class="!py-2" />
        </div>

        <el-table :data="data?.members || []" size="small" :empty-text="$t('pages.schools.id.noMembers')" class="mt-3">
          <el-table-column :label="$t('pages.schools.id.account')" min-width="160">
            <template #default="{ row }">
              {{ row.userName }}
              <el-tag v-if="row.isMe" size="small" effect="plain" class="ml-1">{{ $t('pages.schools.id.extra.me') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('pages.schools.id.role')" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="roleType(row.role)" effect="plain">{{ roleLabel(row.role) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="classCount" :label="$t('pages.schools.id.classCount')" width="90" />
          <el-table-column
            v-if="data?.myRole === 'owner'"
            :label="$t('components.subjectseditor.actions')"
            width="110"
            align="right"
          >
            <template #default="{ row }">
              <el-dropdown v-if="!row.isMe && row.role !== 'owner'" @command="(r: string) => setRole(row, r)">
                <el-button size="small" text type="primary">{{ $t('pages.schools.id.extra.changeRole') }}</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="admin">{{ $t('pages.schools.id.extra.setAdmin') }}</el-dropdown-item>
                    <el-dropdown-item command="member">{{ $t('pages.schools.id.extra.setMember') }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 改名 -->
    <el-dialog v-model="renameVisible" :title="$t('pages.schools.id.editSchoolName')" width="400px">
      <el-input v-model="renameDraft" maxlength="60" show-word-limit :placeholder="$t('pages.schools.id.schoolName')" />
      <div class="text-xs text-gray-400 mt-2">
        {{ $t('pages.schools.id.extra.renameHint') }}
      </div>
      <template #footer>
        <el-button @click="renameVisible = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="renaming" @click="doRename">{{ $t('pages.subaccounts.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 挂入班级 -->
    <el-dialog v-model="linkVisible" :title="$t('pages.schools.id.attachMoreClasses')" width="480px">
      <div class="text-sm text-gray-500 mb-3">{{ $t('pages.schools.id.extra.linkableHint') }}</div>
      <el-checkbox-group v-model="linkSelected" class="flex flex-col gap-2">
        <el-checkbox v-for="c in linkableClasses" :key="c.id" :value="c.id" class="!mr-0">
          {{ c.name || $t('pages.schools.join.token.unnamed') }}
          <span class="text-xs text-gray-400 ml-1">#{{ c.identity }}</span>
        </el-checkbox>
      </el-checkbox-group>
      <el-empty v-if="!linkable && !linkLoading" :image-size="60" :description="$t('pages.schools.id.noClassesToAttach')" />
      <template #footer>
        <el-button @click="linkVisible = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="linking" :disabled="!linkSelected.length" @click="doLink">
          {{ $t('pages.schools.id.extra.attach') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量推送通知 -->
    <el-dialog v-model="notifyVisible" :title="$t('pages.schools.id.batchPushNotification')" width="440px">
      <el-input
        v-model="notifyMessage"
        type="textarea"
        :rows="3"
        maxlength="200"
        show-word-limit
        :placeholder="$t('pages.devices.notificationContent')"
      />
      <div class="flex items-center gap-4 mt-3">
        <el-checkbox v-model="notifyEmergency">{{ $t('pages.schools.id.extra.urgent') }}</el-checkbox>
        <el-checkbox v-model="notifyTopmost">{{ $t('pages.schools.id.extra.topmost') }}</el-checkbox>
        <el-checkbox v-model="notifySound">{{ $t('pages.schools.id.extra.sound') }}</el-checkbox>
      </div>
      <div class="flex items-center gap-3 mt-3">
        <span class="text-[13px] text-gray-500 shrink-0">{{ $t('pages.schools.id.extra.displayDuration') }}</span>
        <el-slider v-model="notifyDuration" :min="0" :max="120" :step="10" class="flex-1" />
        <span class="text-[13px] text-gray-600 w-16 text-right">
          {{ notifyDuration ? `${notifyDuration} 秒` : $t('pages.schools.id.doNotClose') }}
        </span>
      </div>
      <div class="text-xs text-gray-400 mt-2">将发给已选中的 {{ selectedOnline.length }} 台在线设备。</div>
      <template #footer>
        <el-button @click="notifyVisible = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="notifying" :disabled="!notifyMessage.trim()" @click="doNotify">
          {{ $t('pages.schools.id.extra.send') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 合并到其他学校 -->
    <el-dialog v-model="mergeVisible" :title="$t('pages.schools.id.mergeIntoAnotherSchool')" width="520px">
      <el-alert type="warning" :closable="false" show-icon class="mb-3">
        <template #title>合并是把「{{ school?.name }}」整个并进去，然后删掉这个学校</template>
        {{ $t('pages.schools.id.extra.mergeEffect') }}
        {{ $t('pages.schools.id.extra.mergeIrreversible') }}
      </el-alert>

      <div class="mb-3">
        <div class="text-sm font-medium mb-1.5">{{ $t('pages.schools.id.extra.mergeTo') }}</div>
        <el-select v-model="mergeInto" :placeholder="$t('pages.schools.id.selectCreatedSchool')" class="w-full" @change="loadMergePreview">
          <el-option v-for="s in otherSchools" :key="s.id" :label="`${s.name}（${s.classCount} 个班）`" :value="s.id" />
        </el-select>
        <div v-if="!otherSchools.length" class="text-xs text-gray-400 mt-1.5">
          {{ $t('pages.schools.id.extra.noMergeTarget') }}
        </div>
      </div>

      <div v-if="mergePreview" class="preview-box">
        <div class="text-sm">
          把 <b>{{ mergePreview.from.name }}</b>
          （{{ mergePreview.from.classCount }} 班 / {{ mergePreview.from.resourceTotal }} 份学校级资源）
          并入 <b>{{ mergePreview.into.name }}</b>
          （{{ mergePreview.into.classCount }} 班）
        </div>
        <div v-if="mergePreview.duplicateNames.length" class="text-xs text-amber-600 mt-2">
          注意：有 {{ mergePreview.duplicateNames.length }} 份资源在两边同名
          （{{ mergePreview.duplicateNames.slice(0, 3).join("、") }}{{ mergePreview.duplicateNames.length > 3 ? $t('pages.schools.id.etc') : "" }}），
          {{ $t('pages.schools.id.extra.mergeCoexist') }}
        </div>
      </div>

      <template #footer>
        <el-button @click="mergeVisible = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="danger" :loading="merging" :disabled="!mergeInto" @click="doMerge">
          {{ $t('pages.schools.id.confirmMerge') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 下发插件（学校级） -->
    <el-dialog v-model="pluginVisible" :title="$t('pages.schools.id.distributePlugin')" width="480px">
      <el-alert type="info" :closable="false" show-icon class="mb-3">
        <template #title>{{ $t('pages.schools.id.extra.onlyThisSchool') }}</template>
        {{ $t('pages.schools.id.extra.bootstrapHint') }}
      </el-alert>

      <el-form label-position="top">
        <el-form-item :label="$t('pages.schools.id.selectPlugin')">
          <el-select v-model="pluginId" :placeholder="$t('pages.schools.id.selectUploadedPlugin')" class="w-full" :loading="pluginLoading">
            <el-option
              v-for="p in plugins"
              :key="p._id"
              :label="`${p.name}${p.version ? ' v' + p.version : ''}`"
              :value="p._id"
            />
          </el-select>
          <div v-if="!pluginLoading && !plugins.length" class="text-xs text-gray-400 mt-1">
            {{ $t('pages.schools.id.extra.noPluginsHint') }}
          </div>
        </el-form-item>
        <el-form-item :label="$t('pages.schools.id.sendToWhom')">
          <el-radio-group v-model="pluginScope">
            <el-radio value="school">全校在线设备（{{ data?.summary?.onlineDeviceCount || 0 }} 台）</el-radio>
            <el-radio value="selected" :disabled="!selectedOnline.length">
              已选中的 {{ selectedOnline.length }} 台
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="pluginVisible = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="pluginSending" :disabled="!pluginId" @click="doPluginDeliver">
          {{ $t('pages.schools.id.extra.deliver') }}
        </el-button>
      </template>
    </el-dialog>

    <NotifyQrDialog v-model="qrVisible" :class-id="qrClassId" />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, ArrowDown } from "@element-plus/icons-vue";

definePageMeta({ title: "学校详情", protected: true });

const { t } = useI18n();

const route = useRoute();
const id = String(route.params.id ?? "");

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const loading = ref(false);
const data = ref<any>(null);
const tab = ref("classes");

const school = computed(() => data.value?.school || null);

function roleLabel(role: string) {
  return role === "owner" ? t("pages.schools.index.creator") : role === "admin" ? t("pages.schools.index.admin") : t("pages.schools.index.member");
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
    ElMessage.error(e?.data?.msg || t("pages.schools.id.loadSchoolFailed"));
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
  if (!name) return ElMessage.warning(t("pages.schools.id.enterSchoolName"));
  renaming.value = true;
  try {
    await $fetch(`/api/v1/console/ci/schools/${id}/rename`, {
      method: "POST",
      headers: authHeaders(),
      body: { name },
    });
    renameVisible.value = false;
    ElMessage.success(t("pages.plugins.renamed"));
    await load();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("pages.plugins.renameFailed"));
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
    ElMessage.error(e?.data?.msg || t("pages.schools.id.loadClassesFailed"));
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
    ElMessage.error(e?.data?.msg || t("pages.schools.id.attachFailed"));
  } finally {
    linking.value = false;
  }
}

async function unlink(row: any) {
  try {
    await ElMessageBox.confirm(
      `把「${row.name || row.identity}」移出学校？班级会退回个人模式，资源和设备数据都不动。`,
      t("pages.schools.id.removeClass"),
      { type: "warning", confirmButtonText: t("pages.schools.id.remove"), cancelButtonText: t("reauth.cancel") },
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
    ElMessage.success(t("pages.schools.id.removed"));
    await load();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("pages.schools.id.removeFailed"));
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
      t("pages.schools.id.shareToSchool"),
      { type: "info", confirmButtonText: t("pages.schools.id.share"), cancelButtonText: t("reauth.cancel") },
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
    ElMessage.success(t("pages.schools.id.sharedToSchool"));
    await load();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("pages.schools.id.shareFailed"));
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
  if (!n) ElMessage.info(t("pages.schools.id.noOnlineDevices"));
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
    ElMessage.error(e?.data?.msg || t("pages.n.token.sendFailed"));
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
    ElMessage.error(e?.data?.msg || t("pages.grants.generateFailed"));
  } finally {
    inviteCreating.value = false;
  }
}

function copyInvite(url: string) {
  navigator.clipboard.writeText(url).then(
    () => ElMessage.success(t("pages.schools.id.linkCopied")),
    () => ElMessage.error(t("pages.schools.id.copyFailedManual")),
  );
}

async function revokeInvite(inv: any) {
  try {
    await ElMessageBox.confirm(
      t("pages.schools.id.revokeInviteConfirm"),
      t("pages.schools.id.revokeInvite"),
      { type: "warning", confirmButtonText: t("pages.schools.id.revoke"), cancelButtonText: t("reauth.cancel") },
    );
  } catch {
    return;
  }
  try {
    await $fetch(`/api/v1/console/ci/schools/${id}/invites/${inv.id}/revoke`, {
      method: "POST",
      headers: authHeaders(),
    });
    ElMessage.success(t("pages.schools.id.revoked"));
    await loadInvites();
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("pages.schools.id.revokeFailed"));
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
    ElMessage.error(e?.data?.msg || t("pages.schools.id.editFailed"));
  }
}

// ── 合并 / 删除学校（危险操作，只有 owner 看得到入口）──
//
// 设计取舍：删除只允许「空学校」。还有班级或学校级资源时一律拒绝，
// 让用户自己先处理干净 —— "删学校顺带删掉 7 个班"这种级联不该藏在一个按钮里。
const mergeVisible = ref(false);
const mergeInto = ref("");
const otherSchools = ref<any[]>([]);
const mergePreview = ref<any>(null);
const merging = ref(false);
const deleting = ref(false);

async function openMerge() {
  mergeVisible.value = true;
  mergePreview.value = null;
  mergeInto.value = "";
  try {
    const res: any = await $fetch("/api/v1/console/ci/schools", { headers: authHeaders() });
    otherSchools.value = (Array.isArray(res?.data) ? res.data : []).filter(
      (s: any) => s.id !== id && s.role === "owner",
    );
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("pages.schools.index.loadSchoolsFailed"));
  }
}

async function loadMergePreview() {
  mergePreview.value = null;
  if (!mergeInto.value) return;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/schools/${id}/merge-preview`, {
      headers: authHeaders(),
      query: { intoId: mergeInto.value },
    });
    mergePreview.value = res?.data || null;
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("pages.schools.id.loadMergePreviewFailed"));
  }
}

/**
 * 服务端对删除/合并这类不可撤销操作要求「再验证身份」。
 * 这里统一接住：引导去账号安全页输一次动态码（没开 2FA 就是重新登录），回来再点一次。
 */
async function maybeReauth(e: any): Promise<boolean> {
  if (!e?.data?.needReauth) return false;
  try {
    await ElMessageBox.confirm(
      t("pages.schools.id.mergeVerifyRequired"),
      t("reauth.title"),
      { confirmButtonText: t("pages.schools.id.goVerify"), cancelButtonText: t("pages.profile.later"), type: "warning" },
    );
    navigateTo("/security");
  } catch {
    /* 用户选择稍后 */
  }
  return true;
}

async function doMerge() {
  const target = otherSchools.value.find((s) => s.id === mergeInto.value);
  try {
    await ElMessageBox.confirm(
      `把「${school.value?.name}」整个并进「${target?.name}」，然后删除前者。这个操作不可撤销。`,
      t("pages.schools.id.confirmMerge"),
      { type: "warning", confirmButtonText: t("pages.schools.id.merge"), cancelButtonText: t("reauth.cancel") },
    );
  } catch {
    return;
  }
  merging.value = true;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/schools/${id}/merge`, {
      method: "POST",
      headers: authHeaders(),
      body: { intoId: mergeInto.value },
    });
    const d = res?.data || {};
    ElMessage.success(
      `已并入「${d.intoSchoolName}」：班级 ${d.movedClasses}、资源 ${Object.values(d.movedResources || {}).reduce((a: any, b: any) => a + b, 0)}、成员 ${d.addedMembers}`,
    );
    mergeVisible.value = false;
    navigateTo(`/schools/${d.intoSchoolId}`);
  } catch (e: any) {
    if (await maybeReauth(e)) return;
    ElMessage.error(e?.data?.msg || t("pages.schools.id.mergeFailed"));
  } finally {
    merging.value = false;
  }
}

async function doDeleteSchool() {
  const s = data.value;
  if (!s) return;
  if (s.summary.classCount > 0 || s.summary.schoolResourceCount > 0) {
    ElMessageBox.alert(
      `这所学校里还有 ${s.summary.classCount} 个班级、${s.summary.schoolResourceCount} 份学校级资源。` +
        t("pages.schools.id.prepareBeforeDelete"),
      t("pages.schools.id.cannotDelete"),
      { type: "warning", confirmButtonText: t("composables.useciresource.gotIt") },
    ).catch(() => {});
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定删除空学校「${school.value?.name}」？删掉后邀请链接和成员关系一起失效。`,
      t("pages.schools.id.deleteSchool"),
      { type: "error", confirmButtonText: t("components.resourceeditor.delete"), cancelButtonText: t("reauth.cancel") },
    );
  } catch {
    return;
  }
  deleting.value = true;
  try {
    await $fetch(`/api/v1/console/ci/schools/${id}/delete`, {
      method: "POST",
      headers: authHeaders(),
    });
    ElMessage.success(t("components.resourceeditor.deleted"));
    navigateTo("/schools");
  } catch (e: any) {
    if (await maybeReauth(e)) return;
    ElMessage.error(e?.data?.msg || t("composables.useciresource.deleteFailed"));
  } finally {
    deleting.value = false;
  }
}

// ── 设备批量通知 / 刷新数据 ──
const refreshing = ref(false);

async function refreshDevices() {
  const cuids = selectedOnline.value.map((d) => d.cuid);
  if (!cuids.length) return;
  refreshing.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/grpc/data-updated", {
      method: "POST",
      headers: authHeaders(),
      body: { cuids },
    });
    ElMessage.success(`已通知 ${res?.data?.sent ?? 0} 台设备重新拉取配置`);
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("components.cw2centralpanel.dispatchFailed"));
  } finally {
    refreshing.value = false;
  }
}

// ── 下发插件（学校级）──
const pluginVisible = ref(false);
const pluginLoading = ref(false);
const pluginSending = ref(false);
const plugins = ref<any[]>([]);
const pluginId = ref("");
const pluginScope = ref<"school" | "selected">("school");

async function openPluginDeliver() {
  pluginVisible.value = true;
  pluginId.value = "";
  pluginScope.value = selectedOnline.value.length ? "selected" : "school";
  pluginLoading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/plugin/list", { headers: authHeaders() });
    plugins.value = Array.isArray(res?.data) ? res.data : [];
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("pages.schools.id.loadPluginListFailed"));
  } finally {
    pluginLoading.value = false;
  }
}

async function doPluginDeliver() {
  if (!pluginId.value) return;
  pluginSending.value = true;
  try {
    // 学校作用域由后端校验（必须是我所在学校），设备再收敛一次
    const body: any = { pluginId: pluginId.value, schoolId: id };
    if (pluginScope.value === "selected") body.cuids = selectedOnline.value.map((d) => d.cuid);
    const res: any = await $fetch("/api/v1/console/ci/plugin/deliver", {
      method: "POST",
      headers: authHeaders(),
      body,
    });
    const d = res?.data || {};
    ElMessage.success(
      `已下发到 ${d.sent ?? 0} 台设备` + (d.rejected?.length ? `（${d.rejected.length} 台不在本范围内被忽略）` : ""),
    );
    pluginVisible.value = false;
  } catch (e: any) {
    ElMessage.error(e?.data?.msg || t("components.cw2centralpanel.dispatchFailed"));
  } finally {
    pluginSending.value = false;
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
.preview-box {
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}
</style>
