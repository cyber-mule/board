<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
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
  status: '',
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

async function loadAnnouncements() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminAnnouncements({
      page: 1,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status || undefined,
      category: filters.category || undefined,
      audience: filters.audience || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    announcements.value = response.announcements ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load announcements';
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
      status: filters.status || undefined,
      category: filters.category || undefined,
      audience: filters.audience || undefined,
      sort: filters.sort,
      direction: filters.direction,
    });
    announcements.value = [...announcements.value, ...(response.announcements ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load more announcements';
  } finally {
    isLoadingMore.value = false;
  }
}

function openCreateModal() {
  createForm.title = '';
  createForm.content = '';
  createForm.category = '';
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
  if (!createForm.title || !createForm.content) {
    errorMessage.value = 'Please fill in title and content';
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';

  try {
    await adminApi.createAdminAnnouncement(createForm);
    closeCreateModal();
    await loadAnnouncements();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create announcement';
  } finally {
    isSaving.value = false;
  }
}

function openEditModal(announcement: AnnouncementSummary) {
  selectedAnnouncement.value = announcement;
  editForm.title = announcement.title;
  editForm.content = announcement.content || '';
  editForm.category = announcement.category || '';
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
    await adminApi.updateAdminAnnouncement(selectedAnnouncement.value.id, editForm);
    closeEditModal();
    await loadAnnouncements();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to update announcement';
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
    errorMessage.value = error instanceof Error ? error.message : 'Failed to publish announcement';
  } finally {
    isSaving.value = false;
  }
}

function applyFilters() {
  loadAnnouncements();
}

function resetFilters() {
  filters.q = '';
  filters.status = '';
  filters.category = '';
  filters.audience = '';
  filters.sort = 'created';
  filters.direction = 'desc';
  loadAnnouncements();
}

function statusTone(announcement: AnnouncementSummary): string {
  if (announcement.published_at) {
    return 'status-pill status-pill--ok';
  }
  return 'status-pill status-pill--warn';
}

function statusLabel(announcement: AnnouncementSummary): string {
  return announcement.published_at ? 'Published' : 'Draft';
}

onMounted(() => {
  loadAnnouncements();
});
</script>

<template>
  <div class="page-section">
    <header class="section__header">
      <div>
        <h3>Announcements</h3>
        <p class="section__subtitle">
          Manage system announcements for users
        </p>
      </div>
      <div class="section__actions">
        <button class="button button--primary" type="button" @click="openCreateModal">
          Create Announcement
        </button>
      </div>
    </header>

    <!-- Filters -->
    <div class="section__filters">
      <div class="filter-group">
        <input
          v-model="filters.q"
          type="text"
          placeholder="Search by title..."
          class="input input--search"
          @keyup.enter="applyFilters"
        />
        <select v-model="filters.status" class="select">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <select v-model="filters.category" class="select">
          <option value="">All Categories</option>
          <option value="maintenance">Maintenance</option>
          <option value="feature">Feature</option>
          <option value="notice">Notice</option>
          <option value="warning">Warning</option>
        </select>
        <select v-model="filters.audience" class="select">
          <option value="">All Audiences</option>
          <option value="all">All Users</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>
        <button class="button" type="button" @click="applyFilters">Apply</button>
        <button class="button button--secondary" type="button" @click="resetFilters">Reset</button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="alert alert--danger">
      {{ errorMessage }}
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <p>Loading announcements...</p>
    </div>

    <!-- Announcements List -->
    <div v-else-if="announcements.length > 0" class="section__content">
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Audience</th>
              <th>Status</th>
              <th>Pinned</th>
              <th>Priority</th>
              <th>Published</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="announcement in announcements" :key="announcement.id">
              <td>
                <div>
                  <strong>{{ announcement.title }}</strong>
                  <p v-if="announcement.content" class="text-muted text-truncate">
                    {{ announcement.content.substring(0, 100) }}
                    {{ announcement.content.length > 100 ? '...' : '' }}
                  </p>
                </div>
              </td>
              <td>
                <span v-if="announcement.category" class="badge">{{ announcement.category }}</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span class="badge">{{ announcement.audience || 'all' }}</span>
              </td>
              <td>
                <span :class="statusTone(announcement)">
                  {{ statusLabel(announcement) }}
                </span>
              </td>
              <td>
                <span v-if="announcement.is_pinned" class="badge badge--primary">📌 Pinned</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>{{ announcement.priority || 0 }}</td>
              <td>
                <span v-if="announcement.published_at" class="text-muted">
                  {{ formatDateTime(announcement.published_at) }}
                </span>
                <span v-else class="text-muted">Not published</span>
              </td>
              <td>
                <div class="action-buttons">
                  <button
                    v-if="!announcement.published_at"
                    class="button button--small"
                    type="button"
                    @click="openEditModal(announcement)"
                  >
                    Edit
                  </button>
                  <button
                    class="button button--small button--primary"
                    type="button"
                    @click="openPublishModal(announcement)"
                  >
                    {{ announcement.published_at ? 'Republish' : 'Publish' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Load More -->
      <div v-if="pagination?.has_next" class="section__footer">
        <button
          class="button button--secondary"
          type="button"
          :disabled="isLoadingMore"
          @click="loadMore"
        >
          {{ isLoadingMore ? 'Loading...' : 'Load More' }}
        </button>
        <p class="text-muted">
          Showing {{ announcements.length }} of {{ pagination.total_count }} announcements
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <p>No announcements found. Create your first announcement to get started.</p>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal">
        <header class="modal__header">
          <h3>Create Announcement</h3>
          <button class="modal__close" type="button" @click="closeCreateModal">×</button>
        </header>
        <div class="modal__content">
          <div class="form-group">
            <label for="create-title">Title *</label>
            <input
              id="create-title"
              v-model="createForm.title"
              type="text"
              class="input"
              placeholder="Announcement title"
            />
          </div>
          <div class="form-group">
            <label for="create-content">Content *</label>
            <textarea
              id="create-content"
              v-model="createForm.content"
              class="input"
              rows="8"
              placeholder="Announcement content"
            ></textarea>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="create-category">Category</label>
              <select id="create-category" v-model="createForm.category" class="select">
                <option value="">None</option>
                <option value="maintenance">Maintenance</option>
                <option value="feature">Feature</option>
                <option value="notice">Notice</option>
                <option value="warning">Warning</option>
              </select>
            </div>
            <div class="form-group">
              <label for="create-audience">Audience</label>
              <select id="create-audience" v-model="createForm.audience" class="select">
                <option value="all">All Users</option>
                <option value="user">Users Only</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="create-priority">Priority</label>
              <input
                id="create-priority"
                v-model.number="createForm.priority"
                type="number"
                min="0"
                class="input"
                placeholder="0"
              />
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input v-model="createForm.is_pinned" type="checkbox" />
                <span>Pin this announcement</span>
              </label>
            </div>
          </div>
          <div class="form-group">
            <label for="create-by">Created By</label>
            <input
              id="create-by"
              v-model="createForm.created_by"
              type="text"
              class="input"
              placeholder="Your name (optional)"
            />
          </div>
        </div>
        <footer class="modal__footer">
          <button class="button button--secondary" type="button" @click="closeCreateModal">
            Cancel
          </button>
          <button
            class="button button--primary"
            type="button"
            :disabled="isSaving"
            @click="handleCreate"
          >
            {{ isSaving ? 'Creating...' : 'Create' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal">
        <header class="modal__header">
          <h3>Edit Announcement</h3>
          <button class="modal__close" type="button" @click="closeEditModal">×</button>
        </header>
        <div class="modal__content">
          <div class="form-group">
            <label for="edit-title">Title</label>
            <input
              id="edit-title"
              v-model="editForm.title"
              type="text"
              class="input"
              placeholder="Announcement title"
            />
          </div>
          <div class="form-group">
            <label for="edit-content">Content</label>
            <textarea
              id="edit-content"
              v-model="editForm.content"
              class="input"
              rows="8"
              placeholder="Announcement content"
            ></textarea>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="edit-category">Category</label>
              <select id="edit-category" v-model="editForm.category" class="select">
                <option value="">None</option>
                <option value="maintenance">Maintenance</option>
                <option value="feature">Feature</option>
                <option value="notice">Notice</option>
                <option value="warning">Warning</option>
              </select>
            </div>
            <div class="form-group">
              <label for="edit-audience">Audience</label>
              <select id="edit-audience" v-model="editForm.audience" class="select">
                <option value="all">All Users</option>
                <option value="user">Users Only</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="edit-priority">Priority</label>
              <input
                id="edit-priority"
                v-model.number="editForm.priority"
                type="number"
                min="0"
                class="input"
                placeholder="0"
              />
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input v-model="editForm.is_pinned" type="checkbox" />
                <span>Pin this announcement</span>
              </label>
            </div>
          </div>
        </div>
        <footer class="modal__footer">
          <button class="button button--secondary" type="button" @click="closeEditModal">
            Cancel
          </button>
          <button
            class="button button--primary"
            type="button"
            :disabled="isSaving"
            @click="handleUpdate"
          >
            {{ isSaving ? 'Updating...' : 'Update' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Publish Modal -->
    <div v-if="showPublishModal" class="modal-overlay" @click.self="closePublishModal">
      <div class="modal modal--small">
        <header class="modal__header">
          <h3>Publish Announcement</h3>
          <button class="modal__close" type="button" @click="closePublishModal">×</button>
        </header>
        <div class="modal__content">
          <p>
            Publishing this announcement will make it visible to users based on the audience setting.
          </p>
          <div class="form-group">
            <label for="publish-visible-to">Visible Until (Unix timestamp)</label>
            <input
              id="publish-visible-to"
              v-model.number="publishForm.visible_to"
              type="number"
              min="0"
              class="input"
              placeholder="0 for no expiry"
            />
            <small class="form-help">Leave as 0 for no expiration</small>
          </div>
          <div class="form-group">
            <label for="publish-operator">Operator</label>
            <input
              id="publish-operator"
              v-model="publishForm.operator"
              type="text"
              class="input"
              placeholder="Your name (optional)"
            />
          </div>
        </div>
        <footer class="modal__footer">
          <button class="button button--secondary" type="button" @click="closePublishModal">
            Cancel
          </button>
          <button
            class="button button--primary"
            type="button"
            :disabled="isSaving"
            @click="handlePublish"
          >
            {{ isSaving ? 'Publishing...' : 'Publish' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.section__subtitle {
  margin-top: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.section__actions {
  display: flex;
  gap: 0.75rem;
}

.section__filters {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.filter-group {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.input--search {
  flex: 1;
  min-width: 200px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding-top: 1.75rem;
}

.data-table {
  overflow-x: auto;
}

.data-table table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 0.75rem;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
}

.data-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #e5e7eb;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.badge--primary {
  background: #dbeafe;
  color: #1e40af;
}

.text-muted {
  color: #6b7280;
  font-size: 0.875rem;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.section__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  color: #6b7280;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal--small {
  max-width: 500px;
}

.modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal__close {
  font-size: 1.5rem;
  line-height: 1;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
}

.modal__close:hover {
  background: #f3f4f6;
}

.modal__content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: #374151;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.input,
.select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.input:focus,
.select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-help {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.loading-container {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.alert {
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.alert--danger {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
</style>
