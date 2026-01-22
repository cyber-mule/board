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
  <section class="page page--wide admin-shell">
    <header class="page__header">
      <div>
        <p class="page__eyebrow">管理控制台</p>
        <h2>运营中心</h2>
        <p class="page__subtitle">集中管理节点、套餐与订单。</p>
      </div>
      <div class="page__actions">
        <Button type="button" variant="outline" @click="handleLogout">退出登录</Button>
      </div>
    </header>

    <nav class="subnav">
      <RouterLink to="/admin" custom v-slot="{ href, navigate, isExactActive }">
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
      <RouterLink to="/admin/nodes" custom v-slot="{ href, navigate, isActive }">
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
      <RouterLink to="/admin/protocols" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          协议
        </Button>
      </RouterLink>
      <RouterLink to="/admin/users" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          用户
        </Button>
      </RouterLink>
      <RouterLink to="/admin/templates" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          模板
        </Button>
      </RouterLink>
      <RouterLink to="/admin/subscriptions" custom v-slot="{ href, navigate, isActive }">
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
      <RouterLink to="/admin/plans" custom v-slot="{ href, navigate, isActive }">
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
      <RouterLink to="/admin/coupons" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          优惠券
        </Button>
      </RouterLink>
      <RouterLink to="/admin/announcements" custom v-slot="{ href, navigate, isActive }">
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
      <RouterLink to="/admin/payment-channels" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          支付配置
        </Button>
      </RouterLink>
      <RouterLink to="/admin/site-settings" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          站点设置
        </Button>
      </RouterLink>
      <RouterLink to="/admin/security" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          安全设置
        </Button>
      </RouterLink>
      <RouterLink to="/admin/audit-logs" custom v-slot="{ href, navigate, isActive }">
        <Button
          :as="'a'"
          :href="href"
          size="sm"
          :variant="isActive ? 'default' : 'secondary'"
          @click="navigate"
        >
          审计日志
        </Button>
      </RouterLink>
      <RouterLink to="/admin/orders" custom v-slot="{ href, navigate, isActive }">
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
    </nav>

    <div class="page__content">
      <RouterView :key="route.fullPath" />
    </div>
  </section>
</template>
