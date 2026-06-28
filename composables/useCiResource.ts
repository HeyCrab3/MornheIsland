/**
 * CI 资源库通用逻辑。
 * 课表/时间表/科目/设置/策略的列表和编辑共用。
 */
export function useCiResource(collection: string, label: string) {
  const items = ref<any[]>([]);
  const loading = ref(false);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  async function fetchList() {
    loading.value = true;
    try {
      const res: any = await $fetch(`/api/v1/console/ci/${collection}/list`, {
        headers: authHeaders(),
      });
      items.value = res.data || [];
    } finally {
      loading.value = false;
    }
  }

  async function createItem(name: string, data?: any) {
    const res: any = await $fetch(`/api/v1/console/ci/${collection}`, {
      method: "POST",
      headers: authHeaders(),
      body: { name, data },
    });
    return res.data;
  }

  async function removeItem(id: string) {
    try {
      await $fetch(`/api/v1/console/ci/${collection}/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      ElMessage.success(`${label}已删除`);
      await fetchList();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        const msg = e?.response?._data?.msg || "该资源被班级引用，无法删除";
        ElMessageBox.alert(msg, "无法删除", { type: "warning", confirmButtonText: "知道了" });
      } else {
        ElMessage.error("删除失败");
      }
    }
  }

  return { items, loading, fetchList, createItem, removeItem, authHeaders };
}

/**
 * 资源编辑器通用逻辑。
 */
export function useCiResourceEditor(collection: string, label: string) {
  const route = useRoute();
  const id = route.params.id as string;
  const doc = ref<any>(null);
  const loading = ref(false);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  async function fetchDoc() {
    loading.value = true;
    try {
      const res: any = await $fetch(`/api/v1/console/ci/${collection}/${id}`, {
        headers: authHeaders(),
      });
      doc.value = res.data;
    } finally {
      loading.value = false;
    }
  }

  async function save(data: any, name?: string) {
    const body: any = { data };
    if (name !== undefined) body.name = name;
    const res: any = await $fetch(`/api/v1/console/ci/${collection}/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body,
    });
    ElMessage.success(`${label}已保存，v${res.data?.version}`);
    if (doc.value) {
      doc.value.version = res.data?.version;
      if (name !== undefined) doc.value.name = name;
    }
  }

  onMounted(fetchDoc);

  return { doc, loading, save, authHeaders };
}

/** 所有资源类型及其标签 */
export const CI_RESOURCES = {
  classplan: { collection: "classplan", label: "课表" },
  timelayout: { collection: "timelayout", label: "时间表" },
  subjects:  { collection: "subjects",  label: "科目" },
  settings:  { collection: "settings",  label: "设置" },
  policy:    { collection: "policy",    label: "策略" },
} as const;
