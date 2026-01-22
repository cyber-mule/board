<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { userApi } from '../../../api';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import type { OrderDetail, PaginationMeta, UserOrderDetailResponse } from '../../../api/types';

const orders = ref<OrderDetail[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');
const actionMessage = ref('');
const actionError = ref('');
const paymentStatusLoading = ref(false);
const paymentStatusError = ref('');
const perPage = 10;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);
const jumpPage = ref('');
const detailSectionRef = ref<HTMLElement | null>(null);
const route = useRoute();
const router = useRouter();
const filterSyncDelay = 400;
let filterSyncTimer: number | null = null;
const isApplyingQuery = ref(false);

const totalPages = computed(() => {
  if (!pagination.value) {
    return 1;
  }
  return Math.max(1, Math.ceil(pagination.value.total_count / pagination.value.per_page));
});

const storageKey = 'znp_user_orders_filters';

function normalizeStatusFilter(value: unknown): number | string {
  if (value === '__all__') {
    return '__all__';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '__all__') {
      return '__all__';
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : '__all__';
  }
  return '__all__';
}

function loadSavedFilters() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<typeof filters>;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return {
      status: normalizeStatusFilter(parsed.status),
      payment_status: normalizeStatusFilter(parsed.payment_status),
      payment_method: typeof parsed.payment_method === 'string' ? parsed.payment_method : '',
      number: typeof parsed.number === 'string' ? parsed.number : '',
      sort: typeof parsed.sort === 'string' ? parsed.sort : 'updated',
      direction: typeof parsed.direction === 'string' ? parsed.direction : 'desc',
    };
  } catch (error) {
    return null;
  }
}

function saveFilters() {
  if (typeof window === 'undefined') {
    return;
  }
  const payload = {
    status: filters.status,
    payment_status: filters.payment_status,
    payment_method: filters.payment_method,
    number: filters.number,
    sort: filters.sort,
    direction: filters.direction,
  };
  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}

function clearSavedFilters() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(storageKey);
}

function readQueryValue(key: string): string | null {
  const value = route.query[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

function parsePageParam(): number | null {
  const raw = readQueryValue('page');
  if (!raw) {
    return null;
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 1) {
    return null;
  }
  return Math.floor(num);
}

function loadFiltersFromQuery(): Partial<typeof filters> | null {
  const result: Partial<typeof filters> = {};
  const status = readQueryValue('status');
  const paymentStatus = readQueryValue('payment_status');
  const paymentMethod = readQueryValue('payment_method');
  const number = readQueryValue('number');
  const sort = readQueryValue('sort');
  const direction = readQueryValue('direction');

  if (status !== null) {
    result.status = normalizeStatusFilter(status);
  }
  if (paymentStatus !== null) {
    result.payment_status = normalizeStatusFilter(paymentStatus);
  }
  if (paymentMethod !== null) {
    result.payment_method = paymentMethod;
  }
  if (number !== null) {
    result.number = number;
  }
  if (sort !== null) {
    result.sort = sort;
  }
  if (direction !== null) {
    result.direction = direction;
  }

  return Object.keys(result).length ? result : null;
}

function updateQuery(targetPage: number, mode: 'push' | 'replace' = 'push') {
  const query: Record<string, string> = {};
    if (filters.status && filters.status !== '__all__') {
      query.status = String(filters.status);
    }
    if (filters.payment_status && filters.payment_status !== '__all__') {
      query.payment_status = String(filters.payment_status);
    }
    if (filters.payment_method && filters.payment_method !== '__all__') {
      query.payment_method = filters.payment_method;
    }
  if (filters.number) {
    query.number = filters.number;
  }
  if (filters.sort !== defaultFilters.sort) {
    query.sort = filters.sort;
  }
  if (filters.direction !== defaultFilters.direction) {
    query.direction = filters.direction;
  }
  if (targetPage > 1) {
    query.page = String(targetPage);
  }

  if (mode === 'replace') {
    router.replace({ query });
  } else {
    router.push({ query });
  }
}

function scheduleFilterSync() {
  if (filterSyncTimer !== null) {
    window.clearTimeout(filterSyncTimer);
  }
  filterSyncTimer = window.setTimeout(() => {
    void loadOrders(1);
  }, filterSyncDelay);
}

function areFiltersEqual(nextFilters: typeof filters) {
  return (
    nextFilters.status === filters.status &&
    nextFilters.payment_status === filters.payment_status &&
    nextFilters.payment_method === filters.payment_method &&
    nextFilters.number === filters.number &&
    nextFilters.sort === filters.sort &&
    nextFilters.direction === filters.direction
  );
}

function resetFilters() {
  Object.assign(filters, defaultFilters);
  jumpPage.value = '';
  clearSavedFilters();
  updateQuery(1);
  void loadOrders(1, { syncUrl: false });
}

const filters = reactive({
  status: '__all__' as number | string,
  payment_status: '__all__' as number | string,
  payment_method: '',
  number: '',
  sort: 'updated',
  direction: 'desc',
});

const defaultFilters = {
  status: '__all__' as number | string,
  payment_status: '__all__' as number | string,
  payment_method: '',
  number: '',
  sort: 'updated',
  direction: 'desc',
};

const queryFilters = loadFiltersFromQuery();
const savedFilters = loadSavedFilters();
if (queryFilters) {
  Object.assign(filters, queryFilters);
} else if (savedFilters) {
  Object.assign(filters, savedFilters);
}

const selectedOrderId = ref<number | null>(null);
const detail = ref<UserOrderDetailResponse | null>(null);
const detailLoading = ref(false);
const detailError = ref('');
const cancelTarget = ref<OrderDetail | null>(null);
const cancelReason = ref('');
const showCancelModal = ref(false);
const isCanceling = ref(false);
const autoRefresh = ref(false);
let autoRefreshTimer: number | null = null;
const copyMessage = ref('');
const showPaymentQr = ref(false);
const paymentQrUrl = ref('');
const paymentQrSource = ref('');
const paymentQrError = ref('');
const paymentQrLoading = ref(false);

const isPendingDetail = computed(() => {
  const status = detail.value?.order.status;
  const payment = detail.value?.order.payment_status;
  return status === 1 || payment === 1;
});

function ensureSelection(list: OrderDetail[]) {
  if (!list.length) {
    selectedOrderId.value = null;
    detail.value = null;
    return;
  }
  if (selectedOrderId.value && list.some((order) => order.id === selectedOrderId.value)) {
    return;
  }
  void openDetails(list[0], false);
}

function statusVariant(value?: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 2:
      return 'default';
    case 1:
      return 'secondary';
    case 3:
    case 4:
    case 5:
    case 6:
      return 'destructive';
    default:
      return 'outline';
  }
}

function orderStatusLabel(value?: number) {
  switch (value) {
    case 1:
      return '待支付';
    case 2:
      return '已支付';
    case 3:
      return '支付失败';
    case 4:
      return '已取消';
    case 5:
      return '部分退款';
    case 6:
      return '已退款';
    default:
      return '未知';
  }
}

function paymentStatusLabel(value?: number) {
  switch (value) {
    case 1:
      return '待处理';
    case 2:
      return '成功';
    case 3:
      return '失败';
    default:
      return '未知';
  }
}

function canCancel(order: OrderDetail): boolean {
  return order.status === 1 || order.payment_status === 1;
}

function normalizePaymentMeta(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getPaymentMeta(order?: OrderDetail | null) {
  if (!order?.payments?.length) {
    return { payUrl: '', qrCode: '', provider: '' };
  }
  const sorted = [...order.payments].sort(
    (a, b) => (b.updated_at ?? b.created_at) - (a.updated_at ?? a.created_at),
  );
  for (const payment of sorted) {
    const metadata = payment.metadata ?? {};
    const payUrl = normalizePaymentMeta(metadata.pay_url);
    const qrCode = normalizePaymentMeta(metadata.qr_code);
    if (payUrl || qrCode) {
      return {
        payUrl,
        qrCode,
        provider: payment.provider || payment.method || '',
      };
    }
  }
  return { payUrl: '', qrCode: '', provider: '' };
}

const selectedPaymentMeta = computed(() => getPaymentMeta(detail.value?.order ?? null));

const paymentQrValue = computed(() => {
  return selectedPaymentMeta.value.qrCode || selectedPaymentMeta.value.payUrl || '';
});

function isImageSource(value: string) {
  return value.startsWith('data:image') || value.startsWith('http://') || value.startsWith('https://');
}

async function loadPaymentQr(value: string) {
  paymentQrLoading.value = true;
  paymentQrError.value = '';

  try {
    if (isImageSource(value)) {
      paymentQrUrl.value = value;
      paymentQrSource.value = value;
      return;
    }
    const module = await import(
      /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm'
    );
    const api = module.toDataURL ? module : module.default;
    if (!api?.toDataURL) {
      throw new Error('QRCode module missing toDataURL');
    }
    paymentQrUrl.value = await api.toDataURL(value, { width: 180, margin: 1 });
    paymentQrSource.value = value;
  } catch (error) {
    paymentQrUrl.value = '';
    paymentQrError.value = '二维码生成失败，请稍后重试。';
  } finally {
    paymentQrLoading.value = false;
  }
}

async function togglePaymentQr() {
  paymentQrError.value = '';
  const value = paymentQrValue.value;
  if (!value) {
    paymentQrError.value = '二维码不可用。';
    return;
  }
  showPaymentQr.value = !showPaymentQr.value;
  if (showPaymentQr.value) {
    if (!paymentQrUrl.value || paymentQrSource.value !== value) {
      await loadPaymentQr(value);
    }
  }
}

function resetPaymentQr() {
  showPaymentQr.value = false;
  paymentQrUrl.value = '';
  paymentQrSource.value = '';
  paymentQrError.value = '';
  paymentQrLoading.value = false;
}

async function loadOrders(
  targetPage = 1,
  options: { syncUrl?: boolean; historyMode?: 'push' | 'replace'; persist?: boolean } = {},
) {
  loading.value = true;
  errorMessage.value = '';
  const { syncUrl = true, historyMode = 'push', persist = true } = options;
  if (persist) {
    saveFilters();
  }
  page.value = targetPage;
  if (syncUrl) {
    updateQuery(targetPage, historyMode);
  }

  try {
    const response = await userApi.fetchUserOrders({
      page: targetPage,
      per_page: perPage,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      payment_status:
        filters.payment_status && filters.payment_status !== '__all__'
          ? filters.payment_status
          : undefined,
      payment_method:
        filters.payment_method && filters.payment_method !== '__all__'
          ? filters.payment_method
          : undefined,
      number: filters.number || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    orders.value = response.orders ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
    ensureSelection(orders.value);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载订单失败';
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (!pagination.value?.has_next || isLoadingMore.value) {
    return;
  }

  isLoadingMore.value = true;
  errorMessage.value = '';

  const targetPage = page.value + 1;

  try {
    const response = await userApi.fetchUserOrders({
      page: targetPage,
      per_page: perPage,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      payment_status:
        filters.payment_status && filters.payment_status !== '__all__'
          ? filters.payment_status
          : undefined,
      payment_method:
        filters.payment_method && filters.payment_method !== '__all__'
          ? filters.payment_method
          : undefined,
      number: filters.number || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    orders.value = [...orders.value, ...(response.orders ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
    updateQuery(page.value, 'replace');
    ensureSelection(orders.value);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载更多订单失败';
  } finally {
    isLoadingMore.value = false;
  }
}

async function jumpToPage() {
  if (!pagination.value) {
    return;
  }

  const target = Number(jumpPage.value);
  if (!Number.isFinite(target) || target < 1) {
    errorMessage.value = '请输入有效页码。';
    return;
  }

  const clamped = Math.min(Math.max(1, target), totalPages.value);
  if (clamped === page.value) {
    jumpPage.value = '';
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  saveFilters();
  page.value = clamped;
  updateQuery(clamped);

  try {
    const response = await userApi.fetchUserOrders({
      page: clamped,
      per_page: perPage,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      payment_status:
        filters.payment_status && filters.payment_status !== '__all__'
          ? filters.payment_status
          : undefined,
      payment_method:
        filters.payment_method && filters.payment_method !== '__all__'
          ? filters.payment_method
          : undefined,
      number: filters.number || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    orders.value = response.orders ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? clamped;
    if (orders.value.length) {
      await openDetails(orders.value[0], true);
    } else {
      selectedOrderId.value = null;
      detail.value = null;
    }
    jumpPage.value = '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载目标页失败';
  } finally {
    loading.value = false;
  }
}

async function refreshDetail(silent = false) {
  if (!selectedOrderId.value) {
    return;
  }

  if (!silent) {
    detailLoading.value = true;
  }
  detailError.value = '';

  try {
    detail.value = await userApi.fetchUserOrderDetail(selectedOrderId.value);
  } catch (error) {
    detailError.value = error instanceof Error ? error.message : '加载订单详情失败';
  } finally {
    detailLoading.value = false;
  }
}

async function refreshPaymentStatus(silent = false) {
  if (!selectedOrderId.value) {
    return;
  }

  if (!silent) {
    paymentStatusLoading.value = true;
    paymentStatusError.value = '';
  }

  try {
    const response = await userApi.fetchUserOrderPaymentStatus(selectedOrderId.value, {
      toastOnError: !silent,
    });
    if (detail.value) {
      detail.value.order = {
        ...detail.value.order,
        status: response.status,
        payment_status: response.payment_status,
        payment_method: response.payment_method ?? detail.value.order.payment_method,
        payment_intent_id: response.payment_intent_id ?? detail.value.order.payment_intent_id,
        payment_reference: response.payment_reference ?? detail.value.order.payment_reference,
        payment_failure_code: response.payment_failure_code ?? detail.value.order.payment_failure_code,
        payment_failure_message: response.payment_failure_message ?? detail.value.order.payment_failure_message,
        paid_at: response.paid_at ?? detail.value.order.paid_at,
        cancelled_at: response.cancelled_at ?? detail.value.order.cancelled_at,
        refunded_cents: response.refunded_cents ?? detail.value.order.refunded_cents,
        refunded_at: response.refunded_at ?? detail.value.order.refunded_at,
        updated_at: response.updated_at ?? detail.value.order.updated_at,
      };
    }
    orders.value = orders.value.map((order) =>
      order.id === response.order_id
        ? {
            ...order,
            status: response.status,
            payment_status: response.payment_status,
            payment_method: response.payment_method ?? order.payment_method,
            updated_at: response.updated_at ?? order.updated_at,
          }
        : order,
    );
    if (detail.value && !isPendingDetail.value) {
      void refreshDetail(true);
    }
  } catch (error) {
    if (!silent) {
      paymentStatusError.value =
        error instanceof Error ? error.message : '刷新支付状态失败';
    }
  } finally {
    if (!silent) {
      paymentStatusLoading.value = false;
    }
  }
}

async function copyText(label: string, text?: string) {
  copyMessage.value = '';
  if (!text) {
    copyMessage.value = `${label}不可用。`;
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    copyMessage.value = `${label}已复制。`;
  } catch (error) {
    copyMessage.value = `复制${label}失败。`;
  }
}

async function openDetails(order: OrderDetail, scrollToDetail = false) {
  selectedOrderId.value = order.id;
  detail.value = null;
  copyMessage.value = '';
  paymentStatusError.value = '';
  resetPaymentQr();
  await refreshDetail();

  if (scrollToDetail) {
    await nextTick();
    detailSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function startAutoRefresh() {
  if (autoRefreshTimer !== null) {
    return;
  }
  autoRefreshTimer = window.setInterval(() => {
    if (!selectedOrderId.value || !isPendingDetail.value) {
      autoRefresh.value = false;
      return;
    }
    void refreshPaymentStatus(true);
  }, 8000);
}

function stopAutoRefresh() {
  if (autoRefreshTimer !== null) {
    window.clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

async function cancelOrder(order: OrderDetail) {
  actionMessage.value = '';
  actionError.value = '';

  try {
    isCanceling.value = true;
    const response = await userApi.cancelUserOrder(order.id, cancelReason.value || undefined);
    orders.value = orders.value.map((item) =>
      item.id === response.order.id ? response.order : item,
    );
    if (selectedOrderId.value === response.order.id) {
      detail.value = { order: response.order, balance: response.balance };
    }
    actionMessage.value = `订单 #${response.order.number} 已取消。`;
    showCancelModal.value = false;
    cancelTarget.value = null;
    cancelReason.value = '';
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '取消订单失败';
  } finally {
    isCanceling.value = false;
  }
}

function openCancelModal(order: OrderDetail) {
  actionMessage.value = '';
  actionError.value = '';
  cancelTarget.value = order;
  cancelReason.value = '';
  showCancelModal.value = true;
}

function closeCancelModal() {
  showCancelModal.value = false;
  cancelTarget.value = null;
  cancelReason.value = '';
}

onMounted(() => {
  const initialPage = parsePageParam() ?? 1;
  void loadOrders(initialPage, { syncUrl: false });
});

watch(
  () => ({ ...filters }),
  () => {
    if (isApplyingQuery.value) {
      return;
    }
    scheduleFilterSync();
  },
  { deep: true },
);

watch(
  () => route.query,
  () => {
    const nextFilters = {
      ...defaultFilters,
      ...(loadFiltersFromQuery() ?? {}),
    };
    const nextPage = parsePageParam() ?? 1;
    const hasChanges = !areFiltersEqual(nextFilters) || nextPage !== page.value;
    if (!hasChanges) {
      return;
    }
    isApplyingQuery.value = true;
    Object.assign(filters, nextFilters);
    jumpPage.value = '';
    void loadOrders(nextPage, { syncUrl: false, persist: false }).finally(() => {
      isApplyingQuery.value = false;
    });
  },
);

onBeforeUnmount(() => {
  if (filterSyncTimer !== null) {
    window.clearTimeout(filterSyncTimer);
  }
});

watch(autoRefresh, (value) => {
  if (value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

watch(isPendingDetail, (value) => {
  if (!value && autoRefresh.value) {
    autoRefresh.value = false;
  }
});

onBeforeUnmount(() => {
  stopAutoRefresh();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">订单</p>
        <h3 class="page-section__title">支付记录</h3>
        <p class="page__subtitle">查看订单状态并处理待支付订单。</p>
      </div>
      <div class="page-section__actions">
        <Button variant="secondary" type="button" @click="loadOrders" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新列表' }}
        </Button>
      </div>
    </header>

    <form class="form-grid form-grid--wide" @submit.prevent="loadOrders">
      <div class="stack stack--tight">
        <Label>订单号</Label>
        <Input v-model="filters.number" type="search" placeholder="搜索订单号" />
      </div>
      <div class="stack stack--tight">
        <Label>订单状态</Label>
        <Select v-model="filters.status">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem :value="1">待支付</SelectItem>
            <SelectItem :value="2">已支付</SelectItem>
            <SelectItem :value="3">支付失败</SelectItem>
            <SelectItem :value="4">已取消</SelectItem>
            <SelectItem :value="5">部分退款</SelectItem>
            <SelectItem :value="6">已退款</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>支付状态</Label>
        <Select v-model="filters.payment_status">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem :value="1">待处理</SelectItem>
            <SelectItem :value="2">成功</SelectItem>
            <SelectItem :value="3">失败</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>支付方式</Label>
        <Select v-model="filters.payment_method">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem value="balance">余额</SelectItem>
            <SelectItem value="external">外部</SelectItem>
            <SelectItem value="manual">手工</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="cluster cluster--end">
        <Button type="submit" :disabled="loading">应用筛选</Button>
        <Button variant="ghost" type="button" @click="resetFilters" :disabled="loading">
          重置
        </Button>
      </div>
    </form>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>
    <Alert v-if="actionMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
      <AlertTitle>操作成功</AlertTitle>
      <AlertDescription>{{ actionMessage }}</AlertDescription>
    </Alert>
    <Alert v-if="actionError" variant="destructive">
      <AlertTitle>操作失败</AlertTitle>
      <AlertDescription>{{ actionError }}</AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle>订单列表</CardTitle>
        <p class="panel-card__meta">每页最多 {{ perPage }} 条</p>
      </CardHeader>
      <CardContent>
        <p v-if="loading" class="panel-card__empty">正在加载订单...</p>
        <div v-else-if="orders.length === 0" class="panel-card__empty stack">
          <span>暂无订单。</span>
          <RouterLink to="/user/plans" custom v-slot="{ href, navigate }">
            <Button :as="'a'" :href="href" size="sm" variant="secondary" @click="navigate">
              去选套餐
            </Button>
          </RouterLink>
        </div>
        <ul v-else class="data-list">
          <li
            v-for="order in orders"
            :key="order.id"
            :class="['data-row', 'data-row--stack', { 'data-row--selected': order.id === selectedOrderId }]"
          >
            <div class="cursor-pointer" @click="openDetails(order, true)">
              <p class="data-row__title">
                #{{ order.number }} · {{ formatCurrency(order.total_cents, order.currency) }}
              </p>
              <p class="data-row__meta">{{ formatDateTime(order.updated_at || order.created_at) }}</p>
              <div class="cluster">
                <Badge :variant="statusVariant(order.status)">{{ orderStatusLabel(order.status) }}</Badge>
                <Badge :variant="statusVariant(order.payment_status)">
                  {{ paymentStatusLabel(order.payment_status) }}
                </Badge>
              </div>
            </div>
            <div class="data-row__aside data-row__aside--wide">
              <Button variant="ghost" size="sm" type="button" @click="openDetails(order, true)">
                详情
              </Button>
              <div v-if="canCancel(order) && order.payment_method === 'external'" class="cluster cluster--center">
                <Button
                  v-if="getPaymentMeta(order).payUrl"
                  :as="'a'"
                  :href="getPaymentMeta(order).payUrl"
                  size="sm"
                  target="_blank"
                  rel="noopener"
                >
                  去支付
                </Button>
                <Button v-else size="sm" type="button" @click="openDetails(order, true)">
                  去支付
                </Button>
              </div>
              <div v-if="canCancel(order)" class="cluster cluster--center">
                <Button size="sm" type="button" @click="openCancelModal(order)">
                  取消订单
                </Button>
              </div>
            </div>
          </li>
        </ul>
        <div v-if="pagination" class="list-footer">
          <div class="text-xs text-muted-foreground">
            第 {{ pagination.page }} / {{ totalPages }} 页 · 共 {{ pagination.total_count }} 笔
          </div>
          <div class="cluster cluster--center">
            <div class="cluster cluster--center">
              <Label>跳转</Label>
              <Input
                v-model="jumpPage"
                class="w-20"
                type="number"
                min="1"
                :max="totalPages"
                placeholder="页码"
              />
            </div>
            <Button variant="secondary" type="button" @click="jumpToPage" :disabled="loading || !jumpPage">
              前往
            </Button>
            <Button
              variant="ghost"
              type="button"
              @click="loadMore"
              :disabled="isLoadingMore || !pagination.has_next"
            >
              {{ isLoadingMore ? '加载中...' : '加载更多' }}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card ref="detailSectionRef">
      <CardHeader class="cluster cluster--between cluster--start cluster--wide">
        <div>
          <CardTitle>订单详情</CardTitle>
          <p class="panel-card__meta">
            {{ selectedOrderId ? `订单 #${selectedOrderId}` : '请选择订单' }}
          </p>
        </div>
        <div class="cluster cluster--center cluster--loose">
          <Button
            variant="ghost"
            type="button"
            @click="refreshDetail()"
            :disabled="detailLoading || !selectedOrderId"
          >
            刷新详情
          </Button>
          <Button
            variant="ghost"
            type="button"
            @click="refreshPaymentStatus()"
            :disabled="paymentStatusLoading || !selectedOrderId"
          >
            {{ paymentStatusLoading ? '刷新中...' : '刷新支付状态' }}
          </Button>
          <div class="cluster cluster--center">
            <Switch v-model="autoRefresh" :disabled="!selectedOrderId || !isPendingDetail" />
            <span class="text-sm text-muted-foreground">自动刷新待支付</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p v-if="detailLoading" class="panel-card__empty">正在加载订单详情...</p>
        <p v-else-if="detailError" class="panel-card__empty">{{ detailError }}</p>
        <p v-else-if="!detail" class="panel-card__empty">请选择订单查看详情。</p>
        <div v-else class="stack stack--loose">
          <Alert v-if="paymentStatusError" variant="destructive">
            <AlertTitle>支付状态刷新失败</AlertTitle>
            <AlertDescription>{{ paymentStatusError }}</AlertDescription>
          </Alert>
          <div class="detail-grid">
            <div>
              <p class="detail-label">订单状态</p>
              <p class="detail-value">{{ orderStatusLabel(detail.order.status) }}</p>
            </div>
            <div>
              <p class="detail-label">支付状态</p>
              <p class="detail-value">{{ paymentStatusLabel(detail.order.payment_status) }}</p>
            </div>
            <div>
              <p class="detail-label">支付方式</p>
              <p class="detail-value">{{ detail.order.payment_method || '-' }}</p>
            </div>
            <div>
              <p class="detail-label">订单金额</p>
              <p class="detail-value">
                {{ formatCurrency(detail.order.total_cents, detail.order.currency) }}
              </p>
            </div>
          </div>

          <div class="detail-grid">
            <div>
              <p class="detail-label">订单号</p>
              <p class="detail-value">{{ detail.order.number }}</p>
            </div>
            <div class="cluster">
              <Button variant="ghost" size="sm" type="button" @click="copyText('订单号', detail.order.number)">
                复制订单号
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                @click="copyText('支付参考号', detail.order.payment_reference)"
              >
                复制参考号
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                @click="copyText('支付意向', detail.order.payment_intent_id)"
              >
                复制意向号
              </Button>
            </div>
          </div>

          <Alert v-if="copyMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertTitle>复制成功</AlertTitle>
            <AlertDescription>{{ copyMessage }}</AlertDescription>
          </Alert>

          <Alert
            v-if="detail.order.payment_method === 'manual' && isPendingDetail"
            class="border-amber-200 bg-amber-50 text-amber-800"
          >
            <AlertTitle>线下支付待确认</AlertTitle>
            <AlertDescription>已提交线下支付订单，请联系管理员完成确认。</AlertDescription>
          </Alert>

          <div v-if="detail.balance" class="detail-grid">
            <div>
              <p class="detail-label">账户余额</p>
              <p class="detail-value">
                {{ formatCurrency(detail.balance.balance_cents, detail.balance.currency) }}
              </p>
            </div>
          </div>

          <div v-if="detail.order.payment_intent_id || detail.order.payment_reference" class="detail-section">
            <h4>支付信息</h4>
            <div class="detail-grid">
              <div v-if="detail.order.payment_intent_id">
                <p class="detail-label">支付意向</p>
                <p class="detail-value">{{ detail.order.payment_intent_id }}</p>
              </div>
              <div v-if="detail.order.payment_reference">
                <p class="detail-label">支付参考号</p>
                <p class="detail-value">{{ detail.order.payment_reference }}</p>
              </div>
              <div v-if="detail.order.payment_failure_code">
                <p class="detail-label">失败代码</p>
                <p class="detail-value">{{ detail.order.payment_failure_code }}</p>
              </div>
              <div v-if="detail.order.payment_failure_message">
                <p class="detail-label">失败原因</p>
                <p class="detail-value">{{ detail.order.payment_failure_message }}</p>
              </div>
            </div>
          </div>

          <div v-if="selectedPaymentMeta.payUrl || selectedPaymentMeta.qrCode" class="detail-section">
            <h4>支付入口</h4>
            <div class="cluster">
              <Button
                v-if="selectedPaymentMeta.payUrl"
                :as="'a'"
                :href="selectedPaymentMeta.payUrl"
                target="_blank"
                rel="noopener"
              >
                去支付
              </Button>
              <Button variant="ghost" size="sm" type="button" @click="togglePaymentQr">
                {{ showPaymentQr ? '收起二维码' : '显示二维码' }}
              </Button>
              <Button
                v-if="selectedPaymentMeta.payUrl"
                variant="ghost"
                size="sm"
                type="button"
                @click="copyText('支付链接', selectedPaymentMeta.payUrl)"
              >
                复制支付链接
              </Button>
              <Button
                v-if="selectedPaymentMeta.qrCode"
                variant="ghost"
                size="sm"
                type="button"
                @click="copyText('二维码内容', selectedPaymentMeta.qrCode)"
              >
                复制二维码内容
              </Button>
            </div>
            <div v-if="showPaymentQr" class="qr-panel">
              <p v-if="paymentQrLoading" class="text-xs text-muted-foreground">正在生成二维码...</p>
              <img v-else-if="paymentQrUrl" :src="paymentQrUrl" alt="支付二维码" class="qr-image" />
              <p v-else class="text-xs text-muted-foreground">
                {{ paymentQrError || '二维码不可用。' }}
              </p>
            </div>
          </div>
          <p
            v-else-if="
              detail.order.payment_method === 'external' &&
              isPendingDetail
            "
            class="text-xs text-muted-foreground"
          >
            支付链接生成中，可点击刷新支付状态或稍后再试。
          </p>

          <div class="detail-section">
            <h4>商品明细</h4>
            <div v-if="!detail.order.items?.length" class="panel-card__empty">暂无商品。</div>
            <ul v-else class="data-list data-list--compact">
              <li v-for="item in detail.order.items" :key="item.id" class="data-row">
                <div>
                  <p class="data-row__title">{{ item.name }}</p>
                  <p class="data-row__meta">数量 {{ item.quantity }}</p>
                </div>
                <span class="data-row__title">
                  {{ formatCurrency(item.subtotal_cents, item.currency) }}
                </span>
              </li>
            </ul>
          </div>

          <div class="detail-section">
            <h4>支付记录</h4>
            <div v-if="!detail.order.payments?.length" class="panel-card__empty">暂无支付记录。</div>
            <ul v-else class="data-list data-list--compact">
              <li v-for="payment in detail.order.payments" :key="payment.id" class="data-row">
                <div>
                  <p class="data-row__title">{{ payment.provider || payment.method || '支付' }}</p>
                  <p class="data-row__meta">{{ paymentStatusLabel(payment.status) }}</p>
                </div>
                <span class="data-row__title">
                  {{ formatCurrency(payment.amount_cents, payment.currency) }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>

    <Dialog :open="showCancelModal" @update:open="value => { if (!value) closeCancelModal(); }">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>取消订单</DialogTitle>
          <DialogDescription>
            确认取消订单 {{ cancelTarget ? `#${cancelTarget.number}` : '' }}？取消后将释放订单。
          </DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label>取消原因</Label>
            <Input v-model="cancelReason" type="text" placeholder="可选" />
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeCancelModal">返回</Button>
          <Button
            variant="destructive"
            type="button"
            :disabled="isCanceling || !cancelTarget"
            @click="cancelTarget && cancelOrder(cancelTarget)"
          >
            {{ isCanceling ? '取消中...' : '确认取消' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
