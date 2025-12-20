export type PaginationMeta = {
  page: number;
  per_page: number;
  total_count: number;
  has_next: boolean;
  has_prev: boolean;
};

export type AuthenticatedUser = {
  id: number;
  email: string;
  display_name: string;
  roles: string[];
  created_at: number;
  updated_at: number;
};

export type AdminModule = {
  key: string;
  name: string;
  description?: string;
  icon?: string;
  route?: string;
  permissions?: string[];
};

export type AdminDashboardResponse = {
  modules: AdminModule[];
};

export type NodeSummary = {
  id: number;
  name: string;
  region?: string;
  country?: string;
  isp?: string;
  status?: string;
  tags?: string[];
  protocols?: string[];
  capacity_mbps?: number;
  description?: string;
  last_synced_at?: number;
  updated_at?: number;
};

export type NodeKernelSummary = {
  protocol: string;
  endpoint?: string;
  revision?: string;
  status?: string;
  config?: Record<string, unknown>;
  last_synced_at?: number;
};

export type PlanSummary = {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  tags?: string[];
  features?: string[];
  price_cents: number;
  currency: string;
  duration_days: number;
  traffic_limit_bytes?: number;
  devices_limit?: number;
  sort_order?: number;
  status?: string;
  visible?: boolean;
  created_at?: number;
  updated_at?: number;
};

export type AnnouncementSummary = {
  id: number;
  title: string;
  content?: string;
  category?: string;
  status?: string;
  audience?: string;
  is_pinned?: boolean;
  priority?: number;
  visible_from?: number;
  visible_to?: number;
  published_at?: number;
  published_by?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: number;
  updated_at?: number;
};

export type OrderItem = {
  id: number;
  order_id: number;
  item_type: string;
  item_id: number;
  name: string;
  quantity: number;
  unit_price_cents: number;
  currency: string;
  subtotal_cents: number;
  metadata?: Record<string, unknown>;
  created_at: number;
};

export type OrderRefund = {
  id: number;
  order_id: number;
  amount_cents: number;
  reason?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  created_at: number;
};

export type OrderPayment = {
  id: number;
  order_id: number;
  provider?: string;
  method?: string;
  intent_id?: string;
  reference?: string;
  status?: string;
  amount_cents: number;
  currency: string;
  failure_code?: string;
  failure_message?: string;
  metadata?: Record<string, unknown>;
  created_at: number;
  updated_at?: number;
};

export type OrderDetail = {
  id: number;
  number: string;
  user_id?: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  payment_intent_id?: string;
  payment_reference?: string;
  payment_failure_code?: string;
  payment_failure_message?: string;
  total_cents: number;
  refunded_cents?: number;
  currency: string;
  plan_id?: number;
  plan_snapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  paid_at?: number;
  cancelled_at?: number;
  refunded_at?: number;
  created_at: number;
  updated_at?: number;
  items?: OrderItem[];
  refunds?: OrderRefund[];
  payments?: OrderPayment[];
};

export type AdminOrderDetail = OrderDetail & {
  user?: {
    id: number;
    email: string;
    display_name: string;
  };
};

export type AdminOrderDetailResponse = {
  order: AdminOrderDetail;
};

export type UserSubscriptionSummary = {
  id: number;
  name: string;
  plan_name?: string;
  status?: string;
  template_id?: number;
  available_template_ids?: number[];
  expires_at?: number;
  traffic_total_bytes?: number;
  traffic_used_bytes?: number;
  devices_limit?: number;
  last_refreshed_at?: number;
};

export type UserPlanSummary = {
  id: number;
  name: string;
  description?: string;
  features?: string[];
  price_cents: number;
  currency: string;
  duration_days: number;
  traffic_limit_bytes?: number;
  devices_limit?: number;
  tags?: string[];
};

export type UserAnnouncementSummary = {
  id: number;
  title: string;
  content?: string;
  category?: string;
  audience?: string;
  is_pinned?: boolean;
  priority?: number;
  visible_from?: number;
  visible_to?: number;
  published_at?: number;
};

export type BalanceSnapshot = {
  user_id: number;
  balance_cents: number;
  currency: string;
  updated_at: number;
};

export type BalanceTransactionSummary = {
  id: number;
  entry_type: string;
  amount_cents: number;
  currency: string;
  balance_after_cents: number;
  reference?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: number;
};

export type UserBalanceResponse = {
  user_id: number;
  balance_cents: number;
  currency: string;
  updated_at: number;
  transactions: BalanceTransactionSummary[];
  pagination: PaginationMeta;
};

export type UserSubscriptionPreview = {
  subscription_id: number;
  template_id: number;
  content: string;
  content_type: string;
  etag: string;
  generated_at: number;
};

export type UserSubscriptionTemplateUpdate = {
  subscription_id: number;
  template_id: number;
  updated_at: number;
};

export type CreateUserOrderRequest = {
  plan_id: number;
  quantity: number;
  payment_method?: string;
  payment_channel?: string;
  payment_return_url?: string;
  idempotency_key?: string;
};

export type CreateUserOrderResponse = {
  order: OrderDetail;
  balance: BalanceSnapshot;
  transaction?: BalanceTransactionSummary;
};

export type CancelUserOrderResponse = {
  order: OrderDetail;
  balance: BalanceSnapshot;
};

export type UserOrderDetailResponse = {
  order: OrderDetail;
  balance?: BalanceSnapshot;
  transaction?: BalanceTransactionSummary;
};
