/**
 * 引导插件（莫宁岛集控扩展）下载地址。
 *
 * ClassIsland 没有「服务端装插件」的能力，ManagementSettings 里也没有插件源字段，
 * 所以每台机器必须先手动装一次引导插件，之后才收得到插件分发指令（命令 200）。
 * 部署页面把它显出来，省得现场翻文档。
 *
 * 只读：修改入口在「插件管理」页。
 */
export function useBootstrapPlugin() {
  const url = ref("");
  const isDefault = ref(true);
  const loading = ref(false);
  const loaded = ref(false);

  function authHeaders() {
    return { Authorization: `Bearer ${localStorage.getItem("token")}` };
  }

  async function fetchUrl() {
    loading.value = true;
    try {
      const res: any = await $fetch("/api/v1/console/ci/plugin/bootstrap", { headers: authHeaders() });
      url.value = res.data?.url || "";
      isDefault.value = !!res.data?.isDefault;
      loaded.value = true;
    } catch {
      /* 静默：取不到就不显示这块，不影响部署主流程 */
    } finally {
      loading.value = false;
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url.value);
      ElMessage.success("已复制引导插件地址");
    } catch {
      ElMessage.error("复制失败");
    }
  }

  function open() {
    if (url.value) window.open(url.value, "_blank");
  }

  return { url, isDefault, loading, loaded, fetchUrl, copy, open };
}
