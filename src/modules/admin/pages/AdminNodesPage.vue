<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
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
  CreateNodeRequest,
  NodeKernelSummary,
  NodeSummary,
  PaginationMeta,
  UpdateNodeRequest,
} from '../../../api/types';

const nodes = ref<NodeSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');
const actionMessage = ref('');
const actionError = ref('');

const selectedNode = ref<NodeSummary | null>(null);
const kernels = ref<NodeKernelSummary[]>([]);
const kernelsLoading = ref(false);
const kernelsError = ref('');
const syncingKernels = ref(false);
const syncNotice = ref('');
const syncProtocol = ref('');
const statusSyncing = ref(false);
const statusSyncNotice = ref('');
const statusSyncError = ref('');
const protocolStatusSyncing = ref(false);
const protocolStatusSyncNotice = ref('');
const protocolStatusSyncError = ref('');
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDisableModal = ref(false);
const showDeleteModal = ref(false);
const isSaving = ref(false);

const createForm = reactive({
  name: '',
  region: '',
  country: '',
  isp: '',
  status: '__unset__',
  tags: [] as string[],
  capacity_mbps: null as number | null,
  description: '',
  access_address: '',
  control_endpoint: '',
  control_token: '',
  control_access_key: '',
  control_secret_key: '',
  status_sync_enabled: true,
});

const editForm = reactive({
  name: '',
  region: '',
  country: '',
  isp: '',
  tags: [] as string[],
  capacity_mbps: null as number | null,
  description: '',
  access_address: '',
  control_endpoint: '',
  control_token: '',
  control_access_key: '',
  control_secret_key: '',
  status_sync_enabled: true,
});

const tagInput = ref('');
const editTagInput = ref('');

const perPage = 10;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  q: '',
  status: '__all__' as number | string,
  protocol: '',
  sort: 'last_synced_at',
  direction: 'desc',
});

function nodeStatusVariant(value?: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 1:
      return 'default';
    case 3:
      return 'secondary';
    case 2:
    case 4:
      return 'destructive';
    default:
      return 'outline';
  }
}

function nodeStatusLabel(value?: number) {
  switch (value) {
    case 1:
      return '在线';
    case 2:
      return '离线';
    case 3:
      return '维护';
    case 4:
      return '已禁用';
    default:
      return '未知';
  }
}

function kernelStatusVariant(value?: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 2:
      return 'default';
    case 1:
      return 'secondary';
    default:
      return 'outline';
  }
}

function kernelStatusLabel(value?: number) {
  switch (value) {
    case 1:
      return '已配置';
    case 2:
      return '已同步';
    default:
      return '未知';
  }
}

function statusSyncLabel(value?: boolean) {
  if (value === false) {
    return '关闭';
  }
  return '开启';
}

function clearMessages() {
  actionMessage.value = '';
  actionError.value = '';
}

function toOptionalNumber(value: number | null): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
}

function resetCreateForm() {
  createForm.name = '';
  createForm.region = '';
  createForm.country = '';
  createForm.isp = '';
  createForm.status = '__unset__';
  createForm.tags = [];
  createForm.capacity_mbps = null;
  createForm.description = '';
  createForm.access_address = '';
  createForm.control_endpoint = '';
  createForm.control_token = '';
  createForm.control_access_key = '';
  createForm.control_secret_key = '';
  createForm.status_sync_enabled = true;
  tagInput.value = '';
}

function openCreateModal() {
  clearMessages();
  resetCreateForm();
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

function addTag() {
  const value = tagInput.value.trim();
  if (!value) {
    return;
  }
  if (!createForm.tags.includes(value)) {
    createForm.tags.push(value);
  }
  tagInput.value = '';
}

function removeTag(tag: string) {
  createForm.tags = createForm.tags.filter(item => item !== tag);
}

function openEditModal(node: NodeSummary) {
  clearMessages();
  selectedNode.value = node;
  editForm.name = node.name;
  editForm.region = node.region || '';
  editForm.country = node.country || '';
  editForm.isp = node.isp || '';
  editForm.tags = node.tags ? [...node.tags] : [];
  editForm.capacity_mbps = node.capacity_mbps ?? null;
  editForm.description = node.description || '';
  editForm.access_address = node.access_address || '';
  editForm.control_endpoint = node.control_endpoint || '';
  editForm.control_token = '';
  editForm.control_access_key = '';
  editForm.control_secret_key = '';
  editForm.status_sync_enabled = node.status_sync_enabled ?? true;
  editTagInput.value = '';
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
}

function addEditTag() {
  const value = editTagInput.value.trim();
  if (!value) {
    return;
  }
  if (!editForm.tags.includes(value)) {
    editForm.tags.push(value);
  }
  editTagInput.value = '';
}

function removeEditTag(tag: string) {
  editForm.tags = editForm.tags.filter(item => item !== tag);
}

function openDisableModal(node: NodeSummary) {
  clearMessages();
  selectedNode.value = node;
  showDisableModal.value = true;
}

function closeDisableModal() {
  showDisableModal.value = false;
}

function openDeleteModal(node: NodeSummary) {
  clearMessages();
  selectedNode.value = node;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
}

async function loadNodes() {
  loading.value = true;
  errorMessage.value = '';
  const selectedId = selectedNode.value?.id ?? null;

  try {
    const response = await adminApi.fetchAdminNodes({
      page: 1,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      protocol: filters.protocol || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    nodes.value = response.nodes ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
    if (selectedId) {
      selectedNode.value = nodes.value.find((node) => node.id === selectedId) ?? null;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载节点失败';
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
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      protocol: filters.protocol || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    nodes.value = [...nodes.value, ...(response.nodes ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载更多节点失败';
  } finally {
    isLoadingMore.value = false;
  }
}

async function handleCreate() {
  clearMessages();
  if (!createForm.name.trim()) {
    actionError.value = '节点名称不能为空';
    return;
  }
  if (!createForm.control_endpoint.trim()) {
    actionError.value = '控制面地址不能为空';
    return;
  }
  isSaving.value = true;

  try {
    const payload: CreateNodeRequest = {
      name: createForm.name.trim(),
      region: createForm.region.trim() || undefined,
      country: createForm.country.trim() || undefined,
      isp: createForm.isp.trim() || undefined,
      status: createForm.status !== '__unset__' ? createForm.status : undefined,
      tags: createForm.tags.length ? createForm.tags : undefined,
      capacity_mbps: toOptionalNumber(createForm.capacity_mbps),
      description: createForm.description.trim() || undefined,
      access_address: createForm.access_address.trim() || undefined,
      control_endpoint: createForm.control_endpoint.trim(),
      control_token: createForm.control_token.trim() || undefined,
      control_access_key: createForm.control_access_key.trim() || undefined,
      control_secret_key: createForm.control_secret_key.trim() || undefined,
      status_sync_enabled: createForm.status_sync_enabled,
    };
    const response = await adminApi.createAdminNode(payload);
    actionMessage.value = `节点 ${response.node.name} 已创建。`;
    closeCreateModal();
    await loadNodes();
    selectedNode.value = nodes.value.find((node) => node.id === response.node.id) ?? null;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '创建节点失败';
  } finally {
    isSaving.value = false;
  }
}

async function handleUpdate() {
  if (!selectedNode.value) {
    return;
  }

  clearMessages();
  if (!editForm.name.trim()) {
    actionError.value = '节点名称不能为空';
    return;
  }
  isSaving.value = true;

  try {
    const controlToken = editForm.control_token.trim();
    const payload: UpdateNodeRequest = {
      name: editForm.name.trim() || undefined,
      region: editForm.region.trim() || undefined,
      country: editForm.country.trim() || undefined,
      isp: editForm.isp.trim() || undefined,
      tags: editForm.tags,
      capacity_mbps: toOptionalNumber(editForm.capacity_mbps),
      description: editForm.description.trim() || undefined,
      access_address: editForm.access_address.trim() || undefined,
      control_endpoint: editForm.control_endpoint.trim() || undefined,
      control_token: controlToken || undefined,
      control_access_key: editForm.control_access_key.trim() || undefined,
      control_secret_key: editForm.control_secret_key.trim() || undefined,
      status_sync_enabled: editForm.status_sync_enabled,
    };
    const response = await adminApi.updateAdminNode(selectedNode.value.id, payload);
    actionMessage.value = `节点 ${response.node.name} 已更新。`;
    closeEditModal();
    await loadNodes();
    selectedNode.value = nodes.value.find((node) => node.id === response.node.id) ?? null;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '更新节点失败';
  } finally {
    isSaving.value = false;
  }
}

async function handleDisable() {
  if (!selectedNode.value) {
    return;
  }

  clearMessages();
  isSaving.value = true;

  try {
    const response = await adminApi.disableAdminNode(selectedNode.value.id);
    actionMessage.value = `节点 ${response.node.name} 已禁用。`;
    closeDisableModal();
    await loadNodes();
    selectedNode.value = nodes.value.find((node) => node.id === response.node.id) ?? null;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '禁用节点失败';
  } finally {
    isSaving.value = false;
  }
}

async function handleDelete() {
  if (!selectedNode.value) {
    return;
  }

  clearMessages();
  isSaving.value = true;
  const nodeName = selectedNode.value.name;

  try {
    await adminApi.deleteAdminNode(selectedNode.value.id);
    actionMessage.value = `节点 ${nodeName} 已删除。`;
    closeDeleteModal();
    selectedNode.value = null;
    kernels.value = [];
    await loadNodes();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '删除节点失败';
  } finally {
    isSaving.value = false;
  }
}

async function loadKernels(node: NodeSummary) {
  kernels.value = [];
  kernelsLoading.value = true;
  kernelsError.value = '';

  try {
    const response = await adminApi.fetchAdminNodeKernels(node.id);
    kernels.value = response.kernels ?? [];
  } catch (error) {
    kernelsError.value = error instanceof Error ? error.message : '加载内核失败';
  } finally {
    kernelsLoading.value = false;
  }
}

async function selectNode(node: NodeSummary) {
  selectedNode.value = node;
  syncNotice.value = '';
  syncProtocol.value = '';
  syncingKernels.value = false;
  statusSyncNotice.value = '';
  statusSyncError.value = '';
  protocolStatusSyncNotice.value = '';
  protocolStatusSyncError.value = '';
  await loadKernels(node);
}

function updateNodeStatus(nodeId: number, nextStatus: number) {
  const nodeIndex = nodes.value.findIndex((item) => item.id === nodeId);
  if (nodeIndex !== -1) {
    nodes.value[nodeIndex].status = nextStatus;
  }
  if (selectedNode.value?.id === nodeId) {
    selectedNode.value.status = nextStatus;
  }
}

async function syncKernels() {
  if (!selectedNode.value || syncingKernels.value) {
    return;
  }

  const node = selectedNode.value;
  syncingKernels.value = true;
  kernelsError.value = '';
  syncNotice.value = '';
  const protocol = syncProtocol.value.trim();

  try {
    const response = await adminApi.syncNodeKernels(node.id, protocol ? { protocol } : undefined);
    const syncedAt = response.synced_at ?? Math.floor(Date.now() / 1000);
    syncNotice.value = response.message?.trim() || (protocol ? `已同步 ${protocol} 内核。` : '内核已成功同步。');

    const nodeIndex = nodes.value.findIndex(n => n.id === node.id);
    if (nodeIndex !== -1) {
      nodes.value[nodeIndex].last_synced_at = syncedAt;
    }
    if (selectedNode.value?.id === node.id) {
      selectedNode.value.last_synced_at = syncedAt;
    }

    await loadKernels(node);

    setTimeout(() => {
      syncNotice.value = '';
    }, 3000);
  } catch (error) {
    kernelsError.value = error instanceof Error ? error.message : '同步内核失败';
  } finally {
    syncingKernels.value = false;
  }
}

async function syncNodeStatus() {
  if (!selectedNode.value || statusSyncing.value) {
    return;
  }

  statusSyncing.value = true;
  statusSyncNotice.value = '';
  statusSyncError.value = '';

  try {
    const response = await adminApi.syncAdminNodeStatus({ node_ids: [selectedNode.value.id] });
    const result = response.results?.find(item => item.node_id === selectedNode.value?.id);
    if (!result) {
      statusSyncError.value = '未返回节点状态同步结果。';
      return;
    }
    if (result.status === 4) {
      statusSyncError.value = result.message || '节点状态同步失败。';
      return;
    }
    if (result.status === 3) {
      statusSyncNotice.value = result.message || '节点已禁用，已跳过同步。';
      setTimeout(() => {
        statusSyncNotice.value = '';
      }, 3000);
      return;
    }
    if (result.status === 1 || result.status === 2) {
      updateNodeStatus(selectedNode.value.id, result.status);
    }
    statusSyncNotice.value = result.message || '节点状态已同步。';
    setTimeout(() => {
      statusSyncNotice.value = '';
    }, 3000);
  } catch (error) {
    statusSyncError.value = error instanceof Error ? error.message : '节点状态同步失败。';
  } finally {
    statusSyncing.value = false;
  }
}

async function syncProtocolStatus() {
  if (!selectedNode.value || protocolStatusSyncing.value) {
    return;
  }

  protocolStatusSyncing.value = true;
  protocolStatusSyncNotice.value = '';
  protocolStatusSyncError.value = '';

  try {
    const response = await adminApi.syncAdminProtocolBindingsStatus({
      node_ids: [selectedNode.value.id],
    });
    const result = response.results?.find(item => item.node_id === selectedNode.value?.id);
    if (!result) {
      protocolStatusSyncError.value = '未返回协议健康同步结果。';
      return;
    }
    if (result.status === 2) {
      protocolStatusSyncError.value = result.message || '协议健康同步失败。';
      return;
    }
    if (result.status === 3) {
      protocolStatusSyncNotice.value = result.message || '节点已禁用，已跳过同步。';
      setTimeout(() => {
        protocolStatusSyncNotice.value = '';
      }, 3000);
      return;
    }
    const updated = typeof result.updated === 'number' ? result.updated : 0;
    protocolStatusSyncNotice.value = result.message || `协议健康已同步，更新 ${updated} 条。`;
    setTimeout(() => {
      protocolStatusSyncNotice.value = '';
    }, 3000);
  } catch (error) {
    protocolStatusSyncError.value = error instanceof Error ? error.message : '协议健康同步失败。';
  } finally {
    protocolStatusSyncing.value = false;
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
        <p class="page__eyebrow">节点</p>
        <h3 class="page-section__title">节点管理</h3>
        <p class="page__subtitle">监控容量、状态与内核同步。</p>
      </div>
      <div class="page-section__actions">
        <Button type="button" @click="openCreateModal">新建节点</Button>
        <Button variant="secondary" type="button" @click="loadNodes" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新列表' }}
        </Button>
      </div>
    </header>

    <form class="form-grid" @submit.prevent="loadNodes">
      <div class="stack stack--tight">
        <Label>搜索</Label>
        <Input v-model="filters.q" type="search" placeholder="节点名称或区域" />
      </div>
      <div class="stack stack--tight">
        <Label>状态</Label>
        <Select v-model="filters.status">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem :value="1">在线</SelectItem>
            <SelectItem :value="2">离线</SelectItem>
            <SelectItem :value="3">维护</SelectItem>
            <SelectItem :value="4">已禁用</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>协议</Label>
        <Input v-model="filters.protocol" type="text" placeholder="例如 vless" />
      </div>
      <div class="stack stack--tight">
        <Label>排序</Label>
        <Select v-model="filters.sort">
          <SelectTrigger>
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_synced_at">最近同步</SelectItem>
            <SelectItem value="name">名称</SelectItem>
            <SelectItem value="region">区域</SelectItem>
            <SelectItem value="capacity_mbps">容量</SelectItem>
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
          <CardTitle>节点列表</CardTitle>
          <p class="panel-card__meta">共 {{ nodes.length }} 个节点</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载节点...</p>
          <p v-else-if="nodes.length === 0" class="panel-card__empty">暂无节点。</p>
          <ul v-else class="data-list">
            <li
              v-for="node in nodes"
              :key="node.id"
              :class="['data-row', 'data-row--stack', { 'data-row--selected': selectedNode?.id === node.id }]"
            >
              <div>
                <p class="data-row__title">{{ node.name }}</p>
                <p class="data-row__meta">
                  {{ node.region || '未知区域' }} ·
                  {{ node.isp || '未知运营商' }}
                </p>
                <p class="data-row__meta">容量 {{ node.capacity_mbps ?? '-' }} Mbps</p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="nodeStatusVariant(node.status)">{{ nodeStatusLabel(node.status) }}</Badge>
                <span class="data-row__meta">{{ formatDateTime(node.last_synced_at) }}</span>
                <Button variant="ghost" size="sm" type="button" @click="selectNode(node)">
                  详情
                </Button>
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
        <CardHeader class="cluster cluster--between cluster--start cluster--wide">
          <div>
            <CardTitle>节点详情</CardTitle>
            <p class="panel-card__meta">
              {{ selectedNode ? selectedNode.name : '请选择节点' }}
            </p>
          </div>
          <div v-if="selectedNode" class="page-section__actions">
            <Button variant="secondary" type="button" :disabled="isSaving" @click="openEditModal(selectedNode)">
              编辑
            </Button>
            <Button
              variant="destructive"
              type="button"
              :disabled="isSaving || selectedNode.status === 4"
              @click="openDisableModal(selectedNode)"
            >
              {{ selectedNode.status === 4 ? '已禁用' : '禁用' }}
            </Button>
            <Button
              variant="destructive"
              type="button"
              :disabled="isSaving"
              @click="openDeleteModal(selectedNode)"
            >
              删除
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p v-if="!selectedNode" class="panel-card__empty">请先选择节点查看详情。</p>
          <div v-else>
            <div class="detail-grid">
              <div>
                <p class="detail-label">区域</p>
                <p class="detail-value">{{ selectedNode.region || '-' }}</p>
              </div>
              <div>
                <p class="detail-label">国家</p>
                <p class="detail-value">{{ selectedNode.country || '-' }}</p>
              </div>
              <div>
                <p class="detail-label">运营商</p>
                <p class="detail-value">{{ selectedNode.isp || '-' }}</p>
              </div>
              <div>
                <p class="detail-label">访问地址</p>
                <p class="detail-value">{{ selectedNode.access_address || '-' }}</p>
              </div>
              <div>
                <p class="detail-label">控制面</p>
                <p class="detail-value">{{ selectedNode.control_endpoint || '-' }}</p>
              </div>
              <div>
                <p class="detail-label">状态同步</p>
                <p class="detail-value">{{ statusSyncLabel(selectedNode.status_sync_enabled) }}</p>
              </div>
              <div>
                <p class="detail-label">状态</p>
                <p class="detail-value">{{ nodeStatusLabel(selectedNode.status) }}</p>
              </div>
              <div>
                <p class="detail-label">最近同步</p>
                <p class="detail-value">{{ formatDateTime(selectedNode.last_synced_at) }}</p>
              </div>
              <div>
                <p class="detail-label">最近更新</p>
                <p class="detail-value">{{ formatDateTime(selectedNode.updated_at) }}</p>
              </div>
            </div>
            <p class="detail-label">描述</p>
            <p class="detail-value">{{ selectedNode.description || '暂无描述。' }}</p>

            <div v-if="selectedNode.tags?.length" class="detail-section">
              <p class="detail-label">标签</p>
              <div class="cluster">
                <Badge v-for="tag in selectedNode.tags" :key="tag" variant="secondary">{{ tag }}</Badge>
              </div>
            </div>

            <div class="detail-section">
              <h4>节点同步</h4>
              <p class="text-sm text-muted-foreground">手动触发节点状态与协议健康同步。</p>
              <div class="cluster cluster--tight">
                <Button
                  variant="secondary"
                  type="button"
                  :disabled="statusSyncing"
                  @click="syncNodeStatus"
                >
                  {{ statusSyncing ? '同步中...' : '同步节点状态' }}
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  :disabled="protocolStatusSyncing"
                  @click="syncProtocolStatus"
                >
                  {{ protocolStatusSyncing ? '同步中...' : '同步协议健康' }}
                </Button>
              </div>
              <Alert
                v-if="statusSyncNotice"
                class="border-emerald-200 bg-emerald-50 text-emerald-800"
              >
                <AlertTitle>节点状态已同步</AlertTitle>
                <AlertDescription>{{ statusSyncNotice }}</AlertDescription>
              </Alert>
              <Alert v-if="statusSyncError" variant="destructive">
                <AlertTitle>节点状态同步失败</AlertTitle>
                <AlertDescription>{{ statusSyncError }}</AlertDescription>
              </Alert>
              <Alert
                v-if="protocolStatusSyncNotice"
                class="border-emerald-200 bg-emerald-50 text-emerald-800"
              >
                <AlertTitle>协议健康已同步</AlertTitle>
                <AlertDescription>{{ protocolStatusSyncNotice }}</AlertDescription>
              </Alert>
              <Alert v-if="protocolStatusSyncError" variant="destructive">
                <AlertTitle>协议健康同步失败</AlertTitle>
                <AlertDescription>{{ protocolStatusSyncError }}</AlertDescription>
              </Alert>
            </div>

            <div class="detail-section">
              <h4>内核状态</h4>
              <div class="cluster cluster--tight">
                <Input
                  v-model="syncProtocol"
                  type="text"
                  placeholder="协议（留空同步全部）"
                />
                <Button type="button" @click="syncKernels" :disabled="syncingKernels">
                  {{ syncingKernels ? '同步中...' : '同步内核' }}
                </Button>
              </div>
              <Alert v-if="syncNotice" class="border-emerald-200 bg-emerald-50 text-emerald-800">
                <AlertTitle>同步完成</AlertTitle>
                <AlertDescription>{{ syncNotice }}</AlertDescription>
              </Alert>
              <div v-if="kernelsLoading || syncingKernels" class="panel-card__empty">
                {{ syncingKernels ? '正在同步内核...' : '正在加载内核...' }}
              </div>
              <div v-else-if="kernelsError" class="panel-card__empty">{{ kernelsError }}</div>
              <div v-else-if="kernels.length === 0" class="panel-card__empty">暂无内核数据。</div>
              <ul v-else class="data-list data-list--compact">
                <li v-for="kernel in kernels" :key="kernel.protocol" class="data-row">
                  <div>
                    <p class="data-row__title">{{ kernel.protocol }}</p>
                    <p class="data-row__meta">{{ kernel.endpoint || '暂无入口' }}</p>
                  </div>
                  <div class="data-row__aside">
                    <Badge :variant="kernelStatusVariant(kernel.status)">
                      {{ kernelStatusLabel(kernel.status) }}
                    </Badge>
                    <span class="data-row__meta">{{ formatDateTime(kernel.last_synced_at) }}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Dialog v-model:open="showCreateModal">
      <DialogContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle>新建节点</DialogTitle>
          <DialogDescription>录入节点基础信息与协议能力。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="create-node-name">节点名称</Label>
              <Input id="create-node-name" v-model="createForm.name" type="text" placeholder="节点名称" />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="create-node-region">区域</Label>
              <Input id="create-node-region" v-model="createForm.region" type="text" placeholder="区域" />
            </div>
            <div class="stack stack--tight">
              <Label for="create-node-country">国家</Label>
              <Input id="create-node-country" v-model="createForm.country" type="text" placeholder="国家" />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="create-node-isp">运营商</Label>
              <Input id="create-node-isp" v-model="createForm.isp" type="text" placeholder="运营商" />
            </div>
            <div class="stack stack--tight">
              <Label for="create-node-capacity">容量 (Mbps)</Label>
              <Input
                id="create-node-capacity"
                v-model.number="createForm.capacity_mbps"
                type="number"
                min="0"
                placeholder="1000"
              />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="create-node-access-address">访问地址</Label>
              <Input
                id="create-node-access-address"
                v-model="createForm.access_address"
                type="text"
                placeholder="node.example.com"
              />
            </div>
            <div class="stack stack--tight">
              <Label for="create-node-control-endpoint">控制面地址 *</Label>
              <Input
                id="create-node-control-endpoint"
                v-model="createForm.control_endpoint"
                type="text"
                placeholder="https://kernel.example.com/api"
              />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="create-node-status">节点状态</Label>
              <Select v-model="createForm.status">
                <SelectTrigger id="create-node-status">
                  <SelectValue placeholder="默认" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__">默认（由系统维护）</SelectItem>
                  <SelectItem :value="1">在线</SelectItem>
                  <SelectItem :value="3">维护</SelectItem>
                  <SelectItem :value="4">已禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="stack stack--tight">
              <Label>自动状态同步</Label>
              <div class="cluster cluster--between">
                <p class="text-xs text-muted-foreground">
                  启用后按配置周期拉取 /v1/status。
                </p>
                <Switch v-model="createForm.status_sync_enabled" />
              </div>
            </div>
          </div>

          <div class="stack stack--tight">
            <Label for="create-node-control-token">控制面 Token</Label>
            <Input
              id="create-node-control-token"
              v-model="createForm.control_token"
              type="password"
              placeholder="可选，留空则不设置"
            />
            <p class="text-xs text-muted-foreground">
              支持 Bearer/Basic 前缀，无前缀默认 Bearer。
            </p>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="create-node-ak">控制面 AK</Label>
              <Input
                id="create-node-ak"
                v-model="createForm.control_access_key"
                type="text"
                placeholder="control access key"
              />
            </div>
            <div class="stack stack--tight">
              <Label for="create-node-sk">控制面 SK</Label>
              <Input
                id="create-node-sk"
                v-model="createForm.control_secret_key"
                type="password"
                placeholder="control secret key"
              />
            </div>
          </div>
          <p class="text-xs text-muted-foreground">
            AK/SK 优先于 Token，二者留空则不设置鉴权。
          </p>

          <div class="stack stack--tight">
            <Label for="create-node-description">描述</Label>
            <Textarea
              id="create-node-description"
              v-model="createForm.description"
              rows="2"
              placeholder="节点描述"
            />
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
            <div v-if="createForm.tags.length" class="cluster">
              <Badge v-for="tag in createForm.tags" :key="tag" variant="secondary" class="inline-gap">
                {{ tag }}
                <Button variant="ghost" size="icon-sm" type="button" @click="removeTag(tag)">×</Button>
              </Badge>
            </div>
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeCreateModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreate">
            {{ isSaving ? '创建中...' : '创建节点' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditModal">
      <DialogContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle>编辑节点</DialogTitle>
          <DialogDescription>更新节点状态、标签与协议配置。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="edit-node-name">节点名称</Label>
              <Input id="edit-node-name" v-model="editForm.name" type="text" placeholder="节点名称" />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="edit-node-region">区域</Label>
              <Input id="edit-node-region" v-model="editForm.region" type="text" placeholder="区域" />
            </div>
            <div class="stack stack--tight">
              <Label for="edit-node-country">国家</Label>
              <Input id="edit-node-country" v-model="editForm.country" type="text" placeholder="国家" />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="edit-node-isp">运营商</Label>
              <Input id="edit-node-isp" v-model="editForm.isp" type="text" placeholder="运营商" />
            </div>
            <div class="stack stack--tight">
              <Label for="edit-node-capacity">容量 (Mbps)</Label>
              <Input
                id="edit-node-capacity"
                v-model.number="editForm.capacity_mbps"
                type="number"
                min="0"
                placeholder="1000"
              />
            </div>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="edit-node-access-address">访问地址</Label>
              <Input
                id="edit-node-access-address"
                v-model="editForm.access_address"
                type="text"
                placeholder="node.example.com"
              />
            </div>
            <div class="stack stack--tight">
              <Label for="edit-node-control-endpoint">控制面地址</Label>
              <Input
                id="edit-node-control-endpoint"
                v-model="editForm.control_endpoint"
                type="text"
                placeholder="https://kernel.example.com/api"
              />
            </div>
          </div>

          <div class="stack stack--tight">
            <Label for="edit-node-control-token">控制面 Token</Label>
            <Input
              id="edit-node-control-token"
              v-model="editForm.control_token"
              type="password"
              placeholder="留空不修改"
            />
            <p class="text-xs text-muted-foreground">
              支持 Bearer/Basic 前缀，无前缀默认 Bearer。
            </p>
          </div>

          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="edit-node-ak">控制面 AK</Label>
              <Input
                id="edit-node-ak"
                v-model="editForm.control_access_key"
                type="text"
                placeholder="留空不修改"
              />
            </div>
            <div class="stack stack--tight">
              <Label for="edit-node-sk">控制面 SK</Label>
              <Input
                id="edit-node-sk"
                v-model="editForm.control_secret_key"
                type="password"
                placeholder="留空不修改"
              />
            </div>
          </div>
          <p class="text-xs text-muted-foreground">
            AK/SK 优先于 Token，留空表示不修改鉴权配置。
          </p>
          <div class="stack stack--tight">
            <div class="cluster cluster--between">
              <div>
                <Label>自动状态同步</Label>
                <p class="text-xs text-muted-foreground">
                  关闭后不再自动同步节点 online/offline。
                </p>
              </div>
              <Switch v-model="editForm.status_sync_enabled" />
            </div>
          </div>

          <div class="stack stack--tight">
            <Label for="edit-node-description">描述</Label>
            <Textarea
              id="edit-node-description"
              v-model="editForm.description"
              rows="2"
              placeholder="节点描述"
            />
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
            <div v-if="editForm.tags.length" class="cluster">
              <Badge v-for="tag in editForm.tags" :key="tag" variant="secondary" class="inline-gap">
                {{ tag }}
                <Button variant="ghost" size="icon-sm" type="button" @click="removeEditTag(tag)">×</Button>
              </Badge>
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

    <Dialog v-model:open="showDisableModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>禁用节点</DialogTitle>
          <DialogDescription>
            确认禁用 {{ selectedNode?.name || '该节点' }} 吗？禁用后节点将从可用列表下线。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeDisableModal">取消</Button>
          <Button variant="destructive" type="button" :disabled="isSaving" @click="handleDisable">
            {{ isSaving ? '处理中...' : '确认禁用' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDeleteModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除节点</DialogTitle>
          <DialogDescription>
            确认删除 {{ selectedNode?.name || '该节点' }} 吗？此操作不可撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeDeleteModal">取消</Button>
          <Button variant="destructive" type="button" :disabled="isSaving" @click="handleDelete">
            {{ isSaving ? '处理中...' : '确认删除' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
