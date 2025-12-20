<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { userApi } from '../../../api';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import type { OrderDetail, PaginationMeta, UserOrderDetailResponse } from '../../../api/types';

const orders = ref<OrderDetail[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');
const actionMessage = ref('');
const actionError = ref('');
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
      status: typeof parsed.status === 'string' ? parsed.status : '',
      payment_status: typeof parsed.payment_status === 'string' ? parsed.payment_status : '',
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
    result.status = status;
  }
  if (paymentStatus !== null) {
    result.payment_status = paymentStatus;
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
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.payment_status) {
    query.payment_status = filters.payment_status;
  }
  if (filters.payment_method) {
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
  status: '',
  payment_status: '',
  payment_method: '',
  number: '',
  sort: 'updated',
  direction: 'desc',
});

const defaultFilters = {
  status: '',
  payment_status: '',
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
const cancelReasons = ref<Record<number, string>>({});
const autoRefresh = ref(false);
let autoRefreshTimer: number | null = null;
const copyMessage = ref('');

const isPendingDetail = computed(() => {
  const status = detail.value?.order.status;
  const payment = detail.value?.order.payment_status;
  return status === 'pending_payment' || payment === 'pending';
});

function statusTone(value?: string): string {
  switch (value) {
    case 'paid':
    case 'succeeded':
      return 'status-pill status-pill--ok';
    case 'pending':
    case 'pending_payment':
      return 'status-pill status-pill--warn';
    case 'failed':
    case 'payment_failed':
    case 'cancelled':
    case 'refunded':
      return 'status-pill status-pill--danger';
    default:
      return 'status-pill status-pill--muted';
  }
}

function canCancel(order: OrderDetail): boolean {
  return order.status === 'pending_payment' || order.payment_status === 'pending';
}

async function loadOrders(targetPage = 1, options: { syncUrl?: boolean; historyMode?: 'push' | 'replace'; persist?: boolean } = {}) {
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
      status: filters.status || undefined,
      payment_status: filters.payment_status || undefined,
      payment_method: filters.payment_method || undefined,
      number: filters.number || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    orders.value = response.orders ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load orders';
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
      status: filters.status || undefined,
      payment_status: filters.payment_status || undefined,
      payment_method: filters.payment_method || undefined,
      number: filters.number || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    orders.value = [...orders.value, ...(response.orders ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
    updateQuery(page.value, 'replace');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load more orders';
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
    errorMessage.value = 'Enter a valid page number.';
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
      status: filters.status || undefined,
      payment_status: filters.payment_status || undefined,
      payment_method: filters.payment_method || undefined,
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
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load target page';
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
    detailError.value = error instanceof Error ? error.message : 'Failed to load order detail';
  } finally {
    detailLoading.value = false;
  }
}

async function copyText(label: string, text?: string) {
  copyMessage.value = '';
  if (!text) {
    copyMessage.value = `${label} unavailable.`;
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    copyMessage.value = `${label} copied.`;
  } catch (error) {
    copyMessage.value = `Failed to copy ${label.toLowerCase()}.`;
  }
}

async function openDetails(order: OrderDetail, scrollToDetail = false) {
  selectedOrderId.value = order.id;
  detail.value = null;
  copyMessage.value = '';
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
    void refreshDetail(true);
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
    const response = await userApi.cancelUserOrder(order.id, cancelReasons.value[order.id]);
    orders.value = orders.value.map((item) =>
      item.id === response.order.id ? response.order : item,
    );
    if (selectedOrderId.value === response.order.id) {
      detail.value = { order: response.order, balance: response.balance };
    }
    actionMessage.value = `Order #${response.order.number} cancelled.`;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Failed to cancel order';
  }
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
        <p class="page__eyebrow">Orders</p>
        <h3 class="page-section__title">Payment history</h3>
        <p class="page__subtitle">Track orders and manage pending payments.</p>
      </div>
      <div class="page-section__actions">
        <button class="button button--ghost" type="button" @click="loadOrders" :disabled="loading">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </header>

    <form class="filter-bar" @submit.prevent="loadOrders">
      <label class="form__field form__field--compact">
        <span>Order #</span>
        <input v-model="filters.number" type="search" placeholder="Search number" />
      </label>
      <label class="form__field form__field--compact">
        <span>Status</span>
        <select v-model="filters.status">
          <option value="">All</option>
          <option value="pending_payment">Pending payment</option>
          <option value="paid">Paid</option>
          <option value="payment_failed">Payment failed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </label>
      <label class="form__field form__field--compact">
        <span>Payment status</span>
        <select v-model="filters.payment_status">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
        </select>
      </label>
      <label class="form__field form__field--compact">
        <span>Method</span>
        <select v-model="filters.payment_method">
          <option value="">All</option>
          <option value="balance">Balance</option>
          <option value="external">External</option>
          <option value="manual">Manual</option>
        </select>
      </label>
      <button class="button" type="submit" :disabled="loading">Apply</button>
      <button class="button button--ghost" type="button" @click="resetFilters" :disabled="loading">
        Reset
      </button>
    </form>

    <p v-if="errorMessage" class="alert">{{ errorMessage }}</p>
    <p v-if="actionMessage" class="alert alert--success">{{ actionMessage }}</p>
    <p v-if="actionError" class="alert alert--danger">{{ actionError }}</p>

    <article class="panel-card">
      <header class="panel-card__header">
        <div>
          <h3>Orders</h3>
          <p class="panel-card__meta">Showing latest 10 records</p>
        </div>
      </header>
      <div v-if="loading" class="panel-card__empty">Loading orders...</div>
      <div v-else-if="orders.length === 0" class="panel-card__empty">No orders found.</div>
      <ul v-else class="data-list">
        <li
          v-for="order in orders"
          :key="order.id"
          :class="['data-row', 'data-row--stack', { 'data-row--selected': order.id === selectedOrderId }]"
        >
          <div>
            <p class="data-row__title">
              #{{ order.number }} · {{ formatCurrency(order.total_cents, order.currency) }}
            </p>
            <p class="data-row__meta">{{ formatDateTime(order.updated_at || order.created_at) }}</p>
            <div class="tag-list">
              <span :class="statusTone(order.status)">{{ order.status }}</span>
              <span :class="statusTone(order.payment_status)">{{ order.payment_status }}</span>
            </div>
          </div>
          <div class="data-row__aside data-row__aside--wide">
            <button class="button button--ghost" type="button" @click="openDetails(order, true)">
              Details
            </button>
            <div v-if="canCancel(order)" class="inline-actions">
              <input
                v-model="cancelReasons[order.id]"
                class="inline-actions__input"
                type="text"
                placeholder="Cancel reason (optional)"
              />
              <button class="button" type="button" @click="cancelOrder(order)">
                Cancel order
              </button>
            </div>
          </div>
        </li>
      </ul>
      <div v-if="pagination" class="list-footer">
        <div class="list-footer__info">
          Page {{ pagination.page }} of {{ totalPages }} · {{ pagination.total_count }} orders
        </div>
        <div class="list-footer__actions">
          <label class="form__field form__field--inline">
            <span>Go to</span>
            <input
              v-model="jumpPage"
              class="jump-input"
              type="number"
              min="1"
              :max="totalPages"
              placeholder="Page"
            />
          </label>
          <button class="button button--ghost" type="button" @click="jumpToPage" :disabled="loading || !jumpPage">
            Go
          </button>
          <button
            class="button button--ghost"
            type="button"
            @click="loadMore"
            :disabled="isLoadingMore || !pagination.has_next"
          >
            {{ isLoadingMore ? 'Loading...' : 'Load more' }}
          </button>
        </div>
      </div>
    </article>

    <article ref="detailSectionRef" class="panel-card panel-card--full">
      <header class="panel-card__header">
        <div>
          <h3>Order detail</h3>
          <p class="panel-card__meta">
            {{ selectedOrderId ? `Order #${selectedOrderId}` : 'Select an order' }}
          </p>
        </div>
        <div class="panel-card__actions">
          <button
            class="button button--ghost"
            type="button"
            @click="refreshDetail()"
            :disabled="detailLoading || !selectedOrderId"
          >
            Refresh detail
          </button>
          <label class="toggle">
            <input
              v-model="autoRefresh"
              type="checkbox"
              :disabled="!selectedOrderId || !isPendingDetail"
            />
            <span>Auto-refresh pending</span>
          </label>
        </div>
      </header>
      <div v-if="detailLoading" class="panel-card__empty">Loading order detail...</div>
      <div v-else-if="detailError" class="panel-card__empty">{{ detailError }}</div>
      <div v-else-if="!detail" class="panel-card__empty">Choose an order to view details.</div>
      <div v-else class="order-detail">
        <div class="order-summary">
          <div>
            <p class="order-summary__label">Status</p>
            <p class="order-summary__value">{{ detail.order.status }}</p>
          </div>
          <div>
            <p class="order-summary__label">Payment</p>
            <p class="order-summary__value">{{ detail.order.payment_status }}</p>
          </div>
          <div>
            <p class="order-summary__label">Method</p>
            <p class="order-summary__value">{{ detail.order.payment_method || '-' }}</p>
          </div>
          <div>
            <p class="order-summary__label">Total</p>
            <p class="order-summary__value">
              {{ formatCurrency(detail.order.total_cents, detail.order.currency) }}
            </p>
          </div>
        </div>
        <div class="order-summary order-summary--compact">
          <div>
            <p class="order-summary__label">Order number</p>
            <p class="order-summary__value">{{ detail.order.number }}</p>
          </div>
          <div class="order-summary__actions">
            <button class="button button--ghost" type="button" @click="copyText('Order number', detail.order.number)">
              Copy order #
            </button>
            <button
              class="button button--ghost"
              type="button"
              @click="copyText('Payment reference', detail.order.payment_reference)"
            >
              Copy reference
            </button>
            <button
              class="button button--ghost"
              type="button"
              @click="copyText('Payment intent', detail.order.payment_intent_id)"
            >
              Copy intent
            </button>
          </div>
        </div>
        <p v-if="copyMessage" class="alert alert--success">{{ copyMessage }}</p>

        <div v-if="detail.balance" class="order-summary">
          <div>
            <p class="order-summary__label">Balance</p>
            <p class="order-summary__value">
              {{ formatCurrency(detail.balance.balance_cents, detail.balance.currency) }}
            </p>
          </div>
        </div>

        <div v-if="detail.order.payment_intent_id || detail.order.payment_reference" class="order-detail__section">
          <h4>Payment info</h4>
          <div class="order-summary order-summary--compact">
            <div v-if="detail.order.payment_intent_id">
              <p class="order-summary__label">Intent</p>
              <p class="order-summary__value">{{ detail.order.payment_intent_id }}</p>
            </div>
            <div v-if="detail.order.payment_reference">
              <p class="order-summary__label">Reference</p>
              <p class="order-summary__value">{{ detail.order.payment_reference }}</p>
            </div>
            <div v-if="detail.order.payment_failure_message">
              <p class="order-summary__label">Failure</p>
              <p class="order-summary__value">{{ detail.order.payment_failure_message }}</p>
            </div>
          </div>
        </div>

        <div class="order-detail__section">
          <h4>Items</h4>
          <div v-if="!detail.order.items?.length" class="panel-card__empty">No items.</div>
          <ul v-else class="data-list data-list--compact">
            <li v-for="item in detail.order.items" :key="item.id" class="data-row">
              <div>
                <p class="data-row__title">{{ item.name }}</p>
                <p class="data-row__meta">Qty {{ item.quantity }}</p>
              </div>
              <span class="data-row__title">
                {{ formatCurrency(item.subtotal_cents, item.currency) }}
              </span>
            </li>
          </ul>
        </div>

        <div class="order-detail__section">
          <h4>Payments</h4>
          <div v-if="!detail.order.payments?.length" class="panel-card__empty">No payments.</div>
          <ul v-else class="data-list data-list--compact">
            <li v-for="payment in detail.order.payments" :key="payment.id" class="data-row">
              <div>
                <p class="data-row__title">{{ payment.provider || payment.method || 'Payment' }}</p>
                <p class="data-row__meta">{{ payment.status || 'unknown' }}</p>
              </div>
              <span class="data-row__title">
                {{ formatCurrency(payment.amount_cents, payment.currency) }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </article>
  </div>
</template>
