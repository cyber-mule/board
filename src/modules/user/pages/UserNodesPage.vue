<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { userApi } from '../../../api';
import { formatDateTime } from '../../../utils/format';
import type { PaginationMeta, UserNodeStatusSummary } from '../../../api/types';

const nodes = ref<UserNodeStatusSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');

const perPage = 20;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  status: '__all__' as number | string,
  protocol: '__all__',
});

const hasNextPage = computed(() => pagination.value?.has_next ?? false);

function statusVariant(value?: number): 'default' | 'secondary' | 'destructive' | 'outline' {
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

function statusLabel(value?: number) {
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

async function loadNodes(reset = true) {
  if (reset) {
    loading.value = true;
    page.value = 1;
  } else {
    isLoadingMore.value = true;
  }

  errorMessage.value = '';

  try {
    const response = await userApi.fetchUserNodes({
      page: page.value,
      per_page: perPage,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      protocol: filters.protocol && filters.protocol !== '__all__' ? filters.protocol : undefined,
    });

    if (reset) {
      nodes.value = response.nodes ?? [];
    } else {
      nodes.value = [...nodes.value, ...(response.nodes ?? [])];
    }
    pagination.value = response.pagination ?? null;
  } catch (error) {
    errorMessage.value = '节点状态加载失败，请稍后重试。';
  } finally {
    loading.value = false;
    isLoadingMore.value = false;
  }
}

async function loadMore() {
  if (!hasNextPage.value || isLoadingMore.value) return;
  page.value += 1;
  await loadNodes(false);
}

onMounted(() => {
  void loadNodes(true);
});
</script>

<template>
  <section class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">节点</p>
        <h3 class="page-section__title">节点状态</h3>
        <p class="page__subtitle">查看订阅可用节点与协议健康度。</p>
      </div>
      <div class="page-section__actions">
        <Button type="button" variant="secondary" @click="loadNodes(true)" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新' }}
        </Button>
      </div>
    </header>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <Card class="panel-card--full">
      <CardHeader class="cluster cluster--between cluster--center">
        <div>
          <CardTitle>节点列表</CardTitle>
          <p class="panel-card__meta">/user/nodes</p>
        </div>
        <div class="cluster cluster--gap">
          <Select v-model="filters.status">
            <SelectTrigger class="w-36">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              <SelectItem :value="1">在线</SelectItem>
              <SelectItem :value="2">离线</SelectItem>
              <SelectItem :value="3">维护</SelectItem>
              <SelectItem :value="4">已禁用</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="filters.protocol">
            <SelectTrigger class="w-36">
              <SelectValue placeholder="协议" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              <SelectItem value="vless">VLESS</SelectItem>
              <SelectItem value="vmess">VMess</SelectItem>
              <SelectItem value="trojan">Trojan</SelectItem>
              <SelectItem value="ss">Shadowsocks</SelectItem>
              <SelectItem value="hysteria">Hysteria</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="secondary" @click="loadNodes(true)">筛选</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>节点</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>协议健康</TableHead>
              <TableHead>最近同步</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="node in nodes" :key="node.id">
              <TableCell>
                <p class="font-medium">{{ node.name }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ node.region || node.country || '-' }}
                </p>
              </TableCell>
              <TableCell>
                <Badge :variant="statusVariant(node.status)">{{ statusLabel(node.status) }}</Badge>
              </TableCell>
              <TableCell>
                <div class="cluster cluster--gap cluster--wrap">
                  <Badge
                    v-for="item in node.protocol_statuses || []"
                    :key="`${node.id}-${item.binding_id}`"
                    variant="secondary"
                  >
                    {{ item.protocol }} · {{ item.health_status || item.status }}
                  </Badge>
                  <span v-if="!node.protocol_statuses?.length" class="text-xs text-muted-foreground">无协议</span>
                </div>
              </TableCell>
              <TableCell>{{ formatDateTime(node.last_synced_at) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div v-if="!nodes.length && !loading" class="panel-card__empty">
          暂无节点数据。
        </div>

        <div class="panel-card__footer" v-if="pagination">
          <p class="panel-card__meta">已显示 {{ nodes.length }} / {{ pagination.total_count }}</p>
          <Button type="button" variant="secondary" @click="loadMore" :disabled="!hasNextPage || isLoadingMore">
            {{ isLoadingMore ? '加载中...' : hasNextPage ? '加载更多' : '没有更多了' }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
