<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { adminApi } from '../../../api';
import { formatBytes, formatCurrency, formatDateTime } from '../../../utils/format';
import type { CreatePlanRequest, PaginationMeta, PlanSummary, UpdatePlanRequest } from '../../../api/types';

const plans = ref<PlanSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');

const selectedPlan = ref<PlanSummary | null>(null);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const isSaving = ref(false);

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

const createForm = reactive<CreatePlanRequest>({
  name: '',
  slug: '',
  description: '',
  tags: [],
  features: [],
  price_cents: 0,
  currency: 'USD',
  duration_days: 30,
  traffic_limit_bytes: 0,
  devices_limit: 1,
  sort_order: 0,
  status: 'draft',
  visible: false,
});

const editForm = reactive<UpdatePlanRequest>({
  name: '',
  slug: '',
  description: '',
  tags: [],
  features: [],
  price_cents: 0,
  currency: 'USD',
  duration_days: 30,
  traffic_limit_bytes: 0,
  devices_limit: 1,
  sort_order: 0,
  status: 'draft',
  visible: false,
});

const tagInput = ref('');
const featureInput = ref('');
const editTagInput = ref('');
const editFeatureInput = ref('');

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

function openCreateModal() {
  createForm.name = '';
  createForm.slug = '';
  createForm.description = '';
  createForm.tags = [];
  createForm.features = [];
  createForm.price_cents = 0;
  createForm.currency = 'USD';
  createForm.duration_days = 30;
  createForm.traffic_limit_bytes = 0;
  createForm.devices_limit = 1;
  createForm.sort_order = 0;
  createForm.status = 'draft';
  createForm.visible = false;
  tagInput.value = '';
  featureInput.value = '';
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

async function handleCreate() {
  if (!createForm.name || createForm.price_cents <= 0 || createForm.duration_days <= 0) {
    errorMessage.value = 'Please fill in all required fields with valid values';
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';

  try {
    await adminApi.createAdminPlan(createForm);
    closeCreateModal();
    await loadPlans();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create plan';
  } finally {
    isSaving.value = false;
  }
}

function openEditModal(plan: PlanSummary) {
  selectedPlan.value = plan;
  editForm.name = plan.name;
  editForm.slug = plan.slug || '';
  editForm.description = plan.description || '';
  editForm.tags = plan.tags ? [...plan.tags] : [];
  editForm.features = plan.features ? [...plan.features] : [];
  editForm.price_cents = plan.price_cents;
  editForm.currency = plan.currency;
  editForm.duration_days = plan.duration_days;
  editForm.traffic_limit_bytes = plan.traffic_limit_bytes || 0;
  editForm.devices_limit = plan.devices_limit || 1;
  editForm.sort_order = plan.sort_order || 0;
  editForm.status = plan.status || 'draft';
  editForm.visible = plan.visible || false;
  editTagInput.value = '';
  editFeatureInput.value = '';
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  selectedPlan.value = null;
}

async function handleUpdate() {
  if (!selectedPlan.value) return;

  if (editForm.price_cents && editForm.price_cents <= 0) {
    errorMessage.value = 'Price must be greater than 0';
    return;
  }

  if (editForm.duration_days && editForm.duration_days <= 0) {
    errorMessage.value = 'Duration must be greater than 0';
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';

  try {
    await adminApi.updateAdminPlan(selectedPlan.value.id, editForm);
    closeEditModal();
    await loadPlans();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to update plan';
  } finally {
    isSaving.value = false;
  }
}

function addTag() {
  if (tagInput.value.trim() && !createForm.tags?.includes(tagInput.value.trim())) {
    if (!createForm.tags) createForm.tags = [];
    createForm.tags.push(tagInput.value.trim());
    tagInput.value = '';
  }
}

function removeTag(tag: string) {
  if (createForm.tags) {
    createForm.tags = createForm.tags.filter(t => t !== tag);
  }
}

function addFeature() {
  if (featureInput.value.trim() && !createForm.features?.includes(featureInput.value.trim())) {
    if (!createForm.features) createForm.features = [];
    createForm.features.push(featureInput.value.trim());
    featureInput.value = '';
  }
}

function removeFeature(feature: string) {
  if (createForm.features) {
    createForm.features = createForm.features.filter(f => f !== feature);
  }
}

function addEditTag() {
  if (editTagInput.value.trim() && !editForm.tags?.includes(editTagInput.value.trim())) {
    if (!editForm.tags) editForm.tags = [];
    editForm.tags.push(editTagInput.value.trim());
    editTagInput.value = '';
  }
}

function removeEditTag(tag: string) {
  if (editForm.tags) {
    editForm.tags = editForm.tags.filter(t => t !== tag);
  }
}

function addEditFeature() {
  if (editFeatureInput.value.trim() && !editForm.features?.includes(editFeatureInput.value.trim())) {
    if (!editForm.features) editForm.features = [];
    editForm.features.push(editFeatureInput.value.trim());
    editFeatureInput.value = '';
  }
}

function removeEditFeature(feature: string) {
  if (editForm.features) {
    editForm.features = editForm.features.filter(f => f !== feature);
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
        <h3 class="page-section__title">Plan catalog</h3>
        <p class="page__subtitle">Review pricing, limits, and visibility.</p>
      </div>
      <div class="page-section__actions">
        <button class="button button--primary" type="button" @click="openCreateModal">
          Create Plan
        </button>
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
              <button class="button button--small" type="button" @click="openEditModal(plan)">
                Edit
              </button>
              <button class="button button--ghost button--small" type="button" @click="selectPlan(plan)">
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

    <!-- Create Plan Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal modal--large">
        <header class="modal__header">
          <h3>Create Plan</h3>
          <button class="modal__close" type="button" @click="closeCreateModal">×</button>
        </header>
        <div class="modal__content">
          <div class="form-grid">
            <div class="form-group">
              <label for="create-name">Name *</label>
              <input
                id="create-name"
                v-model="createForm.name"
                type="text"
                class="input"
                placeholder="Plan name"
              />
            </div>
            <div class="form-group">
              <label for="create-slug">Slug</label>
              <input
                id="create-slug"
                v-model="createForm.slug"
                type="text"
                class="input"
                placeholder="plan-slug"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="create-description">Description</label>
            <textarea
              id="create-description"
              v-model="createForm.description"
              class="input"
              rows="2"
              placeholder="Plan description"
            ></textarea>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="create-price">Price (cents) *</label>
              <input
                id="create-price"
                v-model.number="createForm.price_cents"
                type="number"
                min="0"
                class="input"
                placeholder="999"
              />
            </div>
            <div class="form-group">
              <label for="create-currency">Currency *</label>
              <select id="create-currency" v-model="createForm.currency" class="select">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="create-duration">Duration (days) *</label>
              <input
                id="create-duration"
                v-model.number="createForm.duration_days"
                type="number"
                min="1"
                class="input"
                placeholder="30"
              />
            </div>
            <div class="form-group">
              <label for="create-traffic">Traffic Limit (bytes)</label>
              <input
                id="create-traffic"
                v-model.number="createForm.traffic_limit_bytes"
                type="number"
                min="0"
                class="input"
                placeholder="107374182400"
              />
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="create-devices">Devices Limit</label>
              <input
                id="create-devices"
                v-model.number="createForm.devices_limit"
                type="number"
                min="1"
                class="input"
                placeholder="1"
              />
            </div>
            <div class="form-group">
              <label for="create-sort">Sort Order</label>
              <input
                id="create-sort"
                v-model.number="createForm.sort_order"
                type="number"
                class="input"
                placeholder="0"
              />
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="create-status">Status</label>
              <select id="create-status" v-model="createForm.status" class="select">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input v-model="createForm.visible" type="checkbox" />
                <span>Visible to users</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Tags</label>
            <div class="tag-input-group">
              <input
                v-model="tagInput"
                type="text"
                class="input"
                placeholder="Add tag and press Enter"
                @keyup.enter="addTag"
              />
              <button class="button button--small" type="button" @click="addTag">Add</button>
            </div>
            <div v-if="createForm.tags && createForm.tags.length > 0" class="tag-list">
              <span v-for="tag in createForm.tags" :key="tag" class="tag tag--removable">
                {{ tag }}
                <button type="button" @click="removeTag(tag)">×</button>
              </span>
            </div>
          </div>

          <div class="form-group">
            <label>Features</label>
            <div class="tag-input-group">
              <input
                v-model="featureInput"
                type="text"
                class="input"
                placeholder="Add feature and press Enter"
                @keyup.enter="addFeature"
              />
              <button class="button button--small" type="button" @click="addFeature">Add</button>
            </div>
            <ul v-if="createForm.features && createForm.features.length > 0" class="feature-list">
              <li v-for="feature in createForm.features" :key="feature" class="feature-item">
                {{ feature }}
                <button type="button" @click="removeFeature(feature)">×</button>
              </li>
            </ul>
          </div>
        </div>
        <footer class="modal__footer">
          <button class="button button--secondary" type="button" @click="closeCreateModal">
            Cancel
          </button>
          <button
            class="button button--primary"
            type="button"
            :disabled="isSaving"
            @click="handleCreate"
          >
            {{ isSaving ? 'Creating...' : 'Create' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Edit Plan Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal modal--large">
        <header class="modal__header">
          <h3>Edit Plan</h3>
          <button class="modal__close" type="button" @click="closeEditModal">×</button>
        </header>
        <div class="modal__content">
          <div class="form-grid">
            <div class="form-group">
              <label for="edit-name">Name</label>
              <input
                id="edit-name"
                v-model="editForm.name"
                type="text"
                class="input"
                placeholder="Plan name"
              />
            </div>
            <div class="form-group">
              <label for="edit-slug">Slug</label>
              <input
                id="edit-slug"
                v-model="editForm.slug"
                type="text"
                class="input"
                placeholder="plan-slug"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="edit-description">Description</label>
            <textarea
              id="edit-description"
              v-model="editForm.description"
              class="input"
              rows="2"
              placeholder="Plan description"
            ></textarea>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="edit-price">Price (cents)</label>
              <input
                id="edit-price"
                v-model.number="editForm.price_cents"
                type="number"
                min="0"
                class="input"
                placeholder="999"
              />
            </div>
            <div class="form-group">
              <label for="edit-currency">Currency</label>
              <select id="edit-currency" v-model="editForm.currency" class="select">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="edit-duration">Duration (days)</label>
              <input
                id="edit-duration"
                v-model.number="editForm.duration_days"
                type="number"
                min="1"
                class="input"
                placeholder="30"
              />
            </div>
            <div class="form-group">
              <label for="edit-traffic">Traffic Limit (bytes)</label>
              <input
                id="edit-traffic"
                v-model.number="editForm.traffic_limit_bytes"
                type="number"
                min="0"
                class="input"
                placeholder="107374182400"
              />
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="edit-devices">Devices Limit</label>
              <input
                id="edit-devices"
                v-model.number="editForm.devices_limit"
                type="number"
                min="1"
                class="input"
                placeholder="1"
              />
            </div>
            <div class="form-group">
              <label for="edit-sort">Sort Order</label>
              <input
                id="edit-sort"
                v-model.number="editForm.sort_order"
                type="number"
                class="input"
                placeholder="0"
              />
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="edit-status">Status</label>
              <select id="edit-status" v-model="editForm.status" class="select">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input v-model="editForm.visible" type="checkbox" />
                <span>Visible to users</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Tags</label>
            <div class="tag-input-group">
              <input
                v-model="editTagInput"
                type="text"
                class="input"
                placeholder="Add tag and press Enter"
                @keyup.enter="addEditTag"
              />
              <button class="button button--small" type="button" @click="addEditTag">Add</button>
            </div>
            <div v-if="editForm.tags && editForm.tags.length > 0" class="tag-list">
              <span v-for="tag in editForm.tags" :key="tag" class="tag tag--removable">
                {{ tag }}
                <button type="button" @click="removeEditTag(tag)">×</button>
              </span>
            </div>
          </div>

          <div class="form-group">
            <label>Features</label>
            <div class="tag-input-group">
              <input
                v-model="editFeatureInput"
                type="text"
                class="input"
                placeholder="Add feature and press Enter"
                @keyup.enter="addEditFeature"
              />
              <button class="button button--small" type="button" @click="addEditFeature">Add</button>
            </div>
            <ul v-if="editForm.features && editForm.features.length > 0" class="feature-list">
              <li v-for="feature in editForm.features" :key="feature" class="feature-item">
                {{ feature }}
                <button type="button" @click="removeEditFeature(feature)">×</button>
              </li>
            </ul>
          </div>
        </div>
        <footer class="modal__footer">
          <button class="button button--secondary" type="button" @click="closeEditModal">
            Cancel
          </button>
          <button
            class="button button--primary"
            type="button"
            :disabled="isSaving"
            @click="handleUpdate"
          >
            {{ isSaving ? 'Updating...' : 'Update' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal--large {
  max-width: 900px;
}

.modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal__close {
  font-size: 1.5rem;
  line-height: 1;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
}

.modal__close:hover {
  background: #f3f4f6;
}

.modal__content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: #374151;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.input,
.select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.input:focus,
.select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding-top: 1.75rem;
}

.tag-input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag--removable {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.tag--removable button {
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 1rem;
  line-height: 1;
}

.tag--removable button:hover {
  background: rgba(0, 0, 0, 0.1);
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
}

.feature-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 0.25rem;
  margin-bottom: 0.5rem;
}

.feature-item button {
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 1rem;
  line-height: 1;
}

.feature-item button:hover {
  background: rgba(0, 0, 0, 0.1);
}

.button--small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}
</style>
