<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { adminApi } from '../../../api';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import type { AdminOrderDetail, CancelOrderRequest, PaginationMeta, PayOrderRequest, RefundOrderRequest } from '../../../api/types';

const orders = ref<AdminOrderDetail[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');

const selectedOrder = ref<AdminOrderDetail | null>(null);
const detailLoading = ref(false);
const detailError = ref('');

const showPayModal = ref(false);
const showCancelModal = ref(false);
const showRefundModal = ref(false);
const isSaving = ref(false);

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

const payForm = reactive<PayOrderRequest>({
  payment_method: 'manual',
  paid_at: 0,
  note: '',
  reference: '',
  charge_balance: false,
});

const cancelForm = reactive<CancelOrderRequest>({
  reason: '',
  cancelled_at: 0,
});

const refundForm = reactive<RefundOrderRequest>({
  amount_cents: 0,
  reason: '',
  operator: '',
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

function openPayModal(order: AdminOrderDetail) {
  selectedOrder.value = order;
  payForm.payment_method = 'manual';
  payForm.paid_at = 0;
  payForm.note = '';
  payForm.reference = '';
  payForm.charge_balance = false;
  showPayModal.value = true;
}

function closePayModal() {
  showPayModal.value = false;
}

async function handlePay() {
  if (!selectedOrder.value) return;

  isSaving.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.payAdminOrder(selectedOrder.value.id, payForm);
    closePayModal();
    
    // Update the order in the list
    const index = orders.value.findIndex(o => o.id === selectedOrder.value!.id);
    if (index !== -1) {
      orders.value[index] = response.order;
    }
    
    // Update selectedOrder if viewing details
    if (selectedOrder.value.id === response.order.id) {
      selectedOrder.value = response.order;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to mark order as paid';
  } finally {
    isSaving.value = false;
  }
}

function openCancelModal(order: AdminOrderDetail) {
  selectedOrder.value = order;
  cancelForm.reason = '';
  cancelForm.cancelled_at = 0;
  showCancelModal.value = true;
}

function closeCancelModal() {
  showCancelModal.value = false;
}

async function handleCancel() {
  if (!selectedOrder.value) return;

  isSaving.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.cancelAdminOrder(selectedOrder.value.id, cancelForm);
    closeCancelModal();
    
    // Update the order in the list
    const index = orders.value.findIndex(o => o.id === selectedOrder.value!.id);
    if (index !== -1) {
      orders.value[index] = response.order;
    }
    
    // Update selectedOrder if viewing details
    if (selectedOrder.value.id === response.order.id) {
      selectedOrder.value = response.order;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to cancel order';
  } finally {
    isSaving.value = false;
  }
}

function canPay(order: AdminOrderDetail): boolean {
  return order.status === 'pending_payment' || order.payment_status === 'pending';
}

function canCancel(order: AdminOrderDetail): boolean {
  return order.status !== 'cancelled' && order.status !== 'refunded';
}

function canRefund(order: AdminOrderDetail): boolean {
  return order.status === 'paid' && (!order.refunded_cents || order.refunded_cents < order.total_cents);
}

function openRefundModal(order: AdminOrderDetail) {
  selectedOrder.value = order;
  const maxRefundAmount = order.total_cents - (order.refunded_cents || 0);
  refundForm.amount_cents = maxRefundAmount;
  refundForm.reason = '';
  refundForm.operator = '';
  showRefundModal.value = true;
  errorMessage.value = '';
}

function closeRefundModal() {
  showRefundModal.value = false;
  refundForm.amount_cents = 0;
  refundForm.reason = '';
  refundForm.operator = '';
}

async function handleRefund() {
  if (!selectedOrder.value) return;
  
  if (refundForm.amount_cents <= 0) {
    errorMessage.value = 'Refund amount must be greater than 0';
    return;
  }
  
  const maxRefundAmount = selectedOrder.value.total_cents - (selectedOrder.value.refunded_cents || 0);
  if (refundForm.amount_cents > maxRefundAmount) {
    errorMessage.value = `Refund amount cannot exceed ${formatCurrency(maxRefundAmount, selectedOrder.value.currency)}`;
    return;
  }
  
  isSaving.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.refundAdminOrder(selectedOrder.value.id, refundForm);
    closeRefundModal();
    
    // Update the order in the list
    const index = orders.value.findIndex(o => o.id === selectedOrder.value!.id);
    if (index !== -1) {
      orders.value[index] = response.order;
    }
    
    // Update selectedOrder if viewing details
    if (selectedOrder.value.id === response.order.id) {
      selectedOrder.value = response.order;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to refund order';
  } finally {
    isSaving.value = false;
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
              <button
                v-if="canPay(order)"
                class="button button--small button--primary"
                type="button"
                @click="openPayModal(order)"
              >
                Mark Paid
              </button>
              <button
                v-if="canCancel(order)"
                class="button button--small button--secondary"
                type="button"
                @click="openCancelModal(order)"
              >
                Cancel
              </button>
              <button
                v-if="canRefund(order)"
                class="button button--small button--warning"
                type="button"
                @click="openRefundModal(order)"
              >
                Refund
              </button>
              <button class="button button--ghost button--small" type="button" @click="selectOrder(order)">
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

    <!-- Pay Order Modal -->
    <div v-if="showPayModal" class="modal-overlay" @click.self="closePayModal">
      <div class="modal modal--medium">
        <header class="modal__header">
          <h3>Mark Order as Paid</h3>
          <button class="modal__close" type="button" @click="closePayModal">×</button>
        </header>
        <div class="modal__content">
          <p v-if="selectedOrder" class="modal-info">
            Order #{{ selectedOrder.number }} · {{ formatCurrency(selectedOrder.total_cents, selectedOrder.currency) }}
          </p>
          
          <div class="form-group">
            <label for="pay-method">Payment Method</label>
            <select id="pay-method" v-model="payForm.payment_method" class="select">
              <option value="manual">Manual</option>
              <option value="balance">Balance</option>
              <option value="external">External</option>
            </select>
          </div>

          <div class="form-group">
            <label for="pay-reference">Reference / Transaction ID</label>
            <input
              id="pay-reference"
              v-model="payForm.reference"
              type="text"
              class="input"
              placeholder="Optional reference ID"
            />
          </div>

          <div class="form-group">
            <label for="pay-note">Note</label>
            <textarea
              id="pay-note"
              v-model="payForm.note"
              class="input"
              rows="3"
              placeholder="Optional internal note"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="payForm.charge_balance" type="checkbox" />
              <span>Deduct from user balance</span>
            </label>
            <p class="form-help">If enabled, the order amount will be deducted from user's account balance.</p>
          </div>
        </div>
        <footer class="modal__footer">
          <button class="button button--secondary" type="button" @click="closePayModal">
            Cancel
          </button>
          <button
            class="button button--primary"
            type="button"
            :disabled="isSaving"
            @click="handlePay"
          >
            {{ isSaving ? 'Processing...' : 'Mark as Paid' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Cancel Order Modal -->
    <div v-if="showCancelModal" class="modal-overlay" @click.self="closeCancelModal">
      <div class="modal modal--medium">
        <header class="modal__header">
          <h3>Cancel Order</h3>
          <button class="modal__close" type="button" @click="closeCancelModal">×</button>
        </header>
        <div class="modal__content">
          <p v-if="selectedOrder" class="modal-info">
            Order #{{ selectedOrder.number }} · {{ formatCurrency(selectedOrder.total_cents, selectedOrder.currency) }}
          </p>
          
          <div class="form-group">
            <label for="cancel-reason">Cancellation Reason</label>
            <textarea
              id="cancel-reason"
              v-model="cancelForm.reason"
              class="input"
              rows="4"
              placeholder="Optional reason for cancellation"
            ></textarea>
            <p class="form-help">This reason will be logged for reference.</p>
          </div>
        </div>
        <footer class="modal__footer">
          <button class="button button--secondary" type="button" @click="closeCancelModal">
            Close
          </button>
          <button
            class="button button--danger"
            type="button"
            :disabled="isSaving"
            @click="handleCancel"
          >
            {{ isSaving ? 'Cancelling...' : 'Cancel Order' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Refund Order Modal -->
    <div v-if="showRefundModal" class="modal-overlay" @click.self="closeRefundModal">
      <div class="modal modal--medium">
        <header class="modal__header">
          <h3>Refund Order</h3>
          <button class="modal__close" type="button" @click="closeRefundModal">×</button>
        </header>
        <div class="modal__content">
          <p v-if="selectedOrder" class="modal-info">
            Order #{{ selectedOrder.number }} · {{ formatCurrency(selectedOrder.total_cents, selectedOrder.currency) }}
            <br>
            <span v-if="selectedOrder.refunded_cents" class="text-muted">
              Already refunded: {{ formatCurrency(selectedOrder.refunded_cents, selectedOrder.currency) }}
            </span>
          </p>
          
          <p v-if="errorMessage" class="alert alert--danger">{{ errorMessage }}</p>
          
          <div class="form-group">
            <label for="refund-amount">Refund Amount (in cents) *</label>
            <input
              id="refund-amount"
              v-model.number="refundForm.amount_cents"
              type="number"
              class="input"
              min="1"
              :max="selectedOrder ? selectedOrder.total_cents - (selectedOrder.refunded_cents || 0) : 0"
              required
            />
            <p v-if="selectedOrder" class="form-help">
              Maximum refundable: {{ formatCurrency(selectedOrder.total_cents - (selectedOrder.refunded_cents || 0), selectedOrder.currency) }}
            </p>
          </div>

          <div class="form-group">
            <label for="refund-reason">Reason</label>
            <textarea
              id="refund-reason"
              v-model="refundForm.reason"
              class="input"
              rows="4"
              placeholder="Optional reason for refund"
            ></textarea>
            <p class="form-help">This reason will be logged and may be visible to the customer.</p>
          </div>

          <div class="form-group">
            <label for="refund-operator">Operator</label>
            <input
              id="refund-operator"
              v-model="refundForm.operator"
              type="text"
              class="input"
              placeholder="Optional operator name"
            />
            <p class="form-help">Name or identifier of the person processing this refund.</p>
          </div>
        </div>
        <footer class="modal__footer">
          <button class="button button--secondary" type="button" @click="closeRefundModal">
            Close
          </button>
          <button
            class="button button--danger"
            type="button"
            :disabled="isSaving || !refundForm.amount_cents || refundForm.amount_cents <= 0"
            @click="handleRefund"
          >
            {{ isSaving ? 'Processing...' : 'Process Refund' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal--medium {
  max-width: 500px;
}

.modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal__close {
  font-size: 1.5rem;
  line-height: 1;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
}

.modal__close:hover {
  background: #f3f4f6;
}

.modal__content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.modal-info {
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-weight: 500;
  color: #374151;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: #374151;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
}

.input,
.select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.input:focus,
.select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-help {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.button--small {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.button--danger {
  background: #dc2626;
  color: white;
}

.button--danger:hover:not(:disabled) {
  background: #b91c1c;
}

.button--warning {
  background: #f59e0b;
  color: white;
}

.button--warning:hover:not(:disabled) {
  background: #d97706;
}

.text-muted {
  color: #6b7280;
  font-size: 0.875rem;
}

.alert--danger {
  background: #fee2e2;
  border-color: #dc2626;
  color: #b91c1c;
}
</style>
