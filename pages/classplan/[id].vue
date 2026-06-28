<template>
  <ResourceEditor collection="classplan" label="课表">
    <template #default="{ doc, save, saving }">
      <ClassPlanEditor v-if="doc" :model-value="doc.data" @save="save" />
    </template>
  </ResourceEditor>
</template>
<script setup lang="ts">
definePageMeta({ title: "编辑课表", protected: true });
</script>
