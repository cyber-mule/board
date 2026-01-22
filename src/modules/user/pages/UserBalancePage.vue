<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { userApi } from '../../../api';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import type { BalanceTransactionSummary, PaginationMeta, UserBalanceResponse } from '../../../api/types';

const balance = ref<UserBalanceResponse | null>(null);
const transactions = ref<BalanceTransactionSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');

const perPage = 10;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  entry_type: '',
});

function entryTypeLabel(value?: string) {
  switch (value) {
    case 'order':
      return '订单';
    case 'refund':
      return '退款';
    case 'recharge':
      return '充值';
    case 'adjustment':
      return '调整';
    case 'debit':
      return '扣款';
    case 'credit':
      return '入账';
    case 'pending':
      return '待处理';
    default:
      return value || '-';
  }
}

async function loadBalance(targetPage: number | Event = 1) {
  const resolvedPage = typeof targetPage === 'number' ? targetPage : 1;
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await userApi.fetchUserBalance({
      page: resolvedPage,
      per_page: perPage,
      entry_type:
        filters.entry_type && filters.entry_type !== '__all__'
          ? filters.entry_type
          : undefined,
    });
    balance.value = response;
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? resolvedPage;
    transactions.value = resolvedPage === 1 ? response.transactions ?? [] : transactions.value;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载余额失败';
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  loadBalance(1);
}

async function loadMore() {
  if (!pagination.value?.has_next || isLoadingMore.value) {
    return;
  }

  isLoadingMore.value = true;
  errorMessage.value = '';

  const targetPage = page.value + 1;

  try {
    const response = await userApi.fetchUserBalance({
      page: targetPage,
      per_page: perPage,
      entry_type:
        filters.entry_type && filters.entry_type !== '__all__'
          ? filters.entry_type
          : undefined,
    });
    balance.value = response;
    transactions.value = [...transactions.value, ...(response.transactions ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载更多记录失败';
  } finally {
    isLoadingMore.value = false;
  }
}

function resetFilters() {
  filters.entry_type = '';
  loadBalance(1);
}

onMounted(() => {
  loadBalance();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">余额</p>
        <h3 class="page-section__title">账户余额</h3>
        <p class="page__subtitle">查看余额、流水与入账记录。</p>
      </div>
      <div class="page-section__actions">
        <Button variant="secondary" type="button" @click="loadBalance" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新列表' }}
        </Button>
      </div>
    </header>

    <form class="form-grid form-grid--wide" @submit.prevent="applyFilters">
      <div class="stack stack--tight">
        <Label>流水类型</Label>
        <Select v-model="filters.entry_type">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem value="order">订单</SelectItem>
            <SelectItem value="refund">退款</SelectItem>
            <SelectItem value="recharge">充值</SelectItem>
            <SelectItem value="adjustment">调整</SelectItem>
            <SelectItem value="debit">扣款</SelectItem>
            <SelectItem value="credit">入账</SelectItem>
            <SelectItem value="pending">待处理</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="cluster cluster--end">
        <Button type="submit" :disabled="loading">应用筛选</Button>
        <Button variant="secondary" type="button" @click="resetFilters" :disabled="loading">
          重置
        </Button>
      </div>
    </form>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <div class="split-grid">
      <Card>
        <CardHeader>
          <CardTitle>余额概览</CardTitle>
          <p class="panel-card__meta">/account/balance</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载余额...</p>
          <p v-else-if="!balance" class="panel-card__empty">余额数据不可用。</p>
          <div v-else class="stack">
            <div class="detail-grid">
              <div>
                <p class="detail-label">当前余额</p>
                <p class="detail-value">
                  {{ formatCurrency(balance.balance_cents, balance.currency) }}
                </p>
              </div>
              <div>
                <p class="detail-label">最近更新</p>
                <p class="detail-value">{{ formatDateTime(balance.updated_at) }}</p>
              </div>
            </div>
            <div class="cluster">
              <RouterLink to="/user/plans" custom v-slot="{ href, navigate }">
                <Button :as="'a'" :href="href" size="sm" variant="secondary" @click="navigate">
                  去选套餐
                </Button>
              </RouterLink>
              <RouterLink to="/user/orders" custom v-slot="{ href, navigate }">
                <Button :as="'a'" :href="href" size="sm" variant="ghost" @click="navigate">
                  查看订单
                </Button>
              </RouterLink>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>余额流水</CardTitle>
          <p class="panel-card__meta">每页最多 {{ perPage }} 条</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载流水...</p>
          <div v-else-if="transactions.length === 0" class="panel-card__empty stack">
            <span>暂无流水记录。</span>
            <RouterLink to="/user/plans" custom v-slot="{ href, navigate }">
              <Button :as="'a'" :href="href" size="sm" variant="secondary" @click="navigate">
                去下单充值
              </Button>
            </RouterLink>
          </div>
          <ul v-else class="data-list data-list--compact">
            <li v-for="entry in transactions" :key="entry.id" class="data-row">
              <div>
                <p class="data-row__title">{{ entry.description || entry.entry_type }}</p>
                <p class="data-row__meta">{{ formatDateTime(entry.created_at) }}</p>
              </div>
              <div class="data-row__aside">
                <Badge variant="outline">{{ entryTypeLabel(entry.entry_type) }}</Badge>
                <span class="data-row__title">
                  {{ formatCurrency(entry.amount_cents, entry.currency) }}
                </span>
              </div>
            </li>
          </ul>
          <div v-if="pagination?.has_next" class="list-footer">
            <Button
              variant="secondary"
              type="button"
              :disabled="isLoadingMore"
              @click="loadMore"
            >
              {{ isLoadingMore ? '加载中...' : '加载更多' }}
            </Button>
            <p class="text-xs text-muted-foreground">
              已显示 {{ transactions.length }} / {{ pagination.total_count }}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
