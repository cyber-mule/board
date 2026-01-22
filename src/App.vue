<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { ToastHost } from '@/components/ui/toast'
</script>

<template>
  <div class="app">
    <header class="app__header">
      <div class="app__brand">
        <span class="app__title">零号网络面板</span>
        <span class="app__subtitle">前端工作台</span>
      </div>
      <nav class="app__nav">
        <RouterLink to="/user" custom v-slot="{ href, navigate, isActive }">
          <Button
            :as="'a'"
            :href="href"
            size="sm"
            :variant="isActive ? 'default' : 'ghost'"
            @click="navigate"
          >
            用户中心
          </Button>
        </RouterLink>
        <RouterLink to="/admin" custom v-slot="{ href, navigate, isActive }">
          <Button
            :as="'a'"
            :href="href"
            size="sm"
            :variant="isActive ? 'default' : 'ghost'"
            @click="navigate"
          >
            管理控制台
          </Button>
        </RouterLink>
        <RouterLink to="/login" custom v-slot="{ href, navigate, isActive }">
          <Button
            :as="'a'"
            :href="href"
            size="sm"
            :variant="isActive ? 'default' : 'ghost'"
            @click="navigate"
          >
            登录
          </Button>
        </RouterLink>
      </nav>
    </header>
    <main class="app__main">
      <RouterView />
    </main>
    <ToastHost />
  </div>
</template>
