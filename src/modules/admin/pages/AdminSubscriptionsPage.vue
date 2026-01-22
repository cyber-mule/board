<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
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
import { adminApi } from '../../../api';
import { formatBytes, formatDateTime } from '../../../utils/format';
import type {
  AdminSubscriptionSummary,
  CreateAdminSubscriptionRequest,
  ExtendAdminSubscriptionRequest,
  PaginationMeta,
  UpdateAdminSubscriptionRequest,
} from '../../../api/types';

type ExtendForm = {
  extend_days: number | null;
  extend_hours: number | null;
  expires_at: number | null;
};

const subscriptions = ref<AdminSubscriptionSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');
const actionMessage = ref('');
const actionError = ref('');

const selectedSubscriptionId = ref<number | null>(null);
const selectedSubscription = computed(() => {
  if (!selectedSubscriptionId.value) {
    return null;
  }
  return (
    subscriptions.value.find((subscription) => subscription.id === selectedSubscriptionId.value) ??
    null
  );
});

const perPage = 10;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  q: '',
  status: '__all__' as number | string,
  user_id: '',
  plan_name: '',
  plan_id: '',
  template_id: '',
  sort: 'updated_at',
  direction: 'desc',
});

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDisableModal = ref(false);
const showExtendModal = ref(false);
const isSaving = ref(false);

const createForm = reactive({
  user_id: null as number | null,
  name: '',
  plan_name: '',
  plan_id: null as number | null,
  status: 1,
  template_id: null as number | null,
  available_template_ids: '',
  token: '',
  expires_at: null as number | null,
  traffic_total_bytes: null as number | null,
  traffic_used_bytes: null as number | null,
  devices_limit: null as number | null,
});

const editForm = reactive({
  name: '',
  plan_name: '',
  plan_id: null as number | null,
  status: 1,
  template_id: null as number | null,
  available_template_ids: '',
  token: '',
  expires_at: null as number | null,
  traffic_total_bytes: null as number | null,
  traffic_used_bytes: null as number | null,
  devices_limit: null as number | null,
});

const disableReason = ref('');

const extendForm = reactive<ExtendForm>({
  extend_days: null,
  extend_hours: null,
  expires_at: null,
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

function parseIdList(value: string): number[] | undefined {
  const list = value
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
  return list.length ? list : undefined;
}

function toOptionalNumber(value: number | null): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function ensureSelection(list: AdminSubscriptionSummary[]) {
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

function updateSubscriptionInList(subscription: AdminSubscriptionSummary) {
  subscriptions.value = subscriptions.value.map((item) =>
    item.id === subscription.id ? subscription : item,
  );
}

function clearMessages() {
  actionMessage.value = '';
  actionError.value = '';
}

async function loadSubscriptions() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminSubscriptions({
      page: 1,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      user_id: filters.user_id ? Number(filters.user_id) : undefined,
      plan_name: filters.plan_name || undefined,
      plan_id: filters.plan_id ? Number(filters.plan_id) : undefined,
      template_id: filters.template_id ? Number(filters.template_id) : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    subscriptions.value = response.subscriptions ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
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
    const response = await adminApi.fetchAdminSubscriptions({
      page: targetPage,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      user_id: filters.user_id ? Number(filters.user_id) : undefined,
      plan_name: filters.plan_name || undefined,
      plan_id: filters.plan_id ? Number(filters.plan_id) : undefined,
      template_id: filters.template_id ? Number(filters.template_id) : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    subscriptions.value = [...subscriptions.value, ...(response.subscriptions ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载更多订阅失败';
  } finally {
    isLoadingMore.value = false;
  }
}

function resetFilters() {
  filters.q = '';
  filters.status = '__all__';
  filters.user_id = '';
  filters.plan_name = '';
  filters.plan_id = '';
  filters.template_id = '';
  filters.sort = 'updated_at';
  filters.direction = 'desc';
  loadSubscriptions();
}

function openCreateModal() {
  createForm.user_id = null;
  createForm.name = '';
  createForm.plan_name = '';
  createForm.plan_id = null;
  createForm.status = 1;
  createForm.template_id = null;
  createForm.available_template_ids = '';
  createForm.token = '';
  createForm.expires_at = null;
  createForm.traffic_total_bytes = null;
  createForm.traffic_used_bytes = null;
  createForm.devices_limit = null;
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

async function handleCreate() {
  clearMessages();

  if (!toOptionalNumber(createForm.user_id)) {
    actionError.value = '请输入用户 ID。';
    return;
  }
  if (!createForm.name || !toOptionalNumber(createForm.plan_id)) {
    actionError.value = '请填写订阅名称与套餐 ID。';
    return;
  }
  if (!toOptionalNumber(createForm.template_id)) {
    actionError.value = '请输入模板 ID。';
    return;
  }
  if (!toOptionalNumber(createForm.expires_at)) {
    actionError.value = '请输入到期时间戳。';
    return;
  }
  if (!toOptionalNumber(createForm.traffic_total_bytes)) {
    actionError.value = '请输入总流量。';
    return;
  }
  if (!toOptionalNumber(createForm.devices_limit)) {
    actionError.value = '请输入设备上限。';
    return;
  }

  isSaving.value = true;

  try {
    const payload: CreateAdminSubscriptionRequest = {
      user_id: toOptionalNumber(createForm.user_id) ?? 0,
      name: createForm.name,
      plan_name: createForm.plan_name || undefined,
      plan_id: toOptionalNumber(createForm.plan_id) ?? 0,
      status: createForm.status || undefined,
      template_id: toOptionalNumber(createForm.template_id) ?? 0,
      available_template_ids: parseIdList(createForm.available_template_ids),
      token: createForm.token || undefined,
      expires_at: toOptionalNumber(createForm.expires_at) ?? 0,
      traffic_total_bytes: toOptionalNumber(createForm.traffic_total_bytes) ?? 0,
      traffic_used_bytes: toOptionalNumber(createForm.traffic_used_bytes),
      devices_limit: toOptionalNumber(createForm.devices_limit) ?? 0,
    };
    const response = await adminApi.createAdminSubscription(payload);
    actionMessage.value = `已创建订阅 ${response.subscription.name}。`;
    closeCreateModal();
    await loadSubscriptions();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '创建订阅失败';
  } finally {
    isSaving.value = false;
  }
}

function openEditModal() {
  if (!selectedSubscription.value) {
    return;
  }
  const subscription = selectedSubscription.value;
  editForm.name = subscription.name || '';
  editForm.plan_name = subscription.plan_name || '';
  editForm.plan_id = subscription.plan_id ?? null;
  editForm.status = subscription.status ?? 1;
  editForm.template_id = subscription.template_id ?? null;
  editForm.available_template_ids = (subscription.available_template_ids ?? []).join(', ');
  editForm.token = subscription.token ?? '';
  editForm.expires_at = subscription.expires_at ?? null;
  editForm.traffic_total_bytes = subscription.traffic_total_bytes ?? null;
  editForm.traffic_used_bytes = subscription.traffic_used_bytes ?? null;
  editForm.devices_limit = subscription.devices_limit ?? null;
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
}

async function handleUpdate() {
  if (!selectedSubscription.value) {
    return;
  }

  clearMessages();
  isSaving.value = true;

  try {
    const payload: UpdateAdminSubscriptionRequest = {
      name: editForm.name || undefined,
      plan_name: editForm.plan_name || undefined,
      plan_id: toOptionalNumber(editForm.plan_id),
      status: editForm.status || undefined,
      template_id: toOptionalNumber(editForm.template_id),
      available_template_ids: parseIdList(editForm.available_template_ids),
      token: editForm.token || undefined,
      expires_at: toOptionalNumber(editForm.expires_at),
      traffic_total_bytes: toOptionalNumber(editForm.traffic_total_bytes),
      traffic_used_bytes: toOptionalNumber(editForm.traffic_used_bytes),
      devices_limit: toOptionalNumber(editForm.devices_limit),
    };
    const response = await adminApi.updateAdminSubscription(selectedSubscription.value.id, payload);
    updateSubscriptionInList(response.subscription);
    actionMessage.value = `订阅 ${response.subscription.name} 已更新。`;
    closeEditModal();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '更新订阅失败';
  } finally {
    isSaving.value = false;
  }
}

function openDisableModal() {
  if (!selectedSubscription.value) {
    return;
  }
  disableReason.value = '';
  showDisableModal.value = true;
}

function closeDisableModal() {
  showDisableModal.value = false;
}

async function handleDisable() {
  if (!selectedSubscription.value) {
    return;
  }

  clearMessages();
  isSaving.value = true;

  try {
    const response = await adminApi.disableAdminSubscription(selectedSubscription.value.id, {
      reason: disableReason.value || undefined,
    });
    updateSubscriptionInList(response.subscription);
    actionMessage.value = `订阅 ${response.subscription.name} 已禁用。`;
    closeDisableModal();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '禁用订阅失败';
  } finally {
    isSaving.value = false;
  }
}

function openExtendModal() {
  if (!selectedSubscription.value) {
    return;
  }
  extendForm.extend_days = null;
  extendForm.extend_hours = null;
  extendForm.expires_at = null;
  showExtendModal.value = true;
}

function closeExtendModal() {
  showExtendModal.value = false;
}

async function handleExtend() {
  if (!selectedSubscription.value) {
    return;
  }

  clearMessages();
  isSaving.value = true;

  try {
    const payload: ExtendAdminSubscriptionRequest = {};
    const expiresAt = toOptionalNumber(extendForm.expires_at);
    const extendDays = toOptionalNumber(extendForm.extend_days);
    const extendHours = toOptionalNumber(extendForm.extend_hours);

    if (expiresAt) {
      payload.expires_at = expiresAt;
    } else if (extendDays) {
      payload.extend_days = extendDays;
    } else if (extendHours) {
      payload.extend_hours = extendHours;
    } else {
      actionError.value = '请输入延长天数、小时或新的到期时间。';
      isSaving.value = false;
      return;
    }

    const response = await adminApi.extendAdminSubscription(selectedSubscription.value.id, payload);
    updateSubscriptionInList(response.subscription);
    actionMessage.value = `订阅 ${response.subscription.name} 已延长。`;
    closeExtendModal();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '延长订阅失败';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  loadSubscriptions();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">订阅</p>
        <h3 class="page-section__title">订阅管理</h3>
        <p class="page__subtitle">管理订阅实例、模板与到期策略。</p>
      </div>
      <div class="page-section__actions">
        <Button type="button" @click="openCreateModal">新建订阅</Button>
      </div>
    </header>

    <form class="form-grid form-grid--wide" @submit.prevent="loadSubscriptions">
      <div class="stack stack--tight grid-span-2">
        <Label>搜索</Label>
        <Input v-model="filters.q" type="text" placeholder="订阅名称或 Token" />
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
        <Label>用户 ID</Label>
        <Input v-model="filters.user_id" type="number" placeholder="用户 ID" />
      </div>
      <div class="stack stack--tight">
        <Label>套餐名称</Label>
        <Input v-model="filters.plan_name" type="text" placeholder="Plan name" />
      </div>
      <div class="stack stack--tight">
        <Label>套餐 ID</Label>
        <Input v-model="filters.plan_id" type="number" placeholder="套餐 ID" />
      </div>
      <div class="stack stack--tight">
        <Label>模板 ID</Label>
        <Input v-model="filters.template_id" type="number" placeholder="模板 ID" />
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
            <SelectItem value="updated_at">更新时间</SelectItem>
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
        <Button type="submit">应用</Button>
        <Button variant="secondary" type="button" @click="resetFilters">重置</Button>
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

    <div class="split-grid">
      <Card>
        <CardHeader>
          <CardTitle>订阅列表</CardTitle>
          <p class="panel-card__meta">每页最多 {{ perPage }} 条</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载订阅...</p>
          <p v-else-if="subscriptions.length === 0" class="panel-card__empty">暂无订阅。</p>
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
              <div class="cursor-pointer" @click="selectedSubscriptionId = subscription.id">
                <p class="data-row__title">
                  {{ subscription.name }} ·
                  {{
                    subscription.plan_name ||
                      subscription.plan_snapshot?.name ||
                      (subscription.plan_id ? `套餐 #${subscription.plan_id}` : '-')
                  }}
                </p>
                <p class="data-row__meta">
                  用户 {{ subscription.user?.email || subscription.user?.display_name || '-' }} ·
                  到期 {{ formatDateTime(subscription.expires_at) }}
                </p>
                <p class="data-row__meta">
                  流量 {{ formatBytes(subscription.traffic_used_bytes) }} /
                  {{ formatBytes(subscription.traffic_total_bytes) }}
                </p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="statusVariant(subscription.status)">
                  {{ statusLabel(subscription.status) }}
                </Badge>
              </div>
            </li>
          </ul>
          <div v-if="pagination?.has_next" class="list-footer">
            <Button variant="secondary" type="button" :disabled="isLoadingMore" @click="loadMore">
              {{ isLoadingMore ? '加载中...' : '加载更多' }}
            </Button>
            <p class="text-xs text-muted-foreground">
              已显示 {{ subscriptions.length }} / {{ pagination.total_count }}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="cluster cluster--between cluster--start cluster--wide">
          <div>
            <CardTitle>订阅详情</CardTitle>
            <p class="panel-card__meta">
              {{ selectedSubscription ? `订阅 #${selectedSubscription.id}` : '请选择订阅' }}
            </p>
          </div>
          <div class="cluster cluster--center">
            <Button variant="secondary" type="button" :disabled="loading" @click="loadSubscriptions">
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载订阅...</p>
          <p v-else-if="!selectedSubscription" class="panel-card__empty">请选择订阅查看详情。</p>
          <div v-else class="stack">
            <div class="cluster">
              <Badge :variant="statusVariant(selectedSubscription.status)">
                {{ statusLabel(selectedSubscription.status) }}
              </Badge>
              <Badge variant="secondary">模板 #{{ selectedSubscription.template_id ?? '-' }}</Badge>
            </div>
            <div class="detail-grid">
              <div>
                <p class="detail-label">用户</p>
                <p class="detail-value">
                  {{ selectedSubscription.user?.display_name || selectedSubscription.user?.email || '-' }}
                </p>
              </div>
              <div>
                <p class="detail-label">套餐</p>
                <p class="detail-value">
                  {{ selectedSubscription.plan_name || selectedSubscription.plan_snapshot?.name || '-' }}
                </p>
              </div>
              <div>
                <p class="detail-label">套餐 ID</p>
                <p class="detail-value">{{ selectedSubscription.plan_id ?? '-' }}</p>
              </div>
              <div>
                <p class="detail-label">Token</p>
                <p class="detail-value">{{ selectedSubscription.token || '-' }}</p>
              </div>
              <div>
                <p class="detail-label">到期时间</p>
                <p class="detail-value">{{ formatDateTime(selectedSubscription.expires_at) }}</p>
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
                <p class="detail-label">创建时间</p>
                <p class="detail-value">{{ formatDateTime(selectedSubscription.created_at) }}</p>
              </div>
              <div>
                <p class="detail-label">更新时间</p>
                <p class="detail-value">{{ formatDateTime(selectedSubscription.updated_at) }}</p>
              </div>
            </div>
            <div class="cluster">
              <Button size="sm" variant="secondary" type="button" @click="openEditModal">
                编辑订阅
              </Button>
              <Button size="sm" variant="secondary" type="button" @click="openExtendModal">
                延长有效期
              </Button>
              <Button size="sm" variant="destructive" type="button" @click="openDisableModal">
                禁用订阅
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Dialog v-model:open="showCreateModal">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新建订阅</DialogTitle>
          <DialogDescription>为指定用户创建订阅实例。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label>用户 ID *</Label>
            <Input v-model.number="createForm.user_id" type="number" placeholder="用户 ID" />
          </div>
          <div class="stack stack--tight">
            <Label>订阅名称 *</Label>
            <Input v-model="createForm.name" type="text" placeholder="Subscription name" />
          </div>
          <div class="detail-grid">
            <div class="stack stack--tight">
              <Label>套餐 ID *</Label>
              <Input v-model.number="createForm.plan_id" type="number" placeholder="套餐 ID" />
            </div>
            <div class="stack stack--tight">
              <Label>套餐名称</Label>
              <Input v-model="createForm.plan_name" type="text" placeholder="Plan name" />
            </div>
          </div>
          <div class="stack stack--tight">
            <Label>状态</Label>
            <Select v-model="createForm.status">
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">已激活</SelectItem>
                <SelectItem :value="2">已禁用</SelectItem>
                <SelectItem :value="3">已过期</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="stack stack--tight">
            <Label>模板 ID *</Label>
            <Input v-model.number="createForm.template_id" type="number" placeholder="模板 ID" />
          </div>
          <div class="stack stack--tight">
            <Label>可用模板</Label>
            <Input v-model="createForm.available_template_ids" type="text" placeholder="1, 2, 3" />
            <p class="text-xs text-muted-foreground">用英文逗号分隔模板 ID。</p>
          </div>
          <div class="stack stack--tight">
            <Label>Token</Label>
            <Input v-model="createForm.token" type="text" placeholder="可选" />
          </div>
          <div class="stack stack--tight">
            <Label>到期时间戳 *</Label>
            <Input v-model.number="createForm.expires_at" type="number" placeholder="Unix 秒" />
          </div>
          <div class="detail-grid">
            <div class="stack stack--tight">
              <Label>总流量 *</Label>
              <Input v-model.number="createForm.traffic_total_bytes" type="number" placeholder="Bytes" />
            </div>
            <div class="stack stack--tight">
              <Label>已用流量</Label>
              <Input v-model.number="createForm.traffic_used_bytes" type="number" placeholder="Bytes" />
            </div>
            <div class="stack stack--tight">
              <Label>设备上限 *</Label>
              <Input v-model.number="createForm.devices_limit" type="number" placeholder="设备数" />
            </div>
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeCreateModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreate">
            {{ isSaving ? '创建中...' : '创建订阅' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditModal">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑订阅</DialogTitle>
          <DialogDescription>更新订阅状态或流量配置。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label>订阅名称</Label>
            <Input v-model="editForm.name" type="text" placeholder="订阅名称" />
          </div>
          <div class="detail-grid">
            <div class="stack stack--tight">
              <Label>套餐 ID</Label>
              <Input v-model.number="editForm.plan_id" type="number" placeholder="套餐 ID" />
            </div>
            <div class="stack stack--tight">
              <Label>套餐名称</Label>
              <Input v-model="editForm.plan_name" type="text" placeholder="Plan name" />
            </div>
          </div>
          <div class="stack stack--tight">
            <Label>状态</Label>
            <Select v-model="editForm.status">
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">已激活</SelectItem>
                <SelectItem :value="2">已禁用</SelectItem>
                <SelectItem :value="3">已过期</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="detail-grid">
            <div class="stack stack--tight">
              <Label>模板 ID</Label>
              <Input v-model.number="editForm.template_id" type="number" placeholder="模板 ID" />
            </div>
            <div class="stack stack--tight">
              <Label>可用模板</Label>
              <Input v-model="editForm.available_template_ids" type="text" placeholder="1, 2, 3" />
            </div>
            <div class="stack stack--tight">
              <Label>Token</Label>
              <Input v-model="editForm.token" type="text" placeholder="Token" />
            </div>
          </div>
          <div class="detail-grid">
            <div class="stack stack--tight">
              <Label>到期时间戳</Label>
              <Input v-model.number="editForm.expires_at" type="number" placeholder="Unix 秒" />
            </div>
            <div class="stack stack--tight">
              <Label>总流量</Label>
              <Input v-model.number="editForm.traffic_total_bytes" type="number" placeholder="Bytes" />
            </div>
            <div class="stack stack--tight">
              <Label>已用流量</Label>
              <Input v-model.number="editForm.traffic_used_bytes" type="number" placeholder="Bytes" />
            </div>
            <div class="stack stack--tight">
              <Label>设备上限</Label>
              <Input v-model.number="editForm.devices_limit" type="number" placeholder="设备数" />
            </div>
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeEditModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleUpdate">
            {{ isSaving ? '保存中...' : '保存修改' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showExtendModal">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>延长订阅</DialogTitle>
          <DialogDescription>填写延长天数、小时或新的到期时间。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label>延长天数</Label>
            <Input v-model.number="extendForm.extend_days" type="number" min="1" placeholder="天" />
          </div>
          <div class="stack stack--tight">
            <Label>延长小时</Label>
            <Input v-model.number="extendForm.extend_hours" type="number" min="1" placeholder="小时" />
          </div>
          <div class="stack stack--tight">
            <Label>新的到期时间</Label>
            <Input v-model.number="extendForm.expires_at" type="number" placeholder="Unix 秒" />
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeExtendModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleExtend">
            {{ isSaving ? '提交中...' : '确认延长' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDisableModal">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>禁用订阅</DialogTitle>
          <DialogDescription>禁用后用户将无法继续使用该订阅。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label>禁用原因</Label>
            <Input v-model="disableReason" type="text" placeholder="可选" />
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeDisableModal">取消</Button>
          <Button variant="destructive" type="button" :disabled="isSaving" @click="handleDisable">
            {{ isSaving ? '处理中...' : '确认禁用' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
