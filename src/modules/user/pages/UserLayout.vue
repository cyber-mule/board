<script setup lang="ts">
import { useRouter } from 'vue-router';
import { clearSession } from '../../../auth/tokens';

const router = useRouter();

function handleLogout() {
  clearSession();
  router.replace({ name: 'login' });
}
</script>

<template>
  <section class="page page--wide user-shell">
    <header class="page__header">
      <div>
        <p class="page__eyebrow">User Portal</p>
        <h2>My account</h2>
        <p class="page__subtitle">Track subscriptions, orders, and announcements.</p>
      </div>
      <div class="page__actions">
        <button class="button" type="button" @click="handleLogout">Sign out</button>
      </div>
    </header>

    <nav class="subnav">
      <RouterLink to="/user" class="subnav__link">Overview</RouterLink>
      <RouterLink to="/user/subscriptions" class="subnav__link">Subscriptions</RouterLink>
      <RouterLink to="/user/plans" class="subnav__link">Plans</RouterLink>
      <RouterLink to="/user/orders" class="subnav__link">Orders</RouterLink>
      <RouterLink to="/user/announcements" class="subnav__link">Announcements</RouterLink>
    </nav>

    <div class="page__content">
      <RouterView />
    </div>
  </section>
</template>
