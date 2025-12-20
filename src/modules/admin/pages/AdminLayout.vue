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
  <section class="page page--wide admin-shell">
    <header class="page__header">
      <div>
        <p class="page__eyebrow">Admin Console</p>
        <h2>Operations</h2>
        <p class="page__subtitle">Manage nodes, plans, and orders.</p>
      </div>
      <div class="page__actions">
        <button class="button" type="button" @click="handleLogout">Sign out</button>
      </div>
    </header>

    <nav class="subnav">
      <RouterLink to="/admin" class="subnav__link">Overview</RouterLink>
      <RouterLink to="/admin/nodes" class="subnav__link">Nodes</RouterLink>
      <RouterLink to="/admin/plans" class="subnav__link">Plans</RouterLink>
      <RouterLink to="/admin/orders" class="subnav__link">Orders</RouterLink>
    </nav>

    <div class="page__content">
      <RouterView />
    </div>
  </section>
</template>
