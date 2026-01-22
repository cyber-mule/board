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
import RichTextEditor from '@/components/RichTextEditor.vue';
import { adminApi } from '../../../api';
import { formatDateTime } from '../../../utils/format';
import type {
  AnnouncementSummary,
  CreateAnnouncementRequest,
  PaginationMeta,
  UpdateAnnouncementRequest,
} from '../../../api/types';

const announcements = ref<AnnouncementSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');

const selectedAnnouncement = ref<AnnouncementSummary | null>(null);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showPublishModal = ref(false);
const isSaving = ref(false);

const perPage = 20;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  q: '',
  status: '__all__' as number | string,
  category: '',
  audience: '',
  sort: 'created',
  direction: 'desc',
});

const createForm = reactive<CreateAnnouncementRequest>({
  title: '',
  content: '',
  category: '',
  audience: '',
  is_pinned: false,
  priority: 0,
  created_by: '',
});

const editForm = reactive<UpdateAnnouncementRequest>({
  title: '',
  content: '',
  category: '',
  audience: '',
  is_pinned: false,
  priority: 0,
});

const publishForm = reactive({
  visible_to: 0,
  operator: '',
});

function statusVariant(announcement: AnnouncementSummary): 'default' | 'secondary' | 'outline' {
  switch (announcement.status) {
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

function statusLabel(announcement: AnnouncementSummary): string {
  switch (announcement.status) {
    case 1:
      return '草稿';
    case 2:
      return '已发布';
    case 3:
      return '已归档';
    default:
      return '未知';
  }
}

function categoryLabel(value?: string): string {
  switch (value) {
    case 'maintenance':
      return '维护';
    case 'feature':
      return '功能';
    case 'notice':
      return '通知';
    case 'warning':
      return '警告';
    default:
      return value || '-';
  }
}

function audienceLabel(value?: string): string {
  switch (value) {
    case 'all':
      return '全体';
    case 'user':
      return '用户';
    case 'admin':
      return '管理员';
    default:
      return value || '-';
  }
}

function extractText(html?: string): string {
  if (!html) {
    return '';
  }
  if (typeof DOMParser === 'undefined') {
    return html;
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.trim() ?? '';
}

function contentPreview(content?: string): string {
  const text = extractText(content);
  if (!text) {
    return '';
  }
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}

function hasContent(html?: string): boolean {
  return extractText(html).length > 0;
}

async function loadAnnouncements() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminAnnouncements({
      page: 1,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      category: filters.category && filters.category !== '__all__' ? filters.category : undefined,
      audience: filters.audience && filters.audience !== '__all__' ? filters.audience : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    announcements.value = response.announcements ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载公告失败';
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
    const response = await adminApi.fetchAdminAnnouncements({
      page: targetPage,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      category: filters.category && filters.category !== '__all__' ? filters.category : undefined,
      audience: filters.audience && filters.audience !== '__all__' ? filters.audience : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    announcements.value = [...announcements.value, ...(response.announcements ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载更多公告失败';
  } finally {
    isLoadingMore.value = false;
  }
}

function openCreateModal() {
  createForm.title = '';
  createForm.content = '';
  createForm.category = '__unset__';
  createForm.audience = 'all';
  createForm.is_pinned = false;
  createForm.priority = 0;
  createForm.created_by = '';
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

async function handleCreate() {
  if (!createForm.title || !hasContent(createForm.content)) {
    errorMessage.value = '请填写标题与内容';
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';

  try {
    const payload: CreateAnnouncementRequest = {
      ...createForm,
      category:
        createForm.category === '__unset__' ? undefined : createForm.category || undefined,
    };
    await adminApi.createAdminAnnouncement(payload);
    closeCreateModal();
    await loadAnnouncements();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '创建公告失败';
  } finally {
    isSaving.value = false;
  }
}

function openEditModal(announcement: AnnouncementSummary) {
  selectedAnnouncement.value = announcement;
  editForm.title = announcement.title;
  editForm.content = announcement.content || '';
  editForm.category = announcement.category || '__unset__';
  editForm.audience = announcement.audience || 'all';
  editForm.is_pinned = announcement.is_pinned || false;
  editForm.priority = announcement.priority || 0;
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  selectedAnnouncement.value = null;
}

async function handleUpdate() {
  if (!selectedAnnouncement.value) return;

  isSaving.value = true;
  errorMessage.value = '';

  try {
    const payload: UpdateAnnouncementRequest = {
      ...editForm,
      category: editForm.category === '__unset__' ? undefined : editForm.category || undefined,
    };
    if (!hasContent(payload.content)) {
      errorMessage.value = '内容不能为空';
      isSaving.value = false;
      return;
    }
    await adminApi.updateAdminAnnouncement(selectedAnnouncement.value.id, payload);
    closeEditModal();
    await loadAnnouncements();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '更新公告失败';
  } finally {
    isSaving.value = false;
  }
}

function openPublishModal(announcement: AnnouncementSummary) {
  selectedAnnouncement.value = announcement;
  publishForm.visible_to = 0;
  publishForm.operator = '';
  showPublishModal.value = true;
}

function closePublishModal() {
  showPublishModal.value = false;
  selectedAnnouncement.value = null;
}

async function handlePublish() {
  if (!selectedAnnouncement.value) return;

  isSaving.value = true;
  errorMessage.value = '';

  try {
    await adminApi.publishAdminAnnouncement(selectedAnnouncement.value.id, publishForm);
    closePublishModal();
    await loadAnnouncements();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '发布公告失败';
  } finally {
    isSaving.value = false;
  }
}

function applyFilters() {
  loadAnnouncements();
}

function resetFilters() {
  filters.q = '';
  filters.status = '__all__';
  filters.category = '';
  filters.audience = '';
  filters.sort = 'created';
  filters.direction = 'desc';
  loadAnnouncements();
}

onMounted(() => {
  loadAnnouncements();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">公告</p>
        <h3 class="page-section__title">公告管理</h3>
        <p class="page__subtitle">管理系统公告与推送范围。</p>
      </div>
      <div class="page-section__actions">
        <Button type="button" @click="openCreateModal">新建公告</Button>
      </div>
    </header>

    <form class="form-grid form-grid--wide" @submit.prevent="applyFilters">
      <div class="stack stack--tight grid-span-2">
        <Label>搜索</Label>
        <Input v-model="filters.q" type="text" placeholder="标题关键词" />
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
            <SelectItem :value="2">已发布</SelectItem>
            <SelectItem :value="3">已归档</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>分类</Label>
        <Select v-model="filters.category">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem value="maintenance">维护</SelectItem>
            <SelectItem value="feature">功能</SelectItem>
            <SelectItem value="notice">通知</SelectItem>
            <SelectItem value="warning">警告</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>受众</Label>
        <Select v-model="filters.audience">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem value="all">全体</SelectItem>
            <SelectItem value="user">用户</SelectItem>
            <SelectItem value="admin">管理员</SelectItem>
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

    <Card>
      <CardHeader>
        <CardTitle>公告列表</CardTitle>
        <p class="panel-card__meta">共 {{ announcements.length }} 条</p>
      </CardHeader>
      <CardContent>
        <p v-if="loading" class="panel-card__empty">正在加载公告...</p>
        <p v-else-if="announcements.length === 0" class="panel-card__empty">暂无公告。</p>
        <div v-else class="w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>受众</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>置顶</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>发布时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="announcement in announcements" :key="announcement.id">
                <TableCell>
                  <div class="stack stack--tight">
                    <p class="font-medium">{{ announcement.title }}</p>
                    <p v-if="announcement.content" class="text-xs text-muted-foreground">
                      {{ contentPreview(announcement.content) }}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{{ categoryLabel(announcement.category) }}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{{ audienceLabel(announcement.audience || 'all') }}</Badge>
                </TableCell>
                <TableCell>
                  <Badge :variant="statusVariant(announcement)">{{ statusLabel(announcement) }}</Badge>
                </TableCell>
                <TableCell>
                  <Badge v-if="announcement.is_pinned" variant="default">置顶</Badge>
                  <span v-else class="text-xs text-muted-foreground">-</span>
                </TableCell>
                <TableCell>{{ announcement.priority || 0 }}</TableCell>
                <TableCell>
                  <span v-if="announcement.published_at" class="text-xs text-muted-foreground">
                    {{ formatDateTime(announcement.published_at) }}
                  </span>
                  <span v-else class="text-xs text-muted-foreground">未发布</span>
                </TableCell>
                <TableCell>
                  <div class="cluster">
                    <Button
                      v-if="!announcement.published_at"
                      size="sm"
                      variant="secondary"
                      type="button"
                      @click="openEditModal(announcement)"
                    >
                      编辑
                    </Button>
                    <Button size="sm" type="button" @click="openPublishModal(announcement)">
                      {{ announcement.published_at ? '重新发布' : '发布' }}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-if="pagination?.has_next" class="list-footer">
          <Button
            variant="secondary"
            type="button"
            :disabled="isLoadingMore"
            @click="loadMore"
          >
            {{ isLoadingMore ? '加载中...' : '加载更多' }}
          </Button>
          <p class="text-xs text-muted-foreground">
            已显示 {{ announcements.length }} / {{ pagination.total_count }}
          </p>
        </div>
      </CardContent>
    </Card>

    <Dialog v-model:open="showCreateModal">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新建公告</DialogTitle>
          <DialogDescription>发布给用户或管理员的系统通知。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label for="create-title">标题 *</Label>
            <Input id="create-title" v-model="createForm.title" type="text" placeholder="公告标题" />
          </div>
          <div class="stack stack--tight">
            <Label>内容 *</Label>
            <RichTextEditor v-model="createForm.content" placeholder="公告正文" />
          </div>
          <div class="form-grid">
            <div class="stack stack--tight">
              <Label>分类</Label>
              <Select v-model="createForm.category">
                <SelectTrigger>
                  <SelectValue placeholder="不设置" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__">不设置</SelectItem>
                  <SelectItem value="maintenance">维护</SelectItem>
                  <SelectItem value="feature">功能</SelectItem>
                  <SelectItem value="notice">通知</SelectItem>
                  <SelectItem value="warning">警告</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="stack stack--tight">
              <Label>受众</Label>
              <Select v-model="createForm.audience">
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全体</SelectItem>
                  <SelectItem value="user">用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="create-priority">优先级</Label>
              <Input id="create-priority" v-model.number="createForm.priority" type="number" min="0" />
            </div>
            <div class="cluster cluster--center form__field--offset">
              <Checkbox id="create-pinned" v-model="createForm.is_pinned" />
              <Label for="create-pinned">置顶显示</Label>
            </div>
          </div>
          <div class="stack stack--tight">
            <Label for="create-by">创建人</Label>
            <Input id="create-by" v-model="createForm.created_by" type="text" placeholder="可选" />
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeCreateModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreate">
            {{ isSaving ? '创建中...' : '创建公告' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditModal">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑公告</DialogTitle>
          <DialogDescription>更新公告内容与展示设置。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label for="edit-title">标题</Label>
            <Input id="edit-title" v-model="editForm.title" type="text" placeholder="公告标题" />
          </div>
          <div class="stack stack--tight">
            <Label>内容</Label>
            <RichTextEditor v-model="editForm.content" placeholder="公告正文" />
          </div>
          <div class="form-grid">
            <div class="stack stack--tight">
              <Label>分类</Label>
              <Select v-model="editForm.category">
                <SelectTrigger>
                  <SelectValue placeholder="不设置" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset__">不设置</SelectItem>
                  <SelectItem value="maintenance">维护</SelectItem>
                  <SelectItem value="feature">功能</SelectItem>
                  <SelectItem value="notice">通知</SelectItem>
                  <SelectItem value="warning">警告</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="stack stack--tight">
              <Label>受众</Label>
              <Select v-model="editForm.audience">
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全体</SelectItem>
                  <SelectItem value="user">用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="form-grid">
            <div class="stack stack--tight">
              <Label for="edit-priority">优先级</Label>
              <Input id="edit-priority" v-model.number="editForm.priority" type="number" min="0" />
            </div>
            <div class="cluster cluster--center form__field--offset">
              <Checkbox id="edit-pinned" v-model="editForm.is_pinned" />
              <Label for="edit-pinned">置顶显示</Label>
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

    <Dialog v-model:open="showPublishModal">
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle>发布公告</DialogTitle>
          <DialogDescription>发布后，公告将按受众范围展示。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label for="publish-visible-to">可见截止（Unix 时间戳）</Label>
            <Input
              id="publish-visible-to"
              v-model.number="publishForm.visible_to"
              type="number"
              min="0"
              placeholder="0 表示不过期"
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
  </div>
</template>
