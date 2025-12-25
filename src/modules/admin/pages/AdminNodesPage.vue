<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { adminApi } from '../../../api';
import { formatDateTime } from '../../../utils/format';
import type { NodeKernelSummary, NodeSummary, PaginationMeta } from '../../../api/types';

const nodes = ref<NodeSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');

const selectedNode = ref<NodeSummary | null>(null);
const kernels = ref<NodeKernelSummary[]>([]);
const kernelsLoading = ref(false);
const kernelsError = ref('');
const syncingKernels = ref(false);
const syncSuccess = ref(false);

const perPage = 10;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  q: '',
  status: '',
  protocol: '',
  sort: 'last_synced_at',
  direction: 'desc',
});

function statusTone(value?: string): string {
  switch (value) {
    case 'active':
    case 'online':
      return 'status-pill status-pill--ok';
    case 'pending':
      return 'status-pill status-pill--warn';
    case 'offline':
    case 'failed':
      return 'status-pill status-pill--danger';
    default:
      return 'status-pill status-pill--muted';
  }
}

async function loadNodes() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminNodes({
      page: 1,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status || undefined,
      protocol: filters.protocol || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    nodes.value = response.nodes ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load nodes';
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
    const response = await adminApi.fetchAdminNodes({
      page: targetPage,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status || undefined,
      protocol: filters.protocol || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    nodes.value = [...nodes.value, ...(response.nodes ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load more nodes';
  } finally {
    isLoadingMore.value = false;
  }
}

async function selectNode(node: NodeSummary) {
  selectedNode.value = node;
  kernels.value = [];
  kernelsLoading.value = true;
  kernelsError.value = '';
  syncSuccess.value = false;

  try {
    const response = await adminApi.fetchAdminNodeKernels(node.id);
    kernels.value = response.kernels ?? [];
  } catch (error) {
    kernelsError.value = error instanceof Error ? error.message : 'Failed to load kernels';
  } finally {
    kernelsLoading.value = false;
  }
}

async function syncKernels() {
  if (!selectedNode.value || syncingKernels.value) {
    return;
  }

  syncingKernels.value = true;
  kernelsError.value = '';
  syncSuccess.value = false;

  try {
    const response = await adminApi.syncNodeKernels(selectedNode.value.id);
    kernels.value = response.kernels ?? [];
    syncSuccess.value = true;
    
    // Update the node's last_synced_at in the list
    const nodeIndex = nodes.value.findIndex(n => n.id === selectedNode.value?.id);
    if (nodeIndex !== -1) {
      nodes.value[nodeIndex].last_synced_at = Math.floor(Date.now() / 1000);
    }

    // Hide success message after 3 seconds
    setTimeout(() => {
      syncSuccess.value = false;
    }, 3000);
  } catch (error) {
    kernelsError.value = error instanceof Error ? error.message : 'Failed to sync kernels';
  } finally {
    syncingKernels.value = false;
  }
}

onMounted(() => {
  void loadNodes();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">Nodes</p>
        <h3 class="page-section__title">Node inventory</h3>
        <p class="page__subtitle">Monitor capacity, status, and kernel sync.</p>
      </div>
      <div class="page-section__actions">
        <button class="button button--ghost" type="button" @click="loadNodes" :disabled="loading">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </header>

    <form class="filter-bar" @submit.prevent="loadNodes">
      <label class="form__field form__field--compact">
        <span>Search</span>
        <input v-model="filters.q" type="search" placeholder="Name or region" />
      </label>
      <label class="form__field form__field--compact">
        <span>Status</span>
        <select v-model="filters.status">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="offline">Offline</option>
          <option value="pending">Pending</option>
        </select>
      </label>
      <label class="form__field form__field--compact">
        <span>Protocol</span>
        <input v-model="filters.protocol" type="text" placeholder="e.g. vless" />
      </label>
      <label class="form__field form__field--compact">
        <span>Sort</span>
        <select v-model="filters.sort">
          <option value="last_synced_at">Last sync</option>
          <option value="name">Name</option>
          <option value="region">Region</option>
          <option value="capacity_mbps">Capacity</option>
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
            <h3>Nodes</h3>
            <p class="panel-card__meta">Latest {{ nodes.length }} nodes</p>
          </div>
        </header>
        <div v-if="loading" class="panel-card__empty">Loading nodes...</div>
        <div v-else-if="nodes.length === 0" class="panel-card__empty">No nodes found.</div>
        <ul v-else class="data-list">
          <li
            v-for="node in nodes"
            :key="node.id"
            :class="['data-row', 'data-row--stack', { 'data-row--selected': selectedNode?.id === node.id }]"
          >
            <div>
              <p class="data-row__title">{{ node.name }}</p>
              <p class="data-row__meta">
                {{ node.region || 'Unknown region' }} ·
                {{ node.protocols?.join(', ') || 'No protocols' }}
              </p>
              <p class="data-row__meta">Capacity {{ node.capacity_mbps ?? '-' }} Mbps</p>
            </div>
            <div class="data-row__aside">
              <span :class="statusTone(node.status)">{{ node.status || 'unknown' }}</span>
              <span class="data-row__meta">{{ formatDateTime(node.last_synced_at) }}</span>
              <button class="button button--ghost" type="button" @click="selectNode(node)">
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
            <h3>Node detail</h3>
            <p class="panel-card__meta">
              {{ selectedNode ? selectedNode.name : 'Select a node' }}
            </p>
          </div>
          <div v-if="selectedNode" class="page-section__actions">
            <button 
              class="button button--primary" 
              type="button" 
              @click="syncKernels" 
              :disabled="syncingKernels"
            >
              {{ syncingKernels ? 'Syncing...' : 'Sync Kernels' }}
            </button>
          </div>
        </header>
        <div v-if="!selectedNode" class="panel-card__empty">Choose a node to view details.</div>
        <div v-else>
          <div class="detail-grid">
            <div>
              <p class="detail-label">Region</p>
              <p class="detail-value">{{ selectedNode.region || '-' }}</p>
            </div>
            <div>
              <p class="detail-label">Country</p>
              <p class="detail-value">{{ selectedNode.country || '-' }}</p>
            </div>
            <div>
              <p class="detail-label">ISP</p>
              <p class="detail-value">{{ selectedNode.isp || '-' }}</p>
            </div>
            <div>
              <p class="detail-label">Status</p>
              <p class="detail-value">{{ selectedNode.status || '-' }}</p>
            </div>
            <div>
              <p class="detail-label">Last sync</p>
              <p class="detail-value">{{ formatDateTime(selectedNode.last_synced_at) }}</p>
            </div>
            <div>
              <p class="detail-label">Updated</p>
              <p class="detail-value">{{ formatDateTime(selectedNode.updated_at) }}</p>
            </div>
          </div>
          <p class="detail-label">Description</p>
          <p class="detail-value">{{ selectedNode.description || 'No description.' }}</p>

          <div class="detail-section">
            <h4>Kernel status</h4>
            <p v-if="syncSuccess" class="alert alert--success" style="margin-bottom: 1rem;">
              ✅ Kernels synced successfully!
            </p>
            <div v-if="kernelsLoading || syncingKernels" class="panel-card__empty">
              {{ syncingKernels ? 'Syncing kernels...' : 'Loading kernels...' }}
            </div>
            <div v-else-if="kernelsError" class="panel-card__empty">{{ kernelsError }}</div>
            <div v-else-if="kernels.length === 0" class="panel-card__empty">No kernels found.</div>
            <ul v-else class="data-list data-list--compact">
              <li v-for="kernel in kernels" :key="kernel.protocol" class="data-row">
                <div>
                  <p class="data-row__title">{{ kernel.protocol }}</p>
                  <p class="data-row__meta">{{ kernel.endpoint || 'No endpoint' }}</p>
                </div>
                <div class="data-row__aside">
                  <span :class="statusTone(kernel.status)">{{ kernel.status || 'unknown' }}</span>
                  <span class="data-row__meta">{{ formatDateTime(kernel.last_synced_at) }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
