<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { registerAccount, requestPasswordReset, resetPassword, verifyEmail } from '../../../api/auth';
import { getRole } from '../../../auth/tokens';

type Mode = 'register' | 'verify' | 'forgot' | 'reset';

const route = useRoute();
const router = useRouter();

const mode = ref<Mode>('register');

const registerForm = reactive({
  email: '',
  display_name: '',
  invite_code: '',
  password: '',
  confirm: '',
  agree: false,
});

const verifyForm = reactive({
  email: '',
  code: '',
});

const forgotForm = reactive({
  email: '',
});

const resetForm = reactive({
  email: '',
  code: '',
  password: '',
  confirm: '',
});

const registerError = ref('');
const registerMessage = ref('');
const verifyNotice = ref('');
const verifyError = ref('');
const verifyMessage = ref('');
const forgotError = ref('');
const forgotMessage = ref('');
const resetError = ref('');
const resetMessage = ref('');

const registerLoading = ref(false);
const verifyLoading = ref(false);
const forgotLoading = ref(false);
const resetLoading = ref(false);

const redirectTarget = computed(() => {
  const redirect = route.query.redirect;
  return typeof redirect === 'string' ? redirect : '';
});

const modeTitle = computed(() => {
  switch (mode.value) {
    case 'verify':
      return '邮箱验证';
    case 'forgot':
      return '找回密码';
    case 'reset':
      return '重置密码';
    default:
      return '注册账号';
  }
});

const modeDescription = computed(() => {
  switch (mode.value) {
    case 'verify':
      return '输入邮箱验证码完成账号激活。';
    case 'forgot':
      return '发送验证码到邮箱，用于重置密码。';
    case 'reset':
      return '输入验证码并设置新密码。';
    default:
      return '创建新账号并开始使用控制台。';
  }
});

function normalizeMode(value: unknown): Mode | null {
  if (value === 'register' || value === 'verify' || value === 'forgot' || value === 'reset') {
    return value;
  }
  return null;
}

function switchMode(next: Mode) {
  mode.value = next;
  router.replace({ query: { ...route.query, mode: next } });
}

function resolveFallbackRoute() {
  return getRole() === 'admin' ? '/admin' : '/user';
}

async function handleRegister() {
  registerError.value = '';
  registerMessage.value = '';

  if (!registerForm.email || !registerForm.password) {
    registerError.value = '请填写邮箱与密码。';
    return;
  }

  if (registerForm.password !== registerForm.confirm) {
    registerError.value = '两次输入的密码不一致。';
    return;
  }

  if (!registerForm.agree) {
    registerError.value = '请先阅读并同意服务协议。';
    return;
  }

  registerLoading.value = true;

  try {
    const payload = {
      email: registerForm.email.trim(),
      password: registerForm.password,
      display_name: registerForm.display_name.trim() || undefined,
      invite_code: registerForm.invite_code.trim() || undefined,
    };
    const result = await registerAccount(payload);
    if (result.requires_verification) {
      verifyForm.email = payload.email;
      verifyNotice.value = '注册成功，请输入邮箱验证码完成验证。';
      switchMode('verify');
      return;
    }
    registerMessage.value = '注册成功，正在进入控制台...';
    await router.replace(redirectTarget.value || resolveFallbackRoute());
  } catch (error) {
    registerError.value = error instanceof Error ? error.message : '注册失败';
  } finally {
    registerLoading.value = false;
  }
}

async function handleVerify() {
  verifyError.value = '';
  verifyNotice.value = '';
  verifyMessage.value = '';

  if (!verifyForm.email || !verifyForm.code) {
    verifyError.value = '请填写邮箱与验证码。';
    return;
  }

  verifyLoading.value = true;

  try {
    await verifyEmail({
      email: verifyForm.email.trim(),
      code: verifyForm.code.trim(),
    });
    verifyMessage.value = '验证成功，正在进入控制台...';
    await router.replace(redirectTarget.value || resolveFallbackRoute());
  } catch (error) {
    verifyError.value = error instanceof Error ? error.message : '验证失败';
  } finally {
    verifyLoading.value = false;
  }
}

async function handleForgot() {
  forgotError.value = '';
  forgotMessage.value = '';

  if (!forgotForm.email) {
    forgotError.value = '请填写邮箱。';
    return;
  }

  forgotLoading.value = true;

  try {
    const response = await requestPasswordReset({ email: forgotForm.email.trim() });
    const message = response.message || '验证码已发送，请检查邮箱。';
    forgotMessage.value = message;
    resetForm.email = forgotForm.email.trim();
    resetMessage.value = message;
    switchMode('reset');
  } catch (error) {
    forgotError.value = error instanceof Error ? error.message : '发送验证码失败';
  } finally {
    forgotLoading.value = false;
  }
}

async function handleReset() {
  resetError.value = '';
  resetMessage.value = '';

  if (!resetForm.email || !resetForm.code || !resetForm.password) {
    resetError.value = '请填写邮箱、验证码与新密码。';
    return;
  }

  if (resetForm.password !== resetForm.confirm) {
    resetError.value = '两次输入的密码不一致。';
    return;
  }

  resetLoading.value = true;

  try {
    const response = await resetPassword({
      email: resetForm.email.trim(),
      code: resetForm.code.trim(),
      password: resetForm.password,
    });
    resetMessage.value = response.message || '密码已重置，请返回登录。';
  } catch (error) {
    resetError.value = error instanceof Error ? error.message : '重置密码失败';
  } finally {
    resetLoading.value = false;
  }
}

watch(
  () => route.query.mode,
  (value) => {
    const next = normalizeMode(value) ?? 'register';
    mode.value = next;
  },
  { immediate: true },
);
</script>

<template>
  <section class="page page--narrow">
    <Card>
      <CardHeader>
        <p class="page__eyebrow">零号网络面板</p>
        <CardTitle>{{ modeTitle }}</CardTitle>
        <CardDescription>{{ modeDescription }}</CardDescription>
      </CardHeader>
      <CardContent class="stack">
        <div class="cluster cluster--center">
          <Button
            size="sm"
            type="button"
            :variant="mode === 'register' ? 'default' : 'secondary'"
            @click="switchMode('register')"
          >
            注册
          </Button>
          <Button
            size="sm"
            type="button"
            :variant="mode === 'verify' ? 'default' : 'secondary'"
            @click="switchMode('verify')"
          >
            邮箱验证
          </Button>
          <Button
            size="sm"
            type="button"
            :variant="mode === 'forgot' || mode === 'reset' ? 'default' : 'secondary'"
            @click="switchMode('forgot')"
          >
            找回密码
          </Button>
        </div>
        <Separator />

        <form v-if="mode === 'register'" class="form" @submit.prevent="handleRegister">
          <div class="stack stack--tight">
            <Label for="register-email">邮箱</Label>
            <Input
              id="register-email"
              v-model="registerForm.email"
              type="email"
              name="email"
              autocomplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div class="stack stack--tight">
            <Label for="register-name">昵称</Label>
            <Input
              id="register-name"
              v-model="registerForm.display_name"
              type="text"
              name="display_name"
              autocomplete="nickname"
              placeholder="可选"
            />
          </div>
          <div class="stack stack--tight">
            <Label for="register-invite">邀请码</Label>
            <Input
              id="register-invite"
              v-model="registerForm.invite_code"
              type="text"
              name="invite_code"
              autocomplete="off"
              placeholder="如启用邀请制请填写"
            />
          </div>
          <div class="stack stack--tight">
            <Label for="register-password">密码</Label>
            <Input
              id="register-password"
              v-model="registerForm.password"
              type="password"
              name="password"
              autocomplete="new-password"
              placeholder="至少 8 位字符"
              required
            />
          </div>
          <div class="stack stack--tight">
            <Label for="register-confirm">确认密码</Label>
            <Input
              id="register-confirm"
              v-model="registerForm.confirm"
              type="password"
              name="confirm"
              autocomplete="new-password"
              placeholder="再次输入密码"
              required
            />
          </div>
          <div class="cluster cluster--center">
            <Checkbox id="register-agree" v-model="registerForm.agree" />
            <Label for="register-agree">已阅读并同意服务协议与隐私政策</Label>
          </div>
          <p class="text-xs text-muted-foreground">
            若系统要求邮箱验证，注册后需输入验证码完成激活。
          </p>
          <Button class="w-full" type="submit" :disabled="registerLoading">
            {{ registerLoading ? '提交中...' : '注册账号' }}
          </Button>
          <Alert v-if="registerMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertTitle>注册成功</AlertTitle>
            <AlertDescription>{{ registerMessage }}</AlertDescription>
          </Alert>
          <Alert v-if="registerError" variant="destructive">
            <AlertTitle>注册失败</AlertTitle>
            <AlertDescription>{{ registerError }}</AlertDescription>
          </Alert>
        </form>

        <form v-else-if="mode === 'verify'" class="form" @submit.prevent="handleVerify">
          <div class="stack stack--tight">
            <Label for="verify-email">邮箱</Label>
            <Input
              id="verify-email"
              v-model="verifyForm.email"
              type="email"
              name="email"
              autocomplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div class="stack stack--tight">
            <Label for="verify-code">验证码</Label>
            <Input
              id="verify-code"
              v-model="verifyForm.code"
              type="text"
              name="code"
              autocomplete="one-time-code"
              placeholder="输入邮件中的验证码"
              required
            />
          </div>
          <p class="text-xs text-muted-foreground">未收到验证码？请检查垃圾箱或稍后重试。</p>
          <Button class="w-full" type="submit" :disabled="verifyLoading">
            {{ verifyLoading ? '验证中...' : '完成验证' }}
          </Button>
          <Alert v-if="verifyNotice">
            <AlertTitle>提示</AlertTitle>
            <AlertDescription>{{ verifyNotice }}</AlertDescription>
          </Alert>
          <Alert v-if="verifyMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertTitle>验证成功</AlertTitle>
            <AlertDescription>{{ verifyMessage }}</AlertDescription>
          </Alert>
          <Alert v-if="verifyError" variant="destructive">
            <AlertTitle>验证失败</AlertTitle>
            <AlertDescription>{{ verifyError }}</AlertDescription>
          </Alert>
        </form>

        <form v-else-if="mode === 'forgot'" class="form" @submit.prevent="handleForgot">
          <div class="stack stack--tight">
            <Label for="forgot-email">邮箱</Label>
            <Input
              id="forgot-email"
              v-model="forgotForm.email"
              type="email"
              name="email"
              autocomplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <p class="text-xs text-muted-foreground">验证码发送后可进入重置密码步骤。</p>
          <Button class="w-full" type="submit" :disabled="forgotLoading">
            {{ forgotLoading ? '发送中...' : '发送验证码' }}
          </Button>
          <Alert v-if="forgotMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertTitle>已发送</AlertTitle>
            <AlertDescription>{{ forgotMessage }}</AlertDescription>
          </Alert>
          <Alert v-if="forgotError" variant="destructive">
            <AlertTitle>发送失败</AlertTitle>
            <AlertDescription>{{ forgotError }}</AlertDescription>
          </Alert>
        </form>

        <form v-else class="form" @submit.prevent="handleReset">
          <div class="stack stack--tight">
            <Label for="reset-email">邮箱</Label>
            <Input
              id="reset-email"
              v-model="resetForm.email"
              type="email"
              name="email"
              autocomplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div class="stack stack--tight">
            <Label for="reset-code">验证码</Label>
            <Input
              id="reset-code"
              v-model="resetForm.code"
              type="text"
              name="code"
              autocomplete="one-time-code"
              placeholder="输入邮件中的验证码"
              required
            />
          </div>
          <div class="stack stack--tight">
            <Label for="reset-password">新密码</Label>
            <Input
              id="reset-password"
              v-model="resetForm.password"
              type="password"
              name="password"
              autocomplete="new-password"
              placeholder="设置新密码"
              required
            />
          </div>
          <div class="stack stack--tight">
            <Label for="reset-confirm">确认新密码</Label>
            <Input
              id="reset-confirm"
              v-model="resetForm.confirm"
              type="password"
              name="confirm"
              autocomplete="new-password"
              placeholder="再次输入新密码"
              required
            />
          </div>
          <Button class="w-full" type="submit" :disabled="resetLoading">
            {{ resetLoading ? '提交中...' : '重置密码' }}
          </Button>
          <Alert v-if="resetMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertTitle>操作成功</AlertTitle>
            <AlertDescription>{{ resetMessage }}</AlertDescription>
          </Alert>
          <Alert v-if="resetError" variant="destructive">
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{{ resetError }}</AlertDescription>
          </Alert>
        </form>
      </CardContent>
      <CardFooter class="stack">
        <Separator />
        <div class="helper">
          <p class="helper__title">已有账号？</p>
          <p class="helper__text">返回登录后进入控制台。</p>
          <div class="helper__actions">
            <RouterLink to="/login" custom v-slot="{ href, navigate }">
              <Button :as="'a'" :href="href" variant="secondary" @click="navigate">
                返回登录
              </Button>
            </RouterLink>
          </div>
        </div>
      </CardFooter>
    </Card>
  </section>
</template>
