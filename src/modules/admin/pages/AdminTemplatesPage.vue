<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
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
  CreateTemplateRequest,
  PaginationMeta,
  SubscriptionTemplateHistoryEntry,
  SubscriptionTemplateSummary,
  UpdateTemplateRequest,
} from '../../../api/types';

const templates = ref<SubscriptionTemplateSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');

const selectedTemplate = ref<SubscriptionTemplateSummary | null>(null);
const historyEntries = ref<SubscriptionTemplateHistoryEntry[]>([]);
const showHistoryModal = ref(false);
const loadingHistory = ref(false);

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showPublishModal = ref(false);
const isSaving = ref(false);

const perPage = 20;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  q: '',
  client_type: '',
  format: '',
  include_drafts: true,
  sort: 'updated_at',
  direction: 'desc',
});

const createForm = reactive<CreateTemplateRequest>({
  name: '',
  description: '',
  client_type: '',
  format: '',
  content: '',
  variables: {},
  is_default: false,
});

const editForm = reactive<UpdateTemplateRequest>({
  name: '',
  description: '',
  format: '',
  content: '',
  variables: {},
  is_default: false,
});

const publishForm = reactive({
  changelog: '',
  operator: '',
});

function statusVariant(template: SubscriptionTemplateSummary): 'default' | 'secondary' {
  return template.published_at ? 'default' : 'secondary';
}

function statusLabel(template: SubscriptionTemplateSummary): string {
  return template.published_at ? '已发布' : '草稿';
}

function clientTypeLabel(value?: string) {
  switch (value) {
    case 'clash':
      return 'Clash';
    case 'v2ray':
      return 'V2Ray';
    case 'shadowsocks':
      return 'Shadowsocks';
    case 'surge':
      return 'Surge';
    case 'quantumult':
      return 'Quantumult';
    default:
      return value || '-';
  }
}

async function loadTemplates() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminTemplates({
      page: 1,
      per_page: perPage,
      q: filters.q || undefined,
      client_type:
        filters.client_type && filters.client_type !== '__all__'
          ? filters.client_type
          : undefined,
      format:
        filters.format && filters.format !== '__all__' ? filters.format : undefined,
      include_drafts: filters.include_drafts,
      sort: filters.sort,
      direction: filters.direction,
    });
    templates.value = response.templates ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载模板失败';
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
    const response = await adminApi.fetchAdminTemplates({
      page: targetPage,
      per_page: perPage,
      q: filters.q || undefined,
      client_type:
        filters.client_type && filters.client_type !== '__all__'
          ? filters.client_type
          : undefined,
      format:
        filters.format && filters.format !== '__all__' ? filters.format : undefined,
      include_drafts: filters.include_drafts,
      sort: filters.sort,
      direction: filters.direction,
    });
    templates.value = [...templates.value, ...(response.templates ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载更多模板失败';
  } finally {
    isLoadingMore.value = false;
  }
}

function openCreateModal() {
  createForm.name = '';
  createForm.description = '';
  createForm.client_type = 'clash';
  createForm.format = 'yaml';
  createForm.content = '';
  createForm.variables = {};
  createForm.is_default = false;
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

async function handleCreate() {
  if (!createForm.name || !createForm.client_type || !createForm.format || !createForm.content) {
    errorMessage.value = '请填写必填项';
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';

  try {
    await adminApi.createAdminTemplate(createForm);
    closeCreateModal();
    await loadTemplates();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '创建模板失败';
  } finally {
    isSaving.value = false;
  }
}

function openEditModal(template: SubscriptionTemplateSummary) {
  selectedTemplate.value = template;
  editForm.name = template.name;
  editForm.description = template.description || '';
  editForm.format = template.format;
  editForm.content = template.content || '';
  editForm.variables = template.variables || {};
  editForm.is_default = template.is_default;
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  selectedTemplate.value = null;
}

async function handleUpdate() {
  if (!selectedTemplate.value) return;

  isSaving.value = true;
  errorMessage.value = '';

  try {
    await adminApi.updateAdminTemplate(selectedTemplate.value.id, editForm);
    closeEditModal();
    await loadTemplates();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '更新模板失败';
  } finally {
    isSaving.value = false;
  }
}

function openPublishModal(template: SubscriptionTemplateSummary) {
  selectedTemplate.value = template;
  publishForm.changelog = '';
  publishForm.operator = '';
  showPublishModal.value = true;
}

function closePublishModal() {
  showPublishModal.value = false;
  selectedTemplate.value = null;
}

async function handlePublish() {
  if (!selectedTemplate.value) return;

  isSaving.value = true;
  errorMessage.value = '';

  try {
    await adminApi.publishAdminTemplate(selectedTemplate.value.id, publishForm);
    closePublishModal();
    await loadTemplates();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '发布模板失败';
  } finally {
    isSaving.value = false;
  }
}

async function openHistoryModal(template: SubscriptionTemplateSummary) {
  selectedTemplate.value = template;
  showHistoryModal.value = true;
  loadingHistory.value = true;
  historyEntries.value = [];

  try {
    const response = await adminApi.fetchAdminTemplateHistory(template.id);
    historyEntries.value = response.history ?? [];
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载历史版本失败';
  } finally {
    loadingHistory.value = false;
  }
}

function closeHistoryModal() {
  showHistoryModal.value = false;
  selectedTemplate.value = null;
  historyEntries.value = [];
}

function applyFilters() {
  loadTemplates();
}

function resetFilters() {
  filters.q = '';
  filters.client_type = '';
  filters.format = '';
  filters.include_drafts = true;
  filters.sort = 'updated_at';
  filters.direction = 'desc';
  loadTemplates();
}

onMounted(() => {
  loadTemplates();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">模板</p>
        <h3 class="page-section__title">订阅模板</h3>
        <p class="page__subtitle">管理不同客户端的订阅配置模板。</p>
      </div>
      <div class="page-section__actions">
        <Button type="button" @click="openCreateModal">新建模板</Button>
      </div>
    </header>

    <form class="form-grid form-grid--wide" @submit.prevent="applyFilters">
      <div class="stack stack--tight grid-span-2">
        <Label>搜索</Label>
        <Input v-model="filters.q" type="text" placeholder="模板名称" />
      </div>
      <div class="stack stack--tight">
        <Label>客户端</Label>
        <Select v-model="filters.client_type">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem value="clash">Clash</SelectItem>
            <SelectItem value="v2ray">V2Ray</SelectItem>
            <SelectItem value="shadowsocks">Shadowsocks</SelectItem>
            <SelectItem value="surge">Surge</SelectItem>
            <SelectItem value="quantumult">Quantumult</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>格式</Label>
        <Select v-model="filters.format">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem value="yaml">YAML</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="text">Text</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="cluster cluster--center form__field--offset">
        <Checkbox id="include-drafts" v-model="filters.include_drafts" />
        <Label for="include-drafts">包含草稿</Label>
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

    <Card>
      <CardHeader>
        <CardTitle>模板列表</CardTitle>
        <p class="panel-card__meta">共 {{ templates.length }} 个模板</p>
      </CardHeader>
      <CardContent>
        <p v-if="loading" class="panel-card__empty">正在加载模板...</p>
        <p v-else-if="templates.length === 0" class="panel-card__empty">暂无模板。</p>
        <div v-else class="w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>客户端</TableHead>
                <TableHead>格式</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>默认</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="template in templates" :key="template.id">
                <TableCell>
                  <div class="stack stack--tight">
                    <p class="font-medium">{{ template.name }}</p>
                    <p v-if="template.description" class="text-xs text-muted-foreground">
                      {{ template.description }}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{{ clientTypeLabel(template.client_type) }}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{{ template.format }}</Badge>
                </TableCell>
                <TableCell>v{{ template.version }}</TableCell>
                <TableCell>
                  <Badge :variant="statusVariant(template)">{{ statusLabel(template) }}</Badge>
                </TableCell>
                <TableCell>
                  <Badge v-if="template.is_default" variant="default">默认</Badge>
                  <span v-else class="text-xs text-muted-foreground">-</span>
                </TableCell>
                <TableCell>
                  <span class="text-xs text-muted-foreground">{{ formatDateTime(template.updated_at) }}</span>
                </TableCell>
                <TableCell>
                  <div class="cluster">
                    <Button size="sm" variant="secondary" type="button" @click="openEditModal(template)">
                      编辑
                    </Button>
                    <Button size="sm" type="button" @click="openPublishModal(template)">发布</Button>
                    <Button size="sm" variant="ghost" type="button" @click="openHistoryModal(template)">
                      历史
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-if="pagination?.has_next" class="list-footer">
          <Button variant="secondary" type="button" :disabled="isLoadingMore" @click="loadMore">
            {{ isLoadingMore ? '加载中...' : '加载更多' }}
          </Button>
          <p class="text-xs text-muted-foreground">
            已显示 {{ templates.length }} / {{ pagination.total_count }}
          </p>
        </div>
      </CardContent>
    </Card>

    <Dialog v-model:open="showCreateModal">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新建模板</DialogTitle>
          <DialogDescription>配置订阅格式与默认内容。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label for="create-name">名称 *</Label>
            <Input id="create-name" v-model="createForm.name" type="text" placeholder="模板名称" />
          </div>
          <div class="stack stack--tight">
            <Label for="create-description">描述</Label>
            <Textarea id="create-description" v-model="createForm.description" rows="2" placeholder="模板用途" />
          </div>
          <div class="stack stack--tight">
            <Label>客户端 *</Label>
            <Select v-model="createForm.client_type">
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clash">Clash</SelectItem>
                <SelectItem value="v2ray">V2Ray</SelectItem>
                <SelectItem value="shadowsocks">Shadowsocks</SelectItem>
                <SelectItem value="surge">Surge</SelectItem>
                <SelectItem value="quantumult">Quantumult</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="stack stack--tight">
            <Label>格式 *</Label>
            <Select v-model="createForm.format">
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yaml">YAML</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="stack stack--tight">
            <Label for="create-content">内容 *</Label>
            <Textarea
              id="create-content"
              v-model="createForm.content"
              rows="10"
              class="font-mono text-xs"
              placeholder="模板内容"
            />
          </div>
          <div class="cluster cluster--center">
            <Checkbox id="create-default" v-model="createForm.is_default" />
            <Label for="create-default">设为默认模板</Label>
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeCreateModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreate">
            {{ isSaving ? '创建中...' : '创建模板' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditModal">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑模板</DialogTitle>
          <DialogDescription>更新模板内容与默认设置。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label for="edit-name">名称</Label>
            <Input id="edit-name" v-model="editForm.name" type="text" placeholder="模板名称" />
          </div>
          <div class="stack stack--tight">
            <Label for="edit-description">描述</Label>
            <Textarea id="edit-description" v-model="editForm.description" rows="2" placeholder="模板用途" />
          </div>
          <div class="stack stack--tight">
            <Label>格式</Label>
            <Select v-model="editForm.format">
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yaml">YAML</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="stack stack--tight">
            <Label for="edit-content">内容</Label>
            <Textarea
              id="edit-content"
              v-model="editForm.content"
              rows="10"
              class="font-mono text-xs"
              placeholder="模板内容"
            />
          </div>
          <div class="cluster cluster--center">
            <Checkbox id="edit-default" v-model="editForm.is_default" />
            <Label for="edit-default">设为默认模板</Label>
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

    <Dialog v-model:open="showPublishModal">
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle>发布模板</DialogTitle>
          <DialogDescription>
            发布后将生成新版本（v{{ (selectedTemplate?.version ?? 0) + 1 }}）。
          </DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label for="publish-changelog">更新说明</Label>
            <Textarea
              id="publish-changelog"
              v-model="publishForm.changelog"
              rows="3"
              placeholder="本次版本变更内容"
            />
          </div>
          <div class="stack stack--tight">
            <Label for="publish-operator">操作人</Label>
            <Input id="publish-operator" v-model="publishForm.operator" type="text" placeholder="可选" />
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closePublishModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handlePublish">
            {{ isSaving ? '发布中...' : '确认发布' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showHistoryModal">
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle>版本历史</DialogTitle>
          <DialogDescription>查看模板的发布记录。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <p v-if="loadingHistory" class="text-sm text-muted-foreground">正在加载历史记录...</p>
          <div v-else-if="historyEntries.length" class="stack stack--compact">
            <div
              v-for="entry in historyEntries"
              :key="entry.version"
              class="rounded-md border border-border p-3"
            >
              <div class="cluster cluster--between cluster--center">
                <p class="font-medium">版本 {{ entry.version }}</p>
                <span class="text-xs text-muted-foreground">{{ formatDateTime(entry.published_at) }}</span>
              </div>
              <p v-if="entry.published_by" class="text-xs text-muted-foreground">
                发布人：{{ entry.published_by }}
              </p>
              <p v-if="entry.changelog" class="text-sm">{{ entry.changelog }}</p>
              <p v-else class="text-xs text-muted-foreground">暂无更新说明</p>
            </div>
          </div>
          <p v-else class="text-sm text-muted-foreground">暂无历史版本。</p>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeHistoryModal">关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

