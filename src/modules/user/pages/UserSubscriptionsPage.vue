<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { userApi } from '../../../api';
import { formatBytes, formatDate, formatDateTime } from '../../../utils/format';
import type { PaginationMeta, UserSubscriptionPreview, UserSubscriptionSummary } from '../../../api/types';

type DiffRow = {
  index: number;
  current: string;
  selected: string;
  status: 'same' | 'added' | 'removed' | 'diff';
};

type DiffGroup = {
  id: string;
  type: 'same' | 'change';
  rows: DiffRow[];
};

type LoadOptions = {
  syncUrl?: boolean;
  historyMode?: 'push' | 'replace';
  persist?: boolean;
};

const subscriptions = ref<UserSubscriptionSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');
const actionMessage = ref('');
const actionError = ref('');
const applyLoading = ref(false);
const perPage = 10;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);
const jumpPage = ref('');
const route = useRoute();
const router = useRouter();

const filters = reactive({
  q: '',
  status: '',
  sort: 'expires_at',
  direction: 'asc',
});

const defaultFilters = {
  q: '',
  status: '',
  sort: 'expires_at',
  direction: 'asc',
};

const queryFilters = loadFiltersFromQuery();
const savedFilters = loadSavedFilters();
if (queryFilters) {
  Object.assign(filters, queryFilters);
} else if (savedFilters) {
  Object.assign(filters, savedFilters);
}

const templateSelections = ref<Record<number, number>>({});
const preview = ref<UserSubscriptionPreview | null>(null);
const previewLoading = ref(false);
const previewError = ref('');
const previewActionMessage = ref('');
const previewActionError = ref('');
const previewTargetId = ref<number | null>(null);
const confirmTarget = ref<UserSubscriptionSummary | null>(null);
const downloadFormat = ref('auto');
const compareLoading = ref(false);
const compareError = ref('');
const compareMessage = ref('');
const compare = ref<{
  subscriptionId: number;
  current: UserSubscriptionPreview;
  selected: UserSubscriptionPreview;
} | null>(null);

const isPreviewReady = computed(() => preview.value !== null && !previewLoading.value);
const maxDiffLines = 200;
const resolvedDownloadFormat = computed(() => {
  if (downloadFormat.value !== 'auto') {
    return downloadFormat.value;
  }
  const contentType = preview.value?.content_type ?? '';
  if (contentType.includes('json')) {
    return 'json';
  }
  if (contentType.includes('yaml') || contentType.includes('yml')) {
    return 'yaml';
  }
  return 'txt';
});

const compareLines = computed(() => {
  if (!compare.value) {
    return null;
  }
  return {
    currentLines: compare.value.current.content.split('\n'),
    selectedLines: compare.value.selected.content.split('\n'),
  };
});

const diffCounts = computed(() => {
  if (!compareLines.value) {
    return null;
  }

  const { currentLines, selectedLines } = compareLines.value;
  const total = Math.max(currentLines.length, selectedLines.length);
  let same = 0;
  let added = 0;
  let removed = 0;
  let changed = 0;

  for (let i = 0; i < total; i += 1) {
    const currentLine = currentLines[i];
    const selectedLine = selectedLines[i];
    if (currentLine === selectedLine) {
      same += 1;
    } else if (currentLine === undefined) {
      added += 1;
    } else if (selectedLine === undefined) {
      removed += 1;
    } else {
      changed += 1;
    }
  }

  return {
    total,
    same,
    added,
    removed,
    changed,
    truncated: total > maxDiffLines,
  };
});

const diffRows = computed<DiffRow[]>(() => {
  if (!compareLines.value) {
    return [];
  }

  const { currentLines, selectedLines } = compareLines.value;
  const total = Math.min(Math.max(currentLines.length, selectedLines.length), maxDiffLines);
  const rows: DiffRow[] = [];

  for (let i = 0; i < total; i += 1) {
    const currentLine = currentLines[i] ?? '';
    const selectedLine = selectedLines[i] ?? '';
    let status: DiffRow['status'] = 'same';

    if (currentLine === selectedLine) {
      status = 'same';
    } else if (!currentLine && selectedLine) {
      status = 'added';
    } else if (currentLine && !selectedLine) {
      status = 'removed';
    } else {
      status = 'diff';
    }

    rows.push({
      index: i + 1,
      current: currentLine,
      selected: selectedLine,
      status,
    });
  }

  return rows;
});

const compareView = ref<'all' | 'diffs'>('diffs');
const collapsed = ref({
  summary: false,
  json: false,
  diff: false,
});
const collapseThreshold = 6;
const expandedGroups = ref<Record<string, boolean>>({});
const isAllExpanded = ref(false);
const filterSyncDelay = 400;
let filterSyncTimer: number | null = null;
const isApplyingQuery = ref(false);

const diffGroups = computed<DiffGroup[]>(() => {
  const rows = diffRows.value;
  if (!rows.length) {
    return [];
  }

  const groups: DiffGroup[] = [];
  let currentGroup: DiffGroup | null = null;

  rows.forEach((row) => {
    const type: DiffGroup['type'] = row.status === 'same' ? 'same' : 'change';
    if (!currentGroup || currentGroup.type !== type) {
      const id = `${row.index}-${type}`;
      currentGroup = { id, type, rows: [row] };
      groups.push(currentGroup);
      return;
    }
    currentGroup.rows.push(row);
  });

  return groups;
});

const totalPages = computed(() => {
  if (!pagination.value) {
    return 1;
  }
  return Math.max(1, Math.ceil(pagination.value.total_count / pagination.value.per_page));
});

const storageKey = 'znp_user_subscriptions_filters';

function loadSavedFilters() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<typeof filters>;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return {
      q: typeof parsed.q === 'string' ? parsed.q : '',
      status: typeof parsed.status === 'string' ? parsed.status : '',
      sort: typeof parsed.sort === 'string' ? parsed.sort : 'expires_at',
      direction: typeof parsed.direction === 'string' ? parsed.direction : 'asc',
    };
  } catch (error) {
    return null;
  }
}

function saveFilters() {
  if (typeof window === 'undefined') {
    return;
  }
  const payload = {
    q: filters.q,
    status: filters.status,
    sort: filters.sort,
    direction: filters.direction,
  };
  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}

function clearSavedFilters() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(storageKey);
}

function readQueryValue(key: string): string | null {
  const value = route.query[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

function parsePageParam(): number | null {
  const raw = readQueryValue('page');
  if (!raw) {
    return null;
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 1) {
    return null;
  }
  return Math.floor(num);
}

function loadFiltersFromQuery(): Partial<typeof filters> | null {
  const result: Partial<typeof filters> = {};
  const q = readQueryValue('q');
  const status = readQueryValue('status');
  const sort = readQueryValue('sort');
  const direction = readQueryValue('direction');

  if (q !== null) {
    result.q = q;
  }
  if (status !== null) {
    result.status = status;
  }
  if (sort !== null) {
    result.sort = sort;
  }
  if (direction !== null) {
    result.direction = direction;
  }

  return Object.keys(result).length ? result : null;
}

function updateQuery(targetPage: number, mode: 'push' | 'replace' = 'push') {
  const query: Record<string, string> = {};
  if (filters.q) {
    query.q = filters.q;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.sort !== defaultFilters.sort) {
    query.sort = filters.sort;
  }
  if (filters.direction !== defaultFilters.direction) {
    query.direction = filters.direction;
  }
  if (targetPage > 1) {
    query.page = String(targetPage);
  }

  if (mode === 'replace') {
    router.replace({ query });
  } else {
    router.push({ query });
  }
}

function scheduleFilterSync() {
  if (filterSyncTimer !== null) {
    window.clearTimeout(filterSyncTimer);
  }
  filterSyncTimer = window.setTimeout(() => {
    void loadSubscriptions(1);
  }, filterSyncDelay);
}

function areFiltersEqual(nextFilters: typeof filters) {
  return (
    nextFilters.q === filters.q &&
    nextFilters.status === filters.status &&
    nextFilters.sort === filters.sort &&
    nextFilters.direction === filters.direction
  );
}

function resetFilters() {
  Object.assign(filters, defaultFilters);
  jumpPage.value = '';
  clearSavedFilters();
  updateQuery(1);
  void loadSubscriptions(1, { syncUrl: false });
}

const activeGroups = computed(() => {
  if (compareView.value === 'diffs') {
    return diffGroups.value.filter((group) => group.type === 'change');
  }
  return diffGroups.value;
});

function isGroupCollapsed(group: DiffGroup): boolean {
  if (compareView.value !== 'all') {
    return false;
  }
  if (group.type !== 'same') {
    return false;
  }
  if (group.rows.length <= collapseThreshold) {
    return false;
  }
  return !expandedGroups.value[group.id];
}

function toggleGroup(group: DiffGroup) {
  if (group.type !== 'same') {
    return;
  }
  expandedGroups.value = {
    ...expandedGroups.value,
    [group.id]: !expandedGroups.value[group.id],
  };
}

function toggleAllGroups() {
  const targetState = !isAllExpanded.value;
  const updated: Record<string, boolean> = {};

  diffGroups.value.forEach((group) => {
    if (group.type !== 'same' || group.rows.length <= collapseThreshold) {
      return;
    }
    updated[group.id] = targetState;
  });

  expandedGroups.value = updated;
  isAllExpanded.value = targetState;
}

function groupLabel(group: DiffGroup): string {
  const start = group.rows[0]?.index ?? 0;
  const end = group.rows[group.rows.length - 1]?.index ?? start;
  return `${group.rows.length} unchanged lines (lines ${start}-${end})`;
}

const jsonDiff = computed(() => {
  if (!compare.value) {
    return null;
  }

  const currentType = compare.value.current.content_type ?? '';
  const selectedType = compare.value.selected.content_type ?? '';
  if (!currentType.includes('json') || !selectedType.includes('json')) {
    return null;
  }

  try {
    const currentJson = JSON.parse(compare.value.current.content) as Record<string, unknown>;
    const selectedJson = JSON.parse(compare.value.selected.content) as Record<string, unknown>;
    const keys = new Set([...Object.keys(currentJson), ...Object.keys(selectedJson)]);
    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];

    keys.forEach((key) => {
      const currentValue = currentJson[key];
      const selectedValue = selectedJson[key];
      if (currentValue === undefined) {
        added.push(key);
        return;
      }
      if (selectedValue === undefined) {
        removed.push(key);
        return;
      }
      if (JSON.stringify(currentValue) !== JSON.stringify(selectedValue)) {
        changed.push(key);
      }
    });

    return { added, removed, changed };
  } catch (error) {
    return null;
  }
});

function statusTone(value?: string): string {
  switch (value) {
    case 'active':
      return 'status-pill status-pill--ok';
    case 'pending':
      return 'status-pill status-pill--warn';
    case 'expired':
    case 'cancelled':
      return 'status-pill status-pill--danger';
    default:
      return 'status-pill status-pill--muted';
  }
}

function buildTemplateSelections(items: UserSubscriptionSummary[]) {
  const selections: Record<number, number> = { ...templateSelections.value };
  items.forEach((subscription) => {
    if (!subscription.available_template_ids?.length) {
      return;
    }
    const fallbackTemplate = subscription.available_template_ids[0];
    if (!fallbackTemplate) {
      return;
    }
    const current =
      selections[subscription.id] ??
      subscription.template_id ??
      fallbackTemplate;
    selections[subscription.id] = current;
  });
  templateSelections.value = selections;
}

async function loadSubscriptions(targetPage = 1, options: LoadOptions = {}) {
  loading.value = true;
  errorMessage.value = '';
  compareError.value = '';
  compareMessage.value = '';
  compare.value = null;
  expandedGroups.value = {};
  isAllExpanded.value = false;
  const { syncUrl = true, historyMode = 'push', persist = true } = options;
  if (persist) {
    saveFilters();
  }
  preview.value = null;
  previewTargetId.value = null;
  page.value = targetPage;
  if (syncUrl) {
    updateQuery(targetPage, historyMode);
  }

  try {
    const response = await userApi.fetchUserSubscriptions({
      page: targetPage,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    subscriptions.value = response.subscriptions ?? [];
    buildTemplateSelections(subscriptions.value);
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load subscriptions';
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
    const response = await userApi.fetchUserSubscriptions({
      page: targetPage,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    subscriptions.value = [...subscriptions.value, ...(response.subscriptions ?? [])];
    buildTemplateSelections(subscriptions.value);
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
    updateQuery(page.value, 'replace');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load more subscriptions';
  } finally {
    isLoadingMore.value = false;
  }
}

async function jumpToPage() {
  if (!pagination.value) {
    return;
  }

  const target = Number(jumpPage.value);
  if (!Number.isFinite(target) || target < 1) {
    errorMessage.value = 'Enter a valid page number.';
    return;
  }

  const clamped = Math.min(Math.max(1, target), totalPages.value);
  if (clamped === page.value) {
    jumpPage.value = '';
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  saveFilters();
  preview.value = null;
  previewTargetId.value = null;
  compare.value = null;
  page.value = clamped;
  updateQuery(clamped);

  try {
    const response = await userApi.fetchUserSubscriptions({
      page: clamped,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    subscriptions.value = response.subscriptions ?? [];
    buildTemplateSelections(subscriptions.value);
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? clamped;
    jumpPage.value = '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load target page';
  } finally {
    loading.value = false;
  }
}

async function handlePreview(subscription: UserSubscriptionSummary) {
  previewLoading.value = true;
  previewError.value = '';
  previewActionError.value = '';
  previewActionMessage.value = '';
  preview.value = null;
  previewTargetId.value = subscription.id;

  const selectedTemplate = templateSelections.value[subscription.id] ?? subscription.template_id;

  try {
    preview.value = await userApi.fetchUserSubscriptionPreview(
      subscription.id,
      selectedTemplate,
    );
  } catch (error) {
    previewError.value = error instanceof Error ? error.message : 'Failed to load preview';
  } finally {
    previewLoading.value = false;
  }
}

async function handleCompare(subscription: UserSubscriptionSummary) {
  compareLoading.value = true;
  compareError.value = '';
  compareMessage.value = '';
  compare.value = null;
  expandedGroups.value = {};
  isAllExpanded.value = false;

  const currentTemplateId = subscription.template_id;
  const selectedTemplateId = templateSelections.value[subscription.id] ?? currentTemplateId;

  if (!currentTemplateId || !selectedTemplateId) {
    compareError.value = 'Missing template information for comparison.';
    compareLoading.value = false;
    return;
  }

  if (currentTemplateId === selectedTemplateId) {
    compareMessage.value = 'Selected template matches the current template.';
    compareLoading.value = false;
    return;
  }

  try {
    const [currentPreview, selectedPreview] = await Promise.all([
      userApi.fetchUserSubscriptionPreview(subscription.id, currentTemplateId),
      userApi.fetchUserSubscriptionPreview(subscription.id, selectedTemplateId),
    ]);
    compare.value = {
      subscriptionId: subscription.id,
      current: currentPreview,
      selected: selectedPreview,
    };
  } catch (error) {
    compareError.value = error instanceof Error ? error.message : 'Failed to compare templates';
  } finally {
    compareLoading.value = false;
  }
}

function openConfirm(subscription: UserSubscriptionSummary) {
  confirmTarget.value = subscription;
}

function closeConfirm() {
  confirmTarget.value = null;
}

async function applyTemplate() {
  actionMessage.value = '';
  actionError.value = '';

  const subscription = confirmTarget.value;
  if (!subscription) {
    return;
  }

  const selectedTemplate = templateSelections.value[subscription.id];
  if (!selectedTemplate) {
    actionError.value = 'Select a template before applying changes.';
    return;
  }

  try {
    applyLoading.value = true;
    const response = await userApi.updateUserSubscriptionTemplate(
      subscription.id,
      selectedTemplate,
    );
    subscription.template_id = response.template_id;
    actionMessage.value = `Template updated for ${subscription.name}.`;
    compare.value = null;
    compareMessage.value = 'Template updated. Run comparison again to view differences.';
    confirmTarget.value = null;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Failed to update template';
  } finally {
    applyLoading.value = false;
  }
}

async function copyPreview() {
  if (!preview.value) {
    return;
  }

  previewActionError.value = '';
  previewActionMessage.value = '';

  try {
    await navigator.clipboard.writeText(preview.value.content);
    previewActionMessage.value = 'Preview copied to clipboard.';
  } catch (error) {
    previewActionError.value = 'Failed to copy preview.';
  }
}

function downloadPreview() {
  if (!preview.value) {
    return;
  }

  previewActionError.value = '';
  previewActionMessage.value = '';

  try {
    const blob = new Blob([preview.value.content], { type: preview.value.content_type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subscription-${preview.value.subscription_id}.${resolvedDownloadFormat.value}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    previewActionMessage.value = 'Preview downloaded.';
  } catch (error) {
    previewActionError.value = 'Failed to download preview.';
  }
}

onMounted(() => {
  const initialPage = parsePageParam() ?? 1;
  void loadSubscriptions(initialPage, { syncUrl: false });
});

watch(
  () => ({ ...filters }),
  () => {
    if (isApplyingQuery.value) {
      return;
    }
    scheduleFilterSync();
  },
  { deep: true },
);

watch(
  () => route.query,
  () => {
    const nextFilters = {
      ...defaultFilters,
      ...(loadFiltersFromQuery() ?? {}),
    };
    const nextPage = parsePageParam() ?? 1;
    const hasChanges = !areFiltersEqual(nextFilters) || nextPage !== page.value;
    if (!hasChanges) {
      return;
    }
    isApplyingQuery.value = true;
    Object.assign(filters, nextFilters);
    jumpPage.value = '';
    void loadSubscriptions(nextPage, { syncUrl: false, persist: false }).finally(() => {
      isApplyingQuery.value = false;
    });
  },
);

onBeforeUnmount(() => {
  if (filterSyncTimer !== null) {
    window.clearTimeout(filterSyncTimer);
  }
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">Subscriptions</p>
        <h3 class="page-section__title">Active access</h3>
        <p class="page__subtitle">Manage templates and preview subscription outputs.</p>
      </div>
      <div class="page-section__actions">
        <button class="button button--ghost" type="button" @click="loadSubscriptions" :disabled="loading">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </header>

    <form class="filter-bar" @submit.prevent="loadSubscriptions">
      <label class="form__field form__field--compact">
        <span>Search</span>
        <input v-model="filters.q" type="search" placeholder="Plan or subscription name" />
      </label>
      <label class="form__field form__field--compact">
        <span>Status</span>
        <select v-model="filters.status">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>
      <label class="form__field form__field--compact">
        <span>Sort</span>
        <select v-model="filters.sort">
          <option value="expires_at">Expires</option>
          <option value="created_at">Created</option>
          <option value="status">Status</option>
        </select>
      </label>
      <label class="form__field form__field--compact">
        <span>Direction</span>
        <select v-model="filters.direction">
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </label>
      <button class="button" type="submit" :disabled="loading">Apply</button>
      <button class="button button--ghost" type="button" @click="resetFilters" :disabled="loading">
        Reset
      </button>
    </form>

    <p v-if="errorMessage" class="alert">{{ errorMessage }}</p>
    <p v-if="actionMessage" class="alert alert--success">{{ actionMessage }}</p>
    <p v-if="actionError" class="alert alert--danger">{{ actionError }}</p>

    <article class="panel-card">
      <header class="panel-card__header">
        <div>
          <h3>Subscription list</h3>
          <p class="panel-card__meta">Showing latest 10 records</p>
        </div>
      </header>
      <div v-if="loading" class="panel-card__empty">Loading subscriptions...</div>
      <div v-else-if="subscriptions.length === 0" class="panel-card__empty">
        No subscriptions match the current filters.
      </div>
      <ul v-else class="data-list">
        <li v-for="subscription in subscriptions" :key="subscription.id" class="data-row data-row--stack">
          <div>
            <p class="data-row__title">{{ subscription.name }}</p>
            <p class="data-row__meta">
              {{ subscription.plan_name || 'Plan not set' }} · Expires
              {{ formatDate(subscription.expires_at) }}
            </p>
            <p class="data-row__meta">
              {{ formatBytes(subscription.traffic_used_bytes) }} /
              {{ formatBytes(subscription.traffic_total_bytes) }} · Devices
              {{ subscription.devices_limit ?? '-' }}
            </p>
          </div>
          <div class="data-row__aside data-row__aside--wide">
            <span :class="statusTone(subscription.status)">{{ subscription.status || 'unknown' }}</span>
            <div v-if="subscription.available_template_ids?.length" class="template-actions">
              <label class="form__field form__field--inline">
                <span>Template</span>
                <select v-model.number="templateSelections[subscription.id]">
                  <option
                    v-for="templateId in subscription.available_template_ids"
                    :key="templateId"
                    :value="templateId"
                  >
                    #{{ templateId }}
                  </option>
                </select>
              </label>
              <p class="data-row__meta">
                Current #{{ subscription.template_id ?? 'n/a' }} · Selected
                #{{ templateSelections[subscription.id] ?? subscription.template_id ?? 'n/a' }}
              </p>
              <div class="template-actions__buttons">
                <button class="button button--ghost" type="button" @click="handlePreview(subscription)">
                  Preview
                </button>
                <button class="button button--ghost" type="button" @click="handleCompare(subscription)">
                  Compare
                </button>
                <button
                  class="button"
                  type="button"
                  :disabled="applyLoading || (templateSelections[subscription.id] ?? subscription.template_id) === subscription.template_id"
                  @click="openConfirm(subscription)"
                >
                  Apply
                </button>
              </div>
            </div>
            <div v-else class="data-row__meta">No templates available.</div>
          </div>
        </li>
      </ul>
      <div v-if="pagination" class="list-footer">
        <div class="list-footer__info">
          Page {{ pagination.page }} of {{ totalPages }} · {{ pagination.total_count }} subscriptions
        </div>
        <div class="list-footer__actions">
          <label class="form__field form__field--inline">
            <span>Go to</span>
            <input
              v-model="jumpPage"
              class="jump-input"
              type="number"
              min="1"
              :max="totalPages"
              placeholder="Page"
            />
          </label>
          <button class="button button--ghost" type="button" @click="jumpToPage" :disabled="loading || !jumpPage">
            Go
          </button>
          <button
            class="button button--ghost"
            type="button"
            @click="loadMore"
            :disabled="isLoadingMore || !pagination.has_next"
          >
            {{ isLoadingMore ? 'Loading...' : 'Load more' }}
          </button>
        </div>
      </div>
    </article>

    <article class="panel-card panel-card--full">
      <header class="panel-card__header">
        <div>
          <h3>Preview</h3>
          <p class="panel-card__meta">
            {{ previewTargetId ? `Subscription #${previewTargetId}` : 'Select a subscription' }}
          </p>
        </div>
      </header>
      <div v-if="previewLoading" class="panel-card__empty">Generating preview...</div>
      <div v-else-if="previewError" class="panel-card__empty">{{ previewError }}</div>
      <div v-else-if="!preview" class="panel-card__empty">
        Pick a subscription to load its preview.
      </div>
      <div v-else class="preview">
        <div class="preview__meta">
          <span class="tag">Template #{{ preview.template_id }}</span>
          <span class="tag">{{ preview.content_type }}</span>
          <span class="tag">ETag {{ preview.etag }}</span>
          <span class="tag">{{ formatDateTime(preview.generated_at) }}</span>
        </div>
        <div class="preview__actions">
          <label class="form__field form__field--inline">
            <span>Download</span>
            <select v-model="downloadFormat">
              <option value="auto">Auto</option>
              <option value="txt">TXT</option>
              <option value="yaml">YAML</option>
              <option value="json">JSON</option>
            </select>
          </label>
          <button class="button button--ghost" type="button" @click="copyPreview" :disabled="!isPreviewReady">
            Copy
          </button>
          <button class="button button--ghost" type="button" @click="downloadPreview" :disabled="!isPreviewReady">
            Download
          </button>
        </div>
        <p v-if="previewActionMessage" class="alert alert--success">{{ previewActionMessage }}</p>
        <p v-if="previewActionError" class="alert alert--danger">{{ previewActionError }}</p>
        <pre class="preview__content">{{ preview.content }}</pre>
      </div>
    </article>

    <article class="panel-card panel-card--full">
      <header class="panel-card__header">
        <div>
          <h3>Comparison</h3>
          <p class="panel-card__meta">Current template vs selected template</p>
        </div>
        <div class="panel-card__actions">
          <label class="form__field form__field--inline">
            <span>View</span>
            <select v-model="compareView">
              <option value="diffs">Differences</option>
              <option value="all">All lines</option>
            </select>
          </label>
        </div>
      </header>
      <div v-if="compareLoading" class="panel-card__empty">Comparing templates...</div>
      <div v-else-if="compareError" class="panel-card__empty">{{ compareError }}</div>
      <div v-else-if="compareMessage" class="panel-card__empty">{{ compareMessage }}</div>
      <div v-else-if="!compare" class="panel-card__empty">
        Choose a subscription and click Compare to see differences.
      </div>
      <div v-else class="compare">
        <button class="collapse-toggle" type="button" @click="collapsed.summary = !collapsed.summary">
          <span>{{ collapsed.summary ? 'Show summary' : 'Hide summary' }}</span>
          <span class="collapse-toggle__icon">{{ collapsed.summary ? '+' : '−' }}</span>
        </button>
        <div v-if="!collapsed.summary" class="compare-summary">
          <div class="compare-summary__item">
            <p class="compare-summary__label">Current</p>
            <p class="compare-summary__value">Template #{{ compare.current.template_id }}</p>
          </div>
          <div class="compare-summary__item">
            <p class="compare-summary__label">Selected</p>
            <p class="compare-summary__value">Template #{{ compare.selected.template_id }}</p>
          </div>
          <div v-if="diffCounts" class="compare-summary__item">
            <p class="compare-summary__label">Lines</p>
            <p class="compare-summary__value">
              {{ diffCounts.total }} total · {{ diffCounts.changed }} changed ·
              {{ diffCounts.added }} added · {{ diffCounts.removed }} removed
            </p>
          </div>
        </div>
        <p v-if="diffCounts?.truncated" class="hint">
          Diff view is limited to {{ maxDiffLines }} lines.
        </p>
        <button
          v-if="jsonDiff"
          class="collapse-toggle"
          type="button"
          @click="collapsed.json = !collapsed.json"
        >
          <span>{{ collapsed.json ? 'Show JSON field changes' : 'Hide JSON field changes' }}</span>
          <span class="collapse-toggle__icon">{{ collapsed.json ? '+' : '−' }}</span>
        </button>
        <div v-if="jsonDiff && !collapsed.json" class="compare-summary compare-summary--stack">
          <div v-if="jsonDiff.added.length" class="compare-summary__item">
            <p class="compare-summary__label">JSON added</p>
            <p class="compare-summary__value">{{ jsonDiff.added.join(', ') }}</p>
          </div>
          <div v-if="jsonDiff.removed.length" class="compare-summary__item">
            <p class="compare-summary__label">JSON removed</p>
            <p class="compare-summary__value">{{ jsonDiff.removed.join(', ') }}</p>
          </div>
          <div v-if="jsonDiff.changed.length" class="compare-summary__item">
            <p class="compare-summary__label">JSON changed</p>
            <p class="compare-summary__value">{{ jsonDiff.changed.join(', ') }}</p>
          </div>
        </div>
        <div class="compare-toolbar">
          <button class="collapse-toggle" type="button" @click="collapsed.diff = !collapsed.diff">
            <span>{{ collapsed.diff ? 'Show line diff' : 'Hide line diff' }}</span>
            <span class="collapse-toggle__icon">{{ collapsed.diff ? '+' : '−' }}</span>
          </button>
          <button
            class="button button--ghost"
            type="button"
            :disabled="compareView !== 'all'"
            @click="toggleAllGroups"
          >
            {{ isAllExpanded ? 'Collapse unchanged' : 'Expand all' }}
          </button>
        </div>
        <div v-if="!collapsed.diff" class="compare-grid">
          <div class="compare-column">
            <h4>Current</h4>
            <div class="compare-code">
              <template v-for="group in activeGroups" :key="`current-${group.id}`">
                <button
                  v-if="isGroupCollapsed(group)"
                  class="diff-placeholder"
                  type="button"
                  @click="toggleGroup(group)"
                >
                  {{ groupLabel(group) }} · Click to expand
                </button>
                <template v-else>
                  <div
                    v-for="row in group.rows"
                    :key="`current-${row.index}`"
                    :class="['diff-line', `diff-line--${row.status}`]"
                  >
                    <span class="diff-line__index">{{ row.index }}</span>
                    <span class="diff-line__text">{{ row.current }}</span>
                  </div>
                </template>
              </template>
              <div v-if="activeGroups.length === 0" class="panel-card__empty">
                No differences detected.
              </div>
            </div>
          </div>
          <div class="compare-column">
            <h4>Selected</h4>
            <div class="compare-code">
              <template v-for="group in activeGroups" :key="`selected-${group.id}`">
                <button
                  v-if="isGroupCollapsed(group)"
                  class="diff-placeholder"
                  type="button"
                  @click="toggleGroup(group)"
                >
                  {{ groupLabel(group) }} · Click to expand
                </button>
                <template v-else>
                  <div
                    v-for="row in group.rows"
                    :key="`selected-${row.index}`"
                    :class="['diff-line', `diff-line--${row.status}`]"
                  >
                    <span class="diff-line__index">{{ row.index }}</span>
                    <span class="diff-line__text">{{ row.selected }}</span>
                  </div>
                </template>
              </template>
              <div v-if="activeGroups.length === 0" class="panel-card__empty">
                No differences detected.
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>

    <div v-if="confirmTarget" class="modal">
      <div class="modal__overlay" @click="closeConfirm"></div>
      <div class="modal__content">
        <h4>Confirm template update</h4>
        <p>
          Update {{ confirmTarget.name }} to template
          #{{ templateSelections[confirmTarget.id] ?? confirmTarget.template_id }}?
        </p>
        <div class="modal__actions">
          <button class="button button--ghost" type="button" @click="closeConfirm" :disabled="applyLoading">
            Cancel
          </button>
          <button class="button button--primary" type="button" @click="applyTemplate" :disabled="applyLoading">
            {{ applyLoading ? 'Applying...' : 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
