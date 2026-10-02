/**
 * 生成 / 复制 / 下载 ClassIsland 集控配置文件（ManagementPreset.json）。
 *
 * 支持两种加入模式：
 *  - serverless：静态清单（ManifestUrlTemplate），客户端轮询拉取
 *  - grpc：集控服务器（ManagementServer + ManagementServerGrpc），支持实时指令
 *
 * ManagementServerGrpc 是客户端**直连**的地址，不走 443、也不经过 /api 代理，
 * 所以不能只看控制台域名——生产环境容易踩坑：
 *   · 只放行了 443 → 客户端连不上，集控模式下连“加入”都做不到（RegisterAsync 走 gRPC）
 *   · 走 nginx 把 gRPC 反代到 443 且上了 TLS → 应该填 https://域名
 * 因此优先用后端 config.public_grpc_address 下发的值，没配才退回推断。
 */
export type PresetMode = "serverless" | "grpc";

export function useManagementPreset() {
  const apiOrigin = computed(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return "https://your-server";
  });

  /** 服务端下发的 gRPC 接入信息（全局缓存一次） */
  const grpcEndpoint = useState("mi-grpc-endpoint", () => ({
    loaded: false,
    listening: true,
    port: 20722,
    configured: "",
    isConfigured: false,
  }));

  /** 按「控制台域名 + 端口」推断——只在客户端能直连该端口时成立 */
  function derivedGrpcAddress(): string {
    const port = grpcEndpoint.value.port || 20722;
    if (typeof window === "undefined") return `http://your-server:${port}`;
    try {
      const u = new URL(window.location.origin);
      return `http://${u.hostname}:${port}`;
    } catch {
      return `http://localhost:${port}`;
    }
  }

  /** 实际写进 preset 的地址：后端显式配置优先，否则用推断值 */
  function defaultGrpcAddress(): string {
    return grpcEndpoint.value.configured || derivedGrpcAddress();
  }

  /** 拉取后端下发的 gRPC 地址与监听状态；失败则保持推断值 */
  async function loadGrpcEndpoint(): Promise<void> {
    try {
      const res: any = await $fetch("/api/v1/console/ci/grpc/endpoint", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      grpcEndpoint.value = { loaded: true, ...(res.data || {}) };
    } catch {
      /* 静默：取不到就继续用推断值 */
    }
  }

  function buildPreset(cls: any, mode: PresetMode = "serverless", grpcAddress?: string): string {
    const identity = cls?.identity ?? "";

    if (mode === "grpc") {
      return JSON.stringify(
        {
          ManagementServerKind: 1,
          ManagementServer: apiOrigin.value,
          ManagementServerGrpc: grpcAddress || defaultGrpcAddress(),
          ClassIdentity: identity,
        },
        null,
        2,
      );
    }

    return JSON.stringify(
      {
        ManagementServerKind: 0,
        ManifestUrlTemplate: `${apiOrigin.value}/api/v1/ci/${String(cls?._id)}/manifest.json`,
        ClassIdentity: identity,
      },
      null,
      2,
    );
  }

  async function copyPreset(cls: any, mode: PresetMode = "serverless", grpcAddress?: string) {
    try {
      await navigator.clipboard.writeText(buildPreset(cls, mode, grpcAddress));
      ElMessage.success(`已复制 ${cls?.name || cls?.identity} 的配置文件（${mode === "grpc" ? "集控服务器" : "静态配置"}模式）`);
    } catch {
      ElMessage.error("复制失败");
    }
  }

  function downloadPreset(cls: any, mode: PresetMode = "serverless", grpcAddress?: string) {
    const blob = new Blob([buildPreset(cls, mode, grpcAddress)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ManagementPreset.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    buildPreset,
    copyPreset,
    downloadPreset,
    defaultGrpcAddress,
    derivedGrpcAddress,
    loadGrpcEndpoint,
    grpcEndpoint,
  };
}
