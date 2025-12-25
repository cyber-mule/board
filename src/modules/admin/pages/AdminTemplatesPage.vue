<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
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

async function loadTemplates() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminTemplates({
      page: 1,
      per_page: perPage,
      q: filters.q || undefined,
      client_type: filters.client_type || undefined,
      format: filters.format || undefined,
      include_drafts: filters.include_drafts,
      sort: filters.sort,
      direction: filters.direction,
    });
    templates.value = response.templates ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load templates';
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
      client_type: filters.client_type || undefined,
      format: filters.format || undefined,
      include_drafts: filters.include_drafts,
      sort: filters.sort,
      direction: filters.direction,
    });
    templates.value = [...templates.value, ...(response.templates ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load more templates';
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
    errorMessage.value = 'Please fill in all required fields';
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';

  try {
    await adminApi.createAdminTemplate(createForm);
    closeCreateModal();
    await loadTemplates();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create template';
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
    errorMessage.value = error instanceof Error ? error.message : 'Failed to update template';
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
    errorMessage.value = error instanceof Error ? error.message : 'Failed to publish template';
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
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load history';
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

function statusTone(template: SubscriptionTemplateSummary): string {
  if (template.published_at) {
    return 'status-pill status-pill--ok';
  }
  return 'status-pill status-pill--warn';
}

function statusLabel(template: SubscriptionTemplateSummary): string {
  return template.published_at ? 'Published' : 'Draft';
}

onMounted(() => {
  loadTemplates();
});
</script>

<template>
  <div class="page-section">
    <header class="section__header">
      <div>
        <h3>Subscription Templates</h3>
        <p class="section__subtitle">
          Manage subscription configuration templates for different clients
        </p>
      </div>
      <div class="section__actions">
        <button class="button button--primary" type="button" @click="openCreateModal">
          Create Template
        </button>
      </div>
    </header>

    <!-- Filters -->
    <div class="section__filters">
      <div class="filter-group">
        <input
          v-model="filters.q"
          type="text"
          placeholder="Search by name..."
          class="input input--search"
          @keyup.enter="applyFilters"
        />
        <select v-model="filters.client_type" class="select">
          <option value="">All Clients</option>
          <option value="clash">Clash</option>
          <option value="v2ray">V2Ray</option>
          <option value="shadowsocks">Shadowsocks</option>
          <option value="surge">Surge</option>
          <option value="quantumult">Quantumult</option>
        </select>
        <select v-model="filters.format" class="select">
          <option value="">All Formats</option>
          <option value="yaml">YAML</option>
          <option value="json">JSON</option>
          <option value="text">Text</option>
        </select>
        <label class="checkbox-label">
          <input v-model="filters.include_drafts" type="checkbox" />
          <span>Include Drafts</span>
        </label>
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
      <p>Loading templates...</p>
    </div>

    <!-- Templates List -->
    <div v-else-if="templates.length > 0" class="section__content">
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Client Type</th>
              <th>Format</th>
              <th>Version</th>
              <th>Status</th>
              <th>Default</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="template in templates" :key="template.id">
              <td>
                <div>
                  <strong>{{ template.name }}</strong>
                  <p v-if="template.description" class="text-muted">
                    {{ template.description }}
                  </p>
                </div>
              </td>
              <td>
                <span class="badge">{{ template.client_type }}</span>
              </td>
              <td>
                <span class="badge">{{ template.format }}</span>
              </td>
              <td>v{{ template.version }}</td>
              <td>
                <span :class="statusTone(template)">
                  {{ statusLabel(template) }}
                </span>
              </td>
              <td>
                <span v-if="template.is_default" class="badge badge--primary">Default</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span class="text-muted">{{ formatDateTime(template.updated_at) }}</span>
              </td>
              <td>
                <div class="action-buttons">
                  <button
                    class="button button--small"
                    type="button"
                    @click="openEditModal(template)"
                  >
                    Edit
                  </button>
                  <button
                    class="button button--small button--primary"
                    type="button"
                    @click="openPublishModal(template)"
                  >
                    Publish
                  </button>
                  <button
                    class="button button--small button--secondary"
                    type="button"
                    @click="openHistoryModal(template)"
                  >
                    History
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
          Showing {{ templates.length }} of {{ pagination.total_count }} templates
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <p>No templates found. Create your first template to get started.</p>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal">
        <header class="modal__header">
          <h3>Create Template</h3>
          <button class="modal__close" type="button" @click="closeCreateModal">×</button>
        </header>
        <div class="modal__content">
          <div class="form-group">
            <label for="create-name">Name *</label>
            <input
              id="create-name"
              v-model="createForm.name"
              type="text"
              class="input"
              placeholder="Template name"
            />
          </div>
          <div class="form-group">
            <label for="create-description">Description</label>
            <textarea
              id="create-description"
              v-model="createForm.description"
              class="input"
              rows="2"
              placeholder="Template description"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="create-client">Client Type *</label>
            <select id="create-client" v-model="createForm.client_type" class="select">
              <option value="">Select client type</option>
              <option value="clash">Clash</option>
              <option value="v2ray">V2Ray</option>
              <option value="shadowsocks">Shadowsocks</option>
              <option value="surge">Surge</option>
              <option value="quantumult">Quantumult</option>
            </select>
          </div>
          <div class="form-group">
            <label for="create-format">Format *</label>
            <select id="create-format" v-model="createForm.format" class="select">
              <option value="">Select format</option>
              <option value="yaml">YAML</option>
              <option value="json">JSON</option>
              <option value="text">Text</option>
            </select>
          </div>
          <div class="form-group">
            <label for="create-content">Content *</label>
            <textarea
              id="create-content"
              v-model="createForm.content"
              class="input input--code"
              rows="10"
              placeholder="Template content"
            ></textarea>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="createForm.is_default" type="checkbox" />
              <span>Set as default template</span>
            </label>
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
          <h3>Edit Template</h3>
          <button class="modal__close" type="button" @click="closeEditModal">×</button>
        </header>
        <div class="modal__content">
          <div class="form-group">
            <label for="edit-name">Name</label>
            <input
              id="edit-name"
              v-model="editForm.name"
              type="text"
              class="input"
              placeholder="Template name"
            />
          </div>
          <div class="form-group">
            <label for="edit-description">Description</label>
            <textarea
              id="edit-description"
              v-model="editForm.description"
              class="input"
              rows="2"
              placeholder="Template description"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="edit-format">Format</label>
            <select id="edit-format" v-model="editForm.format" class="select">
              <option value="yaml">YAML</option>
              <option value="json">JSON</option>
              <option value="text">Text</option>
            </select>
          </div>
          <div class="form-group">
            <label for="edit-content">Content</label>
            <textarea
              id="edit-content"
              v-model="editForm.content"
              class="input input--code"
              rows="10"
              placeholder="Template content"
            ></textarea>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="editForm.is_default" type="checkbox" />
              <span>Set as default template</span>
            </label>
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
          <h3>Publish Template</h3>
          <button class="modal__close" type="button" @click="closePublishModal">×</button>
        </header>
        <div class="modal__content">
          <p>
            Publishing will create a new version (v{{ (selectedTemplate?.version ?? 0) + 1 }}) of
            this template.
          </p>
          <div class="form-group">
            <label for="publish-changelog">Changelog</label>
            <textarea
              id="publish-changelog"
              v-model="publishForm.changelog"
              class="input"
              rows="3"
              placeholder="What changed in this version?"
            ></textarea>
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

    <!-- History Modal -->
    <div v-if="showHistoryModal" class="modal-overlay" @click.self="closeHistoryModal">
      <div class="modal">
        <header class="modal__header">
          <h3>Template History</h3>
          <button class="modal__close" type="button" @click="closeHistoryModal">×</button>
        </header>
        <div class="modal__content">
          <div v-if="loadingHistory" class="loading-container">
            <p>Loading history...</p>
          </div>
          <div v-else-if="historyEntries.length > 0" class="history-list">
            <div v-for="entry in historyEntries" :key="entry.version" class="history-item">
              <div class="history-item__header">
                <h4>Version {{ entry.version }}</h4>
                <span class="text-muted">{{ formatDateTime(entry.published_at) }}</span>
              </div>
              <div class="history-item__content">
                <p v-if="entry.published_by" class="text-muted">
                  Published by: {{ entry.published_by }}
                </p>
                <p v-if="entry.changelog">{{ entry.changelog }}</p>
                <p v-else class="text-muted">No changelog provided</p>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>No history available for this template.</p>
          </div>
        </div>
        <footer class="modal__footer">
          <button class="button button--secondary" type="button" @click="closeHistoryModal">
            Close
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

.input--code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.8125rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-item {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.history-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.history-item__header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.history-item__content p {
  margin: 0.25rem 0;
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
