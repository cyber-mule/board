export type PaginationMeta = {
  page: number;
  per_page: number;
  total_count: number;
  has_next: boolean;
  has_prev: boolean;
};

export type PingResponse = {
  status: string;
  service: string;
  version: string;
  site_name: string;
  logo_url: string;
  timestamp: number;
};

export type AuthenticatedUser = {
  id: number;
  email: string;
  display_name: string;
  roles: string[];
  created_at: number;
  updated_at: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  role?: string;
  user?: AuthenticatedUser;
  requires_verification?: boolean;
};

export type RegisterRequest = {
  email: string;
  password: string;
  display_name?: string;
  invite_code?: string;
};

export type RegisterResponse = LoginResponse & {
  requires_verification?: boolean;
};

export type VerifyRequest = {
  email: string;
  code: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  email: string;
  code: string;
  password: string;
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

export type AdminUserSummary = {
  id: number;
  email: string;
  display_name: string;
  roles: string[];
  status: number;
  email_verified_at?: number;
  failed_login_attempts?: number;
  locked_until?: number;
  last_login_at?: number;
  created_at: number;
  updated_at: number;
};

export type AdminUserResponse = {
  user: AdminUserSummary;
};

export type CreateAdminUserRequest = {
  email: string;
  password: string;
  display_name?: string;
  roles?: string[];
  status?: number;
  email_verified?: boolean;
};

export type UpdateUserStatusRequest = {
  status: number;
};

export type UpdateUserRolesRequest = {
  roles: string[];
};

export type ResetUserPasswordRequest = {
  password: string;
};

export type MessageResponse = {
  message: string;
};

export type CredentialSummary = {
  version: number;
  status: number;
  issued_at: number;
  deprecated_at?: number;
  revoked_at?: number;
  last_seen_at?: number;
};

export type RotateUserCredentialResponse = {
  user_id?: number;
  credential: CredentialSummary;
};

export type AdminSubscriptionUserSummary = {
  id: number;
  email: string;
  display_name: string;
};

export type AdminSubscriptionSummary = {
  id: number;
  user?: AdminSubscriptionUserSummary;
  name: string;
  plan_name?: string;
  plan_id?: number;
  plan_snapshot?: Record<string, unknown>;
  status?: number;
  template_id?: number;
  available_template_ids?: number[];
  token?: string;
  subscription_url?: string;
  subscribe_url?: string;
  expires_at?: number;
  traffic_total_bytes?: number;
  traffic_used_bytes?: number;
  devices_limit?: number;
  last_refreshed_at?: number;
  created_at?: number;
  updated_at?: number;
};

export type AdminSubscriptionResponse = {
  subscription: AdminSubscriptionSummary;
};

export type CreateAdminSubscriptionRequest = {
  user_id: number;
  name: string;
  plan_name?: string;
  plan_id: number;
  status?: number;
  template_id: number;
  available_template_ids?: number[];
  token?: string;
  expires_at: number;
  traffic_total_bytes: number;
  traffic_used_bytes?: number;
  devices_limit: number;
};

export type UpdateAdminSubscriptionRequest = {
  name?: string;
  plan_name?: string;
  plan_id?: number;
  status?: number;
  template_id?: number;
  available_template_ids?: number[];
  token?: string;
  expires_at?: number;
  traffic_total_bytes?: number;
  traffic_used_bytes?: number;
  devices_limit?: number;
};

export type DisableAdminSubscriptionRequest = {
  reason?: string;
};

export type ExtendAdminSubscriptionRequest = {
  extend_days?: number;
  extend_hours?: number;
  expires_at?: number;
};

export type NodeSummary = {
  id: number;
  name: string;
  region?: string;
  country?: string;
  isp?: string;
  status?: number;
  tags?: string[];
  capacity_mbps?: number;
  description?: string;
  access_address?: string;
  control_endpoint?: string;
  kernel_default_protocol?: string;
  kernel_http_timeout_seconds?: number;
  kernel_status_poll_interval_seconds?: number;
  kernel_status_poll_backoff_enabled?: boolean;
  kernel_status_poll_backoff_max_interval_seconds?: number;
  kernel_status_poll_backoff_multiplier?: number;
  kernel_status_poll_backoff_jitter?: number;
  kernel_offline_probe_max_interval_seconds?: number;
  status_sync_enabled?: boolean;
  last_synced_at?: number;
  updated_at?: number;
};

export type NodeKernelSummary = {
  protocol: string;
  endpoint?: string;
  revision?: string;
  status?: number;
  config?: Record<string, unknown>;
  last_synced_at?: number;
};

export type Node = NodeSummary & {
  location?: string;
  load_percent?: number;
  online_user_count?: number;
  traffic_rate_mbps?: number;
  created_at?: number;
  kernels?: NodeKernelSummary[];
  protocols?: string[];
};

export type NodeResponse = {
  node: NodeSummary;
};

export type CreateNodeRequest = {
  name: string;
  region?: string;
  country?: string;
  isp?: string;
  status?: number;
  tags?: string[];
  capacity_mbps?: number;
  description?: string;
  access_address?: string;
  control_endpoint: string;
  control_token?: string;
  control_access_key?: string;
  control_secret_key?: string;
  ak?: string;
  sk?: string;
  kernel_default_protocol?: string;
  kernel_http_timeout_seconds?: number;
  kernel_status_poll_interval_seconds?: number;
  kernel_status_poll_backoff_enabled?: boolean;
  kernel_status_poll_backoff_max_interval_seconds?: number;
  kernel_status_poll_backoff_multiplier?: number;
  kernel_status_poll_backoff_jitter?: number;
  kernel_offline_probe_max_interval_seconds?: number;
  status_sync_enabled?: boolean;
};

export type UpdateNodeRequest = {
  name?: string;
  region?: string;
  country?: string;
  isp?: string;
  status?: number;
  tags?: string[];
  capacity_mbps?: number;
  description?: string;
  access_address?: string;
  control_endpoint?: string;
  control_token?: string;
  control_access_key?: string;
  control_secret_key?: string;
  ak?: string;
  sk?: string;
  kernel_default_protocol?: string;
  kernel_http_timeout_seconds?: number;
  kernel_status_poll_interval_seconds?: number;
  kernel_status_poll_backoff_enabled?: boolean;
  kernel_status_poll_backoff_max_interval_seconds?: number;
  kernel_status_poll_backoff_multiplier?: number;
  kernel_status_poll_backoff_jitter?: number;
  kernel_offline_probe_max_interval_seconds?: number;
  status_sync_enabled?: boolean;
};

export type SyncNodeKernelsResponse = {
  node_id: number;
  protocol?: string;
  revision?: string;
  synced_at?: number;
  message?: string;
  synced_count?: number;
  kernels?: NodeKernelSummary[];
};

export type NodeStatusSyncResult = {
  node_id: number;
  status: number;
  message?: string;
  synced_at?: number;
};

export type NodeStatusSyncResponse = {
  results: NodeStatusSyncResult[];
};

export type ProtocolBindingSummary = {
  id: number;
  name?: string;
  node_id?: number;
  node_name?: string;
  protocol?: string;
  role?: string;
  listen?: string;
  connect?: string;
  access_port?: number;
  status?: number;
  kernel_id?: string;
  sync_status?: number;
  health_status?: number;
  last_synced_at?: number;
  last_heartbeat_at?: number;
  last_sync_error?: string;
  tags?: string[];
  description?: string;
  profile?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at?: number;
  updated_at?: number;
};

export type CreateProtocolBindingRequest = {
  name?: string;
  node_id: number;
  protocol: string;
  role: string;
  profile: Record<string, unknown>;
  listen?: string;
  connect?: string;
  access_port?: number;
  status?: number;
  kernel_id: string;
  tags?: string[];
  description?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateProtocolBindingRequest = {
  name?: string;
  node_id?: number;
  protocol?: string;
  role?: string;
  profile?: Record<string, unknown>;
  listen?: string;
  connect?: string;
  access_port?: number;
  status?: number;
  kernel_id?: string;
  tags?: string[];
  description?: string;
  metadata?: Record<string, unknown>;
};

export type ProtocolBindingSyncResult = {
  binding_id: number;
  status: number;
  message?: string;
  synced_at?: number;
};

export type ProtocolBindingSyncResponse = {
  results: ProtocolBindingSyncResult[];
};

export type ProtocolBindingStatusSyncResult = {
  node_id: number;
  status: number;
  message?: string;
  synced_at?: number;
  updated?: number;
};

export type ProtocolBindingStatusSyncResponse = {
  results: ProtocolBindingStatusSyncResult[];
};

export type ProtocolEntrySummary = {
  id: number;
  name?: string;
  binding_id: number;
  binding_name?: string;
  node_id?: number;
  node_name?: string;
  protocol?: string;
  status?: number;
  binding_status?: number;
  health_status?: number;
  entry_address: string;
  entry_port: number;
  tags?: string[];
  description?: string;
  profile?: Record<string, unknown>;
  created_at?: number;
  updated_at?: number;
};

export type CreateProtocolEntryRequest = {
  name?: string;
  binding_id: number;
  entry_address: string;
  entry_port: number;
  protocol?: string;
  status?: number;
  tags?: string[];
  description?: string;
  profile?: Record<string, unknown>;
};

export type UpdateProtocolEntryRequest = {
  name?: string;
  binding_id?: number;
  entry_address?: string;
  entry_port?: number;
  protocol?: string;
  status?: number;
  tags?: string[];
  description?: string;
  profile?: Record<string, unknown>;
};

export type PlanSummary = {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  tags?: string[];
  features?: string[];
  binding_ids?: number[];
  billing_options?: PlanBillingOptionSummary[];
  price_cents: number;
  currency: string;
  duration_days: number;
  traffic_limit_bytes?: number;
  traffic_multipliers?: Record<string, number>;
  devices_limit?: number;
  sort_order?: number;
  status?: number;
  visible?: boolean;
  created_at?: number;
  updated_at?: number;
};

export type PlanBillingOptionSummary = {
  id: number;
  plan_id: number;
  name?: string;
  duration_value: number;
  duration_unit: string;
  price_cents: number;
  currency: string;
  sort_order?: number;
  status?: number;
  visible?: boolean;
  created_at?: number;
  updated_at?: number;
};

export type CreatePlanBillingOptionRequest = {
  name?: string;
  duration_value: number;
  duration_unit: string;
  price_cents: number;
  currency?: string;
  sort_order?: number;
  status?: number;
  visible?: boolean;
};

export type UpdatePlanBillingOptionRequest = {
  name?: string;
  duration_value?: number;
  duration_unit?: string;
  price_cents?: number;
  currency?: string;
  sort_order?: number;
  status?: number;
  visible?: boolean;
};

export type CreatePlanRequest = {
  name: string;
  slug?: string;
  description?: string;
  tags?: string[];
  features?: string[];
  binding_ids?: number[];
  price_cents: number;
  currency: string;
  duration_days: number;
  traffic_limit_bytes?: number;
  traffic_multipliers?: Record<string, number>;
  devices_limit?: number;
  sort_order?: number;
  status?: number;
  visible?: boolean;
};

export type UpdatePlanRequest = {
  name?: string;
  slug?: string;
  description?: string;
  tags?: string[];
  features?: string[];
  binding_ids?: number[];
  price_cents?: number;
  currency?: string;
  duration_days?: number;
  traffic_limit_bytes?: number;
  traffic_multipliers?: Record<string, number>;
  devices_limit?: number;
  sort_order?: number;
  status?: number;
  visible?: boolean;
};

export type Plan = PlanSummary & {
  device_limit?: number;
  is_visible?: boolean;
};

export type CouponSummary = {
  id: number;
  code: string;
  name: string;
  description?: string;
  status?: number;
  discount_type: string;
  discount_value: number;
  currency?: string;
  max_redemptions?: number;
  max_redemptions_per_user?: number;
  min_order_cents?: number;
  starts_at?: number;
  ends_at?: number;
  created_at?: number;
  updated_at?: number;
};

export type CreateCouponRequest = {
  code: string;
  name: string;
  description?: string;
  status?: number;
  discount_type: string;
  discount_value: number;
  currency?: string;
  max_redemptions?: number;
  max_redemptions_per_user?: number;
  min_order_cents?: number;
  starts_at?: number;
  ends_at?: number;
};

export type UpdateCouponRequest = {
  code?: string;
  name?: string;
  description?: string;
  status?: number;
  discount_type?: string;
  discount_value?: number;
  currency?: string;
  max_redemptions?: number;
  max_redemptions_per_user?: number;
  min_order_cents?: number;
  starts_at?: number;
  ends_at?: number;
};

export type PaymentChannelSummary = {
  id: number;
  name: string;
  code: string;
  provider?: string;
  enabled?: boolean;
  sort_order?: number;
  config?: Record<string, unknown>;
  created_at?: number;
  updated_at?: number;
};

export type UserPaymentChannelSummary = {
  id: number;
  name: string;
  code: string;
  provider?: string;
  sort_order?: number;
  config?: Record<string, unknown>;
};

export type PaymentChannelResponse = PaymentChannelSummary;

export type CreatePaymentChannelRequest = {
  name: string;
  code: string;
  provider?: string;
  enabled?: boolean;
  sort_order?: number;
  config?: Record<string, unknown>;
};

export type UpdatePaymentChannelRequest = {
  name?: string;
  code?: string;
  provider?: string;
  enabled?: boolean;
  sort_order?: number;
  config?: Record<string, unknown>;
};

export type AnnouncementSummary = {
  id: number;
  title: string;
  content?: string;
  category?: string;
  status?: number;
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

export type CreateAnnouncementRequest = {
  title: string;
  content: string;
  category?: string;
  audience?: string;
  is_pinned?: boolean;
  priority?: number;
  created_by?: string;
};

export type UpdateAnnouncementRequest = {
  title?: string;
  content?: string;
  category?: string;
  audience?: string;
  is_pinned?: boolean;
  priority?: number;
};

export type PublishAnnouncementRequest = {
  visible_to?: number;
  operator?: string;
};

export type SiteSetting = {
  id: number;
  name: string;
  logo_url?: string;
  created_at?: number;
  updated_at?: number;
};

export type SiteSettingResponse = {
  setting: SiteSetting;
};

export type UpdateSiteSettingRequest = {
  name?: string;
  logo_url?: string;
};

export type TemplateVariable = {
  value_type: string;
  required: boolean;
  description?: string;
  default_value?: unknown;
};

export type SubscriptionTemplateSummary = {
  id: number;
  name: string;
  description?: string;
  client_type: string;
  format: string;
  content?: string;
  variables?: Record<string, TemplateVariable>;
  is_default: boolean;
  version: number;
  updated_at: number;
  published_at?: number;
  last_published_by?: string;
};

export type SubscriptionTemplateHistoryEntry = {
  version: number;
  changelog?: string;
  published_at: number;
  published_by: string;
  variables?: Record<string, TemplateVariable>;
};

export type CreateTemplateRequest = {
  name: string;
  description?: string;
  client_type: string;
  format: string;
  content: string;
  variables?: Record<string, TemplateVariable>;
  is_default?: boolean;
};

export type UpdateTemplateRequest = {
  name?: string;
  description?: string;
  format?: string;
  content?: string;
  variables?: Record<string, TemplateVariable>;
  is_default?: boolean;
};

export type PublishTemplateRequest = {
  changelog?: string;
  operator?: string;
};

export type PublishTemplateResponse = {
  template: SubscriptionTemplateSummary;
  history: SubscriptionTemplateHistoryEntry;
};

export type TemplateHistoryResponse = {
  template_id: number;
  history: SubscriptionTemplateHistoryEntry[];
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
  status?: number;
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
  status: number;
  payment_status: number;
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

export type PayOrderRequest = {
  payment_method?: string;
  paid_at?: number;
  note?: string;
  reference?: string;
  charge_balance?: boolean;
};

export type CancelOrderRequest = {
  reason?: string;
  cancelled_at?: number;
};

export type RefundOrderRequest = {
  amount_cents: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  refund_at?: number;
  credit_balance?: boolean;
};

export type RefundOrderResponse = {
  order: AdminOrderDetail;
};

export type SecuritySetting = {
  id: number;
  third_party_api_enabled: boolean;
  api_key?: string;
  api_secret?: string;
  encryption_algorithm?: string;
  nonce_ttl_seconds?: number;
  created_at?: number;
  updated_at?: number;
};

export type UpdateSecuritySettingsRequest = {
  third_party_api_enabled?: boolean;
  api_key?: string;
  api_secret?: string;
  encryption_algorithm?: string;
  nonce_ttl_seconds?: number;
};

export type SecuritySettingsResponse = {
  setting: SecuritySetting;
};

export type AuditLogSummary = {
  id: number;
  actor_id?: number;
  actor_email?: string;
  actor_roles?: string[];
  action: string;
  resource_type: string;
  resource_id: string;
  source_ip?: string;
  metadata?: Record<string, unknown>;
  created_at: number;
};

export type AuditLogResponse = {
  logs: AuditLogSummary[];
  pagination: PaginationMeta;
};

export type AuditLogExportResponse = {
  logs: AuditLogSummary[];
  total_count: number;
  exported_at: number;
};

export type ReconcileOrderPaymentRequest = {
  order_id: number;
  payment_id: number;
};

export type UserSubscriptionSummary = {
  id: number;
  name: string;
  plan_name?: string;
  plan_id?: number;
  status?: number;
  template_id?: number;
  available_template_ids?: number[];
  token?: string;
  subscription_url?: string;
  subscribe_url?: string;
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
  billing_options?: PlanBillingOptionSummary[];
  price_cents: number;
  currency: string;
  duration_days: number;
  traffic_limit_bytes?: number;
  devices_limit?: number;
  tags?: string[];
};

export type UserNodeKernelStatusSummary = {
  protocol: string;
  status: number;
  last_synced_at?: number;
};

export type UserNodeProtocolStatusSummary = {
  binding_id: number;
  protocol: string;
  role: string;
  status: number;
  health_status?: number;
  last_heartbeat_at?: number;
};

export type UserNodeStatusSummary = {
  id: number;
  name: string;
  region?: string;
  country?: string;
  isp?: string;
  status?: number;
  tags?: string[];
  capacity_mbps?: number;
  description?: string;
  last_synced_at?: number;
  updated_at?: number;
  kernel_statuses?: UserNodeKernelStatusSummary[];
  protocol_statuses?: UserNodeProtocolStatusSummary[];
};

export type UserNodesResponse = {
  nodes: UserNodeStatusSummary[];
  pagination: PaginationMeta;
};

export type UserProfile = {
  id: number;
  email: string;
  display_name: string;
  status: number;
  email_verified_at?: number;
  created_at: number;
  updated_at: number;
};

export type UserProfileResponse = {
  profile: UserProfile;
};

export type UpdateUserProfileRequest = {
  display_name: string;
};

export type UpdateUserPasswordRequest = {
  current_password: string;
  new_password: string;
};

export type RequestUserEmailCodeRequest = {
  email: string;
};

export type UpdateUserEmailRequest = {
  email: string;
  code: string;
  password: string;
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

export type UserSubscriptionTrafficSummary = {
  raw_bytes: number;
  charged_bytes: number;
};

export type UserTrafficUsageRecord = {
  id: number;
  protocol?: string;
  node_id?: number;
  binding_id?: number;
  bytes_up: number;
  bytes_down: number;
  raw_bytes: number;
  charged_bytes: number;
  multiplier?: number;
  observed_at: number;
};

export type UserSubscriptionTrafficResponse = {
  summary: UserSubscriptionTrafficSummary;
  records: UserTrafficUsageRecord[];
  pagination: PaginationMeta;
};

export type CreateUserOrderRequest = {
  plan_id: number;
  billing_option_id?: number;
  quantity: number;
  payment_method?: string;
  payment_channel?: string;
  payment_return_url?: string;
  idempotency_key?: string;
  coupon_code?: string;
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

export type UserPaymentChannelsResponse = {
  channels: UserPaymentChannelSummary[];
  payment_methods?: string[];
};

export type UserOrderPaymentStatusResponse = {
  order_id: number;
  status: number;
  payment_status: number;
  payment_method?: string;
  payment_intent_id?: string;
  payment_reference?: string;
  payment_failure_code?: string;
  payment_failure_message?: string;
  paid_at?: number;
  cancelled_at?: number;
  refunded_cents?: number;
  refunded_at?: number;
  updated_at?: number;
};
