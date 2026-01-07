<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { adminApi } from '../../../api';
import { formatDateTime } from '../../../utils/format';
import type {
  CreateProtocolBindingRequest,
  CreateProtocolEntryRequest,
  PaginationMeta,
  ProtocolBindingSummary,
  ProtocolEntrySummary,
  UpdateProtocolBindingRequest,
  UpdateProtocolEntryRequest,
} from '../../../api/types';

type ProtocolTab = 'bindings' | 'entries';

const activeTab = ref<ProtocolTab>('bindings');

const bindings = ref<ProtocolBindingSummary[]>([]);
const bindingsLoading = ref(true);
const bindingsLoadingMore = ref(false);
const bindingsError = ref('');
const bindingsPage = ref(1);
const bindingsPagination = ref<PaginationMeta | null>(null);

const entries = ref<ProtocolEntrySummary[]>([]);
const entriesLoading = ref(true);
const entriesLoadingMore = ref(false);
const entriesError = ref('');
const entriesPage = ref(1);
const entriesPagination = ref<PaginationMeta | null>(null);

const actionMessage = ref('');
const actionError = ref('');
const isSaving = ref(false);
const syncingBinding = ref(false);

const bindingFilters = reactive({
  q: '',
  protocol: '',
  status: '',
  node_id: '',
});

const entryFilters = reactive({
  q: '',
  protocol: '',
  status: '',
  binding_id: '',
});

const showCreateBindingModal = ref(false);
const showEditBindingModal = ref(false);
const showDeleteBindingModal = ref(false);

const showCreateEntryModal = ref(false);
const showEditEntryModal = ref(false);
const showDeleteEntryModal = ref(false);

const selectedBinding = ref<ProtocolBindingSummary | null>(null);
const selectedEntry = ref<ProtocolEntrySummary | null>(null);

const createBindingForm = reactive<{
  name: string;
  node_id: number | null;
  protocol: string;
  role: string;
  listen: string;
  connect: string;
  access_port: number | null;
  status: string;
  kernel_id: string;
  tags: string;
  description: string;
  profile: string;
}>({
  name: '',
  node_id: null,
  protocol: '',
  role: 'listener',
  listen: '',
  connect: '',
  access_port: null,
  status: 'active',
  kernel_id: '',
  tags: '',
  description: '',
  profile: '{\n  \n}',
});

const editBindingForm = reactive<{
  name: string;
  node_id: number | null;
  protocol: string;
  role: string;
  listen: string;
  connect: string;
  access_port: number | null;
  status: string;
  kernel_id: string;
  tags: string;
  description: string;
  profile: string;
}>({
  name: '',
  node_id: null,
  protocol: '',
  role: 'listener',
  listen: '',
  connect: '',
  access_port: null,
  status: 'active',
  kernel_id: '',
  tags: '',
  description: '',
  profile: '{\n  \n}',
});

const createEntryForm = reactive<{
  name: string;
  binding_id: number | null;
  entry_address: string;
  entry_port: number | null;
  protocol: string;
  status: string;
  tags: string;
  description: string;
  profile: string;
}>({
  name: '',
  binding_id: null,
  entry_address: '',
  entry_port: null,
  protocol: '',
  status: 'active',
  tags: '',
  description: '',
  profile: '{\n  \n}',
});

const editEntryForm = reactive<{
  name: string;
  binding_id: number | null;
  entry_address: string;
  entry_port: number | null;
  protocol: string;
  status: string;
  tags: string;
  description: string;
  profile: string;
}>({
  name: '',
  binding_id: null,
  entry_address: '',
  entry_port: null,
  protocol: '',
  status: 'active',
  tags: '',
  description: '',
  profile: '{\n  \n}',
});

const hasNextBindings = computed(() => bindingsPagination.value?.has_next ?? false);
const hasNextEntries = computed(() => entriesPagination.value?.has_next ?? false);

function statusVariant(value?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 'active':
    case 'online':
      return 'default';
    case 'pending':
    case 'maintenance':
      return 'secondary';
    case 'disabled':
    case 'offline':
      return 'destructive';
    default:
      return 'outline';
  }
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringifyTags(tags?: string[]): string {
  return (tags || []).join(', ');
}

function parseProfileRequired(value: string): Record<string, unknown> {
  if (!value.trim()) {
    actionError.value = 'Profile JSON 不能为空。';
    throw new Error('Missing profile');
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    actionError.value = 'Profile JSON 格式不正确。';
    throw error;
  }
}

function parseProfileOptional(value: string): Record<string, unknown> | undefined {
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch (error) {
    actionError.value = 'Profile JSON 格式不正确。';
    throw error;
  }
}

function formatProfile(value?: Record<string, unknown>): string {
  if (!value || Object.keys(value).length === 0) {
    return '{\n  \n}';
  }
  return JSON.stringify(value, null, 2);
}

async function loadBindings(reset = true) {
  if (reset) {
    bindingsLoading.value = true;
    bindingsPage.value = 1;
  } else {
    bindingsLoadingMore.value = true;
  }

  bindingsError.value = '';

  try {
    const response = await adminApi.fetchAdminProtocolBindings({
      page: bindingsPage.value,
      per_page: 20,
      q: bindingFilters.q.trim() || undefined,
      protocol: bindingFilters.protocol || undefined,
      status: bindingFilters.status || undefined,
      node_id: bindingFilters.node_id ? Number(bindingFilters.node_id) : undefined,
    });

    if (reset) {
      bindings.value = response.bindings ?? [];
    } else {
      bindings.value = [...bindings.value, ...(response.bindings ?? [])];
    }
    bindingsPagination.value = response.pagination ?? null;
  } catch (error) {
    bindingsError.value = '协议绑定加载失败。';
  } finally {
    bindingsLoading.value = false;
    bindingsLoadingMore.value = false;
  }
}

async function loadEntries(reset = true) {
  if (reset) {
    entriesLoading.value = true;
    entriesPage.value = 1;
  } else {
    entriesLoadingMore.value = true;
  }

  entriesError.value = '';

  try {
    const response = await adminApi.fetchAdminProtocolEntries({
      page: entriesPage.value,
      per_page: 20,
      q: entryFilters.q.trim() || undefined,
      protocol: entryFilters.protocol || undefined,
      status: entryFilters.status || undefined,
      binding_id: entryFilters.binding_id ? Number(entryFilters.binding_id) : undefined,
    });

    if (reset) {
      entries.value = response.entries ?? [];
    } else {
      entries.value = [...entries.value, ...(response.entries ?? [])];
    }
    entriesPagination.value = response.pagination ?? null;
  } catch (error) {
    entriesError.value = '协议发布加载失败。';
  } finally {
    entriesLoading.value = false;
    entriesLoadingMore.value = false;
  }
}

async function loadMoreBindings() {
  if (!hasNextBindings.value || bindingsLoadingMore.value) return;
  bindingsPage.value += 1;
  await loadBindings(false);
}

async function loadMoreEntries() {
  if (!hasNextEntries.value || entriesLoadingMore.value) return;
  entriesPage.value += 1;
  await loadEntries(false);
}

function openEditBinding(binding: ProtocolBindingSummary) {
  selectedBinding.value = binding;
  editBindingForm.name = binding.name || '';
  editBindingForm.node_id = binding.node_id ?? null;
  editBindingForm.protocol = binding.protocol || '';
  editBindingForm.role = binding.role || 'listener';
  editBindingForm.listen = binding.listen || '';
  editBindingForm.connect = binding.connect || '';
  editBindingForm.access_port = binding.access_port ?? null;
  editBindingForm.status = binding.status || 'active';
  editBindingForm.kernel_id = binding.kernel_id || '';
  editBindingForm.tags = stringifyTags(binding.tags);
  editBindingForm.description = binding.description || '';
  editBindingForm.profile = formatProfile(binding.profile);
  showEditBindingModal.value = true;
}

function openDeleteBinding(binding: ProtocolBindingSummary) {
  selectedBinding.value = binding;
  showDeleteBindingModal.value = true;
}

function openEditEntry(entry: ProtocolEntrySummary) {
  selectedEntry.value = entry;
  editEntryForm.name = entry.name || '';
  editEntryForm.binding_id = entry.binding_id;
  editEntryForm.entry_address = entry.entry_address;
  editEntryForm.entry_port = entry.entry_port;
  editEntryForm.protocol = entry.protocol || '';
  editEntryForm.status = entry.status || 'active';
  editEntryForm.tags = stringifyTags(entry.tags);
  editEntryForm.description = entry.description || '';
  editEntryForm.profile = formatProfile(entry.profile);
  showEditEntryModal.value = true;
}

function openDeleteEntry(entry: ProtocolEntrySummary) {
  selectedEntry.value = entry;
  showDeleteEntryModal.value = true;
}

async function handleCreateBinding() {
  actionMessage.value = '';
  actionError.value = '';
  isSaving.value = true;

  try {
    const payload: CreateProtocolBindingRequest = {
      name: createBindingForm.name.trim() || undefined,
      node_id: createBindingForm.node_id || 0,
      protocol: createBindingForm.protocol.trim(),
      role: createBindingForm.role,
      listen: createBindingForm.listen.trim() || undefined,
      connect: createBindingForm.connect.trim() || undefined,
      access_port: createBindingForm.access_port ?? undefined,
      status: createBindingForm.status || undefined,
      kernel_id: createBindingForm.kernel_id.trim(),
      tags: parseTags(createBindingForm.tags),
      description: createBindingForm.description.trim() || undefined,
      profile: parseProfileRequired(createBindingForm.profile),
    };

    if (!payload.node_id || !payload.protocol || !payload.kernel_id) {
      actionError.value = '请补充节点、协议、内核 ID 与 profile。';
      return;
    }

    await adminApi.createAdminProtocolBinding(payload);
    actionMessage.value = '协议绑定已创建。';
    showCreateBindingModal.value = false;
    await loadBindings(true);
  } catch (error) {
    if (!actionError.value) {
      actionError.value = '创建失败，请检查输入。';
    }
  } finally {
    isSaving.value = false;
  }
}

async function handleUpdateBinding() {
  if (!selectedBinding.value) return;

  actionMessage.value = '';
  actionError.value = '';
  isSaving.value = true;

  try {
    const payload: UpdateProtocolBindingRequest = {
      name: editBindingForm.name.trim() || undefined,
      node_id: editBindingForm.node_id || undefined,
      protocol: editBindingForm.protocol.trim() || undefined,
      role: editBindingForm.role || undefined,
      listen: editBindingForm.listen.trim() || undefined,
      connect: editBindingForm.connect.trim() || undefined,
      access_port: editBindingForm.access_port ?? undefined,
      status: editBindingForm.status || undefined,
      kernel_id: editBindingForm.kernel_id.trim() || undefined,
      tags: parseTags(editBindingForm.tags),
      description: editBindingForm.description.trim() || undefined,
      profile: parseProfileOptional(editBindingForm.profile),
    };

    await adminApi.updateAdminProtocolBinding(selectedBinding.value.id, payload);
    actionMessage.value = '协议绑定已更新。';
    showEditBindingModal.value = false;
    await loadBindings(true);
  } catch (error) {
    if (!actionError.value) {
      actionError.value = '更新失败，请稍后重试。';
    }
  } finally {
    isSaving.value = false;
  }
}

async function handleDeleteBinding() {
  if (!selectedBinding.value) return;

  actionMessage.value = '';
  actionError.value = '';
  isSaving.value = true;

  try {
    await adminApi.deleteAdminProtocolBinding(selectedBinding.value.id);
    actionMessage.value = '协议绑定已删除。';
    showDeleteBindingModal.value = false;
    await loadBindings(true);
  } catch (error) {
    actionError.value = '删除失败，请稍后重试。';
  } finally {
    isSaving.value = false;
  }
}

async function handleSyncBinding(binding: ProtocolBindingSummary) {
  if (syncingBinding.value) return;
  syncingBinding.value = true;
  actionMessage.value = '';
  actionError.value = '';

  try {
    const result = await adminApi.syncAdminProtocolBinding(binding.id);
    actionMessage.value = result.message || '同步已触发。';
    bindings.value = bindings.value.map((item) =>
      item.id === binding.id
        ? {
            ...item,
            sync_status: result.status,
            last_synced_at: result.synced_at,
          }
        : item,
    );
  } catch (error) {
    actionError.value = '同步失败，请稍后重试。';
  } finally {
    syncingBinding.value = false;
  }
}

async function handleCreateEntry() {
  actionMessage.value = '';
  actionError.value = '';
  isSaving.value = true;

  try {
    const payload: CreateProtocolEntryRequest = {
      name: createEntryForm.name.trim() || undefined,
      binding_id: createEntryForm.binding_id || 0,
      entry_address: createEntryForm.entry_address.trim(),
      entry_port: createEntryForm.entry_port || 0,
      protocol: createEntryForm.protocol.trim() || undefined,
      status: createEntryForm.status || undefined,
      tags: parseTags(createEntryForm.tags),
      description: createEntryForm.description.trim() || undefined,
      profile: parseProfileOptional(createEntryForm.profile),
    };

    if (!payload.binding_id || !payload.entry_address || !payload.entry_port) {
      actionError.value = '请填写绑定 ID、入口地址与端口。';
      return;
    }

    await adminApi.createAdminProtocolEntry(payload);
    actionMessage.value = '协议发布已创建。';
    showCreateEntryModal.value = false;
    await loadEntries(true);
  } catch (error) {
    if (!actionError.value) {
      actionError.value = '创建失败，请检查输入。';
    }
  } finally {
    isSaving.value = false;
  }
}

async function handleUpdateEntry() {
  if (!selectedEntry.value) return;

  actionMessage.value = '';
  actionError.value = '';
  isSaving.value = true;

  try {
    const payload: UpdateProtocolEntryRequest = {
      name: editEntryForm.name.trim() || undefined,
      binding_id: editEntryForm.binding_id || undefined,
      entry_address: editEntryForm.entry_address.trim() || undefined,
      entry_port: editEntryForm.entry_port ?? undefined,
      protocol: editEntryForm.protocol.trim() || undefined,
      status: editEntryForm.status || undefined,
      tags: parseTags(editEntryForm.tags),
      description: editEntryForm.description.trim() || undefined,
      profile: parseProfileOptional(editEntryForm.profile),
    };

    await adminApi.updateAdminProtocolEntry(selectedEntry.value.id, payload);
    actionMessage.value = '协议发布已更新。';
    showEditEntryModal.value = false;
    await loadEntries(true);
  } catch (error) {
    if (!actionError.value) {
      actionError.value = '更新失败，请稍后重试。';
    }
  } finally {
    isSaving.value = false;
  }
}

async function handleDeleteEntry() {
  if (!selectedEntry.value) return;

  actionMessage.value = '';
  actionError.value = '';
  isSaving.value = true;

  try {
    await adminApi.deleteAdminProtocolEntry(selectedEntry.value.id);
    actionMessage.value = '协议发布已删除。';
    showDeleteEntryModal.value = false;
    await loadEntries(true);
  } catch (error) {
    actionError.value = '删除失败，请稍后重试。';
  } finally {
    isSaving.value = false;
  }
}

watch(activeTab, (value) => {
  if (value === 'bindings' && !bindings.value.length) {
    void loadBindings(true);
  }
  if (value === 'entries' && !entries.value.length) {
    void loadEntries(true);
  }
});

onMounted(() => {
  void loadBindings(true);
});
</script>

<template>
  <section class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">协议</p>
        <h3 class="page-section__title">协议绑定与发布</h3>
        <p class="page__subtitle">维护内核绑定与对外发布入口。</p>
      </div>
      <div class="page-section__actions">
        <Button
          type="button"
          :variant="activeTab === 'bindings' ? 'default' : 'secondary'"
          @click="activeTab = 'bindings'"
        >
          协议绑定
        </Button>
        <Button
          type="button"
          :variant="activeTab === 'entries' ? 'default' : 'secondary'"
          @click="activeTab = 'entries'"
        >
          协议发布
        </Button>
        <Button
          v-if="activeTab === 'bindings'"
          type="button"
          @click="showCreateBindingModal = true"
        >
          新建绑定
        </Button>
        <Button
          v-if="activeTab === 'entries'"
          type="button"
          @click="showCreateEntryModal = true"
        >
          新建发布
        </Button>
      </div>
    </header>

    <Alert v-if="actionMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
      <AlertTitle>操作成功</AlertTitle>
      <AlertDescription>{{ actionMessage }}</AlertDescription>
    </Alert>
    <Alert v-if="actionError" variant="destructive">
      <AlertTitle>操作失败</AlertTitle>
      <AlertDescription>{{ actionError }}</AlertDescription>
    </Alert>

    <Card v-if="activeTab === 'bindings'" class="panel-card--full">
      <CardHeader class="cluster cluster--between cluster--center">
        <div>
          <CardTitle>协议绑定</CardTitle>
          <p class="panel-card__meta">/protocol-bindings</p>
        </div>
        <div class="cluster cluster--gap">
          <Input v-model="bindingFilters.q" placeholder="搜索绑定名称或节点" class="w-56" />
          <Select v-model="bindingFilters.protocol">
            <SelectTrigger class="w-36">
              <SelectValue placeholder="协议" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value="vless">VLESS</SelectItem>
              <SelectItem value="vmess">VMess</SelectItem>
              <SelectItem value="trojan">Trojan</SelectItem>
              <SelectItem value="shadowsocks">Shadowsocks</SelectItem>
              <SelectItem value="hysteria">Hysteria</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="bindingFilters.status">
            <SelectTrigger class="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="disabled">disabled</SelectItem>
              <SelectItem value="maintenance">maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Input v-model="bindingFilters.node_id" placeholder="节点 ID" class="w-28" />
          <Button type="button" variant="secondary" @click="loadBindings(true)">筛选</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Alert v-if="bindingsError" variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{{ bindingsError }}</AlertDescription>
        </Alert>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>节点</TableHead>
              <TableHead>协议</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>同步</TableHead>
              <TableHead>最近同步</TableHead>
              <TableHead class="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="binding in bindings" :key="binding.id">
              <TableCell>
                <p class="font-medium">{{ binding.name || '-' }}</p>
                <p class="text-xs text-muted-foreground">#{{ binding.id }}</p>
              </TableCell>
              <TableCell>{{ binding.node_name || binding.node_id || '-' }}</TableCell>
              <TableCell>{{ binding.protocol || '-' }}</TableCell>
              <TableCell>
                <Badge :variant="statusVariant(binding.status)">{{ binding.status || 'unknown' }}</Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="statusVariant(binding.sync_status)">{{ binding.sync_status || '-' }}</Badge>
              </TableCell>
              <TableCell>{{ formatDateTime(binding.last_synced_at) }}</TableCell>
              <TableCell class="text-right">
                <Button size="sm" variant="secondary" @click="handleSyncBinding(binding)">同步</Button>
                <Button size="sm" variant="outline" class="ml-2" @click="openEditBinding(binding)">
                  编辑
                </Button>
                <Button size="sm" variant="outline" class="ml-2" @click="openDeleteBinding(binding)">
                  删除
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div v-if="!bindings.length && !bindingsLoading" class="panel-card__empty">暂无绑定。</div>
        <div class="panel-card__footer" v-if="bindingsPagination">
          <p class="panel-card__meta">已显示 {{ bindings.length }} / {{ bindingsPagination.total_count }}</p>
          <Button
            type="button"
            variant="secondary"
            @click="loadMoreBindings"
            :disabled="!hasNextBindings || bindingsLoadingMore"
          >
            {{ bindingsLoadingMore ? '加载中...' : hasNextBindings ? '加载更多' : '没有更多了' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card v-else class="panel-card--full">
      <CardHeader class="cluster cluster--between cluster--center">
        <div>
          <CardTitle>协议发布</CardTitle>
          <p class="panel-card__meta">/protocol-entries</p>
        </div>
        <div class="cluster cluster--gap">
          <Input v-model="entryFilters.q" placeholder="搜索入口或节点" class="w-56" />
          <Select v-model="entryFilters.protocol">
            <SelectTrigger class="w-36">
              <SelectValue placeholder="协议" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value="vless">VLESS</SelectItem>
              <SelectItem value="vmess">VMess</SelectItem>
              <SelectItem value="trojan">Trojan</SelectItem>
              <SelectItem value="shadowsocks">Shadowsocks</SelectItem>
              <SelectItem value="hysteria">Hysteria</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="entryFilters.status">
            <SelectTrigger class="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="disabled">disabled</SelectItem>
            </SelectContent>
          </Select>
          <Input v-model="entryFilters.binding_id" placeholder="绑定 ID" class="w-28" />
          <Button type="button" variant="secondary" @click="loadEntries(true)">筛选</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Alert v-if="entriesError" variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{{ entriesError }}</AlertDescription>
        </Alert>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>绑定</TableHead>
              <TableHead>入口</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>健康</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead class="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="entry in entries" :key="entry.id">
              <TableCell>
                <p class="font-medium">{{ entry.name || '-' }}</p>
                <p class="text-xs text-muted-foreground">#{{ entry.id }}</p>
              </TableCell>
              <TableCell>{{ entry.binding_name || entry.binding_id }}</TableCell>
              <TableCell>{{ entry.entry_address }}:{{ entry.entry_port }}</TableCell>
              <TableCell>
                <Badge :variant="statusVariant(entry.status)">{{ entry.status || 'unknown' }}</Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="statusVariant(entry.health_status)">{{ entry.health_status || '-' }}</Badge>
              </TableCell>
              <TableCell>{{ formatDateTime(entry.updated_at) }}</TableCell>
              <TableCell class="text-right">
                <Button size="sm" variant="outline" @click="openEditEntry(entry)">编辑</Button>
                <Button size="sm" variant="outline" class="ml-2" @click="openDeleteEntry(entry)">
                  删除
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div v-if="!entries.length && !entriesLoading" class="panel-card__empty">暂无发布。</div>
        <div class="panel-card__footer" v-if="entriesPagination">
          <p class="panel-card__meta">已显示 {{ entries.length }} / {{ entriesPagination.total_count }}</p>
          <Button
            type="button"
            variant="secondary"
            @click="loadMoreEntries"
            :disabled="!hasNextEntries || entriesLoadingMore"
          >
            {{ entriesLoadingMore ? '加载中...' : hasNextEntries ? '加载更多' : '没有更多了' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Dialog v-model:open="showCreateBindingModal">
      <DialogContent class="dialog-content">
        <DialogHeader>
          <DialogTitle>新建协议绑定</DialogTitle>
          <DialogDescription>填写绑定内核配置。</DialogDescription>
        </DialogHeader>
        <div class="form-grid">
          <div>
            <Label for="binding-name">名称</Label>
            <Input id="binding-name" v-model="createBindingForm.name" placeholder="LA vless" />
          </div>
          <div>
            <Label for="binding-node">节点 ID</Label>
            <Input id="binding-node" v-model.number="createBindingForm.node_id" type="number" />
          </div>
          <div>
            <Label for="binding-protocol">协议</Label>
            <Input id="binding-protocol" v-model="createBindingForm.protocol" placeholder="vless" />
          </div>
          <div>
            <Label for="binding-role">角色</Label>
            <Select v-model="createBindingForm.role">
              <SelectTrigger id="binding-role">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listener">listener</SelectItem>
                <SelectItem value="connector">connector</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="binding-kernel">内核 ID</Label>
            <Input id="binding-kernel" v-model="createBindingForm.kernel_id" placeholder="vless-la" />
          </div>
          <div>
            <Label for="binding-status">状态</Label>
            <Select v-model="createBindingForm.status">
              <SelectTrigger id="binding-status">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="binding-listen">监听</Label>
            <Input id="binding-listen" v-model="createBindingForm.listen" placeholder="0.0.0.0:443" />
          </div>
          <div>
            <Label for="binding-connect">转发</Label>
            <Input id="binding-connect" v-model="createBindingForm.connect" placeholder="127.0.0.1:10000" />
          </div>
          <div>
            <Label for="binding-port">访问端口</Label>
            <Input id="binding-port" v-model.number="createBindingForm.access_port" type="number" />
          </div>
          <div>
            <Label for="binding-tags">标签</Label>
            <Input id="binding-tags" v-model="createBindingForm.tags" placeholder="edge, hk" />
          </div>
          <div class="form-grid__full">
            <Label for="binding-desc">说明</Label>
            <Input id="binding-desc" v-model="createBindingForm.description" placeholder="描述" />
          </div>
          <div class="form-grid__full">
            <Label for="binding-profile">Profile (JSON)</Label>
            <Textarea id="binding-profile" v-model="createBindingForm.profile" rows="6" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showCreateBindingModal = false">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreateBinding">
            {{ isSaving ? '保存中...' : '保存' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditBindingModal">
      <DialogContent class="dialog-content">
        <DialogHeader>
          <DialogTitle>编辑协议绑定</DialogTitle>
          <DialogDescription>更新绑定配置。</DialogDescription>
        </DialogHeader>
        <div class="form-grid">
          <div>
            <Label for="binding-edit-name">名称</Label>
            <Input id="binding-edit-name" v-model="editBindingForm.name" />
          </div>
          <div>
            <Label for="binding-edit-node">节点 ID</Label>
            <Input id="binding-edit-node" v-model.number="editBindingForm.node_id" type="number" />
          </div>
          <div>
            <Label for="binding-edit-protocol">协议</Label>
            <Input id="binding-edit-protocol" v-model="editBindingForm.protocol" />
          </div>
          <div>
            <Label for="binding-edit-role">角色</Label>
            <Select v-model="editBindingForm.role">
              <SelectTrigger id="binding-edit-role">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listener">listener</SelectItem>
                <SelectItem value="connector">connector</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="binding-edit-kernel">内核 ID</Label>
            <Input id="binding-edit-kernel" v-model="editBindingForm.kernel_id" />
          </div>
          <div>
            <Label for="binding-edit-status">状态</Label>
            <Select v-model="editBindingForm.status">
              <SelectTrigger id="binding-edit-status">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="binding-edit-listen">监听</Label>
            <Input id="binding-edit-listen" v-model="editBindingForm.listen" />
          </div>
          <div>
            <Label for="binding-edit-connect">转发</Label>
            <Input id="binding-edit-connect" v-model="editBindingForm.connect" />
          </div>
          <div>
            <Label for="binding-edit-port">访问端口</Label>
            <Input id="binding-edit-port" v-model.number="editBindingForm.access_port" type="number" />
          </div>
          <div>
            <Label for="binding-edit-tags">标签</Label>
            <Input id="binding-edit-tags" v-model="editBindingForm.tags" />
          </div>
          <div class="form-grid__full">
            <Label for="binding-edit-desc">说明</Label>
            <Input id="binding-edit-desc" v-model="editBindingForm.description" />
          </div>
          <div class="form-grid__full">
            <Label for="binding-edit-profile">Profile (JSON)</Label>
            <Textarea id="binding-edit-profile" v-model="editBindingForm.profile" rows="6" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showEditBindingModal = false">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleUpdateBinding">
            {{ isSaving ? '保存中...' : '更新' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDeleteBindingModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            删除绑定 {{ selectedBinding?.name || selectedBinding?.id }} 后无法恢复。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showDeleteBindingModal = false">取消</Button>
          <Button type="button" variant="destructive" :disabled="isSaving" @click="handleDeleteBinding">
            {{ isSaving ? '处理中...' : '删除' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showCreateEntryModal">
      <DialogContent class="dialog-content">
        <DialogHeader>
          <DialogTitle>新建协议发布</DialogTitle>
          <DialogDescription>填写对外入口信息。</DialogDescription>
        </DialogHeader>
        <div class="form-grid">
          <div>
            <Label for="entry-name">名称</Label>
            <Input id="entry-name" v-model="createEntryForm.name" placeholder="LA entry" />
          </div>
          <div>
            <Label for="entry-binding">绑定 ID</Label>
            <Input id="entry-binding" v-model.number="createEntryForm.binding_id" type="number" />
          </div>
          <div>
            <Label for="entry-address">入口地址</Label>
            <Input id="entry-address" v-model="createEntryForm.entry_address" placeholder="la.example.com" />
          </div>
          <div>
            <Label for="entry-port">入口端口</Label>
            <Input id="entry-port" v-model.number="createEntryForm.entry_port" type="number" />
          </div>
          <div>
            <Label for="entry-protocol">协议</Label>
            <Input id="entry-protocol" v-model="createEntryForm.protocol" placeholder="可选" />
          </div>
          <div>
            <Label for="entry-status">状态</Label>
            <Select v-model="createEntryForm.status">
              <SelectTrigger id="entry-status">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="entry-tags">标签</Label>
            <Input id="entry-tags" v-model="createEntryForm.tags" placeholder="edge" />
          </div>
          <div class="form-grid__full">
            <Label for="entry-desc">说明</Label>
            <Input id="entry-desc" v-model="createEntryForm.description" />
          </div>
          <div class="form-grid__full">
            <Label for="entry-profile">Profile (JSON)</Label>
            <Textarea id="entry-profile" v-model="createEntryForm.profile" rows="6" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showCreateEntryModal = false">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreateEntry">
            {{ isSaving ? '保存中...' : '保存' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditEntryModal">
      <DialogContent class="dialog-content">
        <DialogHeader>
          <DialogTitle>编辑协议发布</DialogTitle>
          <DialogDescription>更新入口信息。</DialogDescription>
        </DialogHeader>
        <div class="form-grid">
          <div>
            <Label for="entry-edit-name">名称</Label>
            <Input id="entry-edit-name" v-model="editEntryForm.name" />
          </div>
          <div>
            <Label for="entry-edit-binding">绑定 ID</Label>
            <Input id="entry-edit-binding" v-model.number="editEntryForm.binding_id" type="number" />
          </div>
          <div>
            <Label for="entry-edit-address">入口地址</Label>
            <Input id="entry-edit-address" v-model="editEntryForm.entry_address" />
          </div>
          <div>
            <Label for="entry-edit-port">入口端口</Label>
            <Input id="entry-edit-port" v-model.number="editEntryForm.entry_port" type="number" />
          </div>
          <div>
            <Label for="entry-edit-protocol">协议</Label>
            <Input id="entry-edit-protocol" v-model="editEntryForm.protocol" />
          </div>
          <div>
            <Label for="entry-edit-status">状态</Label>
            <Select v-model="editEntryForm.status">
              <SelectTrigger id="entry-edit-status">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="entry-edit-tags">标签</Label>
            <Input id="entry-edit-tags" v-model="editEntryForm.tags" />
          </div>
          <div class="form-grid__full">
            <Label for="entry-edit-desc">说明</Label>
            <Input id="entry-edit-desc" v-model="editEntryForm.description" />
          </div>
          <div class="form-grid__full">
            <Label for="entry-edit-profile">Profile (JSON)</Label>
            <Textarea id="entry-edit-profile" v-model="editEntryForm.profile" rows="6" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showEditEntryModal = false">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleUpdateEntry">
            {{ isSaving ? '保存中...' : '更新' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDeleteEntryModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            删除发布 {{ selectedEntry?.name || selectedEntry?.id }} 后无法恢复。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showDeleteEntryModal = false">取消</Button>
          <Button type="button" variant="destructive" :disabled="isSaving" @click="handleDeleteEntry">
            {{ isSaving ? '处理中...' : '删除' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
