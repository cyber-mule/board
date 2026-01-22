<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { userApi } from '../../../api';
import { formatBytes, formatCurrency } from '../../../utils/format';
import type {
  CreateUserOrderResponse,
  OrderDetail,
  PlanBillingOptionSummary,
  UserPaymentChannelSummary,
  UserPlanSummary,
} from '../../../api/types';

const plans = ref<UserPlanSummary[]>([]);
const loading = ref(true);
const errorMessage = ref('');
const orderError = ref('');
const orderMessage = ref('');
const orderLoading = ref(false);
const orderResult = ref<CreateUserOrderResponse | null>(null);
const orderFormRef = ref<HTMLElement | null>(null);
const paymentChannels = ref<UserPaymentChannelSummary[]>([]);
const paymentMethods = ref<string[]>([]);
const channelsLoading = ref(false);
const channelsError = ref('');
const methodsLoaded = ref(false);
const showPaymentQr = ref(false);
const paymentQrUrl = ref('');
const paymentQrSource = ref('');
const paymentQrError = ref('');
const paymentQrLoading = ref(false);

const paymentMethodLabels: Record<string, string> = {
  balance: '余额',
  external: '外部',
  manual: '线下',
};

const availablePaymentMethods = computed(() => {
  if (!paymentMethods.value.length) {
    return [];
  }
  return paymentMethods.value;
});

const hasExternalMethod = computed(() => availablePaymentMethods.value.includes('external'));

const externalPaymentEnabled = computed(() => {
  return availablePaymentMethods.value.includes('external') && paymentChannels.value.length > 0;
});
const filters = reactive({
  q: '',
  tag: '',
  minPrice: null as number | null,
  maxPrice: null as number | null,
});

const orderForm = reactive({
  plan_id: 0,
  billing_option_id: 0,
  quantity: 1,
  payment_method: '',
  payment_channel: '',
  payment_return_url: '',
  coupon_code: '',
});

const selectedPlan = computed(() => {
  return plans.value.find((plan) => plan.id === orderForm.plan_id) ?? null;
});

function billingOptionUnitLabel(unit: string): string {
  switch (unit) {
    case 'hour':
      return '小时';
    case 'day':
      return '天';
    case 'month':
      return '月';
    case 'year':
      return '年';
    default:
      return unit;
  }
}

function billingOptionDuration(option: PlanBillingOptionSummary): string {
  return `${option.duration_value}${billingOptionUnitLabel(option.duration_unit)}`;
}

function billingOptionLabel(option: PlanBillingOptionSummary): string {
  const name = option.name?.trim();
  const duration = billingOptionDuration(option);
  const price = formatCurrency(option.price_cents, option.currency);
  return name ? `${name} · ${duration} · ${price}` : `${duration} · ${price}`;
}

function sortBillingOptions(options: PlanBillingOptionSummary[]) {
  return [...options].sort((a, b) => {
    const orderDelta = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (orderDelta !== 0) {
      return orderDelta;
    }
    return a.id - b.id;
  });
}

const sortedBillingOptions = computed(() => {
  const plan = selectedPlan.value;
  if (!plan?.billing_options?.length) {
    return [] as PlanBillingOptionSummary[];
  }
  return sortBillingOptions(plan.billing_options);
});

const selectedBillingOption = computed(() => {
  const options = sortedBillingOptions.value;
  if (!options.length) {
    return null;
  }
  return options.find((option) => option.id === orderForm.billing_option_id) ?? options[0];
});

const unitPriceCents = computed(() => {
  if (!selectedPlan.value) {
    return null;
  }
  return selectedBillingOption.value?.price_cents ?? selectedPlan.value.price_cents;
});

const unitPriceCurrency = computed(() => {
  if (!selectedPlan.value) {
    return 'USD';
  }
  return selectedBillingOption.value?.currency ?? selectedPlan.value.currency;
});

const availableTags = computed(() => {
  const tags = new Set<string>();
  plans.value.forEach((plan) => {
    plan.tags?.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags);
});

const filteredPlans = computed(() => {
  const minCents =
    filters.minPrice === null || Number.isNaN(filters.minPrice)
      ? null
      : Math.round(filters.minPrice * 100);
  const maxCents =
    filters.maxPrice === null || Number.isNaN(filters.maxPrice)
      ? null
      : Math.round(filters.maxPrice * 100);

  return plans.value.filter((plan) => {
    if (filters.tag && filters.tag !== '__all__' && !plan.tags?.includes(filters.tag)) {
      return false;
    }
    if (minCents !== null && plan.price_cents < minCents) {
      return false;
    }
    if (maxCents !== null && plan.price_cents > maxCents) {
      return false;
    }
    return true;
  });
});

const priceShortcuts = [
  { label: '低于 10', min: null, max: 10 },
  { label: '10 - 25', min: 10, max: 25 },
  { label: '25 - 50', min: 25, max: 50 },
  { label: '50 - 100', min: 50, max: 100 },
  { label: '100 以上', min: 100, max: null },
];

function applyPriceRange(min: number | null, max: number | null) {
  filters.minPrice = min;
  filters.maxPrice = max;
}

function clearPriceRange() {
  filters.minPrice = null;
  filters.maxPrice = null;
}

function getHighlightLabel(plan: UserPlanSummary): string | null {
  const tags = plan.tags?.map((tag) => tag.toLowerCase()) ?? [];
  if (tags.some((tag) => tag === 'hot' || tag === 'popular')) {
    return '热门';
  }
  if (tags.some((tag) => tag === 'recommended' || tag === 'recommend' || tag === 'featured')) {
    return '推荐';
  }
  return null;
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

const totalCents = computed(() => {
  if (!selectedPlan.value) {
    return null;
  }
  const quantity = Math.max(1, orderForm.quantity);
  const priceCents = unitPriceCents.value ?? 0;
  return priceCents * quantity;
});

const orderPaymentMeta = computed(() => {
  return getPaymentMeta(orderResult.value?.order ?? null);
});

const paymentQrValue = computed(() => {
  return orderPaymentMeta.value.qrCode || orderPaymentMeta.value.payUrl || '';
});

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function loadPlans() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await userApi.fetchUserPlans({
      q: filters.q || undefined,
    });
    plans.value = response.plans ?? [];
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载套餐失败';
  } finally {
    loading.value = false;
  }
}

async function loadPaymentChannels() {
  channelsLoading.value = true;
  channelsError.value = '';
  methodsLoaded.value = false;

  try {
    const response = await userApi.fetchUserPaymentChannels();
    const channels = response.channels ?? [];
    paymentChannels.value = channels;
    const methods = Array.isArray(response.payment_methods) ? response.payment_methods : [];
    const fallbackMethods = methods.length
      ? methods
      : channels.length
        ? ['balance', 'external', 'manual']
        : ['balance', 'manual'];
    const uniqueMethods = new Set<string>();
    fallbackMethods.forEach((method) => {
      if (typeof method !== 'string') {
        return;
      }
      const normalized = method.trim();
      if (!normalized || uniqueMethods.has(normalized)) {
        return;
      }
      uniqueMethods.add(normalized);
    });
    paymentMethods.value = Array.from(uniqueMethods);
  } catch (error) {
    channelsError.value = error instanceof Error ? error.message : '加载支付通道失败';
    paymentMethods.value = [];
  } finally {
    channelsLoading.value = false;
    methodsLoaded.value = true;
  }
}

function paymentMethodLabel(method: string) {
  return paymentMethodLabels[method] ?? method;
}

function resolveAvailableMethods() {
  const methods = availablePaymentMethods.value.filter((method) => {
    if (method === 'external' && !externalPaymentEnabled.value) {
      return false;
    }
    return true;
  });
  return methods;
}

function ensurePaymentMethod() {
  const methods = resolveAvailableMethods();
  if (!methods.length) {
    orderForm.payment_method = '';
    return;
  }
  if (!methods.includes(orderForm.payment_method)) {
    orderForm.payment_method = methods[0];
  }
}

function ensurePaymentChannel() {
  if (orderForm.payment_method === 'external' && !externalPaymentEnabled.value) {
    ensurePaymentMethod();
  }
  if (orderForm.payment_method !== 'external') {
    orderForm.payment_channel = '';
    return;
  }
  if (orderForm.payment_channel) {
    return;
  }
  const firstChannel = paymentChannels.value[0];
  orderForm.payment_channel = firstChannel?.code ?? '';
}

function selectPlan(plan: UserPlanSummary) {
  orderForm.plan_id = plan.id;
  if (orderForm.quantity < 1) {
    orderForm.quantity = 1;
  }
  if (plan.billing_options?.length) {
    const options = sortBillingOptions(plan.billing_options);
    orderForm.billing_option_id = options[0]?.id ?? 0;
  } else {
    orderForm.billing_option_id = 0;
  }
  orderMessage.value = '';
  orderError.value = '';
}

function selectPlanAndFocus(plan: UserPlanSummary) {
  selectPlan(plan);
  void nextTick(() => {
    orderFormRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function ensureSelectedPlan(list: UserPlanSummary[]) {
  if (!list.length) {
    orderForm.plan_id = 0;
    return;
  }
  if (orderForm.plan_id && list.some((plan) => plan.id === orderForm.plan_id)) {
    return;
  }
  orderForm.plan_id = list[0].id;
}

async function submitOrder() {
  orderError.value = '';
  orderMessage.value = '';
  orderLoading.value = true;

  if (!orderForm.plan_id) {
    orderError.value = '请先选择套餐再下单。';
    orderLoading.value = false;
    return;
  }

  const normalizedQuantity = Math.max(1, orderForm.quantity);
  if (normalizedQuantity !== orderForm.quantity) {
    orderForm.quantity = normalizedQuantity;
  }

  try {
    if (!orderForm.payment_method) {
      orderError.value = '当前没有可用的支付方式，请联系管理员。';
      orderLoading.value = false;
      return;
    }
    if (orderForm.payment_method === 'external' && !orderForm.payment_channel) {
      orderError.value = '请选择可用的支付通道。';
      orderLoading.value = false;
      return;
    }

    const payload = {
      plan_id: orderForm.plan_id,
      billing_option_id: orderForm.billing_option_id || undefined,
      quantity: normalizedQuantity,
      payment_method: orderForm.payment_method,
      idempotency_key: createIdempotencyKey(),
      payment_channel:
        orderForm.payment_method === 'external' && orderForm.payment_channel
          ? orderForm.payment_channel
          : undefined,
      payment_return_url:
        orderForm.payment_method === 'external' && orderForm.payment_return_url
          ? orderForm.payment_return_url
          : undefined,
      coupon_code: orderForm.coupon_code ? orderForm.coupon_code.trim() : undefined,
    };
    const response = await userApi.createUserOrder(payload);
    orderResult.value = response;
    orderMessage.value =
      response.order.status === 1
        ? `订单 #${response.order.number} 创建成功，请完成支付。`
        : `订单 #${response.order.number} 创建成功。`;
  } catch (error) {
    orderError.value = error instanceof Error ? error.message : '创建订单失败';
  } finally {
    orderLoading.value = false;
  }
}

function normalizePaymentMeta(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getPaymentMeta(order: OrderDetail | null) {
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

onMounted(() => {
  void loadPlans();
  void loadPaymentChannels();
  if (typeof window !== 'undefined' && !orderForm.payment_return_url) {
    orderForm.payment_return_url = `${window.location.origin}/user/orders`;
  }
});

watch(
  filteredPlans,
  (list) => {
    ensureSelectedPlan(list);
  },
  { immediate: true },
);

watch(selectedPlan, (plan) => {
  const options = sortedBillingOptions.value;
  if (!plan || !options.length) {
    orderForm.billing_option_id = 0;
    return;
  }
  if (!options.some((option) => option.id === orderForm.billing_option_id)) {
    orderForm.billing_option_id = options[0].id;
  }
});

watch(
  () => orderForm.payment_method,
  () => {
    ensurePaymentChannel();
  },
);

watch([paymentChannels, paymentMethods], () => {
  ensurePaymentMethod();
  ensurePaymentChannel();
});

watch(orderResult, () => {
  resetPaymentQr();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">套餐</p>
        <h3 class="page-section__title">可用套餐</h3>
        <p class="page__subtitle">浏览套餐并直接下单。</p>
      </div>
      <div class="page-section__actions">
        <Button variant="secondary" type="button" @click="loadPlans" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新列表' }}
        </Button>
      </div>
    </header>

    <form class="form-grid" @submit.prevent="loadPlans">
      <div class="stack stack--tight">
        <Label>搜索</Label>
        <Input v-model="filters.q" type="search" placeholder="套餐名称" />
      </div>
      <div class="stack stack--tight">
        <Label>标签</Label>
        <Select v-model="filters.tag">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem v-for="tag in availableTags" :key="tag" :value="tag">
              {{ tag }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>最低价</Label>
        <Input v-model.number="filters.minPrice" type="number" min="0" step="0.01" placeholder="0.00" />
      </div>
      <div class="stack stack--tight">
        <Label>最高价</Label>
        <Input v-model.number="filters.maxPrice" type="number" min="0" step="0.01" placeholder="99.00" />
      </div>
      <div class="cluster cluster--end">
        <Button type="submit" :disabled="loading">应用筛选</Button>
      </div>
    </form>

    <div class="cluster cluster--center text-sm">
      <span class="text-muted-foreground">快捷区间</span>
      <Button
        v-for="shortcut in priceShortcuts"
        :key="shortcut.label"
        variant="outline"
        size="sm"
        type="button"
        @click="applyPriceRange(shortcut.min, shortcut.max)"
      >
        {{ shortcut.label }}
      </Button>
      <Button variant="ghost" size="sm" type="button" @click="clearPriceRange">清除</Button>
    </div>
    <p class="text-xs text-muted-foreground">价格筛选以主币种单位（例如 9.99）。</p>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <div class="split-grid">
      <div ref="orderFormRef">
        <Card>
          <CardHeader>
            <CardTitle>创建订单</CardTitle>
            <p class="panel-card__meta">POST /user/orders</p>
          </CardHeader>
          <CardContent>
            <form class="stack" @submit.prevent="submitOrder">
              <div class="stack stack--tight">
                <Label>套餐</Label>
                <Select v-model.number="orderForm.plan_id">
                  <SelectTrigger>
                    <SelectValue placeholder="选择套餐" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">请选择套餐</SelectItem>
                    <SelectItem v-for="plan in filteredPlans" :key="plan.id" :value="plan.id">
                      {{ plan.name }} · {{ formatCurrency(plan.price_cents, plan.currency) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p class="text-xs text-muted-foreground">也可以从右侧列表直接点击套餐。</p>
              </div>
              <div v-if="selectedPlan" class="detail-grid">
                <div>
                  <p class="detail-label">已选套餐</p>
                  <p class="detail-value">{{ selectedPlan.name }}</p>
                </div>
                <div v-if="getHighlightLabel(selectedPlan)">
                  <p class="detail-label">标签</p>
                  <p class="detail-value">{{ getHighlightLabel(selectedPlan) }}</p>
                </div>
                <div>
                  <p class="detail-label">单价</p>
                  <p class="detail-value">
                    {{ formatCurrency(unitPriceCents ?? 0, unitPriceCurrency) }}
                  </p>
                </div>
                <div>
                  <p class="detail-label">周期</p>
                  <p class="detail-value">
                    {{
                      selectedBillingOption
                        ? billingOptionDuration(selectedBillingOption)
                        : `${selectedPlan.duration_days} 天`
                    }}
                  </p>
                </div>
                <div>
                  <p class="detail-label">总价</p>
                  <p class="detail-value">
                    {{ formatCurrency(totalCents ?? 0, unitPriceCurrency) }}
                  </p>
                </div>
              </div>
              <p v-else class="panel-card__empty">请选择套餐以查看价格详情。</p>
              <div v-if="sortedBillingOptions.length" class="stack stack--tight">
                <Label>计费周期</Label>
                <Select v-model.number="orderForm.billing_option_id">
                  <SelectTrigger>
                    <SelectValue placeholder="选择计费周期" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="option in sortedBillingOptions"
                      :key="option.id"
                      :value="option.id"
                    >
                      {{ billingOptionLabel(option) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p class="text-xs text-muted-foreground">不同周期可能对应不同价格与流量额度。</p>
              </div>
              <div class="stack stack--tight">
                <Label>数量</Label>
                <Input v-model.number="orderForm.quantity" type="number" min="1" />
              </div>
              <div class="stack stack--tight">
                <Label>优惠码</Label>
                <Input v-model="orderForm.coupon_code" type="text" placeholder="可选，支持折扣券" />
              </div>
              <div class="stack stack--tight">
                <Label>支付方式</Label>
                <Select v-model="orderForm.payment_method">
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="method in availablePaymentMethods"
                      :key="method"
                      :value="method"
                      :disabled="method === 'external' && (channelsLoading || !externalPaymentEnabled)"
                    >
                      {{ paymentMethodLabel(method) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p v-if="methodsLoaded && !availablePaymentMethods.length" class="text-xs text-muted-foreground">
                  暂无可用支付方式，请联系管理员。
                </p>
                <p v-else-if="methodsLoaded" class="text-xs text-muted-foreground">
                  支付方式由后台配置，如需调整请联系管理员。
                </p>
                <p v-if="hasExternalMethod && !channelsLoading && !externalPaymentEnabled" class="text-xs text-muted-foreground">
                  外部支付暂未配置，请先使用余额或联系管理员。
                </p>
              </div>
              <div
                v-if="orderForm.payment_method === 'external' && externalPaymentEnabled"
                class="stack stack--tight"
              >
                <Label>支付通道</Label>
                <Select
                  v-model="orderForm.payment_channel"
                  :disabled="channelsLoading || paymentChannels.length === 0"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择支付通道" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="channel in paymentChannels"
                      :key="channel.id"
                      :value="channel.code"
                    >
                      {{ channel.name }}{{ channel.provider ? ` · ${channel.provider}` : '' }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p v-if="channelsLoading" class="text-xs text-muted-foreground">正在加载支付通道...</p>
                <p v-else-if="paymentChannels.length === 0" class="text-xs text-muted-foreground">
                  暂无可用支付通道。
                </p>
              </div>
              <p v-if="orderForm.payment_method === 'external'" class="text-xs text-muted-foreground">
                外部支付会创建待支付订单，支付完成后自动返回订单页。
              </p>
              <p v-if="orderForm.payment_method === 'manual'" class="text-xs text-muted-foreground">
                线下支付会创建待支付订单，需要管理员确认到账。
              </p>
              <Alert v-if="channelsError" variant="destructive">
                <AlertTitle>支付通道加载失败</AlertTitle>
                <AlertDescription>{{ channelsError }}</AlertDescription>
              </Alert>
              <Button type="submit" :disabled="orderLoading">
                {{ orderLoading ? '提交中...' : '创建订单' }}
              </Button>
              <Alert v-if="orderMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
                <AlertTitle>下单成功</AlertTitle>
                <AlertDescription>{{ orderMessage }}</AlertDescription>
              </Alert>
              <Alert v-if="orderError" variant="destructive">
                <AlertTitle>下单失败</AlertTitle>
                <AlertDescription>{{ orderError }}</AlertDescription>
              </Alert>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>套餐列表</CardTitle>
          <p class="panel-card__meta">当前可选套餐</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载套餐...</p>
          <div v-else-if="filteredPlans.length === 0" class="panel-card__empty stack">
            <span>当前筛选条件下暂无套餐。</span>
            <Button variant="secondary" size="sm" type="button" @click="clearPriceRange">
              清除筛选
            </Button>
          </div>
          <ul v-else class="data-list">
            <li
              v-for="plan in filteredPlans"
              :key="plan.id"
              :class="['data-row', 'data-row--stack', { 'data-row--selected': orderForm.plan_id === plan.id }]"
            >
              <div class="cursor-pointer" @click="selectPlanAndFocus(plan)">
                <p class="data-row__title">{{ plan.name }}</p>
                <p class="data-row__meta">
                  {{ formatCurrency(plan.price_cents, plan.currency) }} · {{ plan.duration_days }} 天
                </p>
                <p class="data-row__meta">
                  {{ formatBytes(plan.traffic_limit_bytes) }} · 设备 {{ plan.devices_limit ?? '-' }}
                </p>
                <div class="cluster">
                  <Badge v-if="getHighlightLabel(plan)" variant="default">{{ getHighlightLabel(plan) }}</Badge>
                  <Badge v-for="feature in plan.features?.slice(0, 4) || []" :key="feature" variant="secondary">
                    {{ feature }}
                  </Badge>
                </div>
              </div>
              <div class="data-row__aside">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  @click="selectPlanAndFocus(plan)"
                >
                  选择
                </Button>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card v-if="orderResult" class="panel-card--full">
        <CardHeader>
          <CardTitle>订单结果</CardTitle>
          <p class="panel-card__meta">最近一次下单结果</p>
        </CardHeader>
        <CardContent>
          <div class="detail-grid">
            <div>
              <p class="detail-label">订单号</p>
              <p class="detail-value">#{{ orderResult.order.number }}</p>
            </div>
            <div>
              <p class="detail-label">状态</p>
              <p class="detail-value">{{ orderStatusLabel(orderResult.order.status) }}</p>
            </div>
            <div>
              <p class="detail-label">订单金额</p>
              <p class="detail-value">
                {{ formatCurrency(orderResult.order.total_cents, orderResult.order.currency) }}
              </p>
            </div>
            <div>
              <p class="detail-label">余额</p>
              <p class="detail-value">
                {{ formatCurrency(orderResult.balance.balance_cents, orderResult.balance.currency) }}
              </p>
            </div>
          </div>
          <div v-if="orderResult.order.payment_intent_id" class="panel-card__empty">
            支付意向：{{ orderResult.order.payment_intent_id }}
          </div>
          <Alert
            v-if="orderResult.order.payment_method === 'manual' && orderResult.order.status === 1"
            class="border-amber-200 bg-amber-50 text-amber-800"
          >
            <AlertTitle>线下支付待确认</AlertTitle>
            <AlertDescription>已创建线下支付订单，请联系管理员完成确认。</AlertDescription>
          </Alert>
          <div
            v-if="orderPaymentMeta.payUrl || orderPaymentMeta.qrCode"
            class="detail-section"
          >
            <h4>支付入口</h4>
            <div class="cluster">
              <Button
                v-if="orderPaymentMeta.payUrl"
                :as="'a'"
                :href="orderPaymentMeta.payUrl"
                target="_blank"
                rel="noopener"
              >
                去支付
              </Button>
              <Button variant="ghost" size="sm" type="button" @click="togglePaymentQr">
                {{ showPaymentQr ? '收起二维码' : '显示二维码' }}
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
              orderResult.order.payment_method === 'external' &&
              orderResult.order.status === 1
            "
            class="text-xs text-muted-foreground"
          >
            支付链接生成中，可前往订单页刷新查看。
          </p>
          <div class="cluster">
            <RouterLink to="/user/orders" custom v-slot="{ href, navigate }">
              <Button :as="'a'" :href="href" size="sm" variant="secondary" @click="navigate">
                查看订单
              </Button>
            </RouterLink>
            <RouterLink to="/user/subscriptions" custom v-slot="{ href, navigate }">
              <Button :as="'a'" :href="href" size="sm" variant="ghost" @click="navigate">
                查看订阅
              </Button>
            </RouterLink>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
