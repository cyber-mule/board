<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUBSCRIPTION_BASE_URL, SUBSCRIPTION_PATH } from '@/config/env';
import { formatBytes, formatDate, formatDateTime } from '../../../utils/format';
import { userApi } from '../../../api';
import type {
  PaginationMeta,
  UserSubscriptionPreview,
  UserSubscriptionSummary,
  UserSubscriptionTrafficSummary,
  UserTrafficUsageRecord,
} from '../../../api/types';

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
const trafficPerPage = 10;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);
const jumpPage = ref('');
const route = useRoute();
const router = useRouter();
const selectedSubscriptionId = ref<number | null>(null);

const filters = reactive({
  q: '',
  status: '__all__' as number | string,
  sort: 'expires_at',
  direction: 'asc',
});

const defaultFilters = {
  q: '',
  status: '__all__' as number | string,
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
const toolTab = ref<'preview' | 'compare' | 'traffic'>('preview');
const selectedSubscription = computed(() => {
  return (
    subscriptions.value.find(
      (subscription) => subscription.id === selectedSubscriptionId.value,
    ) ?? null
  );
});
const detailMessage = ref('');
const detailError = ref('');
function normalizeBaseUrl(value: string): string {
  if (value) {
    return value.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

function buildSubscriptionUrl(token?: string): string {
  if (!token) {
    return '';
  }
  const base = normalizeBaseUrl(SUBSCRIPTION_BASE_URL);
  if (!base) {
    return '';
  }
  const normalizedPath = SUBSCRIPTION_PATH
    ? `/${SUBSCRIPTION_PATH.replace(/^\/+|\/+$/g, '')}`
    : '';
  const encodedToken = encodeURIComponent(token);
  return `${base}${normalizedPath}/${encodedToken}`;
}

const subscriptionUrl = computed(() => {
  const subscription = selectedSubscription.value;
  if (!subscription) {
    return '';
  }
  return (
    buildSubscriptionUrl(subscription.token) ||
    subscription.subscription_url ||
    subscription.subscribe_url ||
    ''
  );
});
const hasSubscriptionUrl = computed(() => Boolean(subscriptionUrl.value));
const qrCodeUrl = ref('');
const qrLoading = ref(false);
const qrError = ref('');
const showQr = ref(false);
const qrSource = ref('');
const trafficSummary = ref<UserSubscriptionTrafficSummary | null>(null);
const trafficRecords = ref<UserTrafficUsageRecord[]>([]);
const trafficLoading = ref(false);
const trafficError = ref('');
const trafficPage = ref(1);
const trafficPagination = ref<PaginationMeta | null>(null);
const trafficSubscriptionId = ref<number | null>(null);
const trafficFilters = reactive({
  protocol: '',
  node_id: '',
  binding_id: '',
  from: '',
  to: '',
});

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

const trafficRange = computed(() => {
  if (!trafficRecords.value.length) {
    return null;
  }
  const times = trafficRecords.value
    .map((record) => record.observed_at)
    .filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!times.length) {
    return null;
  }
  return {
    latest: Math.max(...times),
    earliest: Math.min(...times),
  };
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

function normalizeStatusFilter(value: unknown): number | string {
  if (value === '__all__') {
    return '__all__';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '__all__') {
      return '__all__';
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : '__all__';
  }
  return '__all__';
}

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
      status: normalizeStatusFilter(parsed.status),
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

function toOptionalNumber(value: string | number): number | undefined {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
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
    result.status = normalizeStatusFilter(status);
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
  if (filters.status && filters.status !== '__all__') {
    query.status = String(filters.status);
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
  return `${group.rows.length} 行未变化（第 ${start}-${end} 行）`;
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

function statusVariant(value?: number): 'default' | 'secondary' | 'destructive' | 'outline' {
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

function statusLabel(value?: number) {
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

function ensureSelection(list: UserSubscriptionSummary[]) {
  if (!list.length) {
    selectedSubscriptionId.value = null;
    return;
  }
  if (
    selectedSubscriptionId.value &&
    list.some((subscription) => subscription.id === selectedSubscriptionId.value)
  ) {
    return;
  }
  selectedSubscriptionId.value = list[0].id;
}

function selectSubscription(subscription: UserSubscriptionSummary) {
  selectedSubscriptionId.value = subscription.id;
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
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    subscriptions.value = response.subscriptions ?? [];
    buildTemplateSelections(subscriptions.value);
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
    ensureSelection(subscriptions.value);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载订阅失败';
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
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    subscriptions.value = [...subscriptions.value, ...(response.subscriptions ?? [])];
    buildTemplateSelections(subscriptions.value);
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
    updateQuery(page.value, 'replace');
    ensureSelection(subscriptions.value);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载更多订阅失败';
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
    errorMessage.value = '请输入有效页码。';
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
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    subscriptions.value = response.subscriptions ?? [];
    buildTemplateSelections(subscriptions.value);
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? clamped;
    jumpPage.value = '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载目标页失败';
  } finally {
    loading.value = false;
  }
}

function resetTrafficFilters() {
  trafficFilters.protocol = '';
  trafficFilters.node_id = '';
  trafficFilters.binding_id = '';
  trafficFilters.from = '';
  trafficFilters.to = '';
  void loadTraffic(1);
}

async function loadTraffic(targetPage = 1, mode: 'replace' | 'append' = 'replace') {
  const subscription = selectedSubscription.value;
  if (!subscription) {
    trafficError.value = '请选择订阅后查看流量。';
    return;
  }

  if (mode === 'replace') {
    trafficRecords.value = [];
    trafficSummary.value = null;
    trafficPagination.value = null;
  }

  trafficLoading.value = true;
  trafficError.value = '';

  try {
    const response = await userApi.fetchUserSubscriptionTraffic(subscription.id, {
      page: targetPage,
      per_page: trafficPerPage,
      protocol: trafficFilters.protocol || undefined,
      node_id: toOptionalNumber(trafficFilters.node_id),
      binding_id: toOptionalNumber(trafficFilters.binding_id),
      from: toOptionalNumber(trafficFilters.from),
      to: toOptionalNumber(trafficFilters.to),
    });
    trafficSummary.value = response.summary;
    trafficPagination.value = response.pagination ?? null;
    trafficPage.value = response.pagination?.page ?? targetPage;
    trafficSubscriptionId.value = subscription.id;
    trafficRecords.value =
      mode === 'append'
        ? [...trafficRecords.value, ...(response.records ?? [])]
        : response.records ?? [];
  } catch (error) {
    trafficError.value = error instanceof Error ? error.message : '加载流量明细失败';
  } finally {
    trafficLoading.value = false;
  }
}

async function loadMoreTraffic() {
  if (!trafficPagination.value?.has_next || trafficLoading.value) {
    return;
  }
  await loadTraffic(trafficPage.value + 1, 'append');
}

async function handlePreview(subscription: UserSubscriptionSummary) {
  toolTab.value = 'preview';
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
    previewError.value = error instanceof Error ? error.message : '加载预览失败';
  } finally {
    previewLoading.value = false;
  }
}

async function handleCompare(subscription: UserSubscriptionSummary) {
  toolTab.value = 'compare';
  compareLoading.value = true;
  compareError.value = '';
  compareMessage.value = '';
  compare.value = null;
  expandedGroups.value = {};
  isAllExpanded.value = false;

  const currentTemplateId = subscription.template_id;
  const selectedTemplateId = templateSelections.value[subscription.id] ?? currentTemplateId;

  if (!currentTemplateId || !selectedTemplateId) {
    compareError.value = '缺少模板信息，无法比较。';
    compareLoading.value = false;
    return;
  }

  if (currentTemplateId === selectedTemplateId) {
    compareMessage.value = '所选模板与当前模板一致。';
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
    compareError.value = error instanceof Error ? error.message : '比较模板失败';
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
    actionError.value = '请先选择模板再应用。';
    return;
  }

  try {
    applyLoading.value = true;
    const response = await userApi.updateUserSubscriptionTemplate(
      subscription.id,
      selectedTemplate,
    );
    subscription.template_id = response.template_id;
    actionMessage.value = `已更新 ${subscription.name} 的模板。`;
    compare.value = null;
    compareMessage.value = '模板已更新，可再次比较查看差异。';
    confirmTarget.value = null;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '更新模板失败';
  } finally {
    applyLoading.value = false;
  }
}

async function copyDetail(label: string, value: string) {
  detailMessage.value = '';
  detailError.value = '';

  if (!value) {
    detailError.value = `${label}不可用。`;
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    detailMessage.value = `${label}已复制。`;
  } catch (error) {
    detailError.value = `复制${label}失败。`;
  }
}

async function loadQrCode(value: string) {
  qrLoading.value = true;
  qrError.value = '';

  try {
    const module = await import(
      /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm'
    );
    const api = module.toDataURL ? module : module.default;
    if (!api?.toDataURL) {
      throw new Error('QRCode module missing toDataURL');
    }
    qrCodeUrl.value = await api.toDataURL(value, { width: 180, margin: 1 });
    qrSource.value = value;
  } catch (error) {
    qrCodeUrl.value = '';
    qrError.value = '二维码生成失败，请稍后重试。';
  } finally {
    qrLoading.value = false;
  }
}

async function toggleQr() {
  detailMessage.value = '';
  detailError.value = '';
  qrError.value = '';

  if (!subscriptionUrl.value) {
    detailError.value = '订阅地址不可用，无法生成二维码。';
    return;
  }

  showQr.value = !showQr.value;
  if (showQr.value) {
    if (!qrCodeUrl.value || qrSource.value !== subscriptionUrl.value) {
      await loadQrCode(subscriptionUrl.value);
    }
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
    previewActionMessage.value = '预览已复制到剪贴板。';
  } catch (error) {
    previewActionError.value = '复制预览失败。';
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
    previewActionMessage.value = '预览已下载。';
  } catch (error) {
    previewActionError.value = '下载预览失败。';
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

watch(
  () => toolTab.value,
  (value) => {
    if (value !== 'traffic') {
      return;
    }
    const subscription = selectedSubscription.value;
    if (!subscription) {
      return;
    }
    if (trafficSubscriptionId.value === subscription.id && trafficPagination.value) {
      return;
    }
    void loadTraffic(1);
  },
);

onBeforeUnmount(() => {
  if (filterSyncTimer !== null) {
    window.clearTimeout(filterSyncTimer);
  }
});

watch(selectedSubscriptionId, () => {
  preview.value = null;
  previewTargetId.value = null;
  previewError.value = '';
  previewActionError.value = '';
  previewActionMessage.value = '';
  compare.value = null;
  compareError.value = '';
  compareMessage.value = '';
  toolTab.value = 'preview';
  trafficSummary.value = null;
  trafficRecords.value = [];
  trafficPagination.value = null;
  trafficPage.value = 1;
  trafficError.value = '';
  trafficSubscriptionId.value = null;
  detailMessage.value = '';
  detailError.value = '';
  showQr.value = false;
  qrCodeUrl.value = '';
  qrError.value = '';
  qrSource.value = '';
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">订阅</p>
        <h3 class="page-section__title">订阅管理</h3>
        <p class="page__subtitle">管理模板并预览订阅内容。</p>
      </div>
      <div class="page-section__actions">
        <Button variant="secondary" type="button" @click="loadSubscriptions" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新列表' }}
        </Button>
      </div>
    </header>

    <form class="form-grid form-grid--wide" @submit.prevent="loadSubscriptions">
      <div class="stack stack--tight">
        <Label>搜索</Label>
        <Input v-model="filters.q" type="search" placeholder="套餐或订阅名称" />
      </div>
      <div class="stack stack--tight">
        <Label>状态</Label>
        <Select v-model="filters.status">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem :value="1">已激活</SelectItem>
            <SelectItem :value="2">已禁用</SelectItem>
            <SelectItem :value="3">已过期</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>排序</Label>
        <Select v-model="filters.sort">
          <SelectTrigger>
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expires_at">到期时间</SelectItem>
            <SelectItem value="created_at">创建时间</SelectItem>
            <SelectItem value="status">状态</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>方向</Label>
        <Select v-model="filters.direction">
          <SelectTrigger>
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">升序</SelectItem>
            <SelectItem value="desc">降序</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="cluster cluster--end">
        <Button type="submit" :disabled="loading">应用筛选</Button>
        <Button variant="ghost" type="button" @click="resetFilters" :disabled="loading">
          重置
        </Button>
      </div>
    </form>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>
    <Alert v-if="actionMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
      <AlertTitle>操作成功</AlertTitle>
      <AlertDescription>{{ actionMessage }}</AlertDescription>
    </Alert>
    <Alert v-if="actionError" variant="destructive">
      <AlertTitle>操作失败</AlertTitle>
      <AlertDescription>{{ actionError }}</AlertDescription>
    </Alert>

    <Card class="panel-card--full">
      <CardHeader>
        <CardTitle>订阅使用指引</CardTitle>
        <p class="panel-card__meta">按步骤完成模板切换与预览。</p>
      </CardHeader>
      <CardContent>
        <div class="step-grid">
          <div class="step-card">
            <p class="step-card__title">1. 选择订阅</p>
            <p class="step-card__desc">从左侧列表选中需要操作的订阅。</p>
          </div>
          <div class="step-card">
            <p class="step-card__title">2. 选择模板</p>
            <p class="step-card__desc">切换模板并查看差异，确认后应用。</p>
          </div>
          <div class="step-card">
            <p class="step-card__title">3. 预览/比较</p>
            <p class="step-card__desc">查看预览内容，必要时下载或复制。</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>订阅列表</CardTitle>
        <p class="panel-card__meta">每页最多 {{ perPage }} 条</p>
      </CardHeader>
      <CardContent>
        <p v-if="loading" class="panel-card__empty">正在加载订阅...</p>
        <div v-else-if="subscriptions.length === 0" class="panel-card__empty stack">
          <span>当前筛选条件下暂无订阅。</span>
          <RouterLink to="/user/plans" custom v-slot="{ href, navigate }">
            <Button :as="'a'" :href="href" size="sm" variant="secondary" @click="navigate">
              去选套餐
            </Button>
          </RouterLink>
        </div>
        <ul v-else class="data-list">
          <li
            v-for="subscription in subscriptions"
            :key="subscription.id"
            :class="[
              'data-row',
              'data-row--stack',
              { 'data-row--selected': subscription.id === selectedSubscriptionId },
            ]"
          >
            <div class="cursor-pointer" @click="selectSubscription(subscription)">
              <p class="data-row__title">{{ subscription.name }}</p>
              <p class="data-row__meta">
                {{ subscription.plan_name || '未绑定套餐' }} · 到期 {{ formatDate(subscription.expires_at) }}
              </p>
              <p class="data-row__meta">
                {{ formatBytes(subscription.traffic_used_bytes) }} /
                {{ formatBytes(subscription.traffic_total_bytes) }} · 设备 {{ subscription.devices_limit ?? '-' }}
              </p>
            </div>
            <div class="data-row__aside data-row__aside--wide">
              <Badge :variant="statusVariant(subscription.status)">{{ statusLabel(subscription.status) }}</Badge>
              <div v-if="subscription.available_template_ids?.length" class="stack stack--compact">
                <div class="stack stack--tight">
                  <Label>模板</Label>
                  <Select
                    :model-value="String(templateSelections[subscription.id] ?? '')"
                    @update:model-value="value => (templateSelections[subscription.id] = Number(value))"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择模板" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="templateId in subscription.available_template_ids"
                        :key="templateId"
                        :value="String(templateId)"
                      >
                        #{{ templateId }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p class="text-xs text-muted-foreground">
                    当前 #{{ subscription.template_id ?? 'n/a' }} · 已选
                    #{{ templateSelections[subscription.id] ?? subscription.template_id ?? 'n/a' }}
                  </p>
                </div>
                <div class="cluster">
                  <Button variant="ghost" size="sm" type="button" @click="handlePreview(subscription)">
                    预览
                  </Button>
                  <Button variant="ghost" size="sm" type="button" @click="handleCompare(subscription)">
                    比较
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    :disabled="
                      applyLoading ||
                      (templateSelections[subscription.id] ?? subscription.template_id) === subscription.template_id
                    "
                    @click="openConfirm(subscription)"
                  >
                    应用
                  </Button>
                </div>
              </div>
              <div v-else class="text-xs text-muted-foreground">暂无可用模板。</div>
            </div>
          </li>
        </ul>
        <div v-if="pagination" class="list-footer">
          <div class="text-xs text-muted-foreground">
            第 {{ pagination.page }} / {{ totalPages }} 页 · 共 {{ pagination.total_count }} 条
          </div>
          <div class="cluster cluster--center">
            <div class="cluster cluster--center">
              <Label>跳转</Label>
              <Input
                v-model="jumpPage"
                class="w-20"
                type="number"
                min="1"
                :max="totalPages"
                placeholder="页码"
              />
            </div>
            <Button variant="secondary" type="button" @click="jumpToPage" :disabled="loading || !jumpPage">
              前往
            </Button>
            <Button
              variant="ghost"
              type="button"
              @click="loadMore"
              :disabled="isLoadingMore || !pagination.has_next"
            >
              {{ isLoadingMore ? '加载中...' : '加载更多' }}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>订阅详情</CardTitle>
        <p class="panel-card__meta">
          {{ selectedSubscription ? `订阅 #${selectedSubscription.id}` : '请选择订阅' }}
        </p>
      </CardHeader>
      <CardContent>
        <p v-if="loading" class="panel-card__empty">正在加载订阅...</p>
        <p v-else-if="!selectedSubscription" class="panel-card__empty">请选择订阅查看详情。</p>
        <div v-else class="stack">
          <div class="cluster">
            <Badge :variant="statusVariant(selectedSubscription.status)">
              {{ statusLabel(selectedSubscription.status) }}
            </Badge>
            <Badge variant="secondary">{{ selectedSubscription.plan_name || '未绑定套餐' }}</Badge>
          </div>
          <div class="detail-grid">
            <div>
              <p class="detail-label">到期时间</p>
              <p class="detail-value">{{ formatDate(selectedSubscription.expires_at) }}</p>
            </div>
            <div>
              <p class="detail-label">最近刷新</p>
              <p class="detail-value">{{ formatDateTime(selectedSubscription.last_refreshed_at) }}</p>
            </div>
            <div>
              <p class="detail-label">设备上限</p>
              <p class="detail-value">{{ selectedSubscription.devices_limit ?? '-' }}</p>
            </div>
            <div>
              <p class="detail-label">流量</p>
              <p class="detail-value">
                {{ formatBytes(selectedSubscription.traffic_used_bytes) }} /
                {{ formatBytes(selectedSubscription.traffic_total_bytes) }}
              </p>
            </div>
            <div>
              <p class="detail-label">当前模板</p>
              <p class="detail-value">#{{ selectedSubscription.template_id ?? '-' }}</p>
            </div>
            <div>
              <p class="detail-label">已选模板</p>
              <p class="detail-value">
                #{{ templateSelections[selectedSubscription.id] ?? selectedSubscription.template_id ?? '-' }}
              </p>
            </div>
          </div>
          <div v-if="hasSubscriptionUrl" class="detail-grid">
            <div>
              <p class="detail-label">订阅地址</p>
              <p class="detail-value">{{ subscriptionUrl }}</p>
            </div>
          </div>
          <p v-else class="text-xs text-muted-foreground">
            订阅地址未配置，可使用订阅预览下载内容或联系管理员轮转凭证。
          </p>
          <div v-if="hasSubscriptionUrl" class="cluster cluster--center">
            <Button
              size="sm"
              variant="secondary"
              type="button"
              :disabled="!subscriptionUrl"
              @click="copyDetail('订阅地址', subscriptionUrl)"
            >
              复制地址
            </Button>
            <Button
              v-if="subscriptionUrl"
              size="sm"
              variant="ghost"
              type="button"
              :as="'a'"
              :href="subscriptionUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              打开链接
            </Button>
            <Button size="sm" variant="ghost" type="button" @click="toggleQr">
              {{ showQr ? '隐藏二维码' : '生成二维码' }}
            </Button>
          </div>
          <div v-if="hasSubscriptionUrl && showQr" class="qr-panel">
            <p v-if="qrLoading" class="text-xs text-muted-foreground">正在生成二维码...</p>
            <img v-else-if="qrCodeUrl" :src="qrCodeUrl" alt="订阅二维码" class="qr-image" />
            <p v-else class="text-xs text-muted-foreground">{{ qrError || '二维码不可用。' }}</p>
          </div>
          <Alert v-if="detailMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertTitle>操作成功</AlertTitle>
            <AlertDescription>{{ detailMessage }}</AlertDescription>
          </Alert>
          <Alert v-if="detailError" variant="destructive">
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{{ detailError }}</AlertDescription>
          </Alert>
          <div class="cluster cluster--center">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              @click="handlePreview(selectedSubscription)"
              :disabled="previewLoading"
            >
              生成预览
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              @click="handleCompare(selectedSubscription)"
              :disabled="compareLoading"
            >
              比较模板
            </Button>
            <Button
              size="sm"
              type="button"
              :disabled="
                applyLoading ||
                !selectedSubscription.available_template_ids?.length ||
                (templateSelections[selectedSubscription.id] ?? selectedSubscription.template_id) === selectedSubscription.template_id
              "
              @click="openConfirm(selectedSubscription)"
            >
              应用模板
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="cluster cluster--between cluster--start cluster--wide">
        <div>
          <CardTitle>订阅工具</CardTitle>
          <p class="panel-card__meta">选择预览、比较或流量视图。</p>
        </div>
        <div class="cluster cluster--center">
          <Button
            size="sm"
            :variant="toolTab === 'preview' ? 'default' : 'secondary'"
            type="button"
            @click="toolTab = 'preview'"
          >
            预览
          </Button>
          <Button
            size="sm"
            :variant="toolTab === 'compare' ? 'default' : 'secondary'"
            type="button"
            @click="toolTab = 'compare'"
          >
            比较
          </Button>
          <Button
            size="sm"
            :variant="toolTab === 'traffic' ? 'default' : 'secondary'"
            type="button"
            @click="toolTab = 'traffic'"
          >
            流量
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">
          {{ toolTab === 'preview'
            ? '预览当前模板内容，支持复制与下载。'
            : toolTab === 'compare'
              ? '比较当前模板与所选模板的差异。'
              : '查看订阅流量明细与计费汇总。' }}
        </p>
      </CardContent>
    </Card>

    <Card v-if="toolTab === 'preview'">
      <CardHeader>
        <CardTitle>订阅预览</CardTitle>
        <p class="panel-card__meta">
          {{ previewTargetId ? `订阅 #${previewTargetId}` : '请选择订阅' }}
        </p>
      </CardHeader>
      <CardContent>
        <p v-if="previewLoading" class="panel-card__empty">正在生成预览...</p>
        <p v-else-if="previewError" class="panel-card__empty">{{ previewError }}</p>
        <p v-else-if="!preview" class="panel-card__empty">请选择订阅以加载预览。</p>
        <div v-else class="stack">
          <div class="cluster">
            <Badge variant="outline">模板 #{{ preview.template_id }}</Badge>
            <Badge variant="secondary">{{ preview.content_type }}</Badge>
            <Badge variant="outline">ETag {{ preview.etag }}</Badge>
            <Badge variant="outline">{{ formatDateTime(preview.generated_at) }}</Badge>
          </div>
          <div class="cluster cluster--center">
            <div class="cluster cluster--center">
              <Label>下载格式</Label>
              <Select v-model="downloadFormat">
                <SelectTrigger>
                  <SelectValue placeholder="选择格式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自动</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                  <SelectItem value="yaml">YAML</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" type="button" @click="copyPreview" :disabled="!isPreviewReady">
              复制
            </Button>
            <Button variant="ghost" type="button" @click="downloadPreview" :disabled="!isPreviewReady">
              下载
            </Button>
          </div>
          <Alert v-if="previewActionMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertTitle>操作成功</AlertTitle>
            <AlertDescription>{{ previewActionMessage }}</AlertDescription>
          </Alert>
          <Alert v-if="previewActionError" variant="destructive">
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{{ previewActionError }}</AlertDescription>
          </Alert>
          <pre class="preview__content">{{ preview.content }}</pre>
        </div>
      </CardContent>
    </Card>

    <Card v-else-if="toolTab === 'compare'">
      <CardHeader class="cluster cluster--between cluster--start cluster--wide">
        <div>
          <CardTitle>模板比较</CardTitle>
          <p class="panel-card__meta">当前模板与所选模板差异</p>
        </div>
        <div class="cluster cluster--center">
          <Label>视图</Label>
          <Select v-model="compareView">
            <SelectTrigger>
              <SelectValue placeholder="选择视图" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diffs">仅差异</SelectItem>
              <SelectItem value="all">全部行</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <p v-if="compareLoading" class="panel-card__empty">正在比较模板...</p>
        <p v-else-if="compareError" class="panel-card__empty">{{ compareError }}</p>
        <p v-else-if="compareMessage" class="panel-card__empty">{{ compareMessage }}</p>
        <p v-else-if="!compare" class="panel-card__empty">请选择订阅并点击比较。</p>
        <div v-else class="compare">
          <Button variant="ghost" size="sm" class="collapse-toggle" type="button" @click="collapsed.summary = !collapsed.summary">
            <span>{{ collapsed.summary ? '显示摘要' : '隐藏摘要' }}</span>
            <span class="collapse-toggle__icon">{{ collapsed.summary ? '+' : '?' }}</span>
          </Button>
          <div v-if="!collapsed.summary" class="compare-summary">
            <div class="compare-summary__item">
              <p class="compare-summary__label">当前</p>
              <p class="compare-summary__value">模板 #{{ compare.current.template_id }}</p>
            </div>
            <div class="compare-summary__item">
              <p class="compare-summary__label">所选</p>
              <p class="compare-summary__value">模板 #{{ compare.selected.template_id }}</p>
            </div>
            <div v-if="diffCounts" class="compare-summary__item">
              <p class="compare-summary__label">行数</p>
              <p class="compare-summary__value">
                {{ diffCounts.total }} 总计 · {{ diffCounts.changed }} 变更 ·
                {{ diffCounts.added }} 新增 · {{ diffCounts.removed }} 删除
              </p>
            </div>
          </div>
          <p v-if="diffCounts?.truncated" class="text-xs text-muted-foreground">
            对比最多展示 {{ maxDiffLines }} 行。
          </p>
          <Button
            v-if="jsonDiff"
            variant="ghost"
            size="sm"
            class="collapse-toggle"
            type="button"
            @click="collapsed.json = !collapsed.json"
          >
            <span>{{ collapsed.json ? '显示 JSON 字段变化' : '隐藏 JSON 字段变化' }}</span>
            <span class="collapse-toggle__icon">{{ collapsed.json ? '+' : '?' }}</span>
          </Button>
          <div v-if="jsonDiff && !collapsed.json" class="compare-summary compare-summary--stack">
            <div v-if="jsonDiff.added.length" class="compare-summary__item">
              <p class="compare-summary__label">新增字段</p>
              <p class="compare-summary__value">{{ jsonDiff.added.join(', ') }}</p>
            </div>
            <div v-if="jsonDiff.removed.length" class="compare-summary__item">
              <p class="compare-summary__label">移除字段</p>
              <p class="compare-summary__value">{{ jsonDiff.removed.join(', ') }}</p>
            </div>
            <div v-if="jsonDiff.changed.length" class="compare-summary__item">
              <p class="compare-summary__label">变更字段</p>
              <p class="compare-summary__value">{{ jsonDiff.changed.join(', ') }}</p>
            </div>
          </div>
          <div class="compare-toolbar">
            <Button variant="ghost" size="sm" class="collapse-toggle" type="button" @click="collapsed.diff = !collapsed.diff">
              <span>{{ collapsed.diff ? '显示差异' : '隐藏差异' }}</span>
              <span class="collapse-toggle__icon">{{ collapsed.diff ? '+' : '?' }}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              :disabled="compareView !== 'all'"
              @click="toggleAllGroups"
            >
              {{ isAllExpanded ? '折叠相同行' : '展开全部' }}
            </Button>
          </div>
          <div v-if="!collapsed.diff" class="compare-grid">
            <div class="compare-column">
              <h4>当前</h4>
              <div class="compare-code">
                <template v-for="group in activeGroups" :key="`current-${group.id}`">
                  <Button
                    v-if="isGroupCollapsed(group)"
                    variant="ghost"
                    size="sm"
                    class="diff-placeholder"
                    type="button"
                    @click="toggleGroup(group)"
                  >
                    {{ groupLabel(group) }} · 点击展开
                  </Button>
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
                  未发现差异。
                </div>
              </div>
            </div>
            <div class="compare-column">
              <h4>所选</h4>
              <div class="compare-code">
                <template v-for="group in activeGroups" :key="`selected-${group.id}`">
                  <Button
                    v-if="isGroupCollapsed(group)"
                    variant="ghost"
                    size="sm"
                    class="diff-placeholder"
                    type="button"
                    @click="toggleGroup(group)"
                  >
                    {{ groupLabel(group) }} · 点击展开
                  </Button>
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
                  未发现差异。
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card v-else>
      <CardHeader class="cluster cluster--between cluster--start cluster--wide">
        <div>
          <CardTitle>流量明细</CardTitle>
          <p class="panel-card__meta">
            {{ selectedSubscription ? `订阅 #${selectedSubscription.id}` : '请选择订阅' }}
          </p>
        </div>
        <div class="cluster cluster--center">
          <Button
            size="sm"
            variant="secondary"
            type="button"
            :disabled="trafficLoading || !selectedSubscription"
            @click="loadTraffic(1)"
          >
            {{ trafficLoading ? '刷新中...' : '刷新' }}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form class="form-grid form-grid--wide" @submit.prevent="loadTraffic(1)">
          <div class="stack stack--tight">
            <Label>协议</Label>
            <Input v-model="trafficFilters.protocol" type="text" placeholder="http / tls / grpc" />
          </div>
          <div class="stack stack--tight">
            <Label>节点 ID</Label>
            <Input v-model="trafficFilters.node_id" type="number" placeholder="节点 ID" />
          </div>
          <div class="stack stack--tight">
            <Label>绑定 ID</Label>
            <Input v-model="trafficFilters.binding_id" type="number" placeholder="绑定 ID" />
          </div>
          <div class="stack stack--tight">
            <Label>起始时间</Label>
            <Input v-model="trafficFilters.from" type="number" placeholder="Unix 秒" />
          </div>
          <div class="stack stack--tight">
            <Label>结束时间</Label>
            <Input v-model="trafficFilters.to" type="number" placeholder="Unix 秒" />
          </div>
          <div class="cluster cluster--end">
            <Button type="submit" :disabled="trafficLoading || !selectedSubscription">查询</Button>
            <Button
              variant="ghost"
              type="button"
              :disabled="trafficLoading || !selectedSubscription"
              @click="resetTrafficFilters"
            >
              重置
            </Button>
          </div>
        </form>

        <Alert v-if="trafficError" variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{{ trafficError }}</AlertDescription>
        </Alert>

        <div v-if="trafficSummary" class="detail-grid">
          <div>
            <p class="detail-label">原始流量</p>
            <p class="detail-value">{{ formatBytes(trafficSummary.raw_bytes) }}</p>
          </div>
          <div>
            <p class="detail-label">计费流量</p>
            <p class="detail-value">{{ formatBytes(trafficSummary.charged_bytes) }}</p>
          </div>
          <div>
            <p class="detail-label">记录数</p>
            <p class="detail-value">{{ trafficPagination?.total_count ?? 0 }}</p>
          </div>
          <div v-if="trafficRange">
            <p class="detail-label">时间范围</p>
            <p class="detail-value">
              {{ formatDateTime(trafficRange.latest) }} - {{ formatDateTime(trafficRange.earliest) }}
            </p>
          </div>
        </div>

        <p v-if="!selectedSubscription" class="panel-card__empty">请选择订阅查看流量。</p>
        <p v-else-if="trafficLoading && !trafficRecords.length" class="panel-card__empty">
          正在加载流量明细...
        </p>
        <p v-else-if="!trafficRecords.length" class="panel-card__empty">暂无流量记录。</p>
        <ul v-else class="data-list">
          <li v-for="record in trafficRecords" :key="record.id" class="data-row data-row--stack">
            <div>
              <p class="data-row__title">
                {{ record.protocol || 'unknown' }} · 节点 {{ record.node_id ?? '-' }} · 绑定
                {{ record.binding_id ?? '-' }}
              </p>
              <p class="data-row__meta">
                上行 {{ formatBytes(record.bytes_up) }} · 下行 {{ formatBytes(record.bytes_down) }}
              </p>
              <p class="data-row__meta">
                原始 {{ formatBytes(record.raw_bytes) }} · 计费 {{ formatBytes(record.charged_bytes) }}
                <span v-if="record.multiplier"> · 倍率 {{ record.multiplier }}</span>
              </p>
            </div>
            <div class="data-row__aside">
              <Badge variant="outline">{{ formatDateTime(record.observed_at) }}</Badge>
            </div>
          </li>
        </ul>

        <div v-if="trafficPagination" class="list-footer">
          <div class="list-footer__info">
            已显示 {{ trafficRecords.length }} / {{ trafficPagination.total_count }}
          </div>
          <div class="list-footer__actions">
            <Button
              variant="ghost"
              type="button"
              :disabled="trafficLoading || !trafficPagination.has_next"
              @click="loadMoreTraffic"
            >
              {{ trafficLoading ? '加载中...' : '加载更多' }}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Dialog :open="!!confirmTarget" @update:open="value => { if (!value) closeConfirm(); }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认更新模板</DialogTitle>
          <DialogDescription>
            确认将 {{ confirmTarget?.name }} 更新为模板
            #{{ confirmTarget ? templateSelections[confirmTarget.id] ?? confirmTarget.template_id : '' }}？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" type="button" @click="closeConfirm" :disabled="applyLoading">取消</Button>
          <Button type="button" @click="applyTemplate" :disabled="applyLoading">
            {{ applyLoading ? '应用中...' : '确认应用' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
