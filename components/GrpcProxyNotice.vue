<template>
  <el-alert type="warning" :closable="false" show-icon class="mt-2">
    <template #title>{{ $t('components.grpcproxynotice.extra.proxyExceptionTitle') }}</template>
    <div class="text-xs leading-relaxed space-y-2">
      <p>
        {{ $t('components.grpcproxynotice.extra.grpcProxyIntro1') }}
        <b>{{ $t('components.grpcproxynotice.extra.grpcProxyIntroBold') }}</b>{{ $t('components.grpcproxynotice.extra.grpcProxyIntroNote') }}
        {{ $t('components.grpcproxynotice.extra.grpcProxyIntro2') }}
        <code>Unable to get subchannel from HttpRequestMessage</code>{{ $t('components.grpcproxynotice.extra.grpcProxyIntro3') }}
        <code>http://</code>{{ $t('components.grpcproxynotice.extra.grpcProxyIntro4') }}
        <code>unable to establish HTTP/2 connection</code>{{ $t('components.grpcproxynotice.extra.grpcProxyIntro7') }}
        <b>{{ $t('components.grpcproxynotice.extra.grpcProxyIntro5') }}</b>{{ $t('components.grpcproxynotice.extra.grpcProxyIntro6') }}
      </p>
      <p>
        {{ $t('components.grpcproxynotice.extra.grpcProxySolution1') }}<b>{{ $t('components.grpcproxynotice.extra.grpcProxySolutionBold') }}</b>{{ $t('components.grpcproxynotice.extra.grpcProxySolution2') }}
        <code>{{ host }}</code>{{ $t('components.grpcproxynotice.extra.grpcProxySolution3') }}
      </p>
      <p class="text-gray-500">
        {{ $t('components.grpcproxynotice.extra.grpcProxyWarning1') }}<b>{{ $t('components.grpcproxynotice.extra.grpcProxyWarningBold') }}</b>{{ $t('components.grpcproxynotice.extra.grpcProxyWarning2') }}
      </p>
      <el-button size="small" text type="primary" class="!px-0" @click="copyHost">
        <el-icon class="mr-1"><CopyDocument /></el-icon>{{ $t('components.grpcproxynotice.extra.copyExceptionAddress') }}
      </el-button>
    </div>
  </el-alert>
</template>

<script setup lang="ts">
import { CopyDocument } from "@element-plus/icons-vue";

const { t } = useI18n();

const props = defineProps<{ address?: string }>();

/** 代理例外按主机名匹配，不含端口；地址残缺时也给个能用的兜底 */
const host = computed(() => {
  const raw = (props.address || "").trim();
  if (!raw || /your-(host|server)/.test(raw)) return "mornheisland-grpc.crabapi.cn";
  try {
    return new URL(raw.includes("://") ? raw : `http://${raw}`).hostname || raw;
  } catch {
    return raw;
  }
});

async function copyHost() {
  try {
    await navigator.clipboard.writeText(host.value);
    ElMessage.success(t('components.grpcproxynotice.extra.copiedExceptionAddress', { host: host.value }));
  } catch {
    ElMessage.error(t('components.cw2centralpanel.copyFailed'));
  }
}
</script>
