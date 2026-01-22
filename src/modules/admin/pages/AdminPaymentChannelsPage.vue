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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { adminApi } from '../../../api';
import { formatDateTime } from '../../../utils/format';
import type {
  CreatePaymentChannelRequest,
  PaginationMeta,
  PaymentChannelSummary,
  UpdatePaymentChannelRequest,
} from '../../../api/types';

const channels = ref<PaymentChannelSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');
const actionMessage = ref('');
const actionError = ref('');

const selectedChannelId = ref<number | null>(null);
const selectedChannel = computed(() => {
  if (!selectedChannelId.value) {
    return null;
  }
  return channels.value.find((channel) => channel.id === selectedChannelId.value) ?? null;
});

const perPage = 10;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  q: '',
  provider: '',
  enabled: '',
  sort: 'updated',
  direction: 'desc',
});

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showToggleModal = ref(false);
const isSaving = ref(false);
const toggleNextState = ref(false);

const createForm = reactive({
  name: '',
  code: '',
  provider: '',
  enabled: true,
  sort_order: 0 as number | null,
  config: '',
});

const editForm = reactive({
  name: '',
  code: '',
  provider: '',
  enabled: true,
  sort_order: 0 as number | null,
  config: '',
});

const configPlaceholder = `{
  "mode": "http",
  "notify_url": "https://example.com/api/v1/payments/callback?order_id={{order_id}}&payment_id={{payment_id}}",
  "return_url": "https://example.com/orders/{{order_number}}",
  "http": {
    "endpoint": "https://gateway.example.com/pay",
    "method": "POST",
    "body_type": "json",
    "headers": {
      "Content-Type": "application/json"
    },
    "payload": {
      "order_no": "{{order_number}}",
      "amount": "{{amount}}",
      "notify_url": "{{notify_url}}",
      "return_url": "{{return_url}}"
    }
  },
  "response": {
    "pay_url": "data.pay_url",
    "qr_code": "data.qr_code",
    "reference": "data.reference"
  }
}`;

const configTips =
  'notify_url/return_url/payload 支持模板变量（如 {{order_id}}），response.pay_url 可使用 $ 直接取原始响应。';

const selectedConfigPreview = computed(() => {
  if (!selectedChannel.value?.config) {
    return '';
  }
  try {
    return JSON.stringify(selectedChannel.value.config, null, 2);
  } catch (error) {
    return '';
  }
});

function enabledVariant(value?: boolean): 'default' | 'secondary' | 'outline' {
  if (value === true) {
    return 'default';
  }
  if (value === false) {
    return 'secondary';
  }
  return 'outline';
}

function enabledLabel(value?: boolean) {
  if (value === true) {
    return '启用中';
  }
  if (value === false) {
    return '已停用';
  }
  return '未知';
}

function toOptionalNumber(value: number | null): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function parseConfig(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { value: undefined, error: '' };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: undefined, error: '配置需要是 JSON 对象。' };
    }
    return { value: parsed as Record<string, unknown>, error: '' };
  } catch (error) {
    return { value: undefined, error: '配置 JSON 解析失败，请检查格式。' };
  }
}

function ensureSelection(list: PaymentChannelSummary[]) {
  if (!list.length) {
    selectedChannelId.value = null;
    return;
  }
  if (selectedChannelId.value && list.some((channel) => channel.id === selectedChannelId.value)) {
    return;
  }
  selectedChannelId.value = list[0].id;
}

function updateChannelInList(channel: PaymentChannelSummary) {
  channels.value = channels.value.map((item) => (item.id === channel.id ? channel : item));
}

function clearMessages() {
  actionMessage.value = '';
  actionError.value = '';
}

async function loadChannels() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminPaymentChannels({
      page: 1,
      per_page: perPage,
      q: filters.q || undefined,
      provider: filters.provider || undefined,
      enabled:
        filters.enabled && filters.enabled !== '__all__' ? filters.enabled === 'true' : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    channels.value = response.channels ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
    ensureSelection(channels.value);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载支付通道失败';
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
    const response = await adminApi.fetchAdminPaymentChannels({
      page: targetPage,
      per_page: perPage,
      q: filters.q || undefined,
      provider: filters.provider || undefined,
      enabled:
        filters.enabled && filters.enabled !== '__all__' ? filters.enabled === 'true' : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    channels.value = [...channels.value, ...(response.channels ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载更多支付通道失败';
  } finally {
    isLoadingMore.value = false;
  }
}

function resetFilters() {
  filters.q = '';
  filters.provider = '';
  filters.enabled = '';
  filters.sort = 'updated';
  filters.direction = 'desc';
  loadChannels();
}

function openCreateModal() {
  createForm.name = '';
  createForm.code = '';
  createForm.provider = '';
  createForm.enabled = true;
  createForm.sort_order = 0;
  createForm.config = '';
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

async function handleCreate() {
  clearMessages();

  if (!createForm.name || !createForm.code) {
    actionError.value = '请填写通道名称与代码。';
    return;
  }

  const configResult = parseConfig(createForm.config);
  if (configResult.error) {
    actionError.value = configResult.error;
    return;
  }

  isSaving.value = true;

  try {
    const payload: CreatePaymentChannelRequest = {
      name: createForm.name.trim(),
      code: createForm.code.trim(),
      provider: createForm.provider.trim() || undefined,
      enabled: createForm.enabled,
      sort_order: toOptionalNumber(createForm.sort_order),
      config: configResult.value,
    };
    const response = await adminApi.createAdminPaymentChannel(payload);
    actionMessage.value = `支付通道 ${response.name} 已创建。`;
    closeCreateModal();
    await loadChannels();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '创建支付通道失败';
  } finally {
    isSaving.value = false;
  }
}

function openEditModal() {
  if (!selectedChannel.value) {
    return;
  }

  const channel = selectedChannel.value;
  editForm.name = channel.name || '';
  editForm.code = channel.code || '';
  editForm.provider = channel.provider || '';
  editForm.enabled = channel.enabled ?? false;
  editForm.sort_order = channel.sort_order ?? 0;
  editForm.config = channel.config ? JSON.stringify(channel.config, null, 2) : '';
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
}

async function handleUpdate() {
  if (!selectedChannel.value) {
    return;
  }

  clearMessages();

  if (!editForm.name || !editForm.code) {
    actionError.value = '请填写通道名称与代码。';
    return;
  }

  const configResult = parseConfig(editForm.config);
  if (configResult.error) {
    actionError.value = configResult.error;
    return;
  }

  isSaving.value = true;

  try {
    const payload: UpdatePaymentChannelRequest = {
      name: editForm.name.trim(),
      code: editForm.code.trim(),
      provider: editForm.provider.trim() || undefined,
      enabled: editForm.enabled,
      sort_order: toOptionalNumber(editForm.sort_order),
      config: configResult.value,
    };
    const response = await adminApi.updateAdminPaymentChannel(selectedChannel.value.id, payload);
    updateChannelInList(response);
    actionMessage.value = `支付通道 ${response.name} 已更新。`;
    closeEditModal();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '更新支付通道失败';
  } finally {
    isSaving.value = false;
  }
}

function openToggleModal() {
  if (!selectedChannel.value) {
    return;
  }

  toggleNextState.value = !(selectedChannel.value.enabled ?? false);
  showToggleModal.value = true;
}

function closeToggleModal() {
  showToggleModal.value = false;
}

async function handleToggle() {
  if (!selectedChannel.value) {
    return;
  }

  clearMessages();
  isSaving.value = true;

  try {
    const response = await adminApi.updateAdminPaymentChannel(selectedChannel.value.id, {
      enabled: toggleNextState.value,
    });
    updateChannelInList(response);
    actionMessage.value = `支付通道 ${response.name} 已${toggleNextState.value ? '启用' : '停用'}。`;
    closeToggleModal();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '更新通道状态失败';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  loadChannels();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">支付配置</p>
        <h3 class="page-section__title">支付通道管理</h3>
        <p class="page__subtitle">管理外部支付通道、回调与返回配置。</p>
      </div>
      <div class="page-section__actions">
        <Button type="button" @click="openCreateModal">新建通道</Button>
      </div>
    </header>

    <form class="form-grid form-grid--wide" @submit.prevent="loadChannels">
      <div class="stack stack--tight grid-span-2">
        <Label>搜索</Label>
        <Input v-model="filters.q" type="text" placeholder="通道名称或代码" />
      </div>
      <div class="stack stack--tight">
        <Label>提供方</Label>
        <Input v-model="filters.provider" type="text" placeholder="例如 stripe、wechat" />
      </div>
      <div class="stack stack--tight">
        <Label>状态</Label>
        <Select v-model="filters.enabled">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem value="true">启用中</SelectItem>
            <SelectItem value="false">已停用</SelectItem>
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
            <SelectItem value="name">名称</SelectItem>
            <SelectItem value="created">创建时间</SelectItem>
            <SelectItem value="updated">更新时间</SelectItem>
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

    <div class="split-layout">
      <Card class="panel-card">
        <CardHeader>
          <CardTitle>通道列表</CardTitle>
          <p class="panel-card__meta">共 {{ pagination?.total_count ?? 0 }} 条</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载支付通道...</p>
          <p v-else-if="channels.length === 0" class="panel-card__empty">暂无支付通道。</p>
          <ul v-else class="data-list">
            <li
              v-for="channel in channels"
              :key="channel.id"
              :class="[
                'data-row',
                selectedChannelId === channel.id ? 'data-row--selected' : '',
              ]"
              @click="selectedChannelId = channel.id"
            >
              <div>
                <p class="data-row__title">{{ channel.name }}</p>
                <p class="data-row__meta">
                  {{ channel.code }} · {{ channel.provider || '未指定提供方' }}
                </p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="enabledVariant(channel.enabled)">
                  {{ enabledLabel(channel.enabled) }}
                </Badge>
                <span class="data-row__meta">{{ formatDateTime(channel.updated_at) }}</span>
              </div>
            </li>
          </ul>

          <div v-if="pagination?.has_next" class="panel-card__actions">
            <Button variant="secondary" type="button" :disabled="isLoadingMore" @click="loadMore">
              {{ isLoadingMore ? '加载中...' : '加载更多' }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div class="stack">
        <Card class="panel-card">
          <CardHeader>
            <CardTitle>通道详情</CardTitle>
            <div class="panel-card__actions" v-if="selectedChannel">
              <Button variant="secondary" type="button" @click="openEditModal">编辑</Button>
              <Button type="button" @click="openToggleModal">
                {{ selectedChannel.enabled ? '停用' : '启用' }}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p v-if="!selectedChannel" class="panel-card__empty">请选择一个支付通道。</p>
            <div v-else class="stack">
              <div class="detail-grid">
                <div>
                  <p class="detail-label">通道 ID</p>
                  <p class="detail-value">{{ selectedChannel.id }}</p>
                </div>
                <div>
                  <p class="detail-label">通道代码</p>
                  <p class="detail-value">{{ selectedChannel.code }}</p>
                </div>
                <div>
                  <p class="detail-label">提供方</p>
                  <p class="detail-value">{{ selectedChannel.provider || '-' }}</p>
                </div>
                <div>
                  <p class="detail-label">状态</p>
                  <p class="detail-value">{{ enabledLabel(selectedChannel.enabled) }}</p>
                </div>
                <div>
                  <p class="detail-label">排序权重</p>
                  <p class="detail-value">{{ selectedChannel.sort_order ?? '-' }}</p>
                </div>
                <div>
                  <p class="detail-label">更新时间</p>
                  <p class="detail-value">{{ formatDateTime(selectedChannel.updated_at) }}</p>
                </div>
              </div>
              <div class="stack stack--tight">
                <p class="detail-label">通道配置</p>
                <p v-if="!selectedConfigPreview" class="text-sm text-muted-foreground">
                  暂无配置，使用默认支付通道设置。
                </p>
                <pre v-else class="code-block">{{ selectedConfigPreview }}</pre>
                <p class="text-xs text-muted-foreground">{{ configTips }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>配置提示</CardTitle>
          </CardHeader>
          <CardContent class="stack">
            <p class="text-sm text-muted-foreground">
              使用 JSON 配置通道发起请求、回调与返回 URL。响应字段支持点路径（如 data.pay_url）。
            </p>
            <p class="text-sm text-muted-foreground">
              支付网关返回 pay_url/qr_code 时，用户端可展示跳转链接或二维码。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>

    <Dialog v-model:open="showCreateModal">
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle>新建支付通道</DialogTitle>
          <DialogDescription>配置支付通道的基本信息与网关参数。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label for="channel-name">通道名称</Label>
            <Input id="channel-name" v-model="createForm.name" type="text" placeholder="例如 Stripe Checkout" />
          </div>
          <div class="stack stack--tight">
            <Label for="channel-code">通道代码</Label>
            <Input id="channel-code" v-model="createForm.code" type="text" placeholder="例如 stripe_checkout" />
          </div>
          <div class="stack stack--tight">
            <Label for="channel-provider">提供方</Label>
            <Input id="channel-provider" v-model="createForm.provider" type="text" placeholder="例如 stripe" />
          </div>
          <div class="stack stack--tight">
            <Label for="channel-sort">排序权重</Label>
            <Input
              id="channel-sort"
              v-model.number="createForm.sort_order"
              type="number"
              min="0"
              placeholder="0"
            />
          </div>
          <div class="cluster cluster--center">
            <Switch v-model="createForm.enabled" />
            <span class="text-sm">启用该通道</span>
          </div>
          <div class="stack stack--tight">
            <Label for="channel-config">通道配置（JSON）</Label>
            <Textarea
              id="channel-config"
              v-model="createForm.config"
              class="min-h-[200px]"
              :placeholder="configPlaceholder"
            />
            <p class="text-xs text-muted-foreground">{{ configTips }}</p>
            <p class="text-xs text-muted-foreground">留空表示使用系统默认配置。</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" type="button" :disabled="isSaving" @click="closeCreateModal">
            取消
          </Button>
          <Button type="button" :disabled="isSaving" @click="handleCreate">
            {{ isSaving ? '创建中...' : '确认创建' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditModal">
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle>编辑支付通道</DialogTitle>
          <DialogDescription>更新通道信息与支付网关配置。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label for="edit-channel-name">通道名称</Label>
            <Input id="edit-channel-name" v-model="editForm.name" type="text" placeholder="例如 Stripe Checkout" />
          </div>
          <div class="stack stack--tight">
            <Label for="edit-channel-code">通道代码</Label>
            <Input id="edit-channel-code" v-model="editForm.code" type="text" placeholder="例如 stripe_checkout" />
          </div>
          <div class="stack stack--tight">
            <Label for="edit-channel-provider">提供方</Label>
            <Input id="edit-channel-provider" v-model="editForm.provider" type="text" placeholder="例如 stripe" />
          </div>
          <div class="stack stack--tight">
            <Label for="edit-channel-sort">排序权重</Label>
            <Input
              id="edit-channel-sort"
              v-model.number="editForm.sort_order"
              type="number"
              min="0"
              placeholder="0"
            />
          </div>
          <div class="cluster cluster--center">
            <Switch v-model="editForm.enabled" />
            <span class="text-sm">启用该通道</span>
          </div>
          <div class="stack stack--tight">
            <Label for="edit-channel-config">通道配置（JSON）</Label>
            <Textarea
              id="edit-channel-config"
              v-model="editForm.config"
              class="min-h-[200px]"
              :placeholder="configPlaceholder"
            />
            <p class="text-xs text-muted-foreground">{{ configTips }}</p>
            <p class="text-xs text-muted-foreground">清空并保存不会覆盖现有配置，如需清空请填 {}。</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" type="button" :disabled="isSaving" @click="closeEditModal">
            取消
          </Button>
          <Button type="button" :disabled="isSaving" @click="handleUpdate">
            {{ isSaving ? '保存中...' : '保存更新' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showToggleModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ toggleNextState ? '启用通道' : '停用通道' }}</DialogTitle>
          <DialogDescription>
            {{ toggleNextState ? '启用后将用于用户支付创建订单。' : '停用后该通道将不可用。' }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" type="button" :disabled="isSaving" @click="closeToggleModal">
            取消
          </Button>
          <Button type="button" :disabled="isSaving" @click="handleToggle">
            {{ isSaving ? '处理中...' : '确认' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
