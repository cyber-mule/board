<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi } from '../../../api';
import { formatDateTime } from '../../../utils/format';
import type {
  AdminUserSummary,
  CreateAdminUserRequest,
  PaginationMeta,
  ResetUserPasswordRequest,
  UpdateUserStatusRequest,
} from '../../../api/types';

const users = ref<AdminUserSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');
const actionMessage = ref('');
const actionError = ref('');

const selectedUserId = ref<number | null>(null);
const selectedUser = computed(() => {
  if (!selectedUserId.value) {
    return null;
  }
  return users.value.find((user) => user.id === selectedUserId.value) ?? null;
});

const perPage = 12;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  q: '',
  status: '__all__' as number | string,
  role: '',
});

const showCreateModal = ref(false);
const showStatusModal = ref(false);
const showRolesModal = ref(false);
const showResetModal = ref(false);
const showLogoutModal = ref(false);
const isSaving = ref(false);

const createForm = reactive<CreateAdminUserRequest>({
  email: '',
  password: '',
  display_name: '',
  status: 1,
  email_verified: false,
});
const createRolesInput = ref('');

const statusForm = reactive<UpdateUserStatusRequest>({
  status: 1,
});

const rolesInput = ref('');

const resetForm = reactive<ResetUserPasswordRequest>({
  password: '',
});

function statusVariant(value?: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (value) {
    case 1:
      return 'default';
    case 2:
      return 'secondary';
    case 3:
      return 'destructive';
    default:
      return 'outline';
  }
}

function statusLabel(value?: number) {
  switch (value) {
    case 1:
      return '正常';
    case 2:
      return '待激活';
    case 3:
      return '已禁用';
    default:
      return '未知';
  }
}

function formatRoles(roles?: string[]) {
  if (!roles || roles.length === 0) {
    return '-';
  }
  return roles.join(', ');
}

function parseRolesInput(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function ensureSelection(list: AdminUserSummary[]) {
  if (!list.length) {
    selectedUserId.value = null;
    return;
  }
  if (selectedUserId.value && list.some((user) => user.id === selectedUserId.value)) {
    return;
  }
  selectedUserId.value = list[0].id;
}

function updateUserInList(user: AdminUserSummary) {
  users.value = users.value.map((item) => (item.id === user.id ? user : item));
  if (selectedUserId.value === user.id) {
    selectedUserId.value = user.id;
  }
}

function clearMessages() {
  actionMessage.value = '';
  actionError.value = '';
}

async function loadUsers() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminUsers({
      page: 1,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      role: filters.role && filters.role !== '__all__' ? filters.role : undefined,
    });
    users.value = response.users ?? [];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? 1;
    ensureSelection(users.value);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载用户失败';
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (!pagination.value?.has_next || isLoadingMore.value) {
    return;
  }

  isLoadingMore.value = true;
  errorMessage.value = '';

  const targetPage = page.value + 1;

  try {
    const response = await adminApi.fetchAdminUsers({
      page: targetPage,
      per_page: perPage,
      q: filters.q || undefined,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      role: filters.role && filters.role !== '__all__' ? filters.role : undefined,
    });
    users.value = [...users.value, ...(response.users ?? [])];
    pagination.value = response.pagination ?? null;
    page.value = response.pagination?.page ?? targetPage;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载更多用户失败';
  } finally {
    isLoadingMore.value = false;
  }
}

function resetFilters() {
  filters.q = '';
  filters.status = '__all__';
  filters.role = '';
  loadUsers();
}

function openCreateModal() {
  createForm.email = '';
  createForm.password = '';
  createForm.display_name = '';
  createForm.status = 1;
  createForm.email_verified = false;
  createRolesInput.value = '';
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

async function handleCreate() {
  clearMessages();

  if (!createForm.email || !createForm.password) {
    actionError.value = '请填写邮箱与密码。';
    return;
  }

  isSaving.value = true;

  try {
    const payload: CreateAdminUserRequest = {
      email: createForm.email,
      password: createForm.password,
      display_name: createForm.display_name || undefined,
      status: createForm.status || undefined,
      email_verified: createForm.email_verified === true,
      roles: parseRolesInput(createRolesInput.value),
    };
    const response = await adminApi.createAdminUser(payload);
    actionMessage.value = `已创建用户 ${response.user.email}。`;
    closeCreateModal();
    await loadUsers();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '创建用户失败';
  } finally {
    isSaving.value = false;
  }
}

function openStatusModal() {
  if (!selectedUser.value) {
    return;
  }
  statusForm.status = selectedUser.value.status ?? 1;
  showStatusModal.value = true;
}

function closeStatusModal() {
  showStatusModal.value = false;
}

async function handleStatusUpdate() {
  if (!selectedUser.value) {
    return;
  }

  clearMessages();
  isSaving.value = true;

  try {
    const response = await adminApi.updateAdminUserStatus(selectedUser.value.id, statusForm);
    updateUserInList(response.user);
    actionMessage.value = `用户 ${response.user.email} 状态已更新。`;
    closeStatusModal();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '更新用户状态失败';
  } finally {
    isSaving.value = false;
  }
}

function openRolesModal() {
  if (!selectedUser.value) {
    return;
  }
  rolesInput.value = selectedUser.value.roles?.join(', ') ?? '';
  showRolesModal.value = true;
}

function closeRolesModal() {
  showRolesModal.value = false;
}

async function handleRolesUpdate() {
  if (!selectedUser.value) {
    return;
  }

  clearMessages();
  isSaving.value = true;

  try {
    const roles = parseRolesInput(rolesInput.value);
    const response = await adminApi.updateAdminUserRoles(selectedUser.value.id, { roles });
    updateUserInList(response.user);
    actionMessage.value = `用户 ${response.user.email} 角色已更新。`;
    closeRolesModal();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '更新角色失败';
  } finally {
    isSaving.value = false;
  }
}

function openResetModal() {
  if (!selectedUser.value) {
    return;
  }
  resetForm.password = '';
  showResetModal.value = true;
}

function closeResetModal() {
  showResetModal.value = false;
}

async function handleResetPassword() {
  if (!selectedUser.value) {
    return;
  }
  clearMessages();
  if (!resetForm.password) {
    actionError.value = '请输入新密码。';
    return;
  }

  isSaving.value = true;

  try {
    const response = await adminApi.resetAdminUserPassword(selectedUser.value.id, resetForm);
    actionMessage.value = response.message || '密码已重置。';
    closeResetModal();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '重置密码失败';
  } finally {
    isSaving.value = false;
  }
}

function openLogoutModal() {
  if (!selectedUser.value) {
    return;
  }
  showLogoutModal.value = true;
}

function closeLogoutModal() {
  showLogoutModal.value = false;
}

async function handleForceLogout() {
  if (!selectedUser.value) {
    return;
  }

  clearMessages();
  isSaving.value = true;

  try {
    const response = await adminApi.forceAdminUserLogout(selectedUser.value.id);
    actionMessage.value = response.message || '已强制下线用户。';
    closeLogoutModal();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '强制下线失败';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">用户</p>
        <h3 class="page-section__title">用户管理</h3>
        <p class="page__subtitle">查看用户状态并进行角色与密码维护。</p>
      </div>
      <div class="page-section__actions">
        <Button type="button" @click="openCreateModal">新建用户</Button>
      </div>
    </header>

    <form class="form-grid form-grid--wide" @submit.prevent="loadUsers">
      <div class="stack stack--tight grid-span-2">
        <Label>搜索</Label>
        <Input v-model="filters.q" type="text" placeholder="邮箱或显示名称" />
      </div>
      <div class="stack stack--tight">
        <Label>状态</Label>
        <Select v-model="filters.status">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem :value="1">正常</SelectItem>
            <SelectItem :value="2">待激活</SelectItem>
            <SelectItem :value="3">已禁用</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="stack stack--tight">
        <Label>角色</Label>
        <Select v-model="filters.role">
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="cluster cluster--end">
        <Button type="submit">应用</Button>
        <Button variant="secondary" type="button" @click="resetFilters">重置</Button>
      </div>
    </form>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>
    <Alert v-if="actionMessage" class="border-emerald-200 bg-emerald-50 text-emerald-800">
      <AlertTitle>操作成功</AlertTitle>
      <AlertDescription>{{ actionMessage }}</AlertDescription>
    </Alert>
    <Alert v-if="actionError" variant="destructive">
      <AlertTitle>操作失败</AlertTitle>
      <AlertDescription>{{ actionError }}</AlertDescription>
    </Alert>

    <div class="split-grid">
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <p class="panel-card__meta">每页最多 {{ perPage }} 条</p>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载用户...</p>
          <p v-else-if="users.length === 0" class="panel-card__empty">暂无用户。</p>
          <ul v-else class="data-list">
            <li
              v-for="user in users"
              :key="user.id"
              :class="['data-row', 'data-row--stack', { 'data-row--selected': user.id === selectedUserId }]"
            >
              <div class="cursor-pointer" @click="selectedUserId = user.id">
                <p class="data-row__title">{{ user.display_name || user.email }}</p>
                <p class="data-row__meta">{{ user.email }}</p>
                <p class="data-row__meta">角色：{{ formatRoles(user.roles) }}</p>
              </div>
              <div class="data-row__aside">
                <Badge :variant="statusVariant(user.status)">{{ statusLabel(user.status) }}</Badge>
                <span class="data-row__meta">{{ formatDateTime(user.last_login_at) }}</span>
              </div>
            </li>
          </ul>
          <div v-if="pagination?.has_next" class="list-footer">
            <Button variant="secondary" type="button" :disabled="isLoadingMore" @click="loadMore">
              {{ isLoadingMore ? '加载中...' : '加载更多' }}
            </Button>
            <p class="text-xs text-muted-foreground">
              已显示 {{ users.length }} / {{ pagination.total_count }}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="cluster cluster--between cluster--start cluster--wide">
          <div>
            <CardTitle>用户详情</CardTitle>
            <p class="panel-card__meta">
              {{ selectedUser ? `用户 #${selectedUser.id}` : '请选择用户' }}
            </p>
          </div>
          <div class="cluster cluster--center">
            <Button variant="secondary" type="button" :disabled="loading" @click="loadUsers">
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="panel-card__empty">正在加载用户...</p>
          <p v-else-if="!selectedUser" class="panel-card__empty">请选择用户查看详情。</p>
          <div v-else class="stack">
            <div class="cluster">
              <Badge :variant="statusVariant(selectedUser.status)">{{ statusLabel(selectedUser.status) }}</Badge>
              <Badge v-if="selectedUser.roles?.length" variant="secondary">
                {{ formatRoles(selectedUser.roles) }}
              </Badge>
              <Badge v-else variant="outline">无角色</Badge>
            </div>
            <div class="detail-grid">
              <div>
                <p class="detail-label">邮箱</p>
                <p class="detail-value">{{ selectedUser.email }}</p>
              </div>
              <div>
                <p class="detail-label">显示名称</p>
                <p class="detail-value">{{ selectedUser.display_name || '-' }}</p>
              </div>
              <div>
                <p class="detail-label">邮箱验证</p>
                <p class="detail-value">
                  {{ selectedUser.email_verified_at ? formatDateTime(selectedUser.email_verified_at) : '未验证' }}
                </p>
              </div>
              <div>
                <p class="detail-label">最近登录</p>
                <p class="detail-value">{{ formatDateTime(selectedUser.last_login_at) }}</p>
              </div>
              <div>
                <p class="detail-label">失败次数</p>
                <p class="detail-value">{{ selectedUser.failed_login_attempts ?? 0 }}</p>
              </div>
              <div>
                <p class="detail-label">锁定至</p>
                <p class="detail-value">{{ formatDateTime(selectedUser.locked_until) }}</p>
              </div>
              <div>
                <p class="detail-label">创建时间</p>
                <p class="detail-value">{{ formatDateTime(selectedUser.created_at) }}</p>
              </div>
              <div>
                <p class="detail-label">更新时间</p>
                <p class="detail-value">{{ formatDateTime(selectedUser.updated_at) }}</p>
              </div>
            </div>
            <div class="cluster">
              <Button size="sm" variant="secondary" type="button" @click="openStatusModal">
                调整状态
              </Button>
              <Button size="sm" variant="secondary" type="button" @click="openRolesModal">
                调整角色
              </Button>
              <Button size="sm" variant="secondary" type="button" @click="openResetModal">
                重置密码
              </Button>
              <Button size="sm" variant="destructive" type="button" @click="openLogoutModal">
                强制下线
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Dialog v-model:open="showCreateModal">
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle>新建用户</DialogTitle>
          <DialogDescription>创建新账号并设置基础状态。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label for="create-email">邮箱 *</Label>
            <Input id="create-email" v-model="createForm.email" type="email" placeholder="name@example.com" />
          </div>
          <div class="stack stack--tight">
            <Label for="create-password">密码 *</Label>
            <Input id="create-password" v-model="createForm.password" type="password" placeholder="至少 8 位" />
          </div>
          <div class="stack stack--tight">
            <Label for="create-name">显示名称</Label>
            <Input id="create-name" v-model="createForm.display_name" type="text" placeholder="可选" />
          </div>
          <div class="stack stack--tight">
            <Label for="create-roles">角色</Label>
            <Input id="create-roles" v-model="createRolesInput" type="text" placeholder="admin, user" />
            <p class="text-xs text-muted-foreground">多角色用英文逗号分隔。</p>
          </div>
          <div class="stack stack--tight">
            <Label>状态</Label>
            <Select v-model="createForm.status">
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">正常</SelectItem>
                <SelectItem :value="2">待激活</SelectItem>
                <SelectItem :value="3">已禁用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="cluster cluster--center">
            <Checkbox id="create-verified" v-model="createForm.email_verified" />
            <Label for="create-verified">标记邮箱已验证</Label>
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeCreateModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreate">
            {{ isSaving ? '创建中...' : '创建用户' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showStatusModal">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>更新状态</DialogTitle>
          <DialogDescription>调整用户状态以限制或恢复访问。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label>状态</Label>
            <Select v-model="statusForm.status">
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">正常</SelectItem>
                <SelectItem :value="2">待激活</SelectItem>
                <SelectItem :value="3">已禁用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeStatusModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleStatusUpdate">
            {{ isSaving ? '保存中...' : '确认更新' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showRolesModal">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>更新角色</DialogTitle>
          <DialogDescription>多个角色使用英文逗号分隔。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label for="roles-input">角色</Label>
            <Input id="roles-input" v-model="rolesInput" type="text" placeholder="admin, user" />
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeRolesModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleRolesUpdate">
            {{ isSaving ? '保存中...' : '确认更新' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showResetModal">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>重置密码</DialogTitle>
          <DialogDescription>请为用户设置新的登录密码。</DialogDescription>
        </DialogHeader>
        <div class="stack">
          <div class="stack stack--tight">
            <Label for="reset-password">新密码</Label>
            <Input id="reset-password" v-model="resetForm.password" type="password" placeholder="至少 8 位" />
          </div>
        </div>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeResetModal">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleResetPassword">
            {{ isSaving ? '重置中...' : '确认重置' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showLogoutModal">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>强制下线</DialogTitle>
          <DialogDescription>确认强制下线该用户的当前会话？</DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-4">
          <Button variant="secondary" type="button" @click="closeLogoutModal">取消</Button>
          <Button variant="destructive" type="button" :disabled="isSaving" @click="handleForceLogout">
            {{ isSaving ? '处理中...' : '确认下线' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

