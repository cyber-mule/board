<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '../../../api';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import type {
  AdminModule,
  AdminOrderDetail,
  AnnouncementSummary,
  NodeSummary,
  PlanSummary,
} from '../../../api/types';

const modules = ref<AdminModule[]>([]);
const nodes = ref<NodeSummary[]>([]);
const plans = ref<PlanSummary[]>([]);
const orders = ref<AdminOrderDetail[]>([]);
const announcements = ref<AnnouncementSummary[]>([]);
const loading = ref(true);
const errorMessage = ref('');

const sectionLabels: Record<string, string> = {
  dashboard: '模块概览',
  nodes: '节点',
  plans: '套餐',
  orders: '订单',
  announcements: '公告',
};

function statusVariant(value?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 'active':
    case 'paid':
    case 'succeeded':
    case 'published':
      return 'default';
    case 'pending':
    case 'pending_payment':
    case 'draft':
      return 'secondary';
    case 'failed':
    case 'payment_failed':
    case 'cancelled':
    case 'refunded':
      return 'destructive';
    default:
      return 'outline';
  }
}

function statusLabel(value?: string) {
  switch (value) {
    case 'active':
      return '在线';
    case 'published':
      return '已发布';
    case 'paid':
      return '已支付';
    case 'succeeded':
      return '成功';
    case 'pending':
      return '待处理';
    case 'pending_payment':
      return '待支付';
    case 'draft':
      return '草稿';
    case 'failed':
    case 'payment_failed':
      return '失败';
    case 'cancelled':
      return '已取消';
    case 'refunded':
      return '已退款';
    default:
      return value || '未知';
  }
}

async function loadData() {
  loading.value = true;
  errorMessage.value = '';

  const results = await Promise.allSettled([
    adminApi.fetchAdminDashboard(),
    adminApi.fetchAdminNodes({ page: 1, per_page: 5, sort: 'last_synced_at', direction: 'desc' }),
    adminApi.fetchAdminPlans({ page: 1, per_page: 5, sort: 'updated', direction: 'desc' }),
    adminApi.fetchAdminOrders({ page: 1, per_page: 5, sort: 'updated', direction: 'desc' }),
    adminApi.fetchAdminAnnouncements({ page: 1, per_page: 5, sort: 'created', direction: 'desc' }),
  ]);

  const errors: string[] = [];

  if (results[0].status === 'fulfilled') {
    modules.value = results[0].value.modules ?? [];
  } else {
    errors.push('dashboard');
  }

  if (results[1].status === 'fulfilled') {
    nodes.value = results[1].value.nodes ?? [];
  } else {
    errors.push('nodes');
  }

  if (results[2].status === 'fulfilled') {
    plans.value = results[2].value.plans ?? [];
  } else {
    errors.push('plans');
  }

  if (results[3].status === 'fulfilled') {
    orders.value = results[3].value.orders ?? [];
  } else {
    errors.push('orders');
  }

  if (results[4].status === 'fulfilled') {
    announcements.value = results[4].value.announcements ?? [];
  } else {
    errors.push('announcements');
  }

  if (errors.length) {
    const labels = errors.map((key) => sectionLabels[key] || key).join('、');
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
        <p class="page__eyebrow">总览</p>
        <h3 class="page-section__title">运营概览</h3>
        <p class="page__subtitle">实时汇总管理端 API 的关键数据。</p>
      </div>
      <div class="page-section__actions">
        <Button variant="secondary" type="button" @click="loadData" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新数据' }}
        </Button>
      </div>
    </header>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>数据加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <div class="split-grid">
      <Card>
        <CardHeader>
          <CardTitle>模块</CardTitle>
          <p class="panel-card__meta">/dashboard</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载模块...</p>
          <p v-else-if="modules.length === 0" class="panel-card__empty">暂无模块配置。</p>
          <ul v-else class="data-list">
            <li v-for="module in modules" :key="module.key" class="data-row data-row--stack">
              <div>
                <p class="data-row__title">{{ module.name }}</p>
                <p class="data-row__meta">{{ module.description || '暂无描述' }}</p>
              </div>
              <Badge v-if="module.route" variant="outline">{{ module.route }}</Badge>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>节点</CardTitle>
          <p class="panel-card__meta">最近同步情况</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载节点...</p>
          <p v-else-if="nodes.length === 0" class="panel-card__empty">暂无节点。</p>
          <ul v-else class="data-list">
            <li v-for="node in nodes" :key="node.id" class="data-row">
              <div>
                <p class="data-row__title">{{ node.name }}</p>
                <p class="data-row__meta">
                  {{ node.region || '未知区域' }} · {{ node.isp || '未知运营商' }}
                </p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="statusVariant(node.status)">{{ statusLabel(node.status) }}</Badge>
                <span class="data-row__meta">{{ formatDateTime(node.last_synced_at) }}</span>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>套餐</CardTitle>
          <p class="panel-card__meta">最近更新</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载套餐...</p>
          <p v-else-if="plans.length === 0" class="panel-card__empty">暂无套餐。</p>
          <ul v-else class="data-list">
            <li v-for="plan in plans" :key="plan.id" class="data-row">
              <div>
                <p class="data-row__title">{{ plan.name }}</p>
                <p class="data-row__meta">
                  {{ formatCurrency(plan.price_cents, plan.currency) }} · {{ plan.duration_days }} 天
                </p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="statusVariant(plan.status)">{{ statusLabel(plan.status) }}</Badge>
                <span class="data-row__meta">{{ formatDateTime(plan.updated_at) }}</span>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>订单</CardTitle>
          <p class="panel-card__meta">最近变更</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载订单...</p>
          <p v-else-if="orders.length === 0" class="panel-card__empty">暂无订单。</p>
          <ul v-else class="data-list">
            <li v-for="order in orders" :key="order.id" class="data-row data-row--stack">
              <div>
                <p class="data-row__title">
                  #{{ order.number }} · {{ formatCurrency(order.total_cents, order.currency) }}
                </p>
                <p class="data-row__meta">
                  {{ order.user?.email || '未知用户' }} · {{ formatDateTime(order.updated_at || order.created_at) }}
                </p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="statusVariant(order.status)">{{ statusLabel(order.status) }}</Badge>
                <Badge :variant="statusVariant(order.payment_status)">{{ statusLabel(order.payment_status) }}</Badge>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card class="panel-card--full">
        <CardHeader>
          <CardTitle>公告</CardTitle>
          <p class="panel-card__meta">最新发布动态</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载公告...</p>
          <p v-else-if="announcements.length === 0" class="panel-card__empty">暂无公告。</p>
          <ul v-else class="data-list data-list--compact">
            <li v-for="announcement in announcements" :key="announcement.id" class="data-row">
              <div>
                <p class="data-row__title">{{ announcement.title }}</p>
                <p class="data-row__meta">
                  {{ announcement.category || '通用' }} ·
                  {{ formatDateTime(announcement.published_at || announcement.created_at) }}
                </p>
              </div>
              <Badge :variant="statusVariant(announcement.status)">{{ statusLabel(announcement.status) }}</Badge>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
