<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { removeToast, useToastStore } from '@/lib/toast';
import type { Toast } from '@/lib/toast';

const toastStore = useToastStore();

function variantFor(toast: Toast) {
  if (toast.variant === 'error') {
    return 'destructive';
  }
  if (toast.variant === 'success') {
    return 'success';
  }
  return 'default';
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed right-6 top-6 z-[9999] flex w-[360px] max-w-[90vw] flex-col gap-3">
      <div v-for="toast in toastStore.toasts" :key="toast.id" class="relative">
        <Alert :variant="variantFor(toast)" class="pr-10">
          <AlertTitle>{{ toast.title }}</AlertTitle>
          <AlertDescription v-if="toast.description">{{ toast.description }}</AlertDescription>
        </Alert>
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          class="absolute right-2 top-2"
          aria-label="关闭"
          @click="removeToast(toast.id)"
        >
          ×
        </Button>
      </div>
    </div>
  </Teleport>
</template>
