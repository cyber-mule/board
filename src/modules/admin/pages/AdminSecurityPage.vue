<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { adminApi } from '../../../api';
import { formatDateTime } from '../../../utils/format';
import type { SecuritySetting, UpdateSecuritySettingsRequest } from '../../../api/types';

const settings = ref<SecuritySetting | null>(null);
const loading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const form = reactive<UpdateSecuritySettingsRequest>({
  third_party_api_enabled: false,
  api_key: '',
  api_secret: '',
  encryption_algorithm: 'HMAC-SHA256',
  nonce_ttl_seconds: 300,
});

async function loadSettings() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminSecuritySettings();
    settings.value = response.setting;
    
    // Populate form with current settings
    form.third_party_api_enabled = response.setting.third_party_api_enabled;
    form.api_key = response.setting.api_key || '';
    form.api_secret = response.setting.api_secret || '';
    form.encryption_algorithm = response.setting.encryption_algorithm || 'HMAC-SHA256';
    form.nonce_ttl_seconds = response.setting.nonce_ttl_seconds || 300;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load security settings';
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  isSaving.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const response = await adminApi.updateAdminSecuritySettings(form);
    settings.value = response.setting;
    successMessage.value = 'Security settings updated successfully';
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      successMessage.value = '';
    }, 3000);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to update security settings';
  } finally {
    isSaving.value = false;
  }
}

function generateRandomKey(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateApiKey() {
  form.api_key = generateRandomKey(32);
}

function generateApiSecret() {
  form.api_secret = generateRandomKey(64);
}

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="page-section">
    <header class="section__header">
      <div>
        <h3>Security Settings</h3>
        <p class="section__subtitle">
          Configure third-party API authentication and signature verification
        </p>
      </div>
    </header>

    <!-- Error Message -->
    <div v-if="errorMessage" class="alert alert--danger">
      {{ errorMessage }}
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="alert alert--success">
      {{ successMessage }}
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <p>Loading security settings...</p>
    </div>

    <!-- Settings Form -->
    <div v-else class="settings-form">
      <div class="form-section">
        <h4 class="form-section__title">Third-Party API</h4>
        <p class="form-section__description">
          Enable third-party API access with signature-based authentication for external integrations.
        </p>

        <div class="form-group">
          <label class="checkbox-label">
            <input v-model="form.third_party_api_enabled" type="checkbox" />
            <span>Enable Third-Party API Access</span>
          </label>
          <p class="form-help">
            When enabled, user API endpoints require signature verification using API Key and Secret.
          </p>
        </div>
      </div>

      <div v-if="form.third_party_api_enabled" class="form-section">
        <h4 class="form-section__title">API Credentials</h4>
        
        <div class="form-group">
          <label for="api-key">API Key</label>
          <div class="input-with-button">
            <input
              id="api-key"
              v-model="form.api_key"
              type="text"
              class="input"
              placeholder="Enter or generate API key"
            />
            <button
              class="button button--secondary button--small"
              type="button"
              @click="generateApiKey"
            >
              Generate
            </button>
          </div>
          <p class="form-help">
            Unique identifier sent in X-ZNP-API-Key header
          </p>
        </div>

        <div class="form-group">
          <label for="api-secret">API Secret</label>
          <div class="input-with-button">
            <input
              id="api-secret"
              v-model="form.api_secret"
              type="password"
              class="input"
              placeholder="Enter or generate API secret"
            />
            <button
              class="button button--secondary button--small"
              type="button"
              @click="generateApiSecret"
            >
              Generate
            </button>
          </div>
          <p class="form-help">
            Secret key used for signature calculation (keep confidential)
          </p>
        </div>
      </div>

      <div v-if="form.third_party_api_enabled" class="form-section">
        <h4 class="form-section__title">Signature Settings</h4>

        <div class="form-group">
          <label for="encryption-algorithm">Encryption Algorithm</label>
          <select id="encryption-algorithm" v-model="form.encryption_algorithm" class="select">
            <option value="HMAC-SHA256">HMAC-SHA256</option>
            <option value="HMAC-SHA512">HMAC-SHA512</option>
            <option value="HMAC-MD5">HMAC-MD5</option>
          </select>
          <p class="form-help">
            Algorithm used for signature generation and verification
          </p>
        </div>

        <div class="form-group">
          <label for="nonce-ttl">Nonce TTL (seconds)</label>
          <input
            id="nonce-ttl"
            v-model.number="form.nonce_ttl_seconds"
            type="number"
            min="60"
            max="3600"
            class="input"
            placeholder="300"
          />
          <p class="form-help">
            Time-to-live for nonce values (60-3600 seconds). Prevents replay attacks.
          </p>
        </div>
      </div>

      <div v-if="settings" class="form-section">
        <h4 class="form-section__title">Information</h4>
        <div class="info-grid">
          <div>
            <p class="info-label">Setting ID</p>
            <p class="info-value">{{ settings.id }}</p>
          </div>
          <div>
            <p class="info-label">Last Updated</p>
            <p class="info-value">{{ formatDateTime(settings.updated_at) }}</p>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button
          class="button button--primary"
          type="button"
          :disabled="isSaving"
          @click="handleSave"
        >
          {{ isSaving ? 'Saving...' : 'Save Settings' }}
        </button>
        <button
          class="button button--secondary"
          type="button"
          :disabled="isSaving"
          @click="loadSettings"
        >
          Reset
        </button>
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

.alert--success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.form-section__title {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.form-section__description {
  margin: 0 0 1rem 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: #374151;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.checkbox-label input[type="checkbox"] {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
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

.input-with-button {
  display: flex;
  gap: 0.5rem;
}

.input-with-button .input {
  flex: 1;
}

.form-help {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.info-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0 0 0.25rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 0.875rem;
  color: #111827;
  margin: 0;
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-start;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.button--small {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  white-space: nowrap;
}
</style>
