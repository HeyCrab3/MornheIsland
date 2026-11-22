<template>
  <div>
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold mb-1">{{ $t('sidebar.items.plugins') }}</h1>
        <p class="text-sm text-gray-500">{{ $t('pages.plugins.extra.subtitle') }}</p>
      </div>
      <el-radio-group v-model="tab">
        <el-radio-button value="market">{{ $t('pages.plugins.extra.marketTab') }}</el-radio-button>
        <el-radio-button value="local">{{ $t('pages.plugins.extra.localTab') }}</el-radio-button>
        <el-radio-button value="profile">{{ $t('pages.plugins.extra.profileTab') }}</el-radio-button>
        <el-radio-button value="compliance">{{ $t('pages.plugins.extra.complianceTab') }}</el-radio-button>
      </el-radio-group>
    </div>

    <!-- ==================== 引导插件（分发的前提） ==================== -->
    <el-card v-if="tab !== 'market'" shadow="never" class="mb-5 bootstrap-card">
      <div class="flex items-start gap-3">
        <div class="bootstrap-icon">
          <el-icon :size="20"><MagicStick /></el-icon>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold mb-1">{{ $t('pages.plugins.extra.bootstrapFirst') }}</div>
          <p class="text-xs text-gray-500 mb-2 leading-relaxed">
            {{ $t('pages.plugins.extra.bootstrapIntro') }}
          </p>
          <div class="flex items-center gap-2 flex-wrap">
            <el-input
              :model-value="bootstrapForm.url"
              size="small"
              class="bootstrap-input"
              readonly
            />
            <el-button size="small" @click="copyBootstrap">{{ $t('components.notifyqrdialog.extra.copy') }}</el-button>
            <el-button size="small" type="primary" @click="openBootstrap">{{ $t('pages.plugins.extra.download') }}</el-button>
            <el-tag v-if="bootstrapForm.isDefault" size="small" type="info" effect="plain">{{ $t('pages.plugins.extra.defaultAddress') }}</el-tag>
          </div>
        </div>
      </div>
    </el-card>

    <!-- ==================== 插件市场 ==================== -->
    <div v-if="tab === 'market'">
      <el-input v-model="search" :placeholder="$t('pages.plugins.searchPluginHint')" clearable class="mb-4 max-w-md">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>

      <div v-loading="marketLoading" class="min-h-40">
        <div v-if="filteredMarket.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <el-card v-for="p in filteredMarket" :key="p.id" shadow="hover" class="plugin-card">
            <div class="flex items-start gap-3">
              <div class="plugin-icon">
                <img v-if="p.iconUrl" :src="p.iconUrl" alt="" @error="($event.target as HTMLImageElement).style.display = 'none'" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">{{ p.name }}</div>
                <div class="text-xs text-gray-400 truncate">v{{ p.version }} · {{ p.author }}</div>
              </div>
            </div>

            <div class="mt-2 text-xs text-gray-500 plugin-desc">{{ p.description }}</div>

            <div class="mt-3 flex items-center gap-3 text-xs text-gray-400">
              <span>↓ {{ p.downloadCount }}</span>
              <span>★ {{ p.starsCount }}</span>
              <span v-if="p.dependencies?.length">{{ $t('pages.plugins.extra.dependencies') }} {{ p.dependencies.length }}</span>
            </div>

            <div class="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-1.5">
              <el-button size="small" type="primary" :loading="importingId === p.id" @click="importFromMarket(p)">
                {{ $t('pages.backup.plugins') }}
              </el-button>
              <el-button v-if="p.url" size="small" text @click="openUrl(p.url)">{{ $t('pages.plugins.extra.repository') }}</el-button>
            </div>
          </el-card>
        </div>
        <el-empty v-else :image-size="100" :description="$t('pages.plugins.noMatchingPlugins')" />
      </div>
    </div>

    <!-- ==================== 本地插件 ==================== -->
    <div v-else-if="tab === 'local'">
      <div class="flex items-center justify-end gap-2 mb-4 flex-wrap">
        <el-button :loading="checkingUpdates" @click="checkUpdates">
          <el-icon class="mr-1"><Refresh /></el-icon>{{ $t('pages.plugins.extra.checkUpdates') }}
        </el-button>
        <el-button :loading="deduping" @click="dedupePlugins">{{ $t('pages.plugins.extra.dedupe') }}</el-button>
        <el-button @click="showFromUrl = true">
          <el-icon class="mr-1"><Link /></el-icon>{{ $t('pages.plugins.extra.addFromUrl') }}
        </el-button>
        <el-button @click="triggerUpload">
          <el-icon class="mr-1"><Upload /></el-icon>{{ $t('pages.plugins.extra.uploadCipx') }}
        </el-button>
        <input ref="fileInput" type="file" accept=".cipx" hidden @change="onFileChange" />
      </div>

      <div v-loading="localLoading" class="min-h-40">
        <div v-if="localPlugins.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <el-card v-for="p in localPlugins" :key="p._id" shadow="hover" class="plugin-card">
            <div class="flex items-start gap-3">
              <div class="plugin-icon">
                <el-icon :size="20"><Grid /></el-icon>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">{{ p.name }}</div>
                <div class="text-xs text-gray-400">
                  {{ p.version ? 'v' + p.version + ' · ' : '' }}{{ formatSize(p.size) }}
                </div>
              </div>
              <el-tag
                size="small"
                :type="p.source === 'upload' ? 'warning' : 'info'"
                effect="plain"
              >
                {{ sourceLabel(p) }}
              </el-tag>
            </div>

            <div v-if="p.url" class="mt-2 text-xs text-gray-400 truncate" :title="p.url">
              {{ $t('pages.plugins.extra.source') }} {{ p.url }}
            </div>

            <div class="mt-2 text-xs text-gray-400 font-mono truncate" :title="p.sha256">
              SHA256 {{ String(p.sha256 || '').slice(0, 16) }}…
            </div>

            <div class="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-1.5 flex-wrap">
              <el-button size="small" type="primary" @click="openDeliver(p)">{{ $t('pages.plugins.extra.deliverToDevices') }}</el-button>
              <el-button v-if="p.marketId" size="small" text :loading="updatingId === p._id" @click="updatePlugin(p)">{{ $t('pages.plugins.extra.updateToLatest') }}</el-button>
              <el-button size="small" text @click="openRename(p)">{{ $t('pages.plugins.extra.rename') }}</el-button>
              <el-button size="small" text type="danger" @click="removePlugin(p)">{{ $t('components.resourceeditor.delete') }}</el-button>
            </div>
          </el-card>
        </div>
        <el-empty v-else :image-size="100" :description="$t('pages.plugins.emptyPluginLibrary')" />
      </div>
    </div>

    <!-- ==================== 配置组 ==================== -->
    <div v-else-if="tab === 'profile'">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p class="text-sm text-gray-500">
          {{ $t('pages.plugins.extra.profileIntro') }}
        </p>
        <el-button type="primary" @click="openProfileEditor()">
          <el-icon class="mr-1"><Plus /></el-icon>{{ $t('pages.plugins.extra.newProfile') }}
        </el-button>
      </div>

      <div v-loading="profileLoading" class="min-h-40">
        <div v-if="profiles.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <el-card v-for="g in profiles" :key="g._id" shadow="hover" class="plugin-card">
            <div class="flex items-start gap-3">
              <div class="plugin-icon">
                <el-icon :size="20"><Collection /></el-icon>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">{{ g.name }}</div>
                <div class="text-xs text-gray-400 truncate">{{ g.description || $t('pages.plugins.noDescription') }}</div>
              </div>
            </div>

            <div class="mt-3">
              <div class="text-xs text-gray-400 mb-1">{{ $t('pages.plugins.extra.expectedPlugins') }}（{{ g.plugins.length }}）</div>
              <div class="flex flex-wrap gap-1">
                <el-tag
                  v-for="p in g.plugins"
                  :key="p._id"
                  size="small"
                  :type="p.exists ? 'primary' : 'danger'"
                  effect="plain"
                >
                  {{ p.exists ? p.name : $t('pages.plugins.pluginDeleted') }}
                </el-tag>
                <span v-if="!g.plugins.length" class="text-xs text-gray-400">{{ $t('pages.plugins.extra.noPluginsSelected') }}</span>
              </div>
            </div>

            <div class="mt-2">
              <div class="text-xs text-gray-400 mb-1">{{ $t('pages.plugins.extra.boundClasses') }}（{{ g.classes.length }}）</div>
              <div class="flex flex-wrap gap-1">
                <el-tag
                  v-for="c in g.classes"
                  :key="c._id"
                  size="small"
                  :type="c.identity ? 'success' : 'danger'"
                  effect="plain"
                >
                  {{ c.identity ? (c.name || c.identity) : $t('pages.plugins.classDeleted') }}
                </el-tag>
                <span v-if="!g.classes.length" class="text-xs text-gray-400">{{ $t('pages.plugins.extra.noClassesBound') }}</span>
              </div>
            </div>

            <div class="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-1.5">
              <el-button
                size="small"
                type="primary"
                :loading="applyingId === g._id"
                :disabled="!g.plugins.length || !g.classes.length"
                @click="applyProfile(g)"
              >
                {{ $t('pages.plugins.extra.reconcileDispatch') }}
              </el-button>
              <el-button size="small" text @click="openProfileEditor(g)">{{ $t('components.resourcelist.edit') }}</el-button>
              <el-button size="small" text type="danger" @click="removeProfile(g)">{{ $t('components.resourceeditor.delete') }}</el-button>
            </div>
          </el-card>
        </div>
        <el-empty v-else :image-size="100" :description="$t('pages.plugins.noConfigGroups')" />
      </div>
    </div>

    <!-- ==================== 部署状态 ==================== -->
    <div v-else>
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p class="text-sm text-gray-500 leading-relaxed">
          {{ $t('pages.plugins.extra.complianceIntro') }}
          <span class="text-gray-400">{{ $t('pages.plugins.extra.complianceHint') }}</span>
        </p>
        <el-button :loading="refreshing" @click="refreshAllDevices">
          <el-icon class="mr-1"><Refresh /></el-icon>{{ $t('pages.plugins.extra.refreshOnlineDevices') }}
        </el-button>
      </div>

      <div v-if="compliance" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <div class="report-stat">
          <div class="report-stat-num">{{ compliance.summary.devices }}</div>
          <div class="report-stat-label">{{ $t('dashboard.cards.devices') }}</div>
        </div>
        <div class="report-stat">
          <div class="report-stat-num">{{ compliance.summary.online }}</div>
          <div class="report-stat-label">{{ $t('dashboard.online') }}</div>
        </div>
        <div class="report-stat">
          <div class="report-stat-num">{{ compliance.summary.ok }}</div>
          <div class="report-stat-label">{{ $t('pages.plugins.allUpToDate') }}</div>
        </div>
        <div class="report-stat">
          <div class="report-stat-num">{{ compliance.summary.missing }}</div>
          <div class="report-stat-label">{{ $t('pages.plugins.missingPlugins') }}</div>
        </div>
        <div class="report-stat">
          <div class="report-stat-num">{{ compliance.summary.noBootstrap }}</div>
          <div class="report-stat-label">{{ $t('pages.plugins.missingBootstrapPlugin') }}</div>
        </div>
        <div class="report-stat">
          <div class="report-stat-num">{{ compliance.summary.uncollected }}</div>
          <div class="report-stat-label">{{ $t('pages.devices.notCollected') }}</div>
        </div>
      </div>

      <div v-loading="complianceLoading" class="min-h-40 space-y-3">
        <div v-for="d in compliance?.devices || []" :key="d.cuid" class="report-device">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm font-medium truncate">{{ d.className || d.identity || d.cuid }}</span>
              <el-tag v-if="!d.online" size="small" type="info" effect="plain">{{ $t('dashboard.offline') }}</el-tag>
            </div>
            <el-tag size="small" :type="complianceTagType(d.status)" effect="plain">
              {{ complianceLabel(d.status) }}
            </el-tag>
          </div>

          <div class="text-xs text-gray-500 mt-1">
            {{ $t('pages.plugins.extra.installedCount') }} {{ d.installedCount }} {{ $t('pages.plugins.extra.units') }}
            <span v-if="d.collected"> · {{ $t('pages.plugins.extra.collectedAt') }} {{ formatTime(d.pluginsUpdatedAt) }}</span>
            <span v-else> · {{ $t('pages.plugins.extra.notCollectedYet') }}</span>
            <span v-if="d.profiles.length"> · {{ $t('pages.plugins.extra.profilesColon') }}{{ d.profiles.map((p: any) => p.name).join('、') }}</span>
          </div>

          <div v-if="d.missing.length" class="text-xs mt-1">
            <span class="text-red-500">{{ $t('pages.plugins.extra.missingColon') }}</span>{{ d.missing.map(pluginLabel).join('、') }}
          </div>
          <div
            v-if="d.extra.length"
            class="text-xs text-gray-400 mt-1 truncate"
            :title="d.extra.map(pluginLabel).join('、')"
          >
            {{ $t('pages.plugins.extra.unmanaged') }}{{ d.extra.map(pluginLabel).join('、') }}
          </div>
        </div>
        <el-empty
          v-if="!compliance?.devices?.length"
          :image-size="100"
          :description="$t('pages.plugins.noDevicesOrIdentity')"
        />
      </div>
    </div>

    <!-- 改名 -->
    <ResponsiveDrawer v-model:open="renameVisible" :title="$t('pages.plugins.renamePlugin')">
      <div class="py-2 space-y-3">
        <div>
          <div class="text-sm mb-1.5">{{ $t('pages.plugins.extra.displayName') }}</div>
          <el-input v-model="renameForm.name" maxlength="60" />
          <div class="text-xs text-gray-400 mt-1 leading-relaxed">
            {{ $t('pages.plugins.extra.renameHint1') }}
            <code>{{ renameForm.pluginId || $t('pages.plugins.unrecognized') }}</code>{{ $t('pages.plugins.extra.renameHint2') }}
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="renameVisible = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="renaming" @click="saveRename">{{ $t('pages.subaccounts.save') }}</el-button>
      </template>
    </ResponsiveDrawer>

    <!-- 从 URL 添加插件 -->
    <ResponsiveDrawer v-model:open="showFromUrl" :title="$t('pages.plugins.addPluginFromUrl')">
      <div class="py-2 space-y-4">
        <div>
          <div class="text-sm mb-1.5">{{ $t('pages.plugins.extra.pluginDirectLink') }}</div>
          <el-input v-model="fromUrl.url" placeholder="https://example.com/MyPlugin.cipx" />
          <div class="text-xs text-gray-400 mt-1 leading-relaxed">
            {{ $t('pages.plugins.extra.fromUrlHint') }}
          </div>
        </div>
        <div>
          <div class="text-sm mb-1.5">{{ $t('pages.plugins.extra.optionalName') }}</div>
          <el-input v-model="fromUrl.name" :placeholder="$t('pages.plugins.myPlugins')" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showFromUrl = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="addingFromUrl" @click="addFromUrl">{{ $t('pages.plugins.extra.add') }}</el-button>
      </template>
    </ResponsiveDrawer>

    <!-- 分发弹窗（单插件） -->
    <ResponsiveDrawer v-model:open="deliverVisible" :title="`${$t('pages.plugins.extra.distributePlugin')} · ${deliverTarget?.name || ''}`">
      <div class="py-2">
        <div class="text-sm mb-3">{{ $t('pages.plugins.extra.selectTargetDevices') }}</div>
        <el-checkbox v-model="deliverAll" class="mb-3">{{ $t('pages.plugins.extra.allOnlineDevices') }}</el-checkbox>

        <el-checkbox-group v-if="!deliverAll" v-model="selectedCuis" class="block space-y-1 max-h-72 overflow-y-auto">
          <div
            v-for="c in onlineClients"
            :key="c.cuid"
            class="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0"
          >
            <span class="text-sm">{{ c.className || c.identity || c.cuid }}</span>
            <el-checkbox :value="c.cuid" />
          </div>
          <div v-if="!onlineClients.length" class="text-center text-gray-400 py-6 text-sm">{{ $t('components.notifyqrdialog.noOnlineDevice') }}</div>
        </el-checkbox-group>
      </div>
      <template #footer>
        <el-button @click="deliverVisible = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="delivering" @click="doDeliver">{{ $t('pages.plugins.extra.dispatch') }}</el-button>
      </template>
    </ResponsiveDrawer>

    <!-- 配置组编辑 -->
    <ResponsiveDrawer v-model:open="editorVisible" :title="editorForm._id ? $t('pages.plugins.extra.editProfile') : $t('pages.plugins.extra.newProfile')">
      <div class="py-2 space-y-4">
        <div>
          <div class="text-sm mb-1.5">{{ $t('components.cw2centralpanel.name') }}</div>
          <el-input v-model="editorForm.name" :placeholder="$t('pages.plugins.customName')" maxlength="50" />
        </div>
        <div>
          <div class="text-sm mb-1.5">{{ $t('pages.plugins.extra.descriptionOptional') }}</div>
          <el-input v-model="editorForm.description" type="textarea" :placeholder="$t('pages.plugins.customDescription')" :rows="2" maxlength="200" />
        </div>

        <div>
          <div class="text-sm mb-1.5">{{ $t('pages.plugins.extra.expectedPlugins') }}（{{ editorForm.pluginIds.length }}）</div>
          <el-checkbox-group
            v-if="localPlugins.length"
            v-model="editorForm.pluginIds"
            class="block space-y-1 max-h-56 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded p-2"
          >
            <!-- 用 el-checkbox-group + 自带 label 插槽：Element Plus 的 checkbox 内部已是 label，
                 外面再套一层 <label> 会导致点一次切换两次 -->
            <el-checkbox
              v-for="p in localPlugins"
              :key="p._id"
              :value="p._id"
              class="plugin-pick"
            >
              <span class="text-sm">{{ p.name }}</span>
              <span class="text-xs text-gray-400 font-mono ml-2">{{ p.pluginId || $t('pages.plugins.unrecognizedId') }}</span>
            </el-checkbox>
          </el-checkbox-group>
          <el-empty v-else :image-size="60" :description="$t('pages.plugins.localPluginLibraryEmpty')" />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <div class="text-sm">{{ $t('pages.plugins.extra.boundClasses') }}（{{ editorForm.classIds.length }}）</div>
            <el-button
              v-if="editorForm.classIds.length"
              size="small"
              text
              @click="editorForm.classIds = []"
            >
              {{ $t('pages.plugins.extra.clear') }}
            </el-button>
          </div>

          <!-- 这里刻意不用 el-select：它的浮层默认 teleport 到 body，
                而 ResponsiveDrawer（reka Dialog / vaul Drawer）是模态层，
                会把 body 设成 pointer-events:none，浮层于是看得见点不着；
                且浮层没有 data-dismissable-layer 祖先，会被判定为“点击外部”而关掉抽屉。
                复选框在文档流内渲染，没有浮层，两个问题都不存在。 -->
          <el-input
            v-if="classes.length > 6"
            v-model="classSearch"
            size="small"
            :placeholder="$t('pages.plugins.searchClassHint')"
            clearable
            class="mb-2"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-checkbox-group
            v-if="filteredClasses.length"
            v-model="editorForm.classIds"
            class="block space-y-1 max-h-56 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded p-2"
          >
            <el-checkbox
              v-for="c in filteredClasses"
              :key="c._id"
              :value="c._id"
              class="plugin-pick"
            >
              <span class="text-sm">{{ c.name || c.identity }}</span>
              <span class="text-xs text-gray-400 font-mono ml-2">{{ c.identity || $t('pages.plugins.noIdentity') }}</span>
            </el-checkbox>
          </el-checkbox-group>
          <el-empty v-else :image-size="50" :description="$t('pages.plugins.noMatchingClasses')" />

          <div class="text-xs text-gray-400 mt-1">
            {{ $t('pages.plugins.extra.identityMatchHint') }}
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="editorVisible = false">{{ $t('reauth.cancel') }}</el-button>
        <el-button type="primary" :loading="savingProfile" @click="saveProfile">{{ $t('pages.subaccounts.save') }}</el-button>
      </template>
    </ResponsiveDrawer>

    <!-- 对账结果 -->
    <ResponsiveDrawer v-model:open="reportVisible" :title="`${$t('pages.plugins.extra.reconcileResult')} · ${report?.profile?.name || ''}`">
      <div class="py-2">
        <div class="grid grid-cols-3 gap-2 mb-4">
          <div class="report-stat">
            <div class="report-stat-num">{{ report?.summary?.targetDevices ?? 0 }}</div>
            <div class="report-stat-label">{{ $t('pages.plugins.noTargetDevices') }}</div>
          </div>
          <div class="report-stat">
            <div class="report-stat-num">{{ report?.summary?.pushed ?? 0 }}</div>
            <div class="report-stat-label">{{ $t('pages.plugins.resent') }}</div>
          </div>
          <div class="report-stat">
            <div class="report-stat-num">{{ report?.summary?.noBootstrap ?? 0 }}</div>
            <div class="report-stat-label">{{ $t('pages.plugins.missingBootstrapPlugin') }}</div>
          </div>
        </div>

        <el-alert
          v-if="report?.summary?.noBootstrap"
          type="warning"
          :closable="false"
          show-icon
          class="mb-3"
          :title="$t('pages.plugins.bootstrapPluginMissing')"
          :description="$t('pages.plugins.installBootstrapManually')"
        />
        <el-alert
          v-if="report?.summary?.unknownPlugins?.length"
          type="warning"
          :closable="false"
          show-icon
          class="mb-3"
          :title="`${$t('pages.plugins.extra.unknownPluginsPrefix')}${report.summary.unknownPlugins.length}${$t('pages.plugins.extra.unknownPluginsSuffix')}`"
          :description="report.summary.unknownPlugins.join('、')"
        />

        <div v-if="report?.devices?.length" class="space-y-2">
          <div
            v-for="d in report.devices"
            :key="d.cuid"
            class="report-device"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium truncate">{{ d.className || d.identity || d.cuid }}</span>
              <el-tag size="small" :type="statusType(d.status)" effect="plain">{{ statusText(d.status) }}</el-tag>
            </div>
            <div class="text-xs text-gray-500 mt-1">{{ d.message }}</div>
            <div v-if="d.missing?.length" class="text-xs text-gray-400 mt-1">
              {{ $t('pages.plugins.extra.resentThisTime') }}{{ d.missing.join('、') }}
            </div>
            <div v-if="d.installedCount !== null && d.installedCount !== undefined" class="text-xs text-gray-400 mt-1">
              {{ $t('pages.plugins.extra.deviceInstalled') }} {{ d.installedCount }} {{ $t('pages.plugins.extra.pluginsUnit') }}
            </div>
          </div>
        </div>
        <el-empty v-else :image-size="80" :description="$t('pages.plugins.noTargetDevices')" />

        <div v-if="report?.baseUrl" class="text-xs text-gray-400 mt-4 break-all">
          {{ $t('pages.plugins.extra.downloadPrefix') }}{{ report.baseUrl }}/api/v1/ci/plugin/…
        </div>
      </div>
      <template #footer>
        <el-button @click="reportVisible = false">{{ $t('components.notifyqrdialog.extra.close') }}</el-button>
        <el-button type="primary" @click="refreshAll">{{ $t('pages.security.extra.refresh') }}</el-button>
      </template>
    </ResponsiveDrawer>
  </div>
</template>

<script setup lang="ts">
import { Search, Upload, Grid, Plus, Collection, MagicStick, Link, Refresh } from "@element-plus/icons-vue";
import ResponsiveDrawer from "@/components/ui/ResponsiveDrawer.vue";

definePageMeta({ title: "插件管理", protected: true });

const { t } = useI18n();

const tab = ref<"market" | "local" | "profile" | "compliance">("market");

function auth() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

/** 后端用来拼插件下载地址的对外前缀（必须与客户端实际访问的地址一致） */
function publicBase(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

function openUrl(u: string) {
  if (u) window.open(u, "_blank");
}

function formatSize(bytes: number): string {
  if (!bytes) return "-";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

// ── 引导插件 ──
const bootstrapForm = reactive({ url: "", isDefault: true });

async function fetchBootstrap() {
  try {
    const res: any = await $fetch("/api/v1/console/ci/plugin/bootstrap", { headers: auth() });
    bootstrapForm.url = res.data?.url || "";
    bootstrapForm.isDefault = !!res.data?.isDefault;
  } catch {
    /* 静默：不影响其它标签页 */
  }
}

async function copyBootstrap() {
  try {
    await navigator.clipboard.writeText(bootstrapForm.url);
    ElMessage.success(t('composables.usebootstrapplugin.bootstrapUrlCopied'));
  } catch {
    ElMessage.error(t('components.cw2centralpanel.copyFailed'));
  }
}

function openBootstrap() {
  if (bootstrapForm.url) window.open(bootstrapForm.url, "_blank");
}

// ── 市场 ──
const marketLoading = ref(false);
const marketPlugins = ref<any[]>([]);
const search = ref("");
const importingId = ref("");

const filteredMarket = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return marketPlugins.value;
  return marketPlugins.value.filter(
    (p) =>
      p.name?.toLowerCase().includes(q) ||
      p.author?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q),
  );
});

async function fetchMarket() {
  marketLoading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/plugin/market", { headers: auth() });
    marketPlugins.value = res.data || [];
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.fetchMarketFailed'));
  } finally {
    marketLoading.value = false;
  }
}

async function importFromMarket(p: any) {
  importingId.value = p.id;
  try {
    await $fetch("/api/v1/console/ci/plugin/market/import", {
      method: "POST",
      headers: auth(),
      body: { pluginId: p.id },
    });
    ElMessage.success(`${t('pages.plugins.extra.importedPrefix')}「${p.name}」${t('pages.plugins.extra.importedSuffix')}`);
    await fetchLocal();
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.extra.importFailed'));
  } finally {
    importingId.value = "";
  }
}

// ── 本地 ──
const localLoading = ref(false);
const localPlugins = ref<any[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);

function triggerUpload() {
  fileInput.value?.click();
}

async function fetchLocal() {
  localLoading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/plugin/list", { headers: auth() });
    localPlugins.value = res.data || [];
  } catch {
    /* 静默 */
  } finally {
    localLoading.value = false;
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = String(reader.result || "").split(",")[1] || "";
    try {
      await $fetch("/api/v1/console/ci/plugin/upload", {
        method: "POST",
        headers: auth(),
        body: { name: file.name.replace(/\.cipx$/i, ""), fileName: file.name, fileBase64: base64 },
      });
      ElMessage.success(t('pages.plugins.uploadSucceeded'));
      await fetchLocal();
    } catch (err: any) {
      ElMessage.error(err?.response?._data?.msg || t('pages.plugins.uploadFailed'));
    } finally {
      input.value = "";
    }
  };
  reader.readAsDataURL(file);
}

/** 删除插件；若仍被配置组引用，后端返回 409，这里列出来让用户确认强制删除 */
async function removePlugin(p: any) {
  try {
    await $fetch(`/api/v1/console/ci/plugin/${p._id}`, { method: "DELETE", headers: auth() });
  } catch (e: any) {
    const res = e?.response;
    if (res?.status !== 409) {
      return ElMessage.error(res?._data?.msg || t('pages.plugins.extra.deleteFailed'));
    }
    const names = (res?._data?.data?.usedBy || []).map((x: any) => x.name).join("、");
    try {
      await ElMessageBox.confirm(
        `「${p.name}」${t('pages.plugins.extra.inUsePrefix')}${names}${t('pages.plugins.extra.inUseSuffix')}`,
        t('pages.plugins.pluginInUse'),
        { type: "warning", confirmButtonText: t('pages.plugins.forceDelete'), cancelButtonText: t('reauth.cancel') },
      );
    } catch {
      return; // 用户取消
    }
    try {
      await $fetch(`/api/v1/console/ci/plugin/${p._id}?force=1`, { method: "DELETE", headers: auth() });
    } catch (err: any) {
      return ElMessage.error(err?.response?._data?.msg || t('pages.plugins.extra.deleteFailed'));
    }
  }

  ElMessage.success(t('components.resourceeditor.deleted'));
  await Promise.all([fetchLocal(), fetchProfiles()]);
}

// ── 改名（只改显示名，pluginId 是客户端身份，不随之变化）──
const renameVisible = ref(false);
const renaming = ref(false);
const renameForm = reactive({ _id: "", name: "", pluginId: "" });

function openRename(p: any) {
  renameForm._id = p._id;
  renameForm.name = p.name || "";
  renameForm.pluginId = p.pluginId || "";
  renameVisible.value = true;
}

async function saveRename() {
  const name = renameForm.name.trim();
  if (!name) return ElMessage.warning(t('composables.useciresource.nameRequired'));
  renaming.value = true;
  try {
    await $fetch(`/api/v1/console/ci/plugin/${renameForm._id}/rename`, {
      method: "POST",
      headers: auth(),
      body: { name },
    });
    ElMessage.success(t('pages.plugins.renamed'));
    renameVisible.value = false;
    await Promise.all([fetchLocal(), fetchProfiles()]);
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.renameFailed'));
  } finally {
    renaming.value = false;
  }
}

// ── 更新到市场最新版 ──
const updatingId = ref("");
const checkingUpdates = ref(false);

async function updatePlugin(p: any) {
  updatingId.value = p._id;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/plugin/${p._id}/update`, {
      method: "POST",
      headers: auth(),
    });
    ElMessage.success(`${t('pages.plugins.extra.updatedToPrefix')}v${res.data?.version || "?"}`);
    await Promise.all([fetchLocal(), fetchProfiles()]);
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.updateFailed'));
  } finally {
    updatingId.value = "";
  }
}

/**
 * 检查更新。注意只能更新「插件库指向的版本」——
 * 已经装了旧版的设备不会自动升级（客户端只上报插件 id，不上报版本）。
 */
async function checkUpdates() {
  checkingUpdates.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/plugin/check-updates", {
      method: "POST",
      headers: auth(),
    });
    const d = res.data || {};
    if (d.updatable) {
      const lines = (d.items || [])
        .filter((i: any) => i.outdated)
        .map((i: any) => `${i.name}：${i.currentVersion || "?"} → ${i.latestVersion}`)
        .join("\n");
      ElMessageBox.alert(lines, `${t('pages.plugins.extra.updatablePrefix')}${d.updatable}${t('pages.plugins.extra.updatableSuffix')}`, {
        type: "info",
        customStyle: { whiteSpace: "pre-line" },
      });
    } else {
      ElMessage.success(t('pages.plugins.marketPluginsUpToDate'));
    }
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.checkUpdatesFailed'));
  } finally {
    checkingUpdates.value = false;
  }
}

// ── 清理重复条目（同一 manifest id 只留一条）──
const deduping = ref(false);

async function dedupePlugins() {
  deduping.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/plugin/dedupe", { method: "POST", headers: auth() });
    const d = res.data || {};
    if (!d.removed?.length) {
      ElMessage.success(t('pages.plugins.noDuplicates'));
      return;
    }
    await ElMessageBox.alert(
      d.removed.map((r: any) => `${r.name}（${r.pluginId}）`).join("\n"),
      `${t('pages.plugins.extra.deletedDuplicatesPrefix')}${d.removed.length}${t('pages.plugins.extra.deletedDuplicatesSuffix')}`,
      { type: "success", customStyle: { whiteSpace: "pre-line" } },
    );
    await Promise.all([fetchLocal(), fetchProfiles()]);
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.cleanupFailed'));
  } finally {
    deduping.value = false;
  }
}

// ── 部署状态 ──
const complianceLoading = ref(false);
const compliance = ref<any>(null);
const refreshing = ref(false);

async function fetchCompliance() {
  complianceLoading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/plugin/compliance", { headers: auth() });
    compliance.value = res.data;
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.fetchDeploymentStatusFailed'));
  } finally {
    complianceLoading.value = false;
  }
}

async function refreshAllDevices() {
  refreshing.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/plugin/query-all", { method: "POST", headers: auth() });
    const d = res.data || {};
    ElMessage.success(`${t('pages.plugins.extra.refreshedPrefix')}${d.refreshed ?? 0}/${d.online ?? 0}${t('pages.plugins.extra.refreshedSuffix')}`);
    await fetchCompliance();
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.refreshFailed'));
  } finally {
    refreshing.value = false;
  }
}

/** 把插件 id 显示成库里的名字；设备上手工装的插件不在库里，回落到显示 id */
function pluginLabel(id: string): string {
  return compliance.value?.pluginNames?.[id] || id;
}

function complianceLabel(s: string): string {
  return (
    {
      ok: t('pages.plugins.allUpToDate'),
      missing: t('pages.plugins.missingPlugins'),
      "no-bootstrap": t('pages.plugins.missingBootstrapPlugin'),
      "no-expectation": t('pages.plugins.noConfigGroupBound'),
      unknown: t('pages.devices.notCollected'),
    } as Record<string, string>
  )[s] || s;
}

function complianceTagType(s: string): "success" | "warning" | "danger" | "info" {
  if (s === "ok") return "success";
  if (s === "missing") return "danger";
  if (s === "no-bootstrap") return "warning";
  return "info";
}

function formatTime(t: string | null): string {
  if (!t) return "-";
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 来源标识：市场 / 直链（不占存储）/ 本机托管（上传） */
function sourceLabel(p: any): string {
  if (p.source === "market") return t('pages.plugins.market');
  if (p.source === "upload") return t('pages.plugins.localHosted');
  if (p.source === "url") return t('pages.plugins.directLink');
  return p.storedName ? t('pages.plugins.localHosted') : t('pages.plugins.directLink');
}

// ── 从 URL 添加 ──
const showFromUrl = ref(false);
const addingFromUrl = ref(false);
const fromUrl = reactive({ url: "", name: "" });

async function addFromUrl() {
  const u = fromUrl.url.trim();
  if (!/^https?:\/\//i.test(u)) return ElMessage.warning(t('pages.plugins.enterHttpUrl'));
  addingFromUrl.value = true;
  try {
    await $fetch("/api/v1/console/ci/plugin/from-url", {
      method: "POST",
      headers: auth(),
      body: { url: u, name: fromUrl.name.trim() },
    });
    ElMessage.success(t('pages.plugins.added'));
    showFromUrl.value = false;
    fromUrl.url = "";
    fromUrl.name = "";
    await fetchLocal();
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.addFailed'));
  } finally {
    addingFromUrl.value = false;
  }
}

// ── 单插件分发 ──
const deliverVisible = ref(false);
const deliverTarget = ref<any>(null);
const deliverAll = ref(true);
const selectedCuis = ref<string[]>([]);
const delivering = ref(false);
const onlineClients = ref<any[]>([]);

async function openDeliver(p: any) {
  deliverTarget.value = p;
  deliverAll.value = true;
  selectedCuis.value = [];
  deliverVisible.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/clients", { headers: auth() });
    onlineClients.value = (res.data || []).filter((c: any) => c.online);
  } catch {
    onlineClients.value = [];
  }
}

async function doDeliver() {
  delivering.value = true;
  try {
    if (deliverAll.value) {
      const res: any = await $fetch("/api/v1/console/ci/plugin/deliver", {
        method: "POST",
        headers: auth(),
        body: { pluginId: deliverTarget.value._id, all: true, baseUrl: publicBase() },
      });
      ElMessage.success(`${t('pages.plugins.extra.dispatchedPrefix')}${res.data?.sent ?? 0}${t('pages.plugins.extra.dispatchedSuffix')}`);
    } else {
      if (!selectedCuis.value.length) return ElMessage.warning(t('pages.plugins.selectAtLeastOneDevice'));
      let sent = 0;
      for (const cuid of selectedCuis.value) {
        const res: any = await $fetch("/api/v1/console/ci/plugin/deliver", {
          method: "POST",
          headers: auth(),
          body: { pluginId: deliverTarget.value._id, cuid, baseUrl: publicBase() },
        });
        sent += res.data?.sent ?? 0;
      }
      ElMessage.success(`${t('pages.plugins.extra.dispatchedPrefix')}${sent}${t('pages.plugins.extra.dispatchedSuffix')}`);
    }
    deliverVisible.value = false;
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.extra.dispatchFailed'));
  } finally {
    delivering.value = false;
  }
}

// ── 配置组 ──
const profileLoading = ref(false);
const profiles = ref<any[]>([]);
const classes = ref<any[]>([]);

const editorVisible = ref(false);
const savingProfile = ref(false);
const editorForm = reactive({ _id: "", name: "", description: "", pluginIds: [] as string[], classIds: [] as string[] });
const classSearch = ref("");

/** 班级较多时提供本地筛选（替代 el-select 的 filterable，见模板里的说明） */
const filteredClasses = computed(() => {
  const q = classSearch.value.trim().toLowerCase();
  if (!q) return classes.value;
  return classes.value.filter(
    (c: any) =>
      String(c.name || "").toLowerCase().includes(q) ||
      String(c.identity || "").toLowerCase().includes(q),
  );
});

const applyingId = ref("");
const reportVisible = ref(false);
const report = ref<any>(null);

async function fetchProfiles() {
  profileLoading.value = true;
  try {
    const res: any = await $fetch("/api/v1/console/ci/plugin/profile/list", { headers: auth() });
    profiles.value = res.data || [];
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.fetchConfigGroupsFailed'));
  } finally {
    profileLoading.value = false;
  }
}

async function fetchClasses() {
  if (classes.value.length) return;
  try {
    const res: any = await $fetch("/api/v1/console/ci/class/list", { headers: auth() });
    classes.value = res.data || [];
  } catch {
    classes.value = [];
  }
}

async function openProfileEditor(g?: any) {
  await Promise.all([fetchLocal(), fetchClasses()]);
  classSearch.value = "";
  editorForm._id = g?._id || "";
  editorForm.name = g?.name || "";
  editorForm.description = g?.description || "";
  editorForm.pluginIds = (g?.plugins || []).filter((p: any) => p.exists).map((p: any) => p._id);
  editorForm.classIds = (g?.classes || []).filter((c: any) => c.identity).map((c: any) => c._id);
  editorVisible.value = true;
}

async function saveProfile() {
  if (!editorForm.name.trim()) return ElMessage.warning(t('pages.plugins.enterConfigGroupName'));
  savingProfile.value = true;
  try {
    await $fetch("/api/v1/console/ci/plugin/profile", {
      method: "POST",
      headers: auth(),
      body: {
        _id: editorForm._id || undefined,
        name: editorForm.name,
        description: editorForm.description,
        pluginIds: editorForm.pluginIds,
        classIds: editorForm.classIds,
      },
    });
    ElMessage.success(t('components.resourceeditor.saved'));
    editorVisible.value = false;
    await fetchProfiles();
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('components.resourceeditor.saveFailed'));
  } finally {
    savingProfile.value = false;
  }
}

async function removeProfile(g: any) {
  try {
    await $fetch(`/api/v1/console/ci/plugin/profile/${g._id}`, { method: "DELETE", headers: auth() });
    ElMessage.success(t('components.resourceeditor.deleted'));
    await fetchProfiles();
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.extra.deleteFailed'));
  }
}

async function applyProfile(g: any) {
  applyingId.value = g._id;
  try {
    const res: any = await $fetch(`/api/v1/console/ci/plugin/profile/${g._id}/apply`, {
      method: "POST",
      headers: auth(),
      body: { baseUrl: publicBase() },
    });
    report.value = res.data;
    reportVisible.value = true;
    const s = res.data?.summary || {};
    if (s.pushed) ElMessage.success(`${t('pages.plugins.extra.resentPrefix')}${s.pushed}${t('pages.plugins.extra.resentSuffix')}`);
    else if (s.noBootstrap) ElMessage.warning(`${s.noBootstrap}${t('pages.plugins.extra.noBootstrapWarningSuffix')}`);
    else if (s.offline || s.noResponse) ElMessage.warning(t('pages.plugins.targetDevicesUnreachable'));
    else ElMessage.success(t('pages.plugins.allTargetsUpToDate'));
  } catch (e: any) {
    ElMessage.error(e?.response?._data?.msg || t('pages.plugins.reconcileFailed'));
  } finally {
    applyingId.value = "";
  }
}

function statusText(s: string): string {
  return (
    {
      "up-to-date": t('pages.plugins.upToDate'),
      pushed: t('pages.plugins.resent'),
      partial: t('pages.plugins.partiallyResent'),
      "no-bootstrap": t('pages.plugins.missingBootstrapPlugin'),
      offline: t('dashboard.offline'),
      "no-response": t('pages.plugins.noResponse'),
    }[s] || s
  );
}

function statusType(s: string): "success" | "warning" | "danger" | "info" {
  if (s === "up-to-date") return "success";
  if (s === "pushed") return "success";
  if (s === "partial") return "warning";
  if (s === "no-bootstrap") return "warning";
  if (s === "offline" || s === "no-response") return "info";
  return "info";
}

async function refreshAll() {
  await Promise.all([fetchLocal(), fetchProfiles(), fetchClasses(), fetchBootstrap()]);
}

onMounted(() => {
  fetchMarket();
  fetchLocal();
  fetchBootstrap();
  fetchProfiles();
});

watch(tab, (t) => {
  if (t === "profile") fetchProfiles();
  if (t === "local") fetchLocal();
  if (t === "compliance") fetchCompliance();
});
</script>

<style scoped>
.plugin-card {
  border-radius: var(--mi-radius-lg);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.plugin-card:hover {
  transform: translateY(-2px);
}
.plugin-card :deep(.el-card__body) {
  padding: 18px;
}
.plugin-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--mi-brand-light);
  color: var(--mi-brand-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.plugin-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.plugin-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.5em;
}

.bootstrap-card {
  border-radius: var(--mi-radius-lg);
  border: 1px dashed var(--mi-brand-light);
  background: linear-gradient(135deg, var(--mi-brand-light) 0%, transparent 60%);
}
.bootstrap-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--mi-brand-light);
  color: var(--mi-brand-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.bootstrap-input {
  max-width: 30rem;
}
.plugin-pick {
  display: flex;
  width: 100%;
  height: auto;
  margin-right: 0;
}
.plugin-pick :deep(.el-checkbox__label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-stat {
  text-align: center;
  padding: 10px 6px;
  border-radius: var(--mi-radius-md, 10px);
  background: var(--mi-brand-light);
}
.report-stat-num {
  font-size: 20px;
  font-weight: 600;
  color: var(--mi-brand-deep);
  line-height: 1.2;
}
.report-stat-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
.report-device {
  padding: 10px 12px;
  border-radius: var(--mi-radius-md, 10px);
  border: 1px solid var(--el-border-color-lighter);
}
</style>
