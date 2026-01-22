<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminApi } from '../../../api';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import type {
  CouponSummary,
  CreateCouponRequest,
  PaginationMeta,
  UpdateCouponRequest,
} from '../../../api/types';

const coupons = ref<CouponSummary[]>([]);
const loading = ref(true);
const isLoadingMore = ref(false);
const errorMessage = ref('');
const actionMessage = ref('');
const actionError = ref('');
const isSaving = ref(false);

const selectedCoupon = ref<CouponSummary | null>(null);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);

const perPage = 20;
const page = ref(1);
const pagination = ref<PaginationMeta | null>(null);

const filters = reactive({
  q: '',
  status: '__all__' as number | string,
  sort: 'created_at',
  direction: 'desc',
});

const createForm = reactive<CreateCouponRequest>({
  code: '',
  name: '',
  description: '',
  status: 1,
  discount_type: 'percent',
  discount_value: 1000,
  currency: 'USD',
  max_redemptions: undefined,
  max_redemptions_per_user: undefined,
  min_order_cents: undefined,
  starts_at: undefined,
  ends_at: undefined,
});

const editForm = reactive<UpdateCouponRequest>({
  code: '',
  name: '',
  description: '',
  status: 1,
  discount_type: 'percent',
  discount_value: 1000,
  currency: 'USD',
  max_redemptions: undefined,
  max_redemptions_per_user: undefined,
  min_order_cents: undefined,
  starts_at: undefined,
  ends_at: undefined,
});

const hasNextPage = computed(() => pagination.value?.has_next ?? false);

function statusVariant(status?: number): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 1:
      return 'default';
    case 2:
      return 'secondary';
    default:
      return 'outline';
  }
}

function statusLabel(status?: number) {
  switch (status) {
    case 1:
      return '启用';
    case 2:
      return '停用';
    default:
      return '未知';
  }
}

function discountLabel(coupon: CouponSummary): string {
  if (coupon.discount_type === 'percent') {
    return `${(coupon.discount_value / 100).toFixed(2)}%`;
  }
  return formatCurrency(coupon.discount_value, coupon.currency || 'USD');
}

function resetCreateForm() {
  createForm.code = '';
  createForm.name = '';
  createForm.description = '';
  createForm.status = 1;
  createForm.discount_type = 'percent';
  createForm.discount_value = 1000;
  createForm.currency = 'USD';
  createForm.max_redemptions = undefined;
  createForm.max_redemptions_per_user = undefined;
  createForm.min_order_cents = undefined;
  createForm.starts_at = undefined;
  createForm.ends_at = undefined;
}

function openEdit(coupon: CouponSummary) {
  selectedCoupon.value = coupon;
  editForm.code = coupon.code;
  editForm.name = coupon.name;
  editForm.description = coupon.description ?? '';
  editForm.status = coupon.status ?? 1;
  editForm.discount_type = coupon.discount_type;
  editForm.discount_value = coupon.discount_value;
  editForm.currency = coupon.currency ?? 'USD';
  editForm.max_redemptions = coupon.max_redemptions;
  editForm.max_redemptions_per_user = coupon.max_redemptions_per_user;
  editForm.min_order_cents = coupon.min_order_cents;
  editForm.starts_at = coupon.starts_at;
  editForm.ends_at = coupon.ends_at;
  showEditModal.value = true;
}

function openDelete(coupon: CouponSummary) {
  selectedCoupon.value = coupon;
  showDeleteModal.value = true;
}

async function loadCoupons(reset = true) {
  if (reset) {
    loading.value = true;
    page.value = 1;
  } else {
    isLoadingMore.value = true;
  }

  errorMessage.value = '';

  try {
    const response = await adminApi.fetchAdminCoupons({
      page: page.value,
      per_page: perPage,
      q: filters.q.trim() || undefined,
      status: filters.status && filters.status !== '__all__' ? filters.status : undefined,
      sort: filters.sort,
      direction: filters.direction,
    });

    if (reset) {
      coupons.value = response.coupons ?? [];
    } else {
      coupons.value = [...coupons.value, ...(response.coupons ?? [])];
    }
    pagination.value = response.pagination ?? null;
  } catch (error) {
    errorMessage.value = '优惠券加载失败，请稍后重试。';
  } finally {
    loading.value = false;
    isLoadingMore.value = false;
  }
}

async function loadMore() {
  if (!hasNextPage.value || isLoadingMore.value) return;
  page.value += 1;
  await loadCoupons(false);
}

async function handleCreate() {
  if (!createForm.code.trim() || !createForm.name.trim()) {
    actionError.value = '请输入优惠券码与名称。';
    return;
  }

  isSaving.value = true;
  actionError.value = '';
  actionMessage.value = '';

  try {
    await adminApi.createAdminCoupon({
      ...createForm,
      code: createForm.code.trim(),
      name: createForm.name.trim(),
      description: createForm.description?.trim() || undefined,
      currency: createForm.currency?.trim() || undefined,
    });
    actionMessage.value = '优惠券已创建。';
    showCreateModal.value = false;
    resetCreateForm();
    await loadCoupons(true);
  } catch (error) {
    actionError.value = '创建失败，请检查输入内容。';
  } finally {
    isSaving.value = false;
  }
}

async function handleUpdate() {
  if (!selectedCoupon.value) return;

  isSaving.value = true;
  actionError.value = '';
  actionMessage.value = '';

  try {
    await adminApi.updateAdminCoupon(selectedCoupon.value.id, {
      ...editForm,
      code: editForm.code?.trim(),
      name: editForm.name?.trim(),
      description: editForm.description?.trim() || undefined,
      currency: editForm.currency?.trim() || undefined,
    });
    actionMessage.value = '优惠券已更新。';
    showEditModal.value = false;
    await loadCoupons(true);
  } catch (error) {
    actionError.value = '更新失败，请稍后重试。';
  } finally {
    isSaving.value = false;
  }
}

async function handleDelete() {
  if (!selectedCoupon.value) return;

  isSaving.value = true;
  actionError.value = '';
  actionMessage.value = '';

  try {
    await adminApi.deleteAdminCoupon(selectedCoupon.value.id);
    actionMessage.value = '优惠券已删除。';
    showDeleteModal.value = false;
    await loadCoupons(true);
  } catch (error) {
    actionError.value = '删除失败，请稍后重试。';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  void loadCoupons(true);
});
</script>

<template>
  <section class="page-section">
    <header class="page-section__header">
      <div>
        <p class="page__eyebrow">促销</p>
        <h3 class="page-section__title">优惠券管理</h3>
        <p class="page__subtitle">维护优惠券状态、折扣与有效期。</p>
      </div>
      <div class="page-section__actions">
        <Button type="button" variant="secondary" @click="loadCoupons(true)" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新' }}
        </Button>
        <Button type="button" @click="showCreateModal = true">新建优惠券</Button>
      </div>
    </header>

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

    <Card class="panel-card--full">
      <CardHeader class="cluster cluster--between cluster--center">
        <div>
          <CardTitle>优惠券列表</CardTitle>
          <p class="panel-card__meta">/coupons</p>
        </div>
        <div class="cluster cluster--gap">
          <Input v-model="filters.q" placeholder="搜索优惠券码或名称" class="w-56" />
          <Select v-model="filters.status">
            <SelectTrigger class="w-36">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              <SelectItem :value="1">启用</SelectItem>
              <SelectItem :value="2">停用</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="secondary" @click="loadCoupons(true)">筛选</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>优惠码</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>折扣</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>有效期</TableHead>
              <TableHead class="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="coupon in coupons" :key="coupon.id">
              <TableCell>
                <p class="font-medium">{{ coupon.code }}</p>
                <p class="text-xs text-muted-foreground">#{{ coupon.id }}</p>
              </TableCell>
              <TableCell>
                <p class="font-medium">{{ coupon.name }}</p>
                <p class="text-xs text-muted-foreground">{{ coupon.description || '-' }}</p>
              </TableCell>
              <TableCell>{{ discountLabel(coupon) }}</TableCell>
              <TableCell>
                <Badge :variant="statusVariant(coupon.status)">{{ statusLabel(coupon.status) }}</Badge>
              </TableCell>
              <TableCell>
                <p class="text-xs">{{ formatDateTime(coupon.starts_at) }}</p>
                <p class="text-xs text-muted-foreground">{{ formatDateTime(coupon.ends_at) }}</p>
              </TableCell>
              <TableCell class="text-right">
                <Button size="sm" variant="secondary" @click="openEdit(coupon)">编辑</Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="ml-2"
                  @click="openDelete(coupon)"
                >
                  删除
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div v-if="!coupons.length && !loading" class="panel-card__empty">
          暂无优惠券。
        </div>

        <div class="panel-card__footer" v-if="pagination">
          <p class="panel-card__meta">已显示 {{ coupons.length }} / {{ pagination.total_count }}</p>
          <Button type="button" variant="secondary" @click="loadMore" :disabled="!hasNextPage || isLoadingMore">
            {{ isLoadingMore ? '加载中...' : hasNextPage ? '加载更多' : '没有更多了' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Dialog v-model:open="showCreateModal">
      <DialogContent class="dialog-content">
        <DialogHeader>
          <DialogTitle>新建优惠券</DialogTitle>
          <DialogDescription>填写优惠券规则与有效期。</DialogDescription>
        </DialogHeader>
        <div class="form-grid">
          <div>
            <Label for="coupon-code">优惠码</Label>
            <Input id="coupon-code" v-model="createForm.code" placeholder="WELCOME10" />
          </div>
          <div>
            <Label for="coupon-name">名称</Label>
            <Input id="coupon-name" v-model="createForm.name" placeholder="新用户优惠" />
          </div>
          <div>
            <Label for="coupon-type">折扣类型</Label>
            <Select v-model="createForm.discount_type">
              <SelectTrigger id="coupon-type">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">百分比</SelectItem>
                <SelectItem value="fixed">固定金额</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="coupon-value">折扣数值</Label>
            <Input id="coupon-value" v-model.number="createForm.discount_value" type="number" min="0" />
          </div>
          <div>
            <Label for="coupon-currency">币种</Label>
            <Input id="coupon-currency" v-model="createForm.currency" placeholder="USD" />
          </div>
          <div>
            <Label for="coupon-status">状态</Label>
            <Select v-model="createForm.status">
              <SelectTrigger id="coupon-status">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">启用</SelectItem>
                <SelectItem :value="2">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="coupon-min">最低金额（分）</Label>
            <Input id="coupon-min" v-model.number="createForm.min_order_cents" type="number" min="0" />
          </div>
          <div>
            <Label for="coupon-max">总次数</Label>
            <Input id="coupon-max" v-model.number="createForm.max_redemptions" type="number" min="0" />
          </div>
          <div>
            <Label for="coupon-max-user">每用户次数</Label>
            <Input id="coupon-max-user" v-model.number="createForm.max_redemptions_per_user" type="number" min="0" />
          </div>
          <div>
            <Label for="coupon-start">开始时间（Unix 秒）</Label>
            <Input id="coupon-start" v-model.number="createForm.starts_at" type="number" min="0" />
          </div>
          <div>
            <Label for="coupon-end">结束时间（Unix 秒）</Label>
            <Input id="coupon-end" v-model.number="createForm.ends_at" type="number" min="0" />
          </div>
          <div class="form-grid__full">
            <Label for="coupon-desc">说明</Label>
            <Input id="coupon-desc" v-model="createForm.description" placeholder="适用条件说明" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showCreateModal = false">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleCreate">
            {{ isSaving ? '保存中...' : '保存' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditModal">
      <DialogContent class="dialog-content">
        <DialogHeader>
          <DialogTitle>编辑优惠券</DialogTitle>
          <DialogDescription>更新优惠券规则。</DialogDescription>
        </DialogHeader>
        <div class="form-grid">
          <div>
            <Label for="coupon-edit-code">优惠码</Label>
            <Input id="coupon-edit-code" v-model="editForm.code" placeholder="WELCOME10" />
          </div>
          <div>
            <Label for="coupon-edit-name">名称</Label>
            <Input id="coupon-edit-name" v-model="editForm.name" placeholder="新用户优惠" />
          </div>
          <div>
            <Label for="coupon-edit-type">折扣类型</Label>
            <Select v-model="editForm.discount_type">
              <SelectTrigger id="coupon-edit-type">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">百分比</SelectItem>
                <SelectItem value="fixed">固定金额</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="coupon-edit-value">折扣数值</Label>
            <Input id="coupon-edit-value" v-model.number="editForm.discount_value" type="number" min="0" />
          </div>
          <div>
            <Label for="coupon-edit-currency">币种</Label>
            <Input id="coupon-edit-currency" v-model="editForm.currency" placeholder="USD" />
          </div>
          <div>
            <Label for="coupon-edit-status">状态</Label>
            <Select v-model="editForm.status">
              <SelectTrigger id="coupon-edit-status">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="1">启用</SelectItem>
                <SelectItem :value="2">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="coupon-edit-min">最低金额（分）</Label>
            <Input id="coupon-edit-min" v-model.number="editForm.min_order_cents" type="number" min="0" />
          </div>
          <div>
            <Label for="coupon-edit-max">总次数</Label>
            <Input id="coupon-edit-max" v-model.number="editForm.max_redemptions" type="number" min="0" />
          </div>
          <div>
            <Label for="coupon-edit-max-user">每用户次数</Label>
            <Input id="coupon-edit-max-user" v-model.number="editForm.max_redemptions_per_user" type="number" min="0" />
          </div>
          <div>
            <Label for="coupon-edit-start">开始时间（Unix 秒）</Label>
            <Input id="coupon-edit-start" v-model.number="editForm.starts_at" type="number" min="0" />
          </div>
          <div>
            <Label for="coupon-edit-end">结束时间（Unix 秒）</Label>
            <Input id="coupon-edit-end" v-model.number="editForm.ends_at" type="number" min="0" />
          </div>
          <div class="form-grid__full">
            <Label for="coupon-edit-desc">说明</Label>
            <Input id="coupon-edit-desc" v-model="editForm.description" placeholder="适用条件说明" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showEditModal = false">取消</Button>
          <Button type="button" :disabled="isSaving" @click="handleUpdate">
            {{ isSaving ? '保存中...' : '更新' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDeleteModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            删除后无法恢复，确认要删除 {{ selectedCoupon?.code }}？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" @click="showDeleteModal = false">取消</Button>
          <Button type="button" variant="destructive" :disabled="isSaving" @click="handleDelete">
            {{ isSaving ? '处理中...' : '删除' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
