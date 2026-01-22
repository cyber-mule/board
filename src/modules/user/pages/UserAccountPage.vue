<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { userApi } from '../../../api';
import type { CredentialSummary, UserProfile } from '../../../api/types';

const loading = ref(true);
const profile = ref<UserProfile | null>(null);

const profileForm = reactive({
  display_name: '',
});

const passwordForm = reactive({
  current_password: '',
  new_password: '',
});

const emailForm = reactive({
  email: '',
  code: '',
  password: '',
});

const profileMessage = ref('');
const profileError = ref('');
const passwordMessage = ref('');
const passwordError = ref('');
const emailMessage = ref('');
const emailError = ref('');
const credentialMessage = ref('');
const credentialError = ref('');
const credential = ref<CredentialSummary | null>(null);

const isSavingProfile = ref(false);
const isSavingPassword = ref(false);
const isSavingEmail = ref(false);
const isSendingCode = ref(false);
const isRotatingCredential = ref(false);

async function loadProfile() {
  loading.value = true;
  profileError.value = '';

  try {
    const response = await userApi.fetchUserProfile();
    profile.value = response.profile;
    profileForm.display_name = response.profile.display_name;
    emailForm.email = response.profile.email;
  } catch (error) {
    profileError.value = '账户信息加载失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
}

async function handleProfileSave() {
  isSavingProfile.value = true;
  profileMessage.value = '';
  profileError.value = '';

  try {
    const response = await userApi.updateUserProfile({
      display_name: profileForm.display_name.trim(),
    });
    profile.value = response.profile;
    profileMessage.value = '资料已更新。';
  } catch (error) {
    profileError.value = '更新失败，请稍后重试。';
  } finally {
    isSavingProfile.value = false;
  }
}

async function handlePasswordUpdate() {
  isSavingPassword.value = true;
  passwordMessage.value = '';
  passwordError.value = '';

  try {
    const response = await userApi.updateUserPassword({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
    passwordMessage.value = response.message || '密码已更新。';
    passwordForm.current_password = '';
    passwordForm.new_password = '';
  } catch (error) {
    passwordError.value = '更新失败，请检查密码。';
  } finally {
    isSavingPassword.value = false;
  }
}

async function handleSendEmailCode() {
  if (!emailForm.email.trim()) {
    emailError.value = '请输入新邮箱地址。';
    return;
  }

  isSendingCode.value = true;
  emailMessage.value = '';
  emailError.value = '';

  try {
    const response = await userApi.requestUserEmailCode({
      email: emailForm.email.trim(),
    });
    emailMessage.value = response.message || '验证码已发送。';
  } catch (error) {
    emailError.value = '验证码发送失败，请稍后重试。';
  } finally {
    isSendingCode.value = false;
  }
}

async function handleEmailUpdate() {
  isSavingEmail.value = true;
  emailMessage.value = '';
  emailError.value = '';

  try {
    const response = await userApi.updateUserEmail({
      email: emailForm.email.trim(),
      code: emailForm.code.trim(),
      password: emailForm.password,
    });
    profile.value = response.profile;
    emailMessage.value = '邮箱已更新。';
    emailForm.code = '';
    emailForm.password = '';
  } catch (error) {
    emailError.value = '邮箱更新失败，请检查验证码。';
  } finally {
    isSavingEmail.value = false;
  }
}

async function handleRotateCredential() {
  isRotatingCredential.value = true;
  credentialMessage.value = '';
  credentialError.value = '';

  try {
    const response = await userApi.rotateUserCredentials();
    credential.value = response.credential;
    credentialMessage.value = '凭据已轮换。';
  } catch (error) {
    credentialError.value = '轮换失败，请稍后重试。';
  } finally {
    isRotatingCredential.value = false;
  }
}

onMounted(() => {
  void loadProfile();
});
</script>

<template>
  <section class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">账户</p>
        <h3 class="page-section__title">账号设置</h3>
        <p class="page__subtitle">管理个人资料、邮箱与安全凭据。</p>
      </div>
      <div class="page-section__actions">
        <Button type="button" variant="secondary" @click="loadProfile" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新' }}
        </Button>
      </div>
    </header>

    <Alert v-if="profileError" variant="destructive">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{{ profileError }}</AlertDescription>
    </Alert>

    <Card class="panel-card--full">
      <CardHeader>
        <CardTitle>个人资料</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="form-grid">
          <div>
            <Label for="profile-email">邮箱</Label>
            <Input id="profile-email" :model-value="profile?.email || ''" disabled />
          </div>
          <div>
            <Label for="profile-status">状态</Label>
            <div class="cluster cluster--gap">
              <Badge variant="secondary">{{ profile?.status || 'unknown' }}</Badge>
              <span class="text-xs text-muted-foreground">
                {{ profile?.email_verified_at ? '已验证' : '未验证' }}
              </span>
            </div>
          </div>
          <div class="form-grid__full">
            <Label for="profile-name">显示名称</Label>
            <Input id="profile-name" v-model="profileForm.display_name" placeholder="昵称" />
          </div>
        </div>
        <div class="panel-card__footer">
          <Button type="button" @click="handleProfileSave" :disabled="isSavingProfile">
            {{ isSavingProfile ? '保存中...' : '保存资料' }}
          </Button>
        </div>
        <p v-if="profileMessage" class="text-sm text-emerald-600">{{ profileMessage }}</p>
      </CardContent>
    </Card>

    <Card class="panel-card--full">
      <CardHeader>
        <CardTitle>修改密码</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="form-grid">
          <div>
            <Label for="current-password">当前密码</Label>
            <Input id="current-password" v-model="passwordForm.current_password" type="password" />
          </div>
          <div>
            <Label for="new-password">新密码</Label>
            <Input id="new-password" v-model="passwordForm.new_password" type="password" />
          </div>
        </div>
        <div class="panel-card__footer">
          <Button type="button" @click="handlePasswordUpdate" :disabled="isSavingPassword">
            {{ isSavingPassword ? '更新中...' : '更新密码' }}
          </Button>
        </div>
        <p v-if="passwordMessage" class="text-sm text-emerald-600">{{ passwordMessage }}</p>
        <p v-if="passwordError" class="text-sm text-rose-600">{{ passwordError }}</p>
      </CardContent>
    </Card>

    <Card class="panel-card--full">
      <CardHeader>
        <CardTitle>更换邮箱</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="form-grid">
          <div>
            <Label for="new-email">新邮箱</Label>
            <Input id="new-email" v-model="emailForm.email" />
          </div>
          <div>
            <Label for="email-code">验证码</Label>
            <Input id="email-code" v-model="emailForm.code" />
          </div>
          <div>
            <Label for="email-password">密码确认</Label>
            <Input id="email-password" v-model="emailForm.password" type="password" />
          </div>
        </div>
        <div class="panel-card__footer cluster cluster--gap">
          <Button type="button" variant="secondary" @click="handleSendEmailCode" :disabled="isSendingCode">
            {{ isSendingCode ? '发送中...' : '发送验证码' }}
          </Button>
          <Button type="button" @click="handleEmailUpdate" :disabled="isSavingEmail">
            {{ isSavingEmail ? '更新中...' : '更新邮箱' }}
          </Button>
        </div>
        <p v-if="emailMessage" class="text-sm text-emerald-600">{{ emailMessage }}</p>
        <p v-if="emailError" class="text-sm text-rose-600">{{ emailError }}</p>
      </CardContent>
    </Card>

    <Card class="panel-card--full">
      <CardHeader>
        <CardTitle>协议凭据</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="cluster cluster--between">
          <div>
            <p class="text-sm text-muted-foreground">手动轮换订阅鉴权凭据。</p>
            <p v-if="credential" class="text-sm">
              版本 {{ credential.version }} · {{ credential.status }}
            </p>
          </div>
          <Button type="button" variant="secondary" @click="handleRotateCredential" :disabled="isRotatingCredential">
            {{ isRotatingCredential ? '轮换中...' : '轮换凭据' }}
          </Button>
        </div>
        <p v-if="credentialMessage" class="text-sm text-emerald-600">{{ credentialMessage }}</p>
        <p v-if="credentialError" class="text-sm text-rose-600">{{ credentialError }}</p>
      </CardContent>
    </Card>
  </section>
</template>
