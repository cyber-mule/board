<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminApi } from '../../../api';
import type { UpdateSiteSettingRequest } from '../../../api/types';

const loading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const actionMessage = ref('');

const form = reactive<UpdateSiteSettingRequest>({
  name: '',
  logo_url: '',
});

async function loadSettings() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminSiteSettings();
    form.name = response.setting.name;
    form.logo_url = response.setting.logo_url || '';
  } catch (error) {
    errorMessage.value = '站点配置加载失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  isSaving.value = true;
  actionMessage.value = '';
  errorMessage.value = '';

  try {
    const response = await adminApi.updateAdminSiteSettings({
      name: form.name?.trim() || undefined,
      logo_url: form.logo_url?.trim() || undefined,
    });
    form.name = response.setting.name;
    form.logo_url = response.setting.logo_url || '';
    actionMessage.value = '站点配置已更新。';
  } catch (error) {
    errorMessage.value = '保存失败，请稍后重试。';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});
</script>

<template>
  <section class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">站点</p>
        <h3 class="page-section__title">站点配置</h3>
        <p class="page__subtitle">更新站点名称与品牌标识。</p>
      </div>
      <div class="page-section__actions">
        <Button type="button" variant="secondary" @click="loadSettings" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新' }}
        </Button>
        <Button type="button" @click="handleSave" :disabled="isSaving || loading">
          {{ isSaving ? '保存中...' : '保存' }}
        </Button>
      </div>
    </header>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>操作失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>
    <Alert v-if="actionMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
      <AlertTitle>更新成功</AlertTitle>
      <AlertDescription>{{ actionMessage }}</AlertDescription>
    </Alert>

    <Card class="panel-card--full">
      <CardHeader>
        <CardTitle>基础信息</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="form-grid">
          <div>
            <Label for="site-name">站点名称</Label>
            <Input id="site-name" v-model="form.name" placeholder="Zero Network Panel" />
          </div>
          <div>
            <Label for="site-logo">Logo URL</Label>
            <Input id="site-logo" v-model="form.logo_url" placeholder="https://..." />
          </div>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
