<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';

type Props = {
  modelValue: string;
  placeholder?: string;
};

const props = defineProps<Props>();
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const editorRef = ref<HTMLDivElement | null>(null);
const isFocused = ref(false);
const lastEmitted = ref(props.modelValue ?? '');

function setEditorHtml(value: string) {
  if (!editorRef.value) {
    return;
  }
  editorRef.value.innerHTML = value;
}

function syncValue() {
  if (!editorRef.value) {
    return;
  }
  const html = editorRef.value.innerHTML;
  if (html === lastEmitted.value) {
    return;
  }
  lastEmitted.value = html;
  emit('update:modelValue', html);
}

function handleInput() {
  syncValue();
}

function handleBlur() {
  isFocused.value = false;
  syncValue();
}

function handleFocus() {
  isFocused.value = true;
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
  syncValue();
}

function insertLink() {
  const url = window.prompt('输入链接地址');
  if (!url) {
    return;
  }
  exec('createLink', url);
}

function clearFormatting() {
  exec('removeFormat');
  exec('unlink');
}

watch(
  () => props.modelValue,
  (value) => {
    if (isFocused.value) {
      return;
    }
    if (value === lastEmitted.value) {
      return;
    }
    lastEmitted.value = value ?? '';
    void nextTick(() => setEditorHtml(lastEmitted.value));
  },
);

onMounted(() => {
  setEditorHtml(props.modelValue ?? '');
});
</script>

<template>
  <div class="rich-text-editor">
    <div class="rich-text-toolbar">
      <Button type="button" size="sm" variant="secondary" @click="exec('bold')">加粗</Button>
      <Button type="button" size="sm" variant="secondary" @click="exec('italic')">斜体</Button>
      <Button type="button" size="sm" variant="secondary" @click="exec('underline')">下划线</Button>
      <Button type="button" size="sm" variant="secondary" @click="exec('insertUnorderedList')">
        无序列表
      </Button>
      <Button type="button" size="sm" variant="secondary" @click="exec('insertOrderedList')">
        有序列表
      </Button>
      <Button type="button" size="sm" variant="secondary" @click="exec('formatBlock', 'blockquote')">
        引用
      </Button>
      <Button type="button" size="sm" variant="secondary" @click="exec('formatBlock', 'pre')">
        代码
      </Button>
      <Button type="button" size="sm" variant="secondary" @click="insertLink">链接</Button>
      <Button type="button" size="sm" variant="ghost" @click="clearFormatting">清除格式</Button>
    </div>
    <div
      ref="editorRef"
      class="rich-text-area"
      contenteditable="true"
      spellcheck="true"
      :data-placeholder="placeholder || '请输入内容...'"
      @input="handleInput"
      @blur="handleBlur"
      @focus="handleFocus"
    />
  </div>
</template>
