<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { userApi } from '../../../api';
import { formatBytes, formatCurrency, formatDate, formatDateTime } from '../../../utils/format';
import type {
  OrderDetail,
  UserAnnouncementSummary,
  UserBalanceResponse,
  UserPlanSummary,
  UserSubscriptionSummary,
} from '../../../api/types';

const balance = ref<UserBalanceResponse | null>(null);
const subscriptions = ref<UserSubscriptionSummary[]>([]);
const plans = ref<UserPlanSummary[]>([]);
const announcements = ref<UserAnnouncementSummary[]>([]);
const orders = ref<OrderDetail[]>([]);
const loading = ref(true);
const errorMessage = ref('');

const hasSubscription = computed(() => subscriptions.value.length > 0);
const hasPendingPayment = computed(() => {
  return orders.value.some((order) => order.status === 1 || order.payment_status === 1);
});

const sectionLabels: Record<string, string> = {
  balance: '余额',
  subscriptions: '订阅',
  plans: '套餐',
  announcements: '公告',
  orders: '订单',
};

function subscriptionStatusVariant(value?: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 1:
      return 'default';
    case 2:
    case 3:
      return 'destructive';
    default:
      return 'outline';
  }
}

function subscriptionStatusLabel(value?: number) {
  switch (value) {
    case 1:
      return '已激活';
    case 2:
      return '已禁用';
    case 3:
      return '已过期';
    default:
      return '未知';
  }
}

function orderStatusVariant(value?: number): 'default' | 'secondary' | 'destructive' | 'outline' {
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

async function loadData() {
  loading.value = true;
  errorMessage.value = '';

  const results = await Promise.allSettled([
    userApi.fetchUserBalance({ page: 1, per_page: 5 }),
    userApi.fetchUserSubscriptions({
      page: 1,
      per_page: 5,
      sort: 'expires_at',
      direction: 'asc',
    }),
    userApi.fetchUserPlans(),
    userApi.fetchUserAnnouncements({ limit: 5 }),
    userApi.fetchUserOrders({ page: 1, per_page: 5, sort: 'updated', direction: 'desc' }),
  ]);

  const errors: string[] = [];

  if (results[0].status === 'fulfilled') {
    balance.value = results[0].value;
  } else {
    errors.push('balance');
  }

  if (results[1].status === 'fulfilled') {
    subscriptions.value = results[1].value.subscriptions ?? [];
  } else {
    errors.push('subscriptions');
  }

  if (results[2].status === 'fulfilled') {
    plans.value = results[2].value.plans ?? [];
  } else {
    errors.push('plans');
  }

  if (results[3].status === 'fulfilled') {
    announcements.value = results[3].value.announcements ?? [];
  } else {
    errors.push('announcements');
  }

  if (results[4].status === 'fulfilled') {
    orders.value = results[4].value.orders ?? [];
  } else {
    errors.push('orders');
  }

  if (errors.length) {
    const labels = errors.map(key => sectionLabels[key] || key).join('、');
    errorMessage.value = `部分模块加载失败：${labels}。请检查 API 连接。`;
  }

  loading.value = false;
}

onMounted(() => {
  void loadData();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">概览</p>
        <h3 class="page-section__title">账户总览</h3>
        <p class="page__subtitle">展示订阅、余额与订单状态。</p>
      </div>
      <div class="page-section__actions">
        <Button variant="secondary" type="button" @click="loadData" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新数据' }}
        </Button>
      </div>
    </header>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <Card class="panel-card--full">
      <CardHeader>
        <CardTitle>开通指引</CardTitle>
        <p class="panel-card__meta">选套餐 → 支付 → 获取订阅</p>
      </CardHeader>
      <CardContent>
        <div class="step-grid">
          <div class="step-card">
            <p class="step-card__title">1. 选择套餐</p>
            <p class="step-card__desc">浏览套餐并创建订单。</p>
            <RouterLink to="/user/plans" custom v-slot="{ href, navigate }">
              <Button :as="'a'" :href="href" size="sm" variant="secondary" @click="navigate">
                去选套餐
              </Button>
            </RouterLink>
          </div>
          <div class="step-card">
            <p class="step-card__title">2. 支付订单</p>
            <p class="step-card__desc">
              {{ hasPendingPayment ? '存在待支付订单，请尽快完成支付。' : '查看订单状态与支付记录。' }}
            </p>
            <RouterLink to="/user/orders" custom v-slot="{ href, navigate }">
              <Button :as="'a'" :href="href" size="sm" variant="secondary" @click="navigate">
                查看订单
              </Button>
            </RouterLink>
          </div>
          <div class="step-card">
            <p class="step-card__title">3. 获取订阅</p>
            <p class="step-card__desc">
              {{ hasSubscription ? '已有订阅，可前往管理模板。' : '完成支付后生成订阅。' }}
            </p>
            <RouterLink to="/user/subscriptions" custom v-slot="{ href, navigate }">
              <Button :as="'a'" :href="href" size="sm" variant="secondary" @click="navigate">
                管理订阅
              </Button>
            </RouterLink>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="split-grid">
      <Card class="panel-card--full">
        <CardHeader class="cluster cluster--between cluster--center">
          <div>
            <CardTitle>余额</CardTitle>
            <p class="panel-card__meta">/account/balance</p>
          </div>
          <span v-if="balance" class="text-2xl font-semibold">
            {{ formatCurrency(balance.balance_cents, balance.currency) }}
          </span>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载余额...</p>
          <p v-else-if="!balance" class="panel-card__empty">余额数据不可用。</p>
          <div v-else class="stack">
            <div class="detail-grid">
              <div>
                <p class="detail-label">最近更新</p>
                <p class="detail-value">{{ formatDateTime(balance.updated_at) }}</p>
              </div>
              <div>
                <p class="detail-label">交易笔数</p>
                <p class="detail-value">{{ balance.transactions.length }}</p>
              </div>
            </div>
            <ul v-if="balance.transactions.length" class="data-list data-list--compact">
              <li v-for="entry in balance.transactions" :key="entry.id" class="data-row">
                <div>
                  <p class="data-row__title">{{ entry.description || entry.entry_type }}</p>
                  <p class="data-row__meta">{{ formatDateTime(entry.created_at) }}</p>
                </div>
                <div class="data-row__aside">
                  <Badge variant="outline">{{ entry.entry_type }}</Badge>
                  <span class="data-row__title">
                    {{ formatCurrency(entry.amount_cents, entry.currency) }}
                  </span>
                </div>
              </li>
            </ul>
            <div v-else class="panel-card__empty">暂无交易记录。</div>
            <div class="cluster">
              <RouterLink to="/user/balance" custom v-slot="{ href, navigate }">
                <Button :as="'a'" :href="href" size="sm" variant="secondary" @click="navigate">
                  查看明细
                </Button>
              </RouterLink>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>订阅</CardTitle>
          <p class="panel-card__meta">当前可用订阅</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载订阅...</p>
          <div v-else-if="subscriptions.length === 0" class="panel-card__empty stack">
            <span>暂无订阅。</span>
            <RouterLink to="/user/plans" custom v-slot="{ href, navigate }">
              <Button :as="'a'" :href="href" size="sm" variant="secondary" @click="navigate">
                去选套餐
              </Button>
            </RouterLink>
          </div>
          <ul v-else class="data-list">
            <li v-for="subscription in subscriptions" :key="subscription.id" class="data-row">
              <div>
                <p class="data-row__title">{{ subscription.name }}</p>
                <p class="data-row__meta">
                  {{ subscription.plan_name || '未绑定套餐' }} · 到期
                  {{ formatDate(subscription.expires_at) }}
                </p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="subscriptionStatusVariant(subscription.status)">
                  {{ subscriptionStatusLabel(subscription.status) }}
                </Badge>
                <span class="data-row__meta">
                  {{ formatBytes(subscription.traffic_used_bytes) }} /
                  {{ formatBytes(subscription.traffic_total_bytes) }}
                </span>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>套餐</CardTitle>
          <p class="panel-card__meta">可用升级方案</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载套餐...</p>
          <p v-else-if="plans.length === 0" class="panel-card__empty">暂无套餐，请稍后再试。</p>
          <ul v-else class="data-list">
            <li v-for="plan in plans.slice(0, 5)" :key="plan.id" class="data-row">
              <div>
                <p class="data-row__title">{{ plan.name }}</p>
                <p class="data-row__meta">
                  {{ formatCurrency(plan.price_cents, plan.currency) }} · {{ plan.duration_days }} 天
                </p>
              </div>
              <div class="data-row__aside">
                <Badge variant="outline">{{ plan.tags?.[0] || '套餐' }}</Badge>
                <span class="data-row__meta">{{ formatBytes(plan.traffic_limit_bytes) }}</span>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>公告</CardTitle>
          <p class="panel-card__meta">最新更新</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载公告...</p>
          <p v-else-if="announcements.length === 0" class="panel-card__empty">
            暂无公告。
          </p>
          <ul v-else class="data-list data-list--compact">
            <li v-for="announcement in announcements" :key="announcement.id" class="data-row">
              <div>
                <p class="data-row__title">{{ announcement.title }}</p>
                <p class="data-row__meta">
                  {{ announcement.category || '综合' }} ·
                  {{ formatDate(announcement.published_at || announcement.visible_from) }}
                </p>
              </div>
              <Badge variant="secondary">{{ announcement.audience || '全体' }}</Badge>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card class="panel-card--full">
        <CardHeader>
          <CardTitle>订单</CardTitle>
          <p class="panel-card__meta">最近交易</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载订单...</p>
          <div v-else-if="orders.length === 0" class="panel-card__empty stack">
            <span>暂无订单。</span>
            <RouterLink to="/user/plans" custom v-slot="{ href, navigate }">
              <Button :as="'a'" :href="href" size="sm" variant="secondary" @click="navigate">
                创建订单
              </Button>
            </RouterLink>
          </div>
          <ul v-else class="data-list data-list--compact">
            <li v-for="order in orders" :key="order.id" class="data-row">
              <div>
                <p class="data-row__title">
                  #{{ order.number }} · {{ formatCurrency(order.total_cents, order.currency) }}
                </p>
                <p class="data-row__meta">
                  {{ formatDateTime(order.updated_at || order.created_at) }}
                </p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="orderStatusVariant(order.status)">{{ orderStatusLabel(order.status) }}</Badge>
                <Badge :variant="orderStatusVariant(order.payment_status)">
                  {{ paymentStatusLabel(order.payment_status) }}
                </Badge>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
