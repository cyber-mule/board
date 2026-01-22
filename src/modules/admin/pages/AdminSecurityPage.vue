<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Switch } from '@/components/ui/switch';
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
    form.third_party_api_enabled = response.setting.third_party_api_enabled;
    form.api_key = response.setting.api_key || '';
    form.api_secret = response.setting.api_secret || '';
    form.encryption_algorithm = response.setting.encryption_algorithm || 'HMAC-SHA256';
    form.nonce_ttl_seconds = response.setting.nonce_ttl_seconds || 300;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载安全设置失败';
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
    successMessage.value = '安全设置已更新';

    setTimeout(() => {
      successMessage.value = '';
    }, 3000);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '更新安全设置失败';
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
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">安全</p>
        <h3 class="page-section__title">安全设置</h3>
        <p class="page__subtitle">配置第三方 API 鉴权与签名校验。</p>
      </div>
    </header>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>操作失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <Alert v-if="successMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
      <AlertTitle>保存成功</AlertTitle>
      <AlertDescription>{{ successMessage }}</AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle>第三方 API</CardTitle>
      </CardHeader>
      <CardContent class="stack">
        <p class="text-sm text-muted-foreground">
          启用后，用户 API 需使用 API Key 与 Secret 进行签名验证。
        </p>
        <div class="cluster cluster--center cluster--loose">
          <Switch v-model="form.third_party_api_enabled" />
          <span class="text-sm">启用第三方 API 访问</span>
        </div>
      </CardContent>
    </Card>

    <Card v-if="form.third_party_api_enabled">
      <CardHeader>
        <CardTitle>API 凭据</CardTitle>
      </CardHeader>
      <CardContent class="stack">
        <div class="stack stack--tight">
          <Label for="api-key">API Key</Label>
          <div class="cluster">
            <Input id="api-key" v-model="form.api_key" type="text" placeholder="输入或生成 API Key" />
            <Button variant="secondary" type="button" @click="generateApiKey">生成</Button>
          </div>
          <p class="text-xs text-muted-foreground">用于请求头 X-ZNP-API-Key。</p>
        </div>
        <div class="stack stack--tight">
          <Label for="api-secret">API Secret</Label>
          <div class="cluster">
            <Input
              id="api-secret"
              v-model="form.api_secret"
              type="password"
              placeholder="输入或生成 API Secret"
            />
            <Button variant="secondary" type="button" @click="generateApiSecret">生成</Button>
          </div>
          <p class="text-xs text-muted-foreground">用于签名计算，请妥善保管。</p>
        </div>
      </CardContent>
    </Card>

    <Card v-if="form.third_party_api_enabled">
      <CardHeader>
        <CardTitle>签名配置</CardTitle>
      </CardHeader>
      <CardContent class="stack">
        <div class="stack stack--tight">
          <Label>加密算法</Label>
          <Select v-model="form.encryption_algorithm">
            <SelectTrigger>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HMAC-SHA256">HMAC-SHA256</SelectItem>
              <SelectItem value="HMAC-SHA512">HMAC-SHA512</SelectItem>
              <SelectItem value="HMAC-MD5">HMAC-MD5</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">用于签名生成与验证。</p>
        </div>
        <div class="stack stack--tight">
          <Label for="nonce-ttl">Nonce 有效期（秒）</Label>
          <Input
            id="nonce-ttl"
            v-model.number="form.nonce_ttl_seconds"
            type="number"
            min="60"
            max="3600"
            placeholder="300"
          />
          <p class="text-xs text-muted-foreground">60-3600 秒范围，防止重放攻击。</p>
        </div>
      </CardContent>
    </Card>

    <Card v-if="settings">
      <CardHeader>
        <CardTitle>信息</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="detail-grid">
          <div>
            <p class="detail-label">设置 ID</p>
            <p class="detail-value">{{ settings.id }}</p>
          </div>
          <div>
            <p class="detail-label">最近更新</p>
            <p class="detail-value">{{ formatDateTime(settings.updated_at) }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="cluster cluster--loose">
      <Button type="button" :disabled="isSaving" @click="handleSave">
        {{ isSaving ? '保存中...' : '保存设置' }}
      </Button>
      <Button variant="secondary" type="button" :disabled="isSaving" @click="loadSettings">
        重置
      </Button>
    </div>

    <p v-if="loading" class="text-sm text-muted-foreground">正在加载安全设置...</p>
  </div>
</template>

