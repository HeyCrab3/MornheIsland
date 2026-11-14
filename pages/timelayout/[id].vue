<template>
  <ResourceEditor collection="timelayout" label="时间表">
    <template #default="{ doc, save, viewOnly }">
      <TimeLayoutEditor v-if="doc" :model-value="doc.data" :name="doc.name" :view-only="viewOnly" @save="save" />
    </template>
  </ResourceEditor>
</template>
<script setup lang="ts">
definePageMeta({ title: "编辑时间表", protected: true });
</script>
