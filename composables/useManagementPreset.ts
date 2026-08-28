/**
 * 生成 / 复制 / 下载 ClassIsland 集控配置文件（ManagementPreset.json）。
 * 每个班级一份，含 ManifestUrlTemplate（{id} 模板）与 ClassIdentity。
 */
export function useManagementPreset() {
  const apiOrigin = computed(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return "https://your-server";
  });

  function buildPreset(cls: any): string {
    return JSON.stringify(
      {
        ManagementServerKind: 0,
        ManifestUrlTemplate: `${apiOrigin.value}/api/v1/ci/${String(cls._id)}/manifest.json`,
        ClassIdentity: cls.identity,
      },
      null,
      2,
    );
  }

  async function copyPreset(cls: any) {
    try {
      await navigator.clipboard.writeText(buildPreset(cls));
      ElMessage.success(`已复制 ${cls.name || cls.identity} 的配置文件`);
    } catch {
      ElMessage.error("复制失败");
    }
  }

  function downloadPreset(cls: any) {
    const blob = new Blob([buildPreset(cls)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ManagementPreset.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return { buildPreset, copyPreset, downloadPreset };
}
