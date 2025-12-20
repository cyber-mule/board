<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { userApi } from '../../../api';
import { formatDateTime } from '../../../utils/format';
import type { UserAnnouncementSummary } from '../../../api/types';

const announcements = ref<UserAnnouncementSummary[]>([]);
const loading = ref(true);
const errorMessage = ref('');

const filters = reactive({
  audience: '',
  limit: 20,
  keyword: '',
  category: '',
});

const filteredAnnouncements = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  const list = announcements.value.filter((announcement) => {
    if (filters.category && announcement.category !== filters.category) {
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

async function loadAnnouncements() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await userApi.fetchUserAnnouncements({
      limit: filters.limit,
      audience: filters.audience || undefined,
    });
    announcements.value = response.announcements ?? [];
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load announcements';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadAnnouncements();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">Announcements</p>
        <h3 class="page-section__title">Latest updates</h3>
        <p class="page__subtitle">Pinned and public announcements for end users.</p>
      </div>
      <div class="page-section__actions">
        <button class="button button--ghost" type="button" @click="loadAnnouncements" :disabled="loading">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </header>

    <form class="filter-bar" @submit.prevent="loadAnnouncements">
      <label class="form__field form__field--compact">
        <span>Audience</span>
        <select v-model="filters.audience">
          <option value="">All</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="partner">Partner</option>
        </select>
      </label>
      <label class="form__field form__field--compact">
        <span>Limit</span>
        <select v-model.number="filters.limit">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
      </label>
      <label class="form__field form__field--compact">
        <span>Category</span>
        <select v-model="filters.category">
          <option value="">All</option>
          <option v-for="category in availableCategories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </label>
      <label class="form__field form__field--compact">
        <span>Keyword</span>
        <input v-model="filters.keyword" type="search" placeholder="Search announcements" />
      </label>
      <button class="button" type="submit" :disabled="loading">Apply</button>
    </form>

    <p v-if="errorMessage" class="alert">{{ errorMessage }}</p>

    <article class="panel-card">
      <header class="panel-card__header">
        <div>
          <h3>Announcement list</h3>
          <p class="panel-card__meta">Latest 20 entries</p>
        </div>
      </header>
      <div v-if="loading" class="panel-card__empty">Loading announcements...</div>
      <div v-else-if="filteredAnnouncements.length === 0" class="panel-card__empty">
        No announcements available.
      </div>
      <ul v-else class="data-list">
        <li
          v-for="announcement in filteredAnnouncements"
          :key="announcement.id"
          :class="['data-row', 'data-row--stack', { 'data-row--pinned': announcement.is_pinned }]"
        >
          <div>
            <p class="data-row__title">{{ announcement.title }}</p>
            <p class="data-row__meta">
              {{ announcement.category || 'General' }} ·
              {{ formatDateTime(announcement.published_at || announcement.visible_from) }}
            </p>
          </div>
          <div class="data-row__aside">
            <span class="tag">{{ announcement.audience || 'All users' }}</span>
            <span class="data-row__meta">{{ announcement.is_pinned ? 'Pinned' : 'Standard' }}</span>
            <span v-if="announcement.is_pinned" class="tag tag--highlight">Pinned</span>
          </div>
        </li>
      </ul>
    </article>
  </div>
</template>
