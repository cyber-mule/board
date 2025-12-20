<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { adminApi } from '../../../api';
import { formatBytes, formatCurrency, formatDateTime } from '../../../utils/format';
import type { PaginationMeta, PlanSummary } from '../../../api/types';

const plans = ref<PlanSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');

const selectedPlan = ref<PlanSummary | null>(null);

const perPage = 10;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  q: '',
  status: '',
  visible: '',
  sort: 'updated',
  direction: 'desc',
});

async function loadPlans() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminPlans({
      page: 1,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status || undefined,
      visible: filters.visible ? filters.visible === 'true' : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    plans.value = response.plans ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load plans';
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
    const response = await adminApi.fetchAdminPlans({
      page: targetPage,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status || undefined,
      visible: filters.visible ? filters.visible === 'true' : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    plans.value = [...plans.value, ...(response.plans ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load more plans';
  } finally {
    isLoadingMore.value = false;
  }
}

function selectPlan(plan: PlanSummary) {
  selectedPlan.value = plan;
}

onMounted(() => {
  void loadPlans();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">Plans</p>
        <h3 class="page-section__title">Plan catalog</h3>
        <p class="page__subtitle">Review pricing, limits, and visibility.</p>
      </div>
      <div class="page-section__actions">
        <button class="button button--ghost" type="button" @click="loadPlans" :disabled="loading">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </header>

    <form class="filter-bar" @submit.prevent="loadPlans">
      <label class="form__field form__field--compact">
        <span>Search</span>
        <input v-model="filters.q" type="search" placeholder="Plan name" />
      </label>
      <label class="form__field form__field--compact">
        <span>Status</span>
        <select v-model="filters.status">
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
        </select>
      </label>
      <label class="form__field form__field--compact">
        <span>Visible</span>
        <select v-model="filters.visible">
          <option value="">All</option>
          <option value="true">Visible</option>
          <option value="false">Hidden</option>
        </select>
      </label>
      <label class="form__field form__field--compact">
        <span>Sort</span>
        <select v-model="filters.sort">
          <option value="updated">Updated</option>
          <option value="price">Price</option>
          <option value="name">Name</option>
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
            <h3>Plans</h3>
            <p class="panel-card__meta">Latest {{ plans.length }} plans</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading plans...</div>
        <div v-else-if="plans.length === 0" class="panel-card__empty">No plans found.</div>
        <ul v-else class="data-list">
          <li
            v-for="plan in plans"
            :key="plan.id"
            :class="['data-row', 'data-row--stack', { 'data-row--selected': selectedPlan?.id === plan.id }]"
          >
            <div>
              <p class="data-row__title">{{ plan.name }}</p>
              <p class="data-row__meta">
                {{ formatCurrency(plan.price_cents, plan.currency) }} · {{ plan.duration_days }} days
              </p>
              <p class="data-row__meta">Traffic {{ formatBytes(plan.traffic_limit_bytes) }}</p>
            </div>
            <div class="data-row__aside">
              <span class="tag">{{ plan.status || 'draft' }}</span>
              <span class="data-row__meta">{{ plan.visible ? 'Visible' : 'Hidden' }}</span>
              <button class="button button--ghost" type="button" @click="selectPlan(plan)">
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
            <h3>Plan detail</h3>
            <p class="panel-card__meta">
              {{ selectedPlan ? selectedPlan.name : 'Select a plan' }}
            </p>
          </div>
        </header>
        <div v-if="!selectedPlan" class="panel-card__empty">Choose a plan to view details.</div>
        <div v-else>
          <div class="detail-grid">
            <div>
              <p class="detail-label">Price</p>
              <p class="detail-value">
                {{ formatCurrency(selectedPlan.price_cents, selectedPlan.currency) }}
              </p>
            </div>
            <div>
              <p class="detail-label">Duration</p>
              <p class="detail-value">{{ selectedPlan.duration_days }} days</p>
            </div>
            <div>
              <p class="detail-label">Devices</p>
              <p class="detail-value">{{ selectedPlan.devices_limit ?? '-' }}</p>
            </div>
            <div>
              <p class="detail-label">Traffic limit</p>
              <p class="detail-value">{{ formatBytes(selectedPlan.traffic_limit_bytes) }}</p>
            </div>
            <div>
              <p class="detail-label">Status</p>
              <p class="detail-value">{{ selectedPlan.status || 'draft' }}</p>
            </div>
            <div>
              <p class="detail-label">Updated</p>
              <p class="detail-value">{{ formatDateTime(selectedPlan.updated_at) }}</p>
            </div>
          </div>
          <p class="detail-label">Description</p>
          <p class="detail-value">{{ selectedPlan.description || 'No description.' }}</p>
          <div v-if="selectedPlan.tags?.length" class="detail-section">
            <h4>Tags</h4>
            <div class="tag-list">
              <span v-for="tag in selectedPlan.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
          <div v-if="selectedPlan.features?.length" class="detail-section">
            <h4>Features</h4>
            <ul class="data-list data-list--compact">
              <li v-for="feature in selectedPlan.features" :key="feature" class="data-row">
                <span class="data-row__title">{{ feature }}</span>
              </li>
            </ul>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
