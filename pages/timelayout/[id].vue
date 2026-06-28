<template>
  <ResourceEditor collection="timelayout" label="时间表">
    <template #default="{ doc, save }">
      <TimeLayoutEditor v-if="doc" :model-value="doc.data" @save="save" />
    </template>
  </ResourceEditor>
</template>
<script setup lang="ts">
definePageMeta({ title: "编辑时间表", protected: true });
</script>
