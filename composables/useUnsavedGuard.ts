/**
 * 未保存离开提示。
 * 用法: const { isDirty } = useUnsavedGuard()
 *       数据变更时 isDirty.value = true，保存成功后 isDirty.value = false
 */
export function useUnsavedGuard() {
  const isDirty = ref(false);

  // 路由跳转拦截 — 弹出 Element Plus 确认框
  onBeforeRouteLeave(async () => {
    if (!isDirty.value) return true;
    try {
      await ElMessageBox.confirm(
        "有未保存的内容，退出将丢失编辑器内所有未保存更改",
        "提示",
        { confirmButtonText: "放弃更改", cancelButtonText: "继续编辑", type: "warning" },
      );
      return true;
    } catch {
      return false;
    } finally {
      isDirty.value = false;
    }
  });

  // 浏览器关闭/刷新拦截
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty.value) {
      e.preventDefault();
      e.returnValue = "";
    }
  };

  onMounted(() => window.addEventListener("beforeunload", onBeforeUnload));
  onUnmounted(() => window.removeEventListener("beforeunload", onBeforeUnload));

  return { isDirty };
}
