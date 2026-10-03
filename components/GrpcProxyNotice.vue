<template>
  <el-alert type="warning" :closable="false" show-icon class="mt-2">
    <template #title>教室电脑若开着代理软件，必须把 gRPC 域名加进「代理例外」</template>
    <div class="text-xs leading-relaxed space-y-2">
      <p>
        ClassIsland 用 .NET 的 GrpcChannel 直连这个地址，而
        <b>Grpc.Net.Client 的负载均衡层与 HTTP 代理不兼容</b>（上游已知限制，暂无修复时间表）。
        系统代理一开，客户端就会报
        <code>Unable to get subchannel from HttpRequestMessage</code>；
        若地址是明文 <code>http://</code>，则是
        <code>unable to establish HTTP/2 connection</code>。
        <b>换成 https:// 也解决不了</b>——它只影响报错内容，不影响能否连上。
      </p>
      <p>
        解决办法只有一个：让客户端<b>不走代理</b>连接本域名。
        在「Internet 选项 → 连接 → 局域网设置 → 高级 → 例外」里加上
        <code>{{ host }}</code>，或在代理软件里关掉系统代理、改用 TUN / 虚拟网卡模式。
      </p>
      <p class="text-gray-500">
        注意：仅在代理软件里给该域名配一条「直连 / DIRECT」规则<b>无效</b>，
        流量仍会先进代理进程，照样触发这个 bug。
      </p>
      <el-button size="small" text type="primary" class="!px-0" @click="copyHost">
        <el-icon class="mr-1"><CopyDocument /></el-icon>复制例外地址
      </el-button>
    </div>
  </el-alert>
</template>

<script setup lang="ts">
import { CopyDocument } from "@element-plus/icons-vue";

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
    ElMessage.success(`已复制代理例外地址：${host.value}`);
  } catch {
    ElMessage.error("复制失败");
  }
}
</script>
