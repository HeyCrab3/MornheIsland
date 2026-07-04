/**
 * 暗色模式。
 * 用法: const { isDark, toggle } = useDarkMode()
 */
export function useDarkMode() {
  const isDark = ref(false);

  function apply() {
    if (typeof document === "undefined") return;
    if (isDark.value) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function persist() {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem("mi-dark-mode", isDark.value ? "1" : "0");
  }

  onMounted(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("mi-dark-mode") : null;
    if (saved === "1") {
      isDark.value = true;
    } else if (saved === null) {
      // 首次访问，跟随系统
      isDark.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    apply();
  });

  watch(isDark, () => {
    apply();
    persist();
  });

  const toggle = () => {
    isDark.value = !isDark.value;
  };

  return { isDark, toggle };
}
