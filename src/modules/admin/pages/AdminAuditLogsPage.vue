<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminApi } from '../../../api';
import { formatDateTime } from '../../../utils/format';
import type { AuditLogSummary, PaginationMeta } from '../../../api/types';

const logs = ref<AuditLogSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');

const perPage = 20;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  actor_id: '',
  action: '',
  resource_type: '',
  resource_id: '',
  since: '',
  until: '',
});

const hasNextPage = computed(() => pagination.value?.has_next ?? false);

function normalizeNumber(value: string): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.floor(parsed);
}

async function loadLogs(reset = true) {
  if (reset) {
    loading.value = true;
    page.value = 1;
  } else {
    isLoadingMore.value = true;
  }

  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminAuditLogs({
      page: page.value,
      per_page: perPage,
      actor_id: normalizeNumber(filters.actor_id),
      action: filters.action.trim() || undefined,
      resource_type: filters.resource_type.trim() || undefined,
      resource_id: filters.resource_id.trim() || undefined,
      since: normalizeNumber(filters.since),
      until: normalizeNumber(filters.until),
    });

    if (reset) {
      logs.value = response.logs ?? [];
    } else {
      logs.value = [...logs.value, ...(response.logs ?? [])];
    }
    pagination.value = response.pagination ?? null;
  } catch (error) {
    errorMessage.value = '审计日志加载失败，请稍后重试。';
  } finally {
    loading.value = false;
    isLoadingMore.value = false;
  }
}

async function loadMore() {
  if (!hasNextPage.value || isLoadingMore.value) return;
  page.value += 1;
  await loadLogs(false);
}

onMounted(() => {
  void loadLogs(true);
});
</script>

<template>
  <section class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">合规</p>
        <h3 class="page-section__title">审计日志</h3>
        <p class="page__subtitle">追踪管理端关键操作与变更。</p>
      </div>
      <div class="page-section__actions">
        <Button type="button" variant="secondary" @click="loadLogs(true)" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新' }}
        </Button>
      </div>
    </header>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <Card class="panel-card--full">
      <CardHeader>
        <CardTitle>日志筛选</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="form-grid">
          <div>
            <Label for="audit-actor-id">操作人 ID</Label>
            <Input id="audit-actor-id" v-model="filters.actor_id" placeholder="管理员 ID" />
          </div>
          <div>
            <Label for="audit-action">动作</Label>
            <Input id="audit-action" v-model="filters.action" placeholder="plan.update" />
          </div>
          <div>
            <Label for="audit-resource-type">资源类型</Label>
            <Input id="audit-resource-type" v-model="filters.resource_type" placeholder="plan / order" />
          </div>
          <div>
            <Label for="audit-resource-id">资源 ID</Label>
            <Input id="audit-resource-id" v-model="filters.resource_id" placeholder="资源标识" />
          </div>
          <div>
            <Label for="audit-since">开始时间（Unix 秒）</Label>
            <Input id="audit-since" v-model="filters.since" placeholder="1710000000" />
          </div>
          <div>
            <Label for="audit-until">结束时间（Unix 秒）</Label>
            <Input id="audit-until" v-model="filters.until" placeholder="1711000000" />
          </div>
        </div>
        <div class="panel-card__footer">
          <Button type="button" variant="secondary" @click="loadLogs(true)">应用筛选</Button>
        </div>
      </CardContent>
    </Card>

    <Card class="panel-card--full">
      <CardHeader>
        <CardTitle>日志列表</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>操作人</TableHead>
              <TableHead>动作</TableHead>
              <TableHead>资源</TableHead>
              <TableHead>来源 IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="log in logs" :key="log.id">
              <TableCell>{{ formatDateTime(log.created_at) }}</TableCell>
              <TableCell>
                <p>{{ log.actor_email || log.actor_id || '-' }}</p>
                <p class="text-xs text-muted-foreground">{{ (log.actor_roles || []).join(', ') }}</p>
              </TableCell>
              <TableCell>{{ log.action }}</TableCell>
              <TableCell>{{ log.resource_type }} / {{ log.resource_id }}</TableCell>
              <TableCell>{{ log.source_ip || '-' }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div v-if="!logs.length && !loading" class="panel-card__empty">
          暂无日志。
        </div>

        <div class="panel-card__footer" v-if="pagination">
          <p class="panel-card__meta">已显示 {{ logs.length }} / {{ pagination.total_count }}</p>
          <Button type="button" variant="secondary" @click="loadMore" :disabled="!hasNextPage || isLoadingMore">
            {{ isLoadingMore ? '加载中...' : hasNextPage ? '加载更多' : '没有更多了' }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
