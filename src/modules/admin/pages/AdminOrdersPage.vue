<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { adminApi } from '../../../api';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import type { AdminOrderDetail, PaginationMeta } from '../../../api/types';

const orders = ref<AdminOrderDetail[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');

const selectedOrder = ref<AdminOrderDetail | null>(null);
const detailLoading = ref(false);
const detailError = ref('');

const perPage = 10;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  status: '',
  payment_status: '',
  payment_method: '',
  number: '',
  sort: 'updated',
  direction: 'desc',
  user_id: '',
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

async function loadOrders() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminOrders({
      page: 1,
      per_page: perPage,
      status: filters.status || undefined,
      payment_status: filters.payment_status || undefined,
      payment_method: filters.payment_method || undefined,
      number: filters.number || undefined,
      user_id: filters.user_id ? Number(filters.user_id) : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    orders.value = response.orders ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
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
    const response = await adminApi.fetchAdminOrders({
      page: targetPage,
      per_page: perPage,
      status: filters.status || undefined,
      payment_status: filters.payment_status || undefined,
      payment_method: filters.payment_method || undefined,
      number: filters.number || undefined,
      user_id: filters.user_id ? Number(filters.user_id) : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    orders.value = [...orders.value, ...(response.orders ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load more orders';
  } finally {
    isLoadingMore.value = false;
  }
}

async function selectOrder(order: AdminOrderDetail) {
  selectedOrder.value = order;
  detailLoading.value = true;
  detailError.value = '';

  try {
    const response = await adminApi.fetchAdminOrderDetail(order.id);
    selectedOrder.value = response.order;
  } catch (error) {
    detailError.value = error instanceof Error ? error.message : 'Failed to load order detail';
  } finally {
    detailLoading.value = false;
  }
}

onMounted(() => {
  void loadOrders();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">Orders</p>
        <h3 class="page-section__title">Order management</h3>
        <p class="page__subtitle">Review payment status and customer context.</p>
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
        <span>User ID</span>
        <input v-model="filters.user_id" type="number" placeholder="User id" />
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
      <label class="form__field form__field--compact">
        <span>Sort</span>
        <select v-model="filters.sort">
          <option value="updated">Updated</option>
          <option value="total">Total</option>
        </select>
      </label>
      <label class="form__field form__field--compact">
        <span>Direction</span>
        <select v-model="filters.direction">
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
      <button class="button" type="submit" :disabled="loading">Apply</button>
    </form>

    <p v-if="errorMessage" class="alert">{{ errorMessage }}</p>

    <div class="split-grid">
      <article class="panel-card">
        <header class="panel-card__header">
          <div>
            <h3>Orders</h3>
            <p class="panel-card__meta">Latest {{ orders.length }} orders</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading orders...</div>
        <div v-else-if="orders.length === 0" class="panel-card__empty">No orders found.</div>
        <ul v-else class="data-list">
          <li
            v-for="order in orders"
            :key="order.id"
            :class="['data-row', 'data-row--stack', { 'data-row--selected': selectedOrder?.id === order.id }]"
          >
            <div>
              <p class="data-row__title">
                #{{ order.number }} · {{ formatCurrency(order.total_cents, order.currency) }}
              </p>
              <p class="data-row__meta">
                {{ order.user?.email || 'Unknown user' }} ·
                {{ formatDateTime(order.updated_at || order.created_at) }}
              </p>
              <div class="tag-list">
                <span :class="statusTone(order.status)">{{ order.status }}</span>
                <span :class="statusTone(order.payment_status)">{{ order.payment_status }}</span>
              </div>
            </div>
            <div class="data-row__aside">
              <button class="button button--ghost" type="button" @click="selectOrder(order)">
                Details
              </button>
            </div>
          </li>
        </ul>
        <div v-if="pagination?.has_next" class="list-footer">
          <button class="button button--ghost" type="button" @click="loadMore" :disabled="isLoadingMore">
            {{ isLoadingMore ? 'Loading...' : 'Load more' }}
          </button>
        </div>
      </article>

      <article class="panel-card">
        <header class="panel-card__header">
          <div>
            <h3>Order detail</h3>
            <p class="panel-card__meta">
              {{ selectedOrder ? `Order #${selectedOrder.number}` : 'Select an order' }}
            </p>
          </div>
        </header>
        <div v-if="!selectedOrder" class="panel-card__empty">Choose an order to view details.</div>
        <div v-else-if="detailLoading" class="panel-card__empty">Loading order detail...</div>
        <div v-else-if="detailError" class="panel-card__empty">{{ detailError }}</div>
        <div v-else class="order-detail">
          <div class="detail-grid">
            <div>
              <p class="detail-label">User</p>
              <p class="detail-value">{{ selectedOrder.user?.display_name || '-' }}</p>
            </div>
            <div>
              <p class="detail-label">Email</p>
              <p class="detail-value">{{ selectedOrder.user?.email || '-' }}</p>
            </div>
            <div>
              <p class="detail-label">Status</p>
              <p class="detail-value">{{ selectedOrder.status }}</p>
            </div>
            <div>
              <p class="detail-label">Payment</p>
              <p class="detail-value">{{ selectedOrder.payment_status }}</p>
            </div>
            <div>
              <p class="detail-label">Method</p>
              <p class="detail-value">{{ selectedOrder.payment_method || '-' }}</p>
            </div>
            <div>
              <p class="detail-label">Total</p>
              <p class="detail-value">
                {{ formatCurrency(selectedOrder.total_cents, selectedOrder.currency) }}
              </p>
            </div>
          </div>
          <div class="detail-section">
            <h4>Items</h4>
            <div v-if="!selectedOrder.items?.length" class="panel-card__empty">No items.</div>
            <ul v-else class="data-list data-list--compact">
              <li v-for="item in selectedOrder.items" :key="item.id" class="data-row">
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
          <div class="detail-section">
            <h4>Payments</h4>
            <div v-if="!selectedOrder.payments?.length" class="panel-card__empty">No payments.</div>
            <ul v-else class="data-list data-list--compact">
              <li v-for="payment in selectedOrder.payments" :key="payment.id" class="data-row">
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
          <div class="detail-section">
            <h4>Refunds</h4>
            <div v-if="!selectedOrder.refunds?.length" class="panel-card__empty">No refunds.</div>
            <ul v-else class="data-list data-list--compact">
              <li v-for="refund in selectedOrder.refunds" :key="refund.id" class="data-row">
                <div>
                  <p class="data-row__title">{{ refund.reason || 'Refund' }}</p>
                  <p class="data-row__meta">{{ formatDateTime(refund.created_at) }}</p>
                </div>
                <span class="data-row__title">
                  {{ formatCurrency(refund.amount_cents, selectedOrder.currency) }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
