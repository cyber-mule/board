import { requestJson } from '../http';
import { adminPath } from '../paths';
import { withQuery } from '../query';
import type {
  AdminDashboardResponse,
  AdminOrderDetail,
  AdminOrderDetailResponse,
  AdminSubscriptionResponse,
  AdminUserResponse,
  AdminUserSummary,
  AnnouncementSummary,
  CancelOrderRequest,
  CreateNodeRequest,
  CreateProtocolBindingRequest,
  CreateAdminSubscriptionRequest,
  CreateAdminUserRequest,
  CreateAnnouncementRequest,
  CreatePaymentChannelRequest,
  CreatePlanRequest,
  CreateTemplateRequest,
  DisableAdminSubscriptionRequest,
  ExtendAdminSubscriptionRequest,
  MessageResponse,
  NodeKernelSummary,
  NodeSummary,
  NodeResponse,
  PaginationMeta,
  PayOrderRequest,
  PaymentChannelSummary,
  PlanSummary,
  ProtocolBindingSummary,
  ProtocolBindingSyncResponse,
  ProtocolBindingSyncResult,
  PublishAnnouncementRequest,
  PublishTemplateRequest,
  PublishTemplateResponse,
  RefundOrderRequest,
  ResetUserPasswordRequest,
  SecuritySettingsResponse,
  AdminSubscriptionSummary,
  SubscriptionTemplateSummary,
  SyncNodeKernelsResponse,
  TemplateHistoryResponse,
  UpdateAnnouncementRequest,
  UpdateAdminSubscriptionRequest,
  UpdatePaymentChannelRequest,
  UpdatePlanRequest,
  UpdateProtocolBindingRequest,
  UpdateSecuritySettingsRequest,
  UpdateTemplateRequest,
  UpdateUserRolesRequest,
  UpdateUserStatusRequest,
  UpdateNodeRequest,
  AuditLogExportResponse,
  AuditLogResponse,
  CouponSummary,
  CreateCouponRequest,
  CreatePlanBillingOptionRequest,
  CreateProtocolEntryRequest,
  NodeStatusSyncResponse,
  PlanBillingOptionSummary,
  ProtocolBindingStatusSyncResponse,
  ProtocolEntrySummary,
  ReconcileOrderPaymentRequest,
  RotateUserCredentialResponse,
  SiteSettingResponse,
  UpdateCouponRequest,
  UpdatePlanBillingOptionRequest,
  UpdateProtocolEntryRequest,
  UpdateSiteSettingRequest,
} from '../types';

type PaginationQuery = {
  page?: number;
  per_page?: number;
};

type AdminNodesQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  status?: number;
  protocol?: string;
};

type AdminProtocolBindingsQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  status?: number;
  protocol?: string;
  node_id?: number;
};

type AdminProtocolEntriesQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  protocol?: string;
  status?: number;
  binding_id?: number;
};

type AdminPlansQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  status?: number;
  visible?: boolean;
};

type AdminPlanBillingOptionsQuery = {
  status?: number;
  visible?: boolean;
};

type AdminPaymentChannelsQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  provider?: string;
  enabled?: boolean;
};

type AdminOrdersQuery = PaginationQuery & {
  status?: number;
  payment_method?: string;
  payment_status?: number;
  number?: string;
  sort?: string;
  direction?: string;
  user_id?: number;
};

type AdminAnnouncementsQuery = PaginationQuery & {
  status?: number;
  category?: string;
  audience?: string;
  q?: string;
  sort?: string;
  direction?: string;
};

type AdminCouponsQuery = PaginationQuery & {
  q?: string;
  status?: number;
  sort?: string;
  direction?: string;
};

type AdminUsersQuery = PaginationQuery & {
  q?: string;
  status?: number;
  role?: string;
};

type AdminTemplatesQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  client_type?: string;
  format?: string;
  include_drafts?: boolean;
};

type AdminSubscriptionsQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  status?: number;
  user_id?: number;
  plan_name?: string;
  plan_id?: number;
  template_id?: number;
};

type AdminAuditLogsQuery = PaginationQuery & {
  actor_id?: number;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  since?: number;
  until?: number;
};

type AdminAuditLogsExportQuery = AdminAuditLogsQuery & {
  format?: string;
};

type PaginatedResponse<T> = {
  pagination: PaginationMeta;
} & T;

export function fetchAdminDashboard() {
  return requestJson<AdminDashboardResponse>(adminPath('/dashboard'));
}

export function fetchAdminUsers(query: AdminUsersQuery = {}) {
  return requestJson<PaginatedResponse<{ users: AdminUserSummary[] }>>(
    withQuery(adminPath('/users'), query),
  );
}

export function createAdminUser(payload: CreateAdminUserRequest) {
  return requestJson<AdminUserResponse>(adminPath('/users'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminUserStatus(id: number, payload: UpdateUserStatusRequest) {
  return requestJson<AdminUserResponse>(adminPath(`/users/${id}/status`), {
    method: 'PATCH',
    json: payload,
  });
}

export function updateAdminUserRoles(id: number, payload: UpdateUserRolesRequest) {
  return requestJson<AdminUserResponse>(adminPath(`/users/${id}/roles`), {
    method: 'PATCH',
    json: payload,
  });
}

export function resetAdminUserPassword(id: number, payload: ResetUserPasswordRequest) {
  return requestJson<MessageResponse>(adminPath(`/users/${id}/reset-password`), {
    method: 'POST',
    json: payload,
  });
}

export function forceAdminUserLogout(id: number) {
  return requestJson<MessageResponse>(adminPath(`/users/${id}/force-logout`), {
    method: 'POST',
  });
}

export function rotateAdminUserCredential(id: number) {
  return requestJson<RotateUserCredentialResponse>(adminPath(`/users/${id}/credentials/rotate`), {
    method: 'POST',
  });
}

export function fetchAdminSubscriptions(query: AdminSubscriptionsQuery = {}) {
  return requestJson<PaginatedResponse<{ subscriptions: AdminSubscriptionSummary[] }>>(
    withQuery(adminPath('/subscriptions'), query),
  );
}

export function fetchAdminSubscriptionDetail(id: number) {
  return requestJson<AdminSubscriptionResponse>(adminPath(`/subscriptions/${id}`));
}

export function createAdminSubscription(payload: CreateAdminSubscriptionRequest) {
  return requestJson<AdminSubscriptionResponse>(adminPath('/subscriptions'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminSubscription(id: number, payload: UpdateAdminSubscriptionRequest) {
  return requestJson<AdminSubscriptionResponse>(adminPath(`/subscriptions/${id}`), {
    method: 'PATCH',
    json: payload,
  });
}

export function disableAdminSubscription(id: number, payload: DisableAdminSubscriptionRequest = {}) {
  return requestJson<AdminSubscriptionResponse>(adminPath(`/subscriptions/${id}/disable`), {
    method: 'POST',
    json: payload,
  });
}

export function extendAdminSubscription(id: number, payload: ExtendAdminSubscriptionRequest) {
  return requestJson<AdminSubscriptionResponse>(adminPath(`/subscriptions/${id}/extend`), {
    method: 'POST',
    json: payload,
  });
}

export function fetchAdminNodes(query: AdminNodesQuery = {}) {
  return requestJson<PaginatedResponse<{ nodes: NodeSummary[] }>>(
    withQuery(adminPath('/nodes'), query),
  );
}

export function fetchAdminProtocolEntries(query: AdminProtocolEntriesQuery = {}) {
  return requestJson<PaginatedResponse<{ entries: ProtocolEntrySummary[] }>>(
    withQuery(adminPath('/protocol-entries'), query),
  );
}

export function createAdminProtocolEntry(payload: CreateProtocolEntryRequest) {
  return requestJson<ProtocolEntrySummary>(adminPath('/protocol-entries'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminProtocolEntry(id: number, payload: UpdateProtocolEntryRequest) {
  return requestJson<ProtocolEntrySummary>(adminPath(`/protocol-entries/${id}`), {
    method: 'PATCH',
    json: payload,
  });
}

export function deleteAdminProtocolEntry(id: number) {
  return requestJson<void>(adminPath(`/protocol-entries/${id}`), {
    method: 'DELETE',
  });
}

export function fetchAdminProtocolBindings(query: AdminProtocolBindingsQuery = {}) {
  return requestJson<PaginatedResponse<{ bindings: ProtocolBindingSummary[] }>>(
    withQuery(adminPath('/protocol-bindings'), query),
  );
}

export function createAdminProtocolBinding(payload: CreateProtocolBindingRequest) {
  return requestJson<ProtocolBindingSummary>(adminPath('/protocol-bindings'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminProtocolBinding(id: number, payload: UpdateProtocolBindingRequest) {
  return requestJson<ProtocolBindingSummary>(adminPath(`/protocol-bindings/${id}`), {
    method: 'PATCH',
    json: payload,
  });
}

export function deleteAdminProtocolBinding(id: number) {
  return requestJson<void>(adminPath(`/protocol-bindings/${id}`), {
    method: 'DELETE',
  });
}

export function syncAdminProtocolBinding(id: number) {
  return requestJson<ProtocolBindingSyncResult>(adminPath(`/protocol-bindings/${id}/sync`), {
    method: 'POST',
  });
}

export function syncAdminProtocolBindings(payload: { binding_ids?: number[]; node_ids?: number[] }) {
  return requestJson<ProtocolBindingSyncResponse>(adminPath('/protocol-bindings/sync'), {
    method: 'POST',
    json: payload,
  });
}

export function syncAdminProtocolBindingsStatus(payload: { node_ids: number[] }) {
  return requestJson<ProtocolBindingStatusSyncResponse>(adminPath('/protocol-bindings/status/sync'), {
    method: 'POST',
    json: payload,
  });
}

export function createAdminNode(payload: CreateNodeRequest) {
  return requestJson<NodeResponse>(adminPath('/nodes'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminNode(id: number, payload: UpdateNodeRequest) {
  return requestJson<NodeResponse>(adminPath(`/nodes/${id}`), {
    method: 'PATCH',
    json: payload,
  });
}

export function disableAdminNode(id: number) {
  return requestJson<NodeResponse>(adminPath(`/nodes/${id}/disable`), {
    method: 'POST',
  });
}

export function deleteAdminNode(id: number) {
  return requestJson<void>(adminPath(`/nodes/${id}`), {
    method: 'DELETE',
  });
}

export function fetchAdminNodeKernels(id: number) {
  return requestJson<{ node_id: number; kernels: NodeKernelSummary[] }>(
    adminPath(`/nodes/${id}/kernels`),
  );
}

export function syncNodeKernels(id: number, payload?: { protocol?: string }) {
  return requestJson<SyncNodeKernelsResponse>(adminPath(`/nodes/${id}/kernels/sync`), {
    method: 'POST',
    json: payload,
  });
}

export function syncAdminNodeStatus(payload: { node_ids: number[] }) {
  return requestJson<NodeStatusSyncResponse>(adminPath('/nodes/status/sync'), {
    method: 'POST',
    json: payload,
  });
}

export function fetchAdminPlans(query: AdminPlansQuery = {}) {
  return requestJson<PaginatedResponse<{ plans: PlanSummary[] }>>(
    withQuery(adminPath('/plans'), query),
  );
}

export function createAdminPlan(payload: CreatePlanRequest) {
  return requestJson<PlanSummary>(adminPath('/plans'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminPlan(id: number, payload: UpdatePlanRequest) {
  return requestJson<PlanSummary>(adminPath(`/plans/${id}`), {
    method: 'PATCH',
    json: payload,
  });
}

export function fetchAdminPlanBillingOptions(
  planId: number,
  query: AdminPlanBillingOptionsQuery = {},
) {
  return requestJson<{ options: PlanBillingOptionSummary[] }>(
    withQuery(adminPath(`/plans/${planId}/billing-options`), query),
  );
}

export function createAdminPlanBillingOption(
  planId: number,
  payload: CreatePlanBillingOptionRequest,
) {
  return requestJson<PlanBillingOptionSummary>(
    adminPath(`/plans/${planId}/billing-options`),
    {
      method: 'POST',
      json: payload,
    },
  );
}

export function updateAdminPlanBillingOption(
  planId: number,
  id: number,
  payload: UpdatePlanBillingOptionRequest,
) {
  return requestJson<PlanBillingOptionSummary>(
    adminPath(`/plans/${planId}/billing-options/${id}`),
    {
      method: 'PATCH',
      json: payload,
    },
  );
}

export function fetchAdminPaymentChannels(query: AdminPaymentChannelsQuery = {}) {
  return requestJson<PaginatedResponse<{ channels: PaymentChannelSummary[] }>>(
    withQuery(adminPath('/payment-channels'), query),
  );
}

export function fetchAdminPaymentChannelDetail(id: number) {
  return requestJson<PaymentChannelSummary>(adminPath(`/payment-channels/${id}`));
}

export function createAdminPaymentChannel(payload: CreatePaymentChannelRequest) {
  return requestJson<PaymentChannelSummary>(adminPath('/payment-channels'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminPaymentChannel(id: number, payload: UpdatePaymentChannelRequest) {
  return requestJson<PaymentChannelSummary>(adminPath(`/payment-channels/${id}`), {
    method: 'PATCH',
    json: payload,
  });
}

export function fetchAdminCoupons(query: AdminCouponsQuery = {}) {
  return requestJson<PaginatedResponse<{ coupons: CouponSummary[] }>>(
    withQuery(adminPath('/coupons'), query),
  );
}

export function createAdminCoupon(payload: CreateCouponRequest) {
  return requestJson<CouponSummary>(adminPath('/coupons'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminCoupon(id: number, payload: UpdateCouponRequest) {
  return requestJson<CouponSummary>(adminPath(`/coupons/${id}`), {
    method: 'PATCH',
    json: payload,
  });
}

export function deleteAdminCoupon(id: number) {
  return requestJson<MessageResponse>(adminPath(`/coupons/${id}`), {
    method: 'DELETE',
  });
}

export function fetchAdminOrders(query: AdminOrdersQuery = {}) {
  return requestJson<PaginatedResponse<{ orders: AdminOrderDetail[] }>>(
    withQuery(adminPath('/orders'), query),
  );
}

export function fetchAdminOrderDetail(id: number) {
  return requestJson<AdminOrderDetailResponse>(adminPath(`/orders/${id}`));
}

export function fetchAdminAnnouncements(query: AdminAnnouncementsQuery = {}) {
  return requestJson<PaginatedResponse<{ announcements: AnnouncementSummary[] }>>(
    withQuery(adminPath('/announcements'), query),
  );
}

export function createAdminAnnouncement(payload: CreateAnnouncementRequest) {
  return requestJson<AnnouncementSummary>(adminPath('/announcements'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminAnnouncement(id: number, payload: UpdateAnnouncementRequest) {
  return requestJson<AnnouncementSummary>(adminPath(`/announcements/${id}`), {
    method: 'PATCH',
    json: payload,
  });
}

export function publishAdminAnnouncement(id: number, payload: PublishAnnouncementRequest = {}) {
  return requestJson<AnnouncementSummary>(adminPath(`/announcements/${id}/publish`), {
    method: 'POST',
    json: payload,
  });
}

export function fetchAdminTemplates(query: AdminTemplatesQuery = {}) {
  return requestJson<PaginatedResponse<{ templates: SubscriptionTemplateSummary[] }>>(
    withQuery(adminPath('/subscription-templates'), query),
  );
}

export function createAdminTemplate(payload: CreateTemplateRequest) {
  return requestJson<SubscriptionTemplateSummary>(adminPath('/subscription-templates'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminTemplate(id: number, payload: UpdateTemplateRequest) {
  return requestJson<SubscriptionTemplateSummary>(adminPath(`/subscription-templates/${id}`), {
    method: 'PATCH',
    json: payload,
  });
}

export function publishAdminTemplate(id: number, payload: PublishTemplateRequest = {}) {
  return requestJson<PublishTemplateResponse>(adminPath(`/subscription-templates/${id}/publish`), {
    method: 'POST',
    json: payload,
  });
}

export function fetchAdminTemplateHistory(id: number) {
  return requestJson<TemplateHistoryResponse>(adminPath(`/subscription-templates/${id}/history`));
}

export function payAdminOrder(id: number, payload: PayOrderRequest = {}) {
  return requestJson<AdminOrderDetailResponse>(adminPath(`/orders/${id}/pay`), {
    method: 'POST',
    json: payload,
  });
}

export function cancelAdminOrder(id: number, payload: CancelOrderRequest = {}) {
  return requestJson<AdminOrderDetailResponse>(adminPath(`/orders/${id}/cancel`), {
    method: 'POST',
    json: payload,
  });
}

export function refundAdminOrder(id: number, payload: RefundOrderRequest) {
  return requestJson<AdminOrderDetailResponse>(adminPath(`/orders/${id}/refund`), {
    method: 'POST',
    json: payload,
  });
}

export function reconcileAdminOrderPayments(payload: ReconcileOrderPaymentRequest) {
  return requestJson<AdminOrderDetailResponse>(adminPath('/orders/payments/reconcile'), {
    method: 'POST',
    json: payload,
  });
}

export function fetchAdminSiteSettings() {
  return requestJson<SiteSettingResponse>(adminPath('/site-settings'));
}

export function updateAdminSiteSettings(payload: UpdateSiteSettingRequest) {
  return requestJson<SiteSettingResponse>(adminPath('/site-settings'), {
    method: 'PATCH',
    json: payload,
  });
}

export function fetchAdminAuditLogs(query: AdminAuditLogsQuery = {}) {
  return requestJson<AuditLogResponse>(withQuery(adminPath('/audit-logs'), query));
}

export function exportAdminAuditLogs(query: AdminAuditLogsExportQuery = {}) {
  return requestJson<AuditLogExportResponse>(withQuery(adminPath('/audit-logs/export'), query));
}

export function fetchAdminSecuritySettings() {
  return requestJson<SecuritySettingsResponse>(adminPath('/security-settings'));
}

export function updateAdminSecuritySettings(payload: UpdateSecuritySettingsRequest) {
  return requestJson<SecuritySettingsResponse>(adminPath('/security-settings'), {
    method: 'PATCH',
    json: payload,
  });
}
