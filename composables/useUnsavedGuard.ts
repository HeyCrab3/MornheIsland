/**
 * 未保存离开提示。
 * 用法: const { isDirty } = useUnsavedGuard()
 *       数据变更时 isDirty.value = true，保存成功后 isDirty.value = false
 */
export function useUnsavedGuard() {
  const { t } = useI18n();
  const isDirty = ref(false);

  // 路由跳转拦截 — 弹出 Element Plus 确认框
  onBeforeRouteLeave(async () => {
    if (!isDirty.value) return true;
    try {
      await ElMessageBox.confirm(
        t('composables.useunsavedguard.unsavedChangesWarning'),
        t('composables.useunsavedguard.notice'),
        {
          confirmButtonText: t('composables.useunsavedguard.discardChanges'),
          cancelButtonText: t('composables.useunsavedguard.continueEditing'),
          type: "warning",
        },
      );
      return true;
    } catch {
      return false;
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
