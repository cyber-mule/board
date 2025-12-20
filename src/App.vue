<template>
  <div class="app">
    <header class="app__header">
      <div class="app__brand">
        <span class="app__title">Zero Network Panel</span>
        <span class="app__subtitle">Frontend Workspace</span>
      </div>
      <nav class="app__nav">
        <RouterLink to="/user">User Portal</RouterLink>
        <RouterLink to="/admin">Admin Console</RouterLink>
        <RouterLink to="/login">Login</RouterLink>
      </nav>
    </header>
    <main class="app__main">
      <RouterView />
    </main>
  </div>
</template>
