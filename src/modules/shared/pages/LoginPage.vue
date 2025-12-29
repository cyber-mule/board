<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { login } from '../../../api/auth';
import { getRole } from '../../../auth/tokens';

const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isSubmitting = ref(false);

const redirectTarget = computed(() => {
  const redirect = route.query.redirect;
  return typeof redirect === 'string' ? redirect : '';
});

function applyDemoAccount(role: 'admin' | 'user') {
  if (role === 'admin') {
    email.value = 'admin@example.com';
    password.value = 'P@ssw0rd!';
  } else {
    email.value = 'user@example.com';
    password.value = 'P@ssw0rd!';
  }
}

async function handleSubmit() {
  errorMessage.value = '';
  isSubmitting.value = true;

  try {
    const tokens = await login(email.value.trim(), password.value);
    const resolvedRole = tokens.role ?? getRole();
    const fallbackRoute = resolvedRole === 'admin' ? '/admin' : '/user';
    await router.replace(redirectTarget.value || fallbackRoute);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section class="page page--narrow">
    <Card>
      <CardHeader>
        <p class="page__eyebrow">零号网络面板</p>
        <CardTitle>登录</CardTitle>
        <CardDescription>使用管理员或用户账号访问控制台。</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="form" @submit.prevent="handleSubmit">
          <div class="stack stack--tight">
            <Label for="login-email">邮箱</Label>
            <Input
              id="login-email"
              v-model="email"
              type="email"
              name="email"
              autocomplete="username"
              placeholder="you@example.com"
              required
            />
          </div>
          <div class="stack stack--tight">
            <Label for="login-password">密码</Label>
            <Input
              id="login-password"
              v-model="password"
              type="password"
              name="password"
              autocomplete="current-password"
              placeholder="请输入密码"
              required
            />
          </div>
          <Button class="w-full" type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? '正在登录...' : '登录' }}
          </Button>
          <Alert v-if="errorMessage" variant="destructive">
            <AlertTitle>登录失败</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
          </Alert>
        </form>
      </CardContent>
      <CardFooter class="stack">
        <Separator />
        <div class="helper">
          <p class="helper__title">快速入口</p>
          <p class="helper__text">注册新账号或找回密码。</p>
          <div class="helper__actions">
            <RouterLink to="/register" custom v-slot="{ href, navigate }">
              <Button :as="'a'" :href="href" variant="secondary" @click="navigate">
                注册账号
              </Button>
            </RouterLink>
            <RouterLink to="/register?mode=forgot" custom v-slot="{ href, navigate }">
              <Button :as="'a'" :href="href" variant="secondary" @click="navigate">
                找回密码
              </Button>
            </RouterLink>
          </div>
        </div>
        <Separator />
        <div class="helper">
          <p class="helper__title">演示账号</p>
          <p class="helper__text">一键填充 `frontend-guide.md` 中的本地演示账号。</p>
          <div class="helper__actions">
            <Button type="button" variant="secondary" @click="applyDemoAccount('admin')">
              管理员演示
            </Button>
            <Button type="button" variant="secondary" @click="applyDemoAccount('user')">
              用户演示
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  </section>
</template>
