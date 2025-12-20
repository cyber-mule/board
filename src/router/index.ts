import { createRouter, createWebHistory } from 'vue-router';
import { getRefreshToken, getRole } from '../auth/tokens';
import { refreshTokens } from '../api/auth';
import AdminLayout from '../modules/admin/pages/AdminLayout.vue';
import AdminDashboard from '../modules/admin/pages/AdminDashboard.vue';
import AdminNodesPage from '../modules/admin/pages/AdminNodesPage.vue';
import AdminOrdersPage from '../modules/admin/pages/AdminOrdersPage.vue';
import AdminPlansPage from '../modules/admin/pages/AdminPlansPage.vue';
import UserLayout from '../modules/user/pages/UserLayout.vue';
import UserDashboard from '../modules/user/pages/UserDashboard.vue';
import UserAnnouncementsPage from '../modules/user/pages/UserAnnouncementsPage.vue';
import UserOrdersPage from '../modules/user/pages/UserOrdersPage.vue';
import UserPlansPage from '../modules/user/pages/UserPlansPage.vue';
import UserSubscriptionsPage from '../modules/user/pages/UserSubscriptionsPage.vue';
import LoginPage from '../modules/shared/pages/LoginPage.vue';

const routes = [
  { path: '/', redirect: '/user' },
  { path: '/login', name: 'login', component: LoginPage },
  {
    path: '/admin',
    meta: { role: 'admin' },
    component: AdminLayout,
    children: [
      { path: '', name: 'admin', component: AdminDashboard },
      { path: 'nodes', name: 'admin-nodes', component: AdminNodesPage },
      { path: 'plans', name: 'admin-plans', component: AdminPlansPage },
      { path: 'orders', name: 'admin-orders', component: AdminOrdersPage },
    ],
  },
  {
    path: '/user',
    component: UserLayout,
    meta: { role: 'user' },
    children: [
      { path: '', name: 'user', component: UserDashboard },
      { path: 'subscriptions', name: 'user-subscriptions', component: UserSubscriptionsPage },
      { path: 'plans', name: 'user-plans', component: UserPlansPage },
      { path: 'orders', name: 'user-orders', component: UserOrdersPage },
      { path: 'announcements', name: 'user-announcements', component: UserAnnouncementsPage },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

let refreshPromise: Promise<void> | null = null;

async function ensureSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens()
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

router.beforeEach(async (to) => {
  const requiredRole = to.meta.role as string | undefined;
  const refreshToken = getRefreshToken();

  if (to.name === 'login') {
    if (!getRole() && refreshToken) {
      try {
        await ensureSession();
      } catch (error) {
        return true;
      }
    }

    const resolvedRole = getRole();
    if (resolvedRole === 'admin') {
      return { name: 'admin' };
    }
    if (resolvedRole === 'user') {
      return { name: 'user' };
    }

    return true;
  }

  if (!requiredRole) {
    return true;
  }

  let role = getRole();

  if (!role && refreshToken) {
    try {
      await ensureSession();
    } catch (error) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
    role = getRole();
  }

  if (!role) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (role !== requiredRole) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  return true;
});

export default router;
