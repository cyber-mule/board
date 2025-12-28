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
import type { CreateUserOrderResponse, UserPlanSummary } from '../../../api/types';

const plans = ref<UserPlanSummary[]>([]);
const loading = ref(true);
const errorMessage = ref('');
const orderError = ref('');
const orderMessage = ref('');
const orderLoading = ref(false);
const orderResult = ref<CreateUserOrderResponse | null>(null);
const orderFormRef = ref<HTMLElement | null>(null);

const filters = reactive({
  q: '',
  tag: '',
  minPrice: null as number | null,
  maxPrice: null as number | null,
});

const orderForm = reactive({
  plan_id: 0,
  quantity: 1,
  payment_method: 'balance',
});

const selectedPlan = computed(() => {
  return plans.value.find((plan) => plan.id === orderForm.plan_id) ?? null;
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

function orderStatusLabel(value?: string) {
  switch (value) {
    case 'pending_payment':
      return '待支付';
    case 'paid':
      return '已支付';
    case 'payment_failed':
      return '支付失败';
    case 'cancelled':
      return '已取消';
    case 'refunded':
      return '已退款';
    default:
      return value || '未知';
  }
}

const totalCents = computed(() => {
  if (!selectedPlan.value) {
    return null;
  }
  const quantity = Math.max(1, orderForm.quantity);
  return selectedPlan.value.price_cents * quantity;
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

function selectPlan(plan: UserPlanSummary) {
  orderForm.plan_id = plan.id;
  if (orderForm.quantity < 1) {
    orderForm.quantity = 1;
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
    const response = await userApi.createUserOrder({
      plan_id: orderForm.plan_id,
      quantity: normalizedQuantity,
      payment_method: orderForm.payment_method,
      idempotency_key: createIdempotencyKey(),
    });
    orderResult.value = response;
    orderMessage.value = `订单 #${response.order.number} 创建成功。`;
  } catch (error) {
    orderError.value = error instanceof Error ? error.message : '创建订单失败';
  } finally {
    orderLoading.value = false;
  }
}

onMounted(() => {
  void loadPlans();
});

watch(
  filteredPlans,
  (list) => {
    ensureSelectedPlan(list);
  },
  { immediate: true },
);
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
                    {{ formatCurrency(selectedPlan.price_cents, selectedPlan.currency) }}
                  </p>
                </div>
                <div>
                  <p class="detail-label">总价</p>
                  <p class="detail-value">
                    {{ formatCurrency(totalCents ?? 0, selectedPlan.currency) }}
                  </p>
                </div>
              </div>
              <p v-else class="panel-card__empty">请选择套餐以查看价格详情。</p>
              <div class="stack stack--tight">
                <Label>数量</Label>
                <Input v-model.number="orderForm.quantity" type="number" min="1" />
              </div>
              <div class="stack stack--tight">
                <Label>支付方式</Label>
                <Select v-model="orderForm.payment_method">
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balance">余额</SelectItem>
                    <SelectItem value="external">外部</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p v-if="orderForm.payment_method === 'external'" class="text-xs text-muted-foreground">
                外部支付会创建待支付订单，支付完成后自动跳转。
              </p>
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
