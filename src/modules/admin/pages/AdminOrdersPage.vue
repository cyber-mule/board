<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
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
  status: '__all__' as number | string,
  payment_status: '__all__' as number | string,
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
});

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

function paymentMethodLabel(value?: string) {
  switch (value) {
    case 'balance':
      return '余额';
    case 'external':
      return '外部';
    case 'manual':
      return '手工';
    default:
      return value || '-';
  }
}

async function loadOrders() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminOrders({
      page: 1,
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
      user_id: filters.user_id ? Number(filters.user_id) : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    orders.value = response.orders ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
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
    const response = await adminApi.fetchAdminOrders({
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
      user_id: filters.user_id ? Number(filters.user_id) : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    orders.value = [...orders.value, ...(response.orders ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载更多订单失败';
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
    detailError.value = error instanceof Error ? error.message : '加载订单详情失败';
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

    const index = orders.value.findIndex(o => o.id === selectedOrder.value!.id);
    if (index !== -1) {
      orders.value[index] = response.order;
    }

    if (selectedOrder.value.id === response.order.id) {
      selectedOrder.value = response.order;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '标记支付失败';
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

    const index = orders.value.findIndex(o => o.id === selectedOrder.value!.id);
    if (index !== -1) {
      orders.value[index] = response.order;
    }

    if (selectedOrder.value.id === response.order.id) {
      selectedOrder.value = response.order;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '取消订单失败';
  } finally {
    isSaving.value = false;
  }
}

function canPay(order: AdminOrderDetail): boolean {
  return order.status === 1 || order.payment_status === 1;
}

function canCancel(order: AdminOrderDetail): boolean {
  return order.status !== 4 && order.status !== 6;
}

function canRefund(order: AdminOrderDetail): boolean {
  return order.status === 2 && (!order.refunded_cents || order.refunded_cents < order.total_cents);
}

function openRefundModal(order: AdminOrderDetail) {
  selectedOrder.value = order;
  const maxRefundAmount = order.total_cents - (order.refunded_cents || 0);
  refundForm.amount_cents = maxRefundAmount;
  refundForm.reason = '';
  showRefundModal.value = true;
  errorMessage.value = '';
}

function closeRefundModal() {
  showRefundModal.value = false;
  refundForm.amount_cents = 0;
  refundForm.reason = '';
}

async function handleRefund() {
  if (!selectedOrder.value) return;

  if (refundForm.amount_cents <= 0) {
    errorMessage.value = '退款金额必须大于 0';
    return;
  }

  const maxRefundAmount = selectedOrder.value.total_cents - (selectedOrder.value.refunded_cents || 0);
  if (refundForm.amount_cents > maxRefundAmount) {
    errorMessage.value = `退款金额不能超过 ${formatCurrency(maxRefundAmount, selectedOrder.value.currency)}`;
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.refundAdminOrder(selectedOrder.value.id, refundForm);
    closeRefundModal();

    const index = orders.value.findIndex(o => o.id === selectedOrder.value!.id);
    if (index !== -1) {
      orders.value[index] = response.order;
    }

    if (selectedOrder.value.id === response.order.id) {
      selectedOrder.value = response.order;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '退款失败';
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
        <p class="page__eyebrow">订单</p>
        <h3 class="page-section__title">订单管理</h3>
        <p class="page__subtitle">查看支付状态与客户信息。</p>
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
        <Label>用户 ID</Label>
        <Input v-model="filters.user_id" type="number" placeholder="用户 ID" />
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
      <div class="stack stack--tight">
        <Label>排序</Label>
        <Select v-model="filters.sort">
          <SelectTrigger>
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">最近更新</SelectItem>
            <SelectItem value="total">金额</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>方向</Label>
        <Select v-model="filters.direction">
          <SelectTrigger>
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">降序</SelectItem>
            <SelectItem value="asc">升序</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="cluster cluster--end">
        <Button type="submit" :disabled="loading">应用筛选</Button>
      </div>
    </form>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>操作失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <div class="split-grid">
      <Card>
        <CardHeader>
          <CardTitle>订单列表</CardTitle>
          <p class="panel-card__meta">共 {{ orders.length }} 笔订单</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载订单...</p>
          <p v-else-if="orders.length === 0" class="panel-card__empty">暂无订单。</p>
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
                  {{ order.user?.email || '未知用户' }} ·
                  {{ formatDateTime(order.updated_at || order.created_at) }}
                </p>
                <div class="cluster">
                  <Badge :variant="statusVariant(order.status)">{{ orderStatusLabel(order.status) }}</Badge>
                  <Badge :variant="statusVariant(order.payment_status)">
                    {{ paymentStatusLabel(order.payment_status) }}
                  </Badge>
                </div>
              </div>
              <div class="data-row__aside">
                <Button
                  v-if="canPay(order)"
                  size="sm"
                  type="button"
                  @click="openPayModal(order)"
                >
                  标记已支付
                </Button>
                <Button
                  v-if="canCancel(order)"
                  size="sm"
                  variant="secondary"
                  type="button"
                  @click="openCancelModal(order)"
                >
                  取消
                </Button>
                <Button
                  v-if="canRefund(order)"
                  size="sm"
                  variant="destructive"
                  type="button"
                  @click="openRefundModal(order)"
                >
                  退款
                </Button>
                <Button variant="ghost" size="sm" type="button" @click="selectOrder(order)">
                  详情
                </Button>
              </div>
            </li>
          </ul>
          <div v-if="pagination?.has_next" class="list-footer">
            <Button variant="ghost" type="button" @click="loadMore" :disabled="isLoadingMore">
              {{ isLoadingMore ? '加载中...' : '加载更多' }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>订单详情</CardTitle>
          <p class="panel-card__meta">
            {{ selectedOrder ? `订单 #${selectedOrder.number}` : '请选择订单' }}
          </p>
        </CardHeader>
        <CardContent>
          <p v-if="!selectedOrder" class="panel-card__empty">请先选择订单查看详情。</p>
          <p v-else-if="detailLoading" class="panel-card__empty">正在加载订单详情...</p>
          <p v-else-if="detailError" class="panel-card__empty">{{ detailError }}</p>
          <div v-else class="order-detail">
            <div class="detail-grid">
              <div>
                <p class="detail-label">用户</p>
                <p class="detail-value">{{ selectedOrder.user?.display_name || '-' }}</p>
              </div>
              <div>
                <p class="detail-label">邮箱</p>
                <p class="detail-value">{{ selectedOrder.user?.email || '-' }}</p>
              </div>
              <div>
                <p class="detail-label">订单状态</p>
                <p class="detail-value">{{ orderStatusLabel(selectedOrder.status) }}</p>
              </div>
              <div>
                <p class="detail-label">支付状态</p>
                <p class="detail-value">{{ paymentStatusLabel(selectedOrder.payment_status) }}</p>
              </div>
              <div>
                <p class="detail-label">支付方式</p>
                <p class="detail-value">{{ paymentMethodLabel(selectedOrder.payment_method) }}</p>
              </div>
              <div>
                <p class="detail-label">订单金额</p>
                <p class="detail-value">
                  {{ formatCurrency(selectedOrder.total_cents, selectedOrder.currency) }}
                </p>
              </div>
            </div>
            <div class="detail-section">
              <h4>商品明细</h4>
              <div v-if="!selectedOrder.items?.length" class="panel-card__empty">暂无商品。</div>
              <ul v-else class="data-list data-list--compact">
                <li v-for="item in selectedOrder.items" :key="item.id" class="data-row">
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
              <div v-if="!selectedOrder.payments?.length" class="panel-card__empty">暂无支付记录。</div>
              <ul v-else class="data-list data-list--compact">
                <li v-for="payment in selectedOrder.payments" :key="payment.id" class="data-row">
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
            <div class="detail-section">
              <h4>退款记录</h4>
              <div v-if="!selectedOrder.refunds?.length" class="panel-card__empty">暂无退款记录。</div>
              <ul v-else class="data-list data-list--compact">
                <li v-for="refund in selectedOrder.refunds" :key="refund.id" class="data-row">
                  <div>
                    <p class="data-row__title">{{ refund.reason || '退款' }}</p>
                    <p class="data-row__meta">{{ formatDateTime(refund.created_at) }}</p>
                  </div>
                  <span class="data-row__title">
                    {{ formatCurrency(refund.amount_cents, selectedOrder.currency) }}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Dialog v-model:open="showPayModal">
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle>标记已支付</DialogTitle>
          <DialogDescription>用于线下或人工确认订单已完成支付。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <p v-if="selectedOrder" class="text-sm text-muted-foreground">
            订单 #{{ selectedOrder.number }} · {{ formatCurrency(selectedOrder.total_cents, selectedOrder.currency) }}
          </p>
          <div class="stack stack--tight">
            <Label>支付方式</Label>
            <Select v-model="payForm.payment_method">
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">手工</SelectItem>
                <SelectItem value="balance">余额</SelectItem>
                <SelectItem value="external">外部</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="stack stack--tight">
            <Label for="pay-reference">参考号 / 交易号</Label>
            <Input
              id="pay-reference"
              v-model="payForm.reference"
              type="text"
              placeholder="可选，便于核对"
            />
          </div>
          <div class="stack stack--tight">
            <Label for="pay-note">备注</Label>
            <Textarea
              id="pay-note"
              v-model="payForm.note"
              rows="3"
              placeholder="可选备注"
            />
          </div>
          <div class="cluster cluster--start">
            <Checkbox id="pay-charge-balance" v-model="payForm.charge_balance" />
            <Label for="pay-charge-balance">从用户余额扣款</Label>
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closePayModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handlePay">
            {{ isSaving ? '处理中...' : '确认已支付' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showCancelModal">
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle>取消订单</DialogTitle>
          <DialogDescription>取消订单会记录原因，请谨慎操作。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <p v-if="selectedOrder" class="text-sm text-muted-foreground">
            订单 #{{ selectedOrder.number }} · {{ formatCurrency(selectedOrder.total_cents, selectedOrder.currency) }}
          </p>
          <div class="stack stack--tight">
            <Label for="cancel-reason">取消原因</Label>
            <Textarea
              id="cancel-reason"
              v-model="cancelForm.reason"
              rows="4"
              placeholder="可选，记录原因"
            />
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeCancelModal">关闭</Button>
          <Button variant="destructive" type="button" :disabled="isSaving" @click="handleCancel">
            {{ isSaving ? '取消中...' : '确认取消' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showRefundModal">
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle>订单退款</DialogTitle>
          <DialogDescription>退款金额不能超过订单可退额度。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <p v-if="selectedOrder" class="text-sm text-muted-foreground">
            订单 #{{ selectedOrder.number }} · {{ formatCurrency(selectedOrder.total_cents, selectedOrder.currency) }}
            <span v-if="selectedOrder.refunded_cents">
              （已退 {{ formatCurrency(selectedOrder.refunded_cents, selectedOrder.currency) }}）
            </span>
          </p>

          <Alert v-if="errorMessage" variant="destructive">
            <AlertTitle>退款失败</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
          </Alert>

          <div class="stack stack--tight">
            <Label for="refund-amount">退款金额（分）*</Label>
            <Input
              id="refund-amount"
              v-model.number="refundForm.amount_cents"
              type="number"
              min="1"
              :max="selectedOrder ? selectedOrder.total_cents - (selectedOrder.refunded_cents || 0) : 0"
            />
            <p v-if="selectedOrder" class="text-xs text-muted-foreground">
              可退上限：{{ formatCurrency(selectedOrder.total_cents - (selectedOrder.refunded_cents || 0), selectedOrder.currency) }}
            </p>
          </div>

          <div class="stack stack--tight">
            <Label for="refund-reason">退款原因</Label>
            <Textarea
              id="refund-reason"
              v-model="refundForm.reason"
              rows="4"
              placeholder="可选，客户可见"
            />
          </div>

        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeRefundModal">关闭</Button>
          <Button
            variant="destructive"
            type="button"
            :disabled="isSaving || !refundForm.amount_cents || refundForm.amount_cents <= 0"
            @click="handleRefund"
          >
            {{ isSaving ? '处理中...' : '确认退款' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

