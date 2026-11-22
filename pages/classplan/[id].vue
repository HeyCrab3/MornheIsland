<template>
  <ResourceEditor collection="classplan" :label="$t('composables.useciresource.plan')">
    <template #default="{ doc, save, saving, viewOnly }">
      <ClassPlanEditor v-if="doc" :model-value="doc.data" :view-only="viewOnly" @save="save" />
    </template>
  </ResourceEditor>
</template>
<script setup lang="ts">
definePageMeta({ title: "编辑课表", protected: true });
</script>
