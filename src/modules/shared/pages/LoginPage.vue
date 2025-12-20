<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
    errorMessage.value = error instanceof Error ? error.message : 'Login failed';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section class="page page--narrow">
    <header class="page__header page__header--stacked">
      <div>
        <p class="page__eyebrow">Zero Network Panel</p>
        <h2>Sign in</h2>
      </div>
      <p class="page__subtitle">Use your admin or user credentials to access the panel.</p>
    </header>

    <form class="form" @submit.prevent="handleSubmit">
      <label class="form__field">
        <span>Email</span>
        <input
          v-model="email"
          type="email"
          name="email"
          autocomplete="username"
          placeholder="you@example.com"
          required
        />
      </label>
      <label class="form__field">
        <span>Password</span>
        <input
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          placeholder="Enter your password"
          required
        />
      </label>
      <button class="button button--primary" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
      </button>
      <p v-if="errorMessage" class="form__error">{{ errorMessage }}</p>
    </form>

    <div class="divider"></div>

    <div class="helper">
      <p class="helper__title">Demo accounts</p>
      <p class="helper__text">Quick-fill local demo credentials from `frontend-guide.md`.</p>
      <div class="helper__actions">
        <button class="button button--ghost" type="button" @click="applyDemoAccount('admin')">
          Admin demo
        </button>
        <button class="button button--ghost" type="button" @click="applyDemoAccount('user')">
          User demo
        </button>
      </div>
    </div>
  </section>
</template>
