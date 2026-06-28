export const defineI18nPageMeta = (key: string) => {
  const { t } = useI18n();
  return definePageMeta({
    title: () => t(key) + " | CrabCity",
  });
};
