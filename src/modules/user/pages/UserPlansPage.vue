<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
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
  payment_channel: '',
  payment_return_url: '',
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
    if (filters.tag && !plan.tags?.includes(filters.tag)) {
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
  { label: 'Under 10', min: null, max: 10 },
  { label: '10 - 25', min: 10, max: 25 },
  { label: '25 - 50', min: 25, max: 50 },
  { label: '50 - 100', min: 50, max: 100 },
  { label: '100+', min: 100, max: null },
];

function applyPriceRange(min: number | null, max: number | null) {
  filters.minPrice = min;
  filters.maxPrice = max;
  void loadPlans();
}

function clearPriceRange() {
  filters.minPrice = null;
  filters.maxPrice = null;
  void loadPlans();
}

function getHighlightLabel(plan: UserPlanSummary): string | null {
  const tags = plan.tags?.map((tag) => tag.toLowerCase()) ?? [];
  if (tags.some((tag) => tag === 'hot' || tag === 'popular')) {
    return 'Hot';
  }
  if (tags.some((tag) => tag === 'recommended' || tag === 'recommend' || tag === 'featured')) {
    return 'Recommended';
  }
  return null;
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
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load plans';
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

async function submitOrder() {
  orderError.value = '';
  orderMessage.value = '';
  orderLoading.value = true;

  if (!orderForm.plan_id) {
    orderError.value = 'Select a plan before placing an order.';
    orderLoading.value = false;
    return;
  }

  const normalizedQuantity = Math.max(1, orderForm.quantity);
  if (normalizedQuantity !== orderForm.quantity) {
    orderForm.quantity = normalizedQuantity;
  }

  if (orderForm.payment_method === 'external' && !orderForm.payment_channel) {
    orderError.value = 'External payments require a payment channel.';
    orderLoading.value = false;
    return;
  }

  try {
    const response = await userApi.createUserOrder({
      plan_id: orderForm.plan_id,
      quantity: normalizedQuantity,
      payment_method: orderForm.payment_method,
      payment_channel:
        orderForm.payment_method === 'external' ? orderForm.payment_channel : undefined,
      payment_return_url:
        orderForm.payment_method === 'external' ? orderForm.payment_return_url : undefined,
      idempotency_key: createIdempotencyKey(),
    });
    orderResult.value = response;
    orderMessage.value = `Order #${response.order.number} created.`;
  } catch (error) {
    orderError.value = error instanceof Error ? error.message : 'Failed to create order';
  } finally {
    orderLoading.value = false;
  }
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
        <h3 class="page-section__title">Available plans</h3>
        <p class="page__subtitle">Browse plans and create orders directly.</p>
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
        <input v-model="filters.q" type="search" placeholder="Search plans" />
      </label>
      <label class="form__field form__field--compact">
        <span>Tag</span>
        <select v-model="filters.tag">
          <option value="">All</option>
          <option v-for="tag in availableTags" :key="tag" :value="tag">{{ tag }}</option>
        </select>
      </label>
      <label class="form__field form__field--compact">
        <span>Min price</span>
        <input v-model.number="filters.minPrice" type="number" min="0" step="0.01" placeholder="0.00" />
      </label>
      <label class="form__field form__field--compact">
        <span>Max price</span>
        <input v-model.number="filters.maxPrice" type="number" min="0" step="0.01" placeholder="99.00" />
      </label>
      <button class="button" type="submit" :disabled="loading">Apply</button>
    </form>
    <div class="shortcut-bar">
      <span class="shortcut-bar__label">Quick ranges</span>
      <button
        v-for="shortcut in priceShortcuts"
        :key="shortcut.label"
        class="chip"
        type="button"
        @click="applyPriceRange(shortcut.min, shortcut.max)"
      >
        {{ shortcut.label }}
      </button>
      <button class="chip chip--ghost" type="button" @click="clearPriceRange">Clear</button>
    </div>
    <p class="hint">Price filters use major currency units (e.g. 9.99).</p>

    <p v-if="errorMessage" class="alert">{{ errorMessage }}</p>

    <div class="panel-grid">
      <article class="panel-card">
        <header class="panel-card__header">
          <div>
            <h3>Create order</h3>
            <p class="panel-card__meta">POST /user/orders</p>
          </div>
        </header>
        <form class="form" @submit.prevent="submitOrder">
          <label class="form__field">
            <span>Plan</span>
            <select v-model.number="orderForm.plan_id">
              <option value="0">Select a plan</option>
              <option v-for="plan in filteredPlans" :key="plan.id" :value="plan.id">
                {{ plan.name }} · {{ formatCurrency(plan.price_cents, plan.currency) }}
              </option>
            </select>
          </label>
          <div v-if="selectedPlan" class="order-summary order-summary--compact">
            <div>
              <p class="order-summary__label">Selected plan</p>
              <p class="order-summary__value">{{ selectedPlan.name }}</p>
            </div>
            <div v-if="getHighlightLabel(selectedPlan)">
              <p class="order-summary__label">Badge</p>
              <p class="order-summary__value">{{ getHighlightLabel(selectedPlan) }}</p>
            </div>
            <div>
              <p class="order-summary__label">Unit price</p>
              <p class="order-summary__value">
                {{ formatCurrency(selectedPlan.price_cents, selectedPlan.currency) }}
              </p>
            </div>
            <div>
              <p class="order-summary__label">Total</p>
              <p class="order-summary__value">
                {{ formatCurrency(totalCents ?? 0, selectedPlan.currency) }}
              </p>
            </div>
          </div>
          <p v-else class="panel-card__empty">Pick a plan to see pricing details.</p>
          <label class="form__field">
            <span>Quantity</span>
            <input v-model.number="orderForm.quantity" type="number" min="1" />
          </label>
          <label class="form__field">
            <span>Payment method</span>
            <select v-model="orderForm.payment_method">
              <option value="balance">Balance</option>
              <option value="external">External</option>
            </select>
          </label>
          <label class="form__field" :class="{ 'form__field--hidden': orderForm.payment_method !== 'external' }">
            <span>Payment channel</span>
            <input v-model="orderForm.payment_channel" type="text" placeholder="e.g. stripe" />
          </label>
          <label class="form__field" :class="{ 'form__field--hidden': orderForm.payment_method !== 'external' }">
            <span>Return URL</span>
            <input v-model="orderForm.payment_return_url" type="url" placeholder="https://example.com/return" />
          </label>
          <p v-if="orderForm.payment_method === 'external'" class="hint">
            External payments create pending orders. Use the return URL for gateway redirects.
          </p>
          <button class="button button--primary" type="submit" :disabled="orderLoading">
            {{ orderLoading ? 'Submitting...' : 'Create order' }}
          </button>
          <p v-if="orderMessage" class="alert alert--success">{{ orderMessage }}</p>
          <p v-if="orderError" class="alert alert--danger">{{ orderError }}</p>
        </form>
      </article>

      <article class="panel-card panel-card--full">
        <header class="panel-card__header">
          <div>
            <h3>Plans</h3>
            <p class="panel-card__meta">Available offerings</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading plans...</div>
        <div v-else-if="filteredPlans.length === 0" class="panel-card__empty">
          No plans available for the current filters.
        </div>
        <ul v-else class="data-list">
          <li
            v-for="plan in filteredPlans"
            :key="plan.id"
            :class="['data-row', 'data-row--stack', { 'data-row--selected': orderForm.plan_id === plan.id }]"
          >
            <div>
              <p class="data-row__title">{{ plan.name }}</p>
              <p class="data-row__meta">
                {{ formatCurrency(plan.price_cents, plan.currency) }} · {{ plan.duration_days }} days
              </p>
              <p class="data-row__meta">
                {{ formatBytes(plan.traffic_limit_bytes) }} · Devices {{ plan.devices_limit ?? '-' }}
              </p>
              <div v-if="plan.features?.length" class="tag-list">
                <span v-if="getHighlightLabel(plan)" class="tag tag--highlight">
                  {{ getHighlightLabel(plan) }}
                </span>
                <span v-for="feature in plan.features.slice(0, 4)" :key="feature" class="tag">
                  {{ feature }}
                </span>
              </div>
              <div v-else-if="getHighlightLabel(plan)" class="tag-list">
                <span class="tag tag--highlight">{{ getHighlightLabel(plan) }}</span>
              </div>
            </div>
            <div class="data-row__aside">
              <button class="button button--ghost" type="button" @click="selectPlan(plan)">
                Select
              </button>
            </div>
          </li>
        </ul>
      </article>

      <article v-if="orderResult" class="panel-card panel-card--full">
        <header class="panel-card__header">
          <div>
            <h3>Order result</h3>
            <p class="panel-card__meta">Latest order response</p>
          </div>
        </header>
        <div class="order-summary">
          <div>
            <p class="order-summary__label">Order</p>
            <p class="order-summary__value">#{{ orderResult.order.number }}</p>
          </div>
          <div>
            <p class="order-summary__label">Status</p>
            <p class="order-summary__value">{{ orderResult.order.status }}</p>
          </div>
          <div>
            <p class="order-summary__label">Total</p>
            <p class="order-summary__value">
              {{ formatCurrency(orderResult.order.total_cents, orderResult.order.currency) }}
            </p>
          </div>
          <div>
            <p class="order-summary__label">Balance</p>
            <p class="order-summary__value">
              {{ formatCurrency(orderResult.balance.balance_cents, orderResult.balance.currency) }}
            </p>
          </div>
        </div>
        <div v-if="orderResult.order.payment_intent_id" class="panel-card__empty">
          Payment intent: {{ orderResult.order.payment_intent_id }}
        </div>
      </article>
    </div>
  </div>
</template>
