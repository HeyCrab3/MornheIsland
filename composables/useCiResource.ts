/**
 * CI 资源库通用逻辑。
 * 课表/时间表/科目/设置/策略的列表和编辑共用。
 */
export function useCiResource(collection: string, label: string) {
  const { t } = useI18n();
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
      ElMessage.success(`${label}${t('components.resourceeditor.deleted')}`);
      await fetchList();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        const msg = e?.response?._data?.msg || t('composables.useciresource.resourceInUseCannotDelete');
        ElMessageBox.alert(msg, t('components.resourceeditor.cannotDelete'), { type: "warning", confirmButtonText: t('composables.useciresource.gotIt') });
      } else {
        ElMessage.error(t('composables.useciresource.deleteFailed'));
      }
    }
  }

  /**
   * 重命名。走专用的 rename 接口：只改显示名，**不动 version、不写历史版本**，
   * 否则客户端会把配置当成有新版本白白重拉一遍。
   */
  async function renameItem(id: string, currentName: string) {
    let input: string;
    try {
      const res = await ElMessageBox.prompt(t('composables.useciresource.renamePrompt', { name: currentName }), t('composables.useciresource.renameTitle', { label }), {
        confirmButtonText: t('components.resourceeditor.confirm'),
        cancelButtonText: t('reauth.cancel'),
        inputValue: currentName,
        inputValidator: (v: string) => {
          const val = String(v ?? "").trim();
          if (!val) return t('composables.useciresource.nameRequired');
          if (val.length > 100) return t('composables.useciresource.nameTooLong');
          return true;
        },
      });
      input = String(res.value).trim();
    } catch {
      return; // 用户取消
    }
    if (input === currentName) return;

    try {
      await $fetch(`/api/v1/console/ci/${collection}/${id}/rename`, {
        method: "POST",
        headers: authHeaders(),
        body: { name: input },
      });
      ElMessage.success(t('composables.useciresource.renamed', { name: input }));
      await fetchList();
    } catch (e: any) {
      ElMessage.error(e?.data?.msg || t('composables.useciresource.renameFailed'));
    }
  }

  return { items, loading, fetchList, createItem, removeItem, renameItem, authHeaders };
}

/**
 * 资源编辑器通用逻辑。
 */
export function useCiResourceEditor(collection: string, label: string) {
  const { t } = useI18n();
  const route = useRoute();
  const id = route.params.id as string;
  const doc = ref<any>(null);
  // 已保存内容供复制使用；doc.data 是子编辑器的加载输入，保存响应不能重置它。
  const persistedData = ref<any>(null);
  watch(doc, (value) => {
    persistedData.value = value?.data == null ? value?.data : JSON.parse(JSON.stringify(value.data));
  }, { flush: "sync" });
  const loading = ref(false);
  const dataReady = ref(false);

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
      nextTick(() => { dataReady.value = true; });
    } finally {
      loading.value = false;
    }
  }

  async function save(data: any, name?: string) {
    // 固定本次提交的数据，避免请求期间继续编辑改变保存成功后的副本。
    const savedData = JSON.parse(JSON.stringify(data));
    const savingDoc = doc.value;
    const body: any = { data: savedData };
    if (name !== undefined) body.name = name;
    const res: any = await $fetch(`/api/v1/console/ci/${collection}/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body,
    });
    ElMessage.success(t('composables.useciresource.savedVersion', { label, version: res.data?.version }));
    if (doc.value && doc.value === savingDoc) {
      persistedData.value = savedData;
      doc.value.version = res.data?.version;
      if (name !== undefined) doc.value.name = name;
    }
  }

  onMounted(fetchDoc);

  return { doc, persistedData, loading, dataReady, save, authHeaders };
}

