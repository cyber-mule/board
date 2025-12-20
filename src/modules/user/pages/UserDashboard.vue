<script setup lang="ts">
import { onMounted, ref } from 'vue';
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

function statusTone(value?: string): string {
  switch (value) {
    case 'active':
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
    case 'expired':
      return 'status-pill status-pill--danger';
    default:
      return 'status-pill status-pill--muted';
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
    errorMessage.value = `Failed to load ${errors.join(', ')}. Check API connectivity.`;
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
        <p class="page__eyebrow">Overview</p>
        <h3 class="page-section__title">Account snapshot</h3>
        <p class="page__subtitle">Subscriptions, balance, and orders powered by the user API.</p>
      </div>
      <div class="page-section__actions">
        <button class="button button--ghost" type="button" @click="loadData" :disabled="loading">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </header>

    <p v-if="errorMessage" class="alert">{{ errorMessage }}</p>

    <div class="panel-grid">
      <article class="panel-card panel-card--full">
        <header class="panel-card__header">
          <div>
            <h3>Balance</h3>
            <p class="panel-card__meta">/account/balance</p>
          </div>
          <span v-if="balance" class="panel-card__headline">
            {{ formatCurrency(balance.balance_cents, balance.currency) }}
          </span>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading balance...</div>
        <div v-else-if="!balance" class="panel-card__empty">Balance data unavailable.</div>
        <div v-else class="balance">
          <div class="balance__meta">
            <div>
              <p class="balance__label">Last updated</p>
              <p class="balance__value">{{ formatDateTime(balance.updated_at) }}</p>
            </div>
            <div>
              <p class="balance__label">Recent transactions</p>
              <p class="balance__value">{{ balance.transactions.length }}</p>
            </div>
          </div>
          <ul v-if="balance.transactions.length" class="data-list data-list--compact">
            <li v-for="entry in balance.transactions" :key="entry.id" class="data-row">
              <div>
                <p class="data-row__title">{{ entry.description || entry.entry_type }}</p>
                <p class="data-row__meta">{{ formatDateTime(entry.created_at) }}</p>
              </div>
              <div class="data-row__aside">
                <span class="tag">{{ entry.entry_type }}</span>
                <span class="data-row__title">
                  {{ formatCurrency(entry.amount_cents, entry.currency) }}
                </span>
              </div>
            </li>
          </ul>
          <div v-else class="panel-card__empty">No transactions yet.</div>
        </div>
      </article>

      <article class="panel-card">
        <header class="panel-card__header">
          <div>
            <h3>Subscriptions</h3>
            <p class="panel-card__meta">Active access</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading subscriptions...</div>
        <div v-else-if="subscriptions.length === 0" class="panel-card__empty">
          No subscriptions yet.
        </div>
        <ul v-else class="data-list">
          <li v-for="subscription in subscriptions" :key="subscription.id" class="data-row">
            <div>
              <p class="data-row__title">{{ subscription.name }}</p>
              <p class="data-row__meta">
                {{ subscription.plan_name || 'Plan not set' }} · Expires
                {{ formatDate(subscription.expires_at) }}
              </p>
            </div>
            <div class="data-row__aside">
              <span :class="statusTone(subscription.status)">{{ subscription.status || 'unknown' }}</span>
              <span class="data-row__meta">
                {{ formatBytes(subscription.traffic_used_bytes) }} /
                {{ formatBytes(subscription.traffic_total_bytes) }}
              </span>
            </div>
          </li>
        </ul>
      </article>

      <article class="panel-card">
        <header class="panel-card__header">
          <div>
            <h3>Plans</h3>
            <p class="panel-card__meta">Available upgrades</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading plans...</div>
        <div v-else-if="plans.length === 0" class="panel-card__empty">No plans available.</div>
        <ul v-else class="data-list">
          <li v-for="plan in plans.slice(0, 5)" :key="plan.id" class="data-row">
            <div>
              <p class="data-row__title">{{ plan.name }}</p>
              <p class="data-row__meta">
                {{ formatCurrency(plan.price_cents, plan.currency) }} · {{ plan.duration_days }} days
              </p>
            </div>
            <div class="data-row__aside">
              <span class="tag">{{ plan.tags?.[0] || 'Plan' }}</span>
              <span class="data-row__meta">{{ formatBytes(plan.traffic_limit_bytes) }}</span>
            </div>
          </li>
        </ul>
      </article>

      <article class="panel-card">
        <header class="panel-card__header">
          <div>
            <h3>Announcements</h3>
            <p class="panel-card__meta">Latest updates</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading announcements...</div>
        <div v-else-if="announcements.length === 0" class="panel-card__empty">
          No announcements.
        </div>
        <ul v-else class="data-list data-list--compact">
          <li v-for="announcement in announcements" :key="announcement.id" class="data-row">
            <div>
              <p class="data-row__title">{{ announcement.title }}</p>
              <p class="data-row__meta">
                {{ announcement.category || 'General' }} ·
                {{ formatDate(announcement.published_at || announcement.visible_from) }}
              </p>
            </div>
            <span class="tag">{{ announcement.audience || 'All users' }}</span>
          </li>
        </ul>
      </article>

      <article class="panel-card panel-card--full">
        <header class="panel-card__header">
          <div>
            <h3>Orders</h3>
            <p class="panel-card__meta">Recent activity</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading orders...</div>
        <div v-else-if="orders.length === 0" class="panel-card__empty">No orders yet.</div>
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
              <span :class="statusTone(order.status)">{{ order.status }}</span>
              <span :class="statusTone(order.payment_status)">{{ order.payment_status }}</span>
            </div>
          </li>
        </ul>
      </article>
    </div>
  </div>
</template>
