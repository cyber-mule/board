<script setup lang="ts">
import { onMounted, ref } from 'vue';
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

function statusTone(value?: string): string {
  switch (value) {
    case 'active':
    case 'paid':
    case 'succeeded':
    case 'published':
      return 'status-pill status-pill--ok';
    case 'pending':
    case 'pending_payment':
    case 'draft':
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
    errors.push('dashboard modules');
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
        <h3 class="page-section__title">Operations overview</h3>
        <p class="page__subtitle">Live data pulled from the admin API prefix.</p>
      </div>
      <div class="page-section__actions">
        <button class="button button--ghost" type="button" @click="loadData" :disabled="loading">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </header>

    <p v-if="errorMessage" class="alert">{{ errorMessage }}</p>

    <div class="panel-grid">
      <article class="panel-card">
        <header class="panel-card__header">
          <div>
            <h3>Modules</h3>
            <p class="panel-card__meta">/dashboard</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading modules...</div>
        <div v-else-if="modules.length === 0" class="panel-card__empty">No modules configured.</div>
        <ul v-else class="data-list">
          <li v-for="module in modules" :key="module.key" class="data-row data-row--stack">
            <div>
              <p class="data-row__title">{{ module.name }}</p>
              <p class="data-row__meta">{{ module.description || 'No description provided.' }}</p>
            </div>
            <span v-if="module.route" class="tag">{{ module.route }}</span>
          </li>
        </ul>
      </article>

      <article class="panel-card">
        <header class="panel-card__header">
          <div>
            <h3>Nodes</h3>
            <p class="panel-card__meta">Recent sync activity</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading nodes...</div>
        <div v-else-if="nodes.length === 0" class="panel-card__empty">No nodes found.</div>
        <ul v-else class="data-list">
          <li v-for="node in nodes" :key="node.id" class="data-row">
            <div>
              <p class="data-row__title">{{ node.name }}</p>
              <p class="data-row__meta">
                {{ node.region || 'Unknown region' }} · {{ node.protocols?.join(', ') || 'No protocols' }}
              </p>
            </div>
            <div class="data-row__aside">
              <span :class="statusTone(node.status)">{{ node.status || 'unknown' }}</span>
              <span class="data-row__meta">{{ formatDateTime(node.last_synced_at) }}</span>
            </div>
          </li>
        </ul>
      </article>

      <article class="panel-card">
        <header class="panel-card__header">
          <div>
            <h3>Plans</h3>
            <p class="panel-card__meta">Latest updates</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading plans...</div>
        <div v-else-if="plans.length === 0" class="panel-card__empty">No plans available.</div>
        <ul v-else class="data-list">
          <li v-for="plan in plans" :key="plan.id" class="data-row">
            <div>
              <p class="data-row__title">{{ plan.name }}</p>
              <p class="data-row__meta">
                {{ formatCurrency(plan.price_cents, plan.currency) }} · {{ plan.duration_days }} days
              </p>
            </div>
            <div class="data-row__aside">
              <span :class="statusTone(plan.status)">{{ plan.status || 'draft' }}</span>
              <span class="data-row__meta">{{ formatDateTime(plan.updated_at) }}</span>
            </div>
          </li>
        </ul>
      </article>

      <article class="panel-card">
        <header class="panel-card__header">
          <div>
            <h3>Orders</h3>
            <p class="panel-card__meta">Recent changes</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading orders...</div>
        <div v-else-if="orders.length === 0" class="panel-card__empty">No orders yet.</div>
        <ul v-else class="data-list">
          <li v-for="order in orders" :key="order.id" class="data-row data-row--stack">
            <div>
              <p class="data-row__title">
                #{{ order.number }} · {{ formatCurrency(order.total_cents, order.currency) }}
              </p>
              <p class="data-row__meta">
                {{ order.user?.email || 'Unknown user' }} · {{ formatDateTime(order.updated_at || order.created_at) }}
              </p>
            </div>
            <div class="data-row__aside">
              <span :class="statusTone(order.status)">{{ order.status }}</span>
              <span :class="statusTone(order.payment_status)">{{ order.payment_status }}</span>
            </div>
          </li>
        </ul>
      </article>

      <article class="panel-card panel-card--full">
        <header class="panel-card__header">
          <div>
            <h3>Announcements</h3>
            <p class="panel-card__meta">Latest published updates</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading announcements...</div>
        <div v-else-if="announcements.length === 0" class="panel-card__empty">No announcements.</div>
        <ul v-else class="data-list data-list--compact">
          <li v-for="announcement in announcements" :key="announcement.id" class="data-row">
            <div>
              <p class="data-row__title">{{ announcement.title }}</p>
              <p class="data-row__meta">
                {{ announcement.category || 'General' }} ·
                {{ formatDateTime(announcement.published_at || announcement.created_at) }}
              </p>
            </div>
            <span :class="statusTone(announcement.status)">{{ announcement.status || 'draft' }}</span>
          </li>
        </ul>
      </article>
    </div>
  </div>
</template>
