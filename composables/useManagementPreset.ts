/**
 * 生成 / 复制 / 下载 ClassIsland 集控配置文件（ManagementPreset.json）。
 *
 * 支持两种加入模式：
 *  - serverless：静态清单（ManifestUrlTemplate），客户端轮询拉取
 *  - grpc：集控服务器（ManagementServer + ManagementServerGrpc），支持实时指令
 */
export type PresetMode = "serverless" | "grpc";

export function useManagementPreset() {
  const apiOrigin = computed(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return "https://your-server";
  });

  /** 默认 gRPC 地址（http://host:20722，界面上可覆盖） */
  function defaultGrpcAddress(): string {
    if (typeof window === "undefined") return "http://your-server:20722";
    try {
      const u = new URL(window.location.origin);
      return `http://${u.hostname}:20722`;
    } catch {
      return "http://localhost:20722";
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

  return { buildPreset, copyPreset, downloadPreset, defaultGrpcAddress };
}
