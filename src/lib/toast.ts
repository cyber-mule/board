import { reactive } from 'vue';

export type ToastVariant = 'error' | 'success' | 'info';

export type ToastPayload = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

export type Toast = ToastPayload & {
  id: number;
  title: string;
};

const DEFAULT_DURATION = 5000;
const DEDUPE_WINDOW_MS = 3000;
const RECENT_LIMIT = 200;

const toastState = reactive({
  toasts: [] as Toast[],
});

const recentToasts = new Map<string, number>();
let nextId = 1;

function pruneRecent(now: number) {
  if (recentToasts.size < RECENT_LIMIT) {
    return;
  }

  for (const [key, timestamp] of recentToasts.entries()) {
    if (now - timestamp > 10 * 60 * 1000) {
      recentToasts.delete(key);
    }
  }
}

export function pushToast(payload: ToastPayload) {
  const variant = payload.variant ?? 'info';
  const title = payload.title?.trim() || (variant === 'error' ? '操作失败' : '提示');
  const description = payload.description?.trim();
  const duration = payload.duration ?? DEFAULT_DURATION;
  const key = `${variant}:${title}:${description ?? ''}`;
  const now = Date.now();

  pruneRecent(now);

  const lastShown = recentToasts.get(key);
  if (lastShown && now - lastShown < DEDUPE_WINDOW_MS) {
    return;
  }
  recentToasts.set(key, now);

  const toast: Toast = {
    id: nextId++,
    title,
    description,
    variant,
    duration,
  };
  toastState.toasts.push(toast);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast.id);
    }, duration);
  }
}

export function removeToast(id: number) {
  const index = toastState.toasts.findIndex((toast) => toast.id === id);
  if (index >= 0) {
    toastState.toasts.splice(index, 1);
  }
}

export function useToastStore() {
  return toastState;
}

