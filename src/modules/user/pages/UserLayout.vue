<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { clearSession } from '../../../auth/tokens';

const route = useRoute();
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
        <p class="page__eyebrow">用户中心</p>
        <h2>我的账号</h2>
        <p class="page__subtitle">查看订阅、订单与公告动态。</p>
      </div>
      <div class="page__actions">
        <Button type="button" variant="outline" @click="handleLogout">退出登录</Button>
      </div>
    </header>

    <nav class="subnav">
      <RouterLink to="/user" custom v-slot="{ href, navigate, isExactActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isExactActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          概览
        </Button>
      </RouterLink>
      <RouterLink to="/user/subscriptions" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          订阅
        </Button>
      </RouterLink>
      <RouterLink to="/user/plans" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          套餐
        </Button>
      </RouterLink>
      <RouterLink to="/user/nodes" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          节点
        </Button>
      </RouterLink>
      <RouterLink to="/user/orders" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          订单
        </Button>
      </RouterLink>
      <RouterLink to="/user/balance" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          余额
        </Button>
      </RouterLink>
      <RouterLink to="/user/announcements" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          公告
        </Button>
      </RouterLink>
      <RouterLink to="/user/account" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          账户
        </Button>
      </RouterLink>
    </nav>

    <div class="page__content">
      <RouterView :key="route.fullPath" />
    </div>
  </section>
</template>
