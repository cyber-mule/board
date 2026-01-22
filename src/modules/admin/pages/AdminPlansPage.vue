<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { adminApi } from '../../../api';
import { formatBytes, formatCurrency, formatDateTime } from '../../../utils/format';
import type {
  CreatePlanRequest,
  PaginationMeta,
  PlanSummary,
  ProtocolBindingSummary,
  UpdatePlanRequest,
} from '../../../api/types';

const plans = ref<PlanSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');

const selectedPlan = ref<PlanSummary | null>(null);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const isSaving = ref(false);
const protocolBindings = ref<ProtocolBindingSummary[]>([]);
const bindingsLoading = ref(false);
const bindingsError = ref('');
const bindingSearch = ref('');

const perPage = 10;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  q: '',
  status: '__all__' as number | string,
  visible: '',
  sort: 'updated',
  direction: 'desc',
});

const createForm = reactive<CreatePlanRequest & { binding_ids: number[] }>({
  name: '',
  slug: '',
  description: '',
  tags: [],
  features: [],
  binding_ids: [],
  price_cents: 0,
  currency: 'USD',
  duration_days: 30,
  traffic_limit_bytes: 0,
  devices_limit: 1,
  sort_order: 0,
  status: 1,
  visible: false,
});

const editForm = reactive<UpdatePlanRequest & { binding_ids: number[] }>({
  name: '',
  slug: '',
  description: '',
  tags: [],
  features: [],
  binding_ids: [],
  price_cents: 0,
  currency: 'USD',
  duration_days: 30,
  traffic_limit_bytes: 0,
  devices_limit: 1,
  sort_order: 0,
  status: 1,
  visible: false,
});

type TrafficUnit = 'b' | 'kb' | 'mb' | 'gb' | 'tb';

const trafficUnitOptions: TrafficUnit[] = ['tb', 'gb', 'mb', 'kb', 'b'];
const trafficUnitMeta: Record<TrafficUnit, { label: string; factor: number }> = {
  b: { label: 'B', factor: 1 },
  kb: { label: 'KB', factor: 1024 },
  mb: { label: 'MB', factor: 1024 ** 2 },
  gb: { label: 'GB', factor: 1024 ** 3 },
  tb: { label: 'TB', factor: 1024 ** 4 },
};

const tagInput = ref('');
const featureInput = ref('');
const editTagInput = ref('');
const editFeatureInput = ref('');
const createTrafficValue = ref<number | null>(0);
const createTrafficUnit = ref<TrafficUnit>('gb');
const editTrafficValue = ref<number | null>(0);
const editTrafficUnit = ref<TrafficUnit>('gb');

const filteredBindings = computed(() => {
  const query = bindingSearch.value.trim().toLowerCase();
  if (!query) {
    return protocolBindings.value;
  }
  return protocolBindings.value.filter((binding) => {
    const haystack = [
      binding.name,
      binding.node_name,
      binding.protocol,
      String(binding.id),
      binding.node_id ? String(binding.node_id) : '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
});

function planStatusVariant(value?: number): 'default' | 'secondary' | 'outline' {
  switch (value) {
    case 2:
      return 'default';
    case 1:
      return 'secondary';
    case 3:
      return 'outline';
    default:
      return 'outline';
  }
}

function planStatusLabel(value?: number) {
  switch (value) {
    case 1:
      return '草稿';
    case 2:
      return '已上架';
    case 3:
      return '已归档';
    default:
      return '未知';
  }
}

function bindingStatusLabel(value?: number) {
  switch (value) {
    case 1:
      return '启用';
    case 2:
      return '停用';
    default:
      return '未知';
  }
}

function toBytes(value: number | null, unit: TrafficUnit): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  if (value <= 0) {
    return 0;
  }
  return Math.round(value * trafficUnitMeta[unit].factor);
}

function splitTrafficLimit(bytes?: number) {
  if (!bytes || bytes <= 0) {
    return { value: 0, unit: 'gb' as TrafficUnit };
  }
  const unit: TrafficUnit =
    bytes >= trafficUnitMeta.tb.factor
      ? 'tb'
      : bytes >= trafficUnitMeta.gb.factor
        ? 'gb'
        : bytes >= trafficUnitMeta.mb.factor
          ? 'mb'
          : bytes >= trafficUnitMeta.kb.factor
            ? 'kb'
            : 'b';
  const value = Number((bytes / trafficUnitMeta[unit].factor).toFixed(2));
  return { value, unit };
}

function bindingLabel(bindingId: number) {
  const binding = protocolBindings.value.find((item) => item.id === bindingId);
  if (!binding) {
    return `绑定 #${bindingId}`;
  }
  const nodeLabel = binding.node_name || (binding.node_id ? `节点 ${binding.node_id}` : '未知节点');
  const protocolLabel = binding.protocol || '未知协议';
  return `${protocolLabel} · ${nodeLabel}`;
}

function toggleBinding(list: number[], bindingId: number, checked: boolean | 'indeterminate') {
  const isChecked = checked === true;
  if (isChecked && !list.includes(bindingId)) {
    list.push(bindingId);
    return;
  }
  if (!isChecked && list.includes(bindingId)) {
    const index = list.indexOf(bindingId);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }
}

function removeBinding(list: number[], bindingId: number) {
  const index = list.indexOf(bindingId);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

async function loadProtocolBindings() {
  bindingsLoading.value = true;
  bindingsError.value = '';

  try {
    const response = await adminApi.fetchAdminProtocolBindings({
      page: 1,
      per_page: 200,
    });
    protocolBindings.value = response.bindings ?? [];
  } catch (error) {
    bindingsError.value = error instanceof Error ? error.message : '加载协议绑定失败';
  } finally {
    bindingsLoading.value = false;
  }
}

async function loadPlans() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminPlans({
      page: 1,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      visible:
        filters.visible && filters.visible !== '__all__'
          ? filters.visible === 'true'
          : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    plans.value = response.plans ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载套餐失败';
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
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      visible:
        filters.visible && filters.visible !== '__all__'
          ? filters.visible === 'true'
          : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    plans.value = [...plans.value, ...(response.plans ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载更多套餐失败';
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
  createForm.binding_ids = [];
  createForm.price_cents = 0;
  createForm.currency = 'USD';
  createForm.duration_days = 30;
  createForm.traffic_limit_bytes = 0;
  createTrafficValue.value = 0;
  createTrafficUnit.value = 'gb';
  createForm.devices_limit = 1;
  createForm.sort_order = 0;
  createForm.status = 1;
  createForm.visible = false;
  tagInput.value = '';
  featureInput.value = '';
  bindingSearch.value = '';
  if (!protocolBindings.value.length) {
    void loadProtocolBindings();
  }
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

async function handleCreate() {
  if (!createForm.name || createForm.price_cents <= 0 || createForm.duration_days <= 0) {
    errorMessage.value = '请填写必填项并确认数值有效';
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';

  try {
    const payload: CreatePlanRequest = {
      ...createForm,
      traffic_limit_bytes: toBytes(createTrafficValue.value, createTrafficUnit.value),
    };
    await adminApi.createAdminPlan(payload);
    closeCreateModal();
    await loadPlans();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '创建套餐失败';
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
  editForm.binding_ids = plan.binding_ids ? [...plan.binding_ids] : [];
  editForm.price_cents = plan.price_cents;
  editForm.currency = plan.currency;
  editForm.duration_days = plan.duration_days;
  editForm.traffic_limit_bytes = plan.traffic_limit_bytes || 0;
  const trafficLimit = splitTrafficLimit(plan.traffic_limit_bytes);
  editTrafficValue.value = trafficLimit.value;
  editTrafficUnit.value = trafficLimit.unit;
  editForm.devices_limit = plan.devices_limit || 1;
  editForm.sort_order = plan.sort_order || 0;
  editForm.status = plan.status ?? 1;
  editForm.visible = plan.visible || false;
  editTagInput.value = '';
  editFeatureInput.value = '';
  bindingSearch.value = '';
  if (!protocolBindings.value.length) {
    void loadProtocolBindings();
  }
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  selectedPlan.value = null;
}

async function handleUpdate() {
  if (!selectedPlan.value) return;

  if (editForm.price_cents && editForm.price_cents <= 0) {
    errorMessage.value = '价格必须大于 0';
    return;
  }

  if (editForm.duration_days && editForm.duration_days <= 0) {
    errorMessage.value = '时长必须大于 0';
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';

  try {
    const payload: UpdatePlanRequest = {
      ...editForm,
      traffic_limit_bytes: toBytes(editTrafficValue.value, editTrafficUnit.value),
    };
    await adminApi.updateAdminPlan(selectedPlan.value.id, payload);
    closeEditModal();
    await loadPlans();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '更新套餐失败';
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
  void loadProtocolBindings();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">套餐</p>
        <h3 class="page-section__title">套餐目录</h3>
        <p class="page__subtitle">管理价格、流量与可见性。</p>
      </div>
      <div class="page-section__actions">
        <Button type="button" @click="openCreateModal">新建套餐</Button>
        <Button variant="secondary" type="button" @click="loadPlans" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新列表' }}
        </Button>
      </div>
    </header>

    <form class="form-grid form-grid--wide" @submit.prevent="loadPlans">
      <div class="stack stack--tight grid-span-2">
        <Label>搜索</Label>
        <Input v-model="filters.q" type="search" placeholder="套餐名称" />
      </div>
      <div class="stack stack--tight">
        <Label>状态</Label>
        <Select v-model="filters.status">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem :value="1">草稿</SelectItem>
            <SelectItem :value="2">已上架</SelectItem>
            <SelectItem :value="3">已归档</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>可见性</Label>
        <Select v-model="filters.visible">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem value="true">可见</SelectItem>
            <SelectItem value="false">隐藏</SelectItem>
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
            <SelectItem value="updated">最近更新</SelectItem>
            <SelectItem value="price">价格</SelectItem>
            <SelectItem value="name">名称</SelectItem>
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
            <SelectItem value="desc">降序</SelectItem>
            <SelectItem value="asc">升序</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="cluster cluster--end">
        <Button type="submit" :disabled="loading">应用筛选</Button>
      </div>
    </form>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>操作失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <div class="split-grid">
      <Card>
        <CardHeader>
          <CardTitle>套餐列表</CardTitle>
          <p class="panel-card__meta">共 {{ plans.length }} 个套餐</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载套餐...</p>
          <p v-else-if="plans.length === 0" class="panel-card__empty">暂无套餐。</p>
          <ul v-else class="data-list">
            <li
              v-for="plan in plans"
              :key="plan.id"
              :class="['data-row', 'data-row--stack', { 'data-row--selected': selectedPlan?.id === plan.id }]"
            >
              <div>
                <p class="data-row__title">{{ plan.name }}</p>
                <p class="data-row__meta">
                  {{ formatCurrency(plan.price_cents, plan.currency) }} · {{ plan.duration_days }} 天
                </p>
                <p class="data-row__meta">流量 {{ formatBytes(plan.traffic_limit_bytes) }}</p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="planStatusVariant(plan.status)">{{ planStatusLabel(plan.status) }}</Badge>
                <Badge variant="outline">{{ plan.visible ? '可见' : '隐藏' }}</Badge>
                <Button size="sm" type="button" @click="openEditModal(plan)">编辑</Button>
                <Button variant="ghost" size="sm" type="button" @click="selectPlan(plan)">详情</Button>
              </div>
            </li>
          </ul>
          <div v-if="pagination?.has_next" class="list-footer">
            <Button variant="ghost" type="button" @click="loadMore" :disabled="isLoadingMore">
              {{ isLoadingMore ? '加载中...' : '加载更多' }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>套餐详情</CardTitle>
          <p class="panel-card__meta">
            {{ selectedPlan ? selectedPlan.name : '请选择套餐' }}
          </p>
        </CardHeader>
        <CardContent>
          <p v-if="!selectedPlan" class="panel-card__empty">请先选择套餐查看详情。</p>
          <div v-else>
            <div class="detail-grid">
              <div>
                <p class="detail-label">价格</p>
                <p class="detail-value">
                  {{ formatCurrency(selectedPlan.price_cents, selectedPlan.currency) }}
                </p>
              </div>
              <div>
                <p class="detail-label">时长</p>
                <p class="detail-value">{{ selectedPlan.duration_days }} 天</p>
              </div>
              <div>
                <p class="detail-label">设备数</p>
                <p class="detail-value">{{ selectedPlan.devices_limit ?? '-' }}</p>
              </div>
              <div>
                <p class="detail-label">流量上限</p>
                <p class="detail-value">{{ formatBytes(selectedPlan.traffic_limit_bytes) }}</p>
              </div>
              <div>
                <p class="detail-label">状态</p>
                <p class="detail-value">{{ planStatusLabel(selectedPlan.status) }}</p>
              </div>
              <div>
                <p class="detail-label">更新时间</p>
                <p class="detail-value">{{ formatDateTime(selectedPlan.updated_at) }}</p>
              </div>
            </div>
            <p class="detail-label">描述</p>
            <p class="detail-value">{{ selectedPlan.description || '暂无描述。' }}</p>
            <div v-if="selectedPlan.tags?.length" class="detail-section">
              <h4>标签</h4>
              <div class="cluster">
                <Badge v-for="tag in selectedPlan.tags" :key="tag" variant="secondary">{{ tag }}</Badge>
              </div>
            </div>
            <div v-if="selectedPlan.features?.length" class="detail-section">
              <h4>权益</h4>
              <ul class="data-list data-list--compact">
                <li v-for="feature in selectedPlan.features" :key="feature" class="data-row">
                  <span class="data-row__title">{{ feature }}</span>
                </li>
              </ul>
            </div>
            <div v-if="selectedPlan.binding_ids?.length" class="detail-section">
              <h4>协议绑定</h4>
              <div class="cluster">
                <Badge v-for="bindingId in selectedPlan.binding_ids" :key="bindingId" variant="outline">
                  {{ bindingLabel(bindingId) }}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Dialog v-model:open="showCreateModal">
      <DialogContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle>新建套餐</DialogTitle>
          <DialogDescription>请填写套餐价格、时长与流量限制。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="create-name">套餐名称 *</Label>
              <Input id="create-name" v-model="createForm.name" type="text" placeholder="例如 高速月卡" />
            </div>
            <div class="stack stack--tight">
              <Label for="create-slug">别名</Label>
              <Input id="create-slug" v-model="createForm.slug" type="text" placeholder="plan-slug" />
            </div>
          </div>

          <div class="stack stack--tight">
            <Label for="create-description">描述</Label>
            <Textarea
              id="create-description"
              v-model="createForm.description"
              rows="2"
              placeholder="套餐说明与适用人群"
            />
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="create-price">价格（分）*</Label>
              <Input
                id="create-price"
                v-model.number="createForm.price_cents"
                type="number"
                min="0"
                placeholder="999"
              />
            </div>
            <div class="stack stack--tight">
              <Label>币种 *</Label>
              <Select v-model="createForm.currency">
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="create-duration">时长（天）*</Label>
              <Input
                id="create-duration"
                v-model.number="createForm.duration_days"
                type="number"
                min="1"
                placeholder="30"
              />
            </div>
            <div class="stack stack--tight">
              <Label for="create-traffic">流量上限</Label>
              <div class="traffic-input">
                <Input
                  id="create-traffic"
                  v-model.number="createTrafficValue"
                  type="number"
                  min="0"
                  placeholder="100"
                  class="traffic-input__value"
                />
                <Select v-model="createTrafficUnit">
                  <SelectTrigger class="traffic-input__unit">
                    <SelectValue placeholder="单位" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="unit in trafficUnitOptions" :key="unit" :value="unit">
                      {{ trafficUnitMeta[unit].label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="create-devices">设备数限制</Label>
              <Input
                id="create-devices"
                v-model.number="createForm.devices_limit"
                type="number"
                min="1"
                placeholder="1"
              />
            </div>
            <div class="stack stack--tight">
              <Label for="create-sort">排序权重</Label>
              <Input
                id="create-sort"
                v-model.number="createForm.sort_order"
                type="number"
                placeholder="0"
              />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label>状态</Label>
              <Select v-model="createForm.status">
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="1">草稿</SelectItem>
                  <SelectItem :value="2">已上架</SelectItem>
                  <SelectItem :value="3">已归档</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="cluster cluster--center form__field--offset">
              <Checkbox id="create-visible" v-model="createForm.visible" />
              <Label for="create-visible">对用户可见</Label>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label>标签</Label>
            <div class="cluster">
              <Input
                v-model="tagInput"
                type="text"
                placeholder="输入标签后回车"
                @keyup.enter.prevent="addTag"
              />
              <Button variant="secondary" type="button" @click="addTag">添加</Button>
            </div>
            <div v-if="createForm.tags && createForm.tags.length" class="cluster">
              <Badge v-for="tag in createForm.tags" :key="tag" variant="secondary" class="inline-gap">
                {{ tag }}
                <Button variant="ghost" size="icon-sm" type="button" @click="removeTag(tag)">×</Button>
              </Badge>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label>权益</Label>
            <div class="cluster">
              <Input
                v-model="featureInput"
                type="text"
                placeholder="输入权益后回车"
                @keyup.enter.prevent="addFeature"
              />
              <Button variant="secondary" type="button" @click="addFeature">添加</Button>
            </div>
            <div v-if="createForm.features && createForm.features.length" class="cluster">
              <Badge
                v-for="feature in createForm.features"
                :key="feature"
                variant="outline"
                class="inline-gap"
              >
                {{ feature }}
                <Button variant="ghost" size="icon-sm" type="button" @click="removeFeature(feature)">×</Button>
              </Badge>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label>协议绑定</Label>
            <Input v-model="bindingSearch" type="search" placeholder="搜索节点、协议或绑定 ID" />
            <p v-if="bindingsLoading" class="panel-card__empty">正在加载协议绑定...</p>
            <p v-else-if="bindingsError" class="panel-card__empty">{{ bindingsError }}</p>
            <p v-else-if="filteredBindings.length === 0" class="panel-card__empty">暂无可用绑定。</p>
            <div v-else class="data-list data-list--compact">
              <div v-for="binding in filteredBindings" :key="binding.id" class="data-row data-row--stack">
                <div class="cluster cluster--center">
                  <Checkbox
                    :checked="createForm.binding_ids.includes(binding.id)"
                    @update:checked="(checked) => toggleBinding(createForm.binding_ids, binding.id, checked)"
                  />
                  <div>
                    <p class="data-row__title">{{ binding.name || binding.protocol || '未命名绑定' }}</p>
                    <p class="data-row__meta">
                      节点 {{ binding.node_name || binding.node_id || '-' }} ·
                      {{ binding.protocol || '未知协议' }} ·
                      ID {{ binding.id }}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{{ bindingStatusLabel(binding.status) }}</Badge>
              </div>
            </div>
            <div v-if="createForm.binding_ids.length" class="cluster">
              <Badge
                v-for="bindingId in createForm.binding_ids"
                :key="bindingId"
                variant="secondary"
                class="inline-gap"
              >
                {{ bindingLabel(bindingId) }}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  @click="removeBinding(createForm.binding_ids, bindingId)"
                >
                  ×
                </Button>
              </Badge>
            </div>
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeCreateModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreate">
            {{ isSaving ? '创建中...' : '创建套餐' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditModal">
      <DialogContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle>编辑套餐</DialogTitle>
          <DialogDescription>更新套餐定价与能力配置。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="edit-name">套餐名称</Label>
              <Input id="edit-name" v-model="editForm.name" type="text" placeholder="套餐名称" />
            </div>
            <div class="stack stack--tight">
              <Label for="edit-slug">别名</Label>
              <Input id="edit-slug" v-model="editForm.slug" type="text" placeholder="plan-slug" />
            </div>
          </div>

          <div class="stack stack--tight">
            <Label for="edit-description">描述</Label>
            <Textarea
              id="edit-description"
              v-model="editForm.description"
              rows="2"
              placeholder="套餐说明"
            />
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="edit-price">价格（分）</Label>
              <Input
                id="edit-price"
                v-model.number="editForm.price_cents"
                type="number"
                min="0"
                placeholder="999"
              />
            </div>
            <div class="stack stack--tight">
              <Label>币种</Label>
              <Select v-model="editForm.currency">
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="edit-duration">时长（天）</Label>
              <Input
                id="edit-duration"
                v-model.number="editForm.duration_days"
                type="number"
                min="1"
                placeholder="30"
              />
            </div>
            <div class="stack stack--tight">
              <Label for="edit-traffic">流量上限</Label>
              <div class="traffic-input">
                <Input
                  id="edit-traffic"
                  v-model.number="editTrafficValue"
                  type="number"
                  min="0"
                  placeholder="100"
                  class="traffic-input__value"
                />
                <Select v-model="editTrafficUnit">
                  <SelectTrigger class="traffic-input__unit">
                    <SelectValue placeholder="单位" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="unit in trafficUnitOptions" :key="unit" :value="unit">
                      {{ trafficUnitMeta[unit].label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="edit-devices">设备数限制</Label>
              <Input
                id="edit-devices"
                v-model.number="editForm.devices_limit"
                type="number"
                min="1"
                placeholder="1"
              />
            </div>
            <div class="stack stack--tight">
              <Label for="edit-sort">排序权重</Label>
              <Input
                id="edit-sort"
                v-model.number="editForm.sort_order"
                type="number"
                placeholder="0"
              />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label>状态</Label>
              <Select v-model="editForm.status">
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="1">草稿</SelectItem>
                  <SelectItem :value="2">已上架</SelectItem>
                  <SelectItem :value="3">已归档</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="cluster cluster--center form__field--offset">
              <Checkbox id="edit-visible" v-model="editForm.visible" />
              <Label for="edit-visible">对用户可见</Label>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label>标签</Label>
            <div class="cluster">
              <Input
                v-model="editTagInput"
                type="text"
                placeholder="输入标签后回车"
                @keyup.enter.prevent="addEditTag"
              />
              <Button variant="secondary" type="button" @click="addEditTag">添加</Button>
            </div>
            <div v-if="editForm.tags && editForm.tags.length" class="cluster">
              <Badge v-for="tag in editForm.tags" :key="tag" variant="secondary" class="inline-gap">
                {{ tag }}
                <Button variant="ghost" size="icon-sm" type="button" @click="removeEditTag(tag)">×</Button>
              </Badge>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label>权益</Label>
            <div class="cluster">
              <Input
                v-model="editFeatureInput"
                type="text"
                placeholder="输入权益后回车"
                @keyup.enter.prevent="addEditFeature"
              />
              <Button variant="secondary" type="button" @click="addEditFeature">添加</Button>
            </div>
            <div v-if="editForm.features && editForm.features.length" class="cluster">
              <Badge
                v-for="feature in editForm.features"
                :key="feature"
                variant="outline"
                class="inline-gap"
              >
                {{ feature }}
                <Button variant="ghost" size="icon-sm" type="button" @click="removeEditFeature(feature)">×</Button>
              </Badge>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label>协议绑定</Label>
            <Input v-model="bindingSearch" type="search" placeholder="搜索节点、协议或绑定 ID" />
            <p v-if="bindingsLoading" class="panel-card__empty">正在加载协议绑定...</p>
            <p v-else-if="bindingsError" class="panel-card__empty">{{ bindingsError }}</p>
            <p v-else-if="filteredBindings.length === 0" class="panel-card__empty">暂无可用绑定。</p>
            <div v-else class="data-list data-list--compact">
              <div v-for="binding in filteredBindings" :key="binding.id" class="data-row data-row--stack">
                <div class="cluster cluster--center">
                  <Checkbox
                    :checked="editForm.binding_ids.includes(binding.id)"
                    @update:checked="(checked) => toggleBinding(editForm.binding_ids, binding.id, checked)"
                  />
                  <div>
                    <p class="data-row__title">{{ binding.name || binding.protocol || '未命名绑定' }}</p>
                    <p class="data-row__meta">
                      节点 {{ binding.node_name || binding.node_id || '-' }} ·
                      {{ binding.protocol || '未知协议' }} ·
                      ID {{ binding.id }}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{{ bindingStatusLabel(binding.status) }}</Badge>
              </div>
            </div>
            <div v-if="editForm.binding_ids.length" class="cluster">
              <Badge
                v-for="bindingId in editForm.binding_ids"
                :key="bindingId"
                variant="secondary"
                class="inline-gap"
              >
                {{ bindingLabel(bindingId) }}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  @click="removeBinding(editForm.binding_ids, bindingId)"
                >
                  ×
                </Button>
              </Badge>
            </div>
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeEditModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleUpdate">
            {{ isSaving ? '更新中...' : '保存修改' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
