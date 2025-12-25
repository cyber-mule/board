<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function statusVariant(value?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 'active':
    case 'online':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'offline':
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function statusLabel(value?: string) {
  switch (value) {
    case 'active':
    case 'online':
      return '在线';
    case 'pending':
      return '待机';
    case 'offline':
      return '离线';
    case 'failed':
      return '失败';
    default:
      return value || '未知';
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
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      protocol: filters.protocol || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    nodes.value = response.nodes ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
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
    kernelsError.value = error instanceof Error ? error.message : '加载内核失败';
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

    const nodeIndex = nodes.value.findIndex(n => n.id === selectedNode.value?.id);
    if (nodeIndex !== -1) {
      nodes.value[nodeIndex].last_synced_at = Math.floor(Date.now() / 1000);
    }

    setTimeout(() => {
      syncSuccess.value = false;
    }, 3000);
  } catch (error) {
    kernelsError.value = error instanceof Error ? error.message : '同步内核失败';
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
        <p class="page__eyebrow">节点</p>
        <h3 class="page-section__title">节点管理</h3>
        <p class="page__subtitle">监控容量、状态与内核同步。</p>
      </div>
      <div class="page-section__actions">
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
            <SelectItem value="active">在线</SelectItem>
            <SelectItem value="offline">离线</SelectItem>
            <SelectItem value="pending">待机</SelectItem>
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
                  {{ node.protocols?.join(', ') || '暂无协议' }}
                </p>
                <p class="data-row__meta">容量 {{ node.capacity_mbps ?? '-' }} Mbps</p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="statusVariant(node.status)">{{ statusLabel(node.status) }}</Badge>
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
            <Button type="button" @click="syncKernels" :disabled="syncingKernels">
              {{ syncingKernels ? '同步中...' : '同步内核' }}
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
                <p class="detail-label">状态</p>
                <p class="detail-value">{{ statusLabel(selectedNode.status) }}</p>
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

            <div class="detail-section">
              <h4>内核状态</h4>
              <Alert v-if="syncSuccess" class="border-emerald-200 bg-emerald-50 text-emerald-800">
                <AlertTitle>同步完成</AlertTitle>
                <AlertDescription>内核已成功同步。</AlertDescription>
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
                    <Badge :variant="statusVariant(kernel.status)">{{ statusLabel(kernel.status) }}</Badge>
                    <span class="data-row__meta">{{ formatDateTime(kernel.last_synced_at) }}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

