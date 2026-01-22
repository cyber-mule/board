<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
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
import { userApi } from '../../../api';
import { formatDateTime } from '../../../utils/format';
import { sanitizeHtml } from '../../../utils/sanitize';
import type { UserAnnouncementSummary } from '../../../api/types';

const announcements = ref<UserAnnouncementSummary[]>([]);
const loading = ref(true);
const errorMessage = ref('');
const selectedAnnouncementId = ref<number | null>(null);

const filters = reactive({
  audience: '',
  limit: 20,
  keyword: '',
  category: '',
});

const filteredAnnouncements = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  const list = announcements.value.filter((announcement) => {
    const audience = filters.audience;
    if (audience && audience !== '__all__') {
      const announcementAudience = announcement.audience || 'all';
      if (announcementAudience !== 'all' && announcementAudience !== audience) {
        return false;
      }
    }
    const category = filters.category;
    if (category && category !== '__all__' && announcement.category !== category) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const haystack = `${announcement.title} ${announcement.content ?? ''}`.toLowerCase();
    return haystack.includes(keyword);
  });

  return [...list].sort((a, b) => {
    const aPinned = a.is_pinned ? 1 : 0;
    const bPinned = b.is_pinned ? 1 : 0;
    if (aPinned !== bPinned) {
      return bPinned - aPinned;
    }
    const aPriority = a.priority ?? 0;
    const bPriority = b.priority ?? 0;
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    const aTime = a.published_at ?? a.visible_from ?? 0;
    const bTime = b.published_at ?? b.visible_from ?? 0;
    return bTime - aTime;
  });
});

const availableCategories = computed(() => {
  const categories = new Set<string>();
  announcements.value.forEach((announcement) => {
    if (announcement.category) {
      categories.add(announcement.category);
    }
  });
  return Array.from(categories);
});

const selectedAnnouncement = computed(() => {
  return (
    filteredAnnouncements.value.find(
      (announcement) => announcement.id === selectedAnnouncementId.value,
    ) ?? null
  );
});

const sanitizedContent = computed(() => {
  return sanitizeHtml(selectedAnnouncement.value?.content ?? '');
});

function ensureSelection(list: UserAnnouncementSummary[]) {
  if (!list.length) {
    selectedAnnouncementId.value = null;
    return;
  }
  if (selectedAnnouncementId.value && list.some((item) => item.id === selectedAnnouncementId.value)) {
    return;
  }
  selectedAnnouncementId.value = list[0].id;
}

function selectAnnouncement(announcement: UserAnnouncementSummary) {
  selectedAnnouncementId.value = announcement.id;
}

async function loadAnnouncements() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const audience =
      filters.audience && filters.audience !== '__all__' ? filters.audience : undefined;
    const response = await userApi.fetchUserAnnouncements({
      limit: filters.limit,
      audience,
    });
    announcements.value = response.announcements ?? [];
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载公告失败';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadAnnouncements();
});

watch(
  filteredAnnouncements,
  (list) => {
    ensureSelection(list);
  },
  { immediate: true },
);
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">公告</p>
        <h3 class="page-section__title">最新动态</h3>
        <p class="page__subtitle">查看置顶与公开公告。</p>
      </div>
      <div class="page-section__actions">
        <Button variant="secondary" type="button" @click="loadAnnouncements" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新列表' }}
        </Button>
      </div>
    </header>

    <form class="form-grid" @submit.prevent="loadAnnouncements">
      <div class="stack stack--tight">
        <Label>受众</Label>
        <Select v-model="filters.audience">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem value="user">用户</SelectItem>
            <SelectItem value="admin">管理员</SelectItem>
            <SelectItem value="partner">合作伙伴</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>条数</Label>
        <Select v-model.number="filters.limit">
          <SelectTrigger>
            <SelectValue placeholder="选择条数" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="10">10</SelectItem>
            <SelectItem :value="20">20</SelectItem>
            <SelectItem :value="50">50</SelectItem>
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
            <SelectItem v-for="category in availableCategories" :key="category" :value="category">
              {{ category }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>关键词</Label>
        <Input v-model="filters.keyword" type="search" placeholder="搜索公告" />
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
          <CardTitle>公告列表</CardTitle>
          <p class="panel-card__meta">最新 {{ filters.limit }} 条</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载公告...</p>
          <p v-else-if="filteredAnnouncements.length === 0" class="panel-card__empty">
            暂无公告。
          </p>
          <ul v-else class="data-list">
            <li
              v-for="announcement in filteredAnnouncements"
              :key="announcement.id"
              :class="[
                'data-row',
                'data-row--stack',
                {
                  'data-row--pinned': announcement.is_pinned,
                  'data-row--selected': announcement.id === selectedAnnouncementId,
                },
              ]"
              @click="selectAnnouncement(announcement)"
            >
              <div>
                <p class="data-row__title">{{ announcement.title }}</p>
                <p class="data-row__meta">
                  {{ announcement.category || '综合' }} ·
                  {{ formatDateTime(announcement.published_at || announcement.visible_from) }}
                </p>
              </div>
              <div class="data-row__aside">
                <Badge variant="secondary">{{ announcement.audience || '全体' }}</Badge>
                <span class="data-row__meta">{{ announcement.is_pinned ? '置顶' : '常规' }}</span>
                <Badge v-if="announcement.is_pinned" variant="default">置顶</Badge>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>公告详情</CardTitle>
          <p class="panel-card__meta">
            {{ selectedAnnouncement ? selectedAnnouncement.title : '请选择公告' }}
          </p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载公告...</p>
          <p v-else-if="!selectedAnnouncement" class="panel-card__empty">
            请选择公告查看详情。
          </p>
          <div v-else class="stack">
            <div class="cluster">
              <Badge variant="secondary">{{ selectedAnnouncement.category || '综合' }}</Badge>
              <Badge variant="outline">{{ selectedAnnouncement.audience || '全体' }}</Badge>
              <Badge v-if="selectedAnnouncement.is_pinned" variant="default">置顶</Badge>
            </div>
            <div class="detail-grid">
              <div>
                <p class="detail-label">发布时间</p>
                <p class="detail-value">
                  {{ formatDateTime(selectedAnnouncement.published_at || selectedAnnouncement.visible_from) }}
                </p>
              </div>
              <div>
                <p class="detail-label">有效期</p>
                <p class="detail-value">
                  {{ selectedAnnouncement.visible_to ? formatDateTime(selectedAnnouncement.visible_to) : '长期' }}
                </p>
              </div>
              <div>
                <p class="detail-label">优先级</p>
                <p class="detail-value">{{ selectedAnnouncement.priority ?? '-' }}</p>
              </div>
            </div>
            <div v-if="selectedAnnouncement.content" class="rich-text-content" v-html="sanitizedContent" />
            <div v-else class="preview__content">暂无公告内容。</div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
