<template>
  <div
    class="cell-zone rounded min-h-9 flex items-center justify-center text-sm transition-all"
    :class="[subject ? (props.inherited ? 'inherited' : 'has-subject') : 'empty', { 'drag-hover': dragOver }]"
    @dragover.prevent="dragOver = true"
    @dragleave="dragOver = false"
    @drop="onDrop"
    @click="openPicker"
  >
    <span v-if="subject" class="truncate">{{ subject }}</span>
    <span v-else class="text-gray-300 text-xs">—</span>
    <el-icon v-if="subject" class="ml-1 cursor-pointer text-gray-400 hover:text-red-400" @click.stop="$emit('remove')">
      <Close />
    </el-icon>
  </div>

  <!-- 快速选择器 -->
  <Teleport to="body">
    <div v-if="pickerOpen" class="fixed inset-0 z-50" @click="pickerOpen = false">
      <div
        class="absolute bg-white rounded-lg shadow-xl border p-2 min-w-32"
        :style="{ left: pickerPos.x + 'px', top: pickerPos.y + 'px' }"
        @click.stop
      >
        <div
          v-for="s in availableSubjects"
          :key="s.name"
          class="px-3 py-1.5 text-sm rounded cursor-pointer hover:bg-gray-100"
          @click="selectSubject(s.name)"
        >
          {{ s.name }}
        </div>
        <div v-if="subject" class="border-t mt-1 pt-1">
          <div class="px-3 py-1.5 text-sm text-red-400 rounded cursor-pointer hover:bg-red-50" @click="selectSubject('')">
            清除
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { Close } from "@element-plus/icons-vue";

const props = defineProps<{
  day: string;
  periodIndex: number;
  subject: string;
  inherited?: boolean;
}>();

const emit = defineEmits<{
  assign: [day: string, periodIndex: number, subject: string];
  remove: [];
}>();

const dragOver = ref(false);
const pickerOpen = ref(false);
const pickerPos = ref({ x: 0, y: 0 });

// 从全局 subjectPool 获取（由父组件 provide）
const availableSubjects = inject<{ name: string }[]>("subjectPool", []);

function onDrop(e: DragEvent) {
  dragOver.value = false;
  const raw = e.dataTransfer?.getData("text/plain");
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    const name = data.name || data;
    if (name) emit("assign", props.day, props.periodIndex, name);
  } catch {
    // raw text fallback
    emit("assign", props.day, props.periodIndex, raw);
  }
}

function openPicker(e: MouseEvent) {
  pickerPos.value = { x: e.clientX - 10, y: e.clientY - 10 };
  pickerOpen.value = true;
}

function selectSubject(name: string) {
  emit("assign", props.day, props.periodIndex, name);
  pickerOpen.value = false;
}
</script>

<style scoped>
.cell-zone {
  cursor: pointer;
  border: 1px dashed transparent;
}
.cell-zone.empty {
  border-color: #e5e7eb;
}
.cell-zone.has-subject {
  background: #e8f0fe;
  border-color: #90b4f0;
  padding: 2px 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cell-zone.inherited {
  background: #f0f4e8;
  border-color: #bccf90;
  border-style: dashed;
  padding: 2px 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-style: italic;
}
.cell-zone.drag-hover {
  border-color: var(--mi-accent);
  background: var(--mi-accent-bg);
}
.cell-zone:hover {
  border-color: var(--mi-brand);
}
</style>
