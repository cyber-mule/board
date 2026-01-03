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
  CreateProtocolConfigRequest,
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
  PaymentChannelResponse,
  PaymentChannelSummary,
  PlanSummary,
  ProtocolBindingSummary,
  ProtocolBindingSyncResponse,
  ProtocolBindingSyncResult,
  ProtocolConfigSummary,
  PublishAnnouncementRequest,
  PublishTemplateRequest,
  PublishTemplateResponse,
  RefundOrderRequest,
  RefundOrderResponse,
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
  UpdateProtocolConfigRequest,
  UpdateSecuritySettingsRequest,
  UpdateTemplateRequest,
  UpdateUserRolesRequest,
  UpdateUserStatusRequest,
  UpdateNodeRequest,
} from '../types';

type PaginationQuery = {
  page?: number;
  per_page?: number;
};

type AdminNodesQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  status?: string;
  protocol?: string;
};

type AdminProtocolBindingsQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  status?: string;
  protocol?: string;
  node_id?: number;
  protocol_config_id?: number;
};

type AdminProtocolConfigsQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  protocol?: string;
  status?: string;
};

type AdminPlansQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  status?: string;
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
  status?: string;
  payment_method?: string;
  payment_status?: string;
  number?: string;
  sort?: string;
  direction?: string;
  user_id?: number;
};

type AdminAnnouncementsQuery = PaginationQuery & {
  status?: string;
  category?: string;
  audience?: string;
  q?: string;
  sort?: string;
  direction?: string;
};

type AdminUsersQuery = PaginationQuery & {
  q?: string;
  status?: string;
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
  status?: string;
  user_id?: number;
  plan_name?: string;
  plan_id?: number;
  template_id?: number;
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

export function fetchAdminProtocolConfigs(query: AdminProtocolConfigsQuery = {}) {
  return requestJson<PaginatedResponse<{ configs: ProtocolConfigSummary[] }>>(
    withQuery(adminPath('/protocol-configs'), query),
  );
}

export function createAdminProtocolConfig(payload: CreateProtocolConfigRequest) {
  return requestJson<{ config: ProtocolConfigSummary }>(adminPath('/protocol-configs'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminProtocolConfig(id: number, payload: UpdateProtocolConfigRequest) {
  return requestJson<{ config: ProtocolConfigSummary }>(adminPath(`/protocol-configs/${id}`), {
    method: 'PATCH',
    json: payload,
  });
}

export function deleteAdminProtocolConfig(id: number) {
  return requestJson<void>(adminPath(`/protocol-configs/${id}`), {
    method: 'DELETE',
  });
}

export function fetchAdminProtocolBindings(query: AdminProtocolBindingsQuery = {}) {
  return requestJson<PaginatedResponse<{ bindings: ProtocolBindingSummary[] }>>(
    withQuery(adminPath('/protocol-bindings'), query),
  );
}

export function createAdminProtocolBinding(payload: CreateProtocolBindingRequest) {
  return requestJson<{ binding: ProtocolBindingSummary }>(adminPath('/protocol-bindings'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminProtocolBinding(id: number, payload: UpdateProtocolBindingRequest) {
  return requestJson<{ binding: ProtocolBindingSummary }>(adminPath(`/protocol-bindings/${id}`), {
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

export function fetchAdminPaymentChannels(query: AdminPaymentChannelsQuery = {}) {
  return requestJson<PaginatedResponse<{ channels: PaymentChannelSummary[] }>>(
    withQuery(adminPath('/payment-channels'), query),
  );
}

export function fetchAdminPaymentChannelDetail(id: number) {
  return requestJson<PaymentChannelResponse>(adminPath(`/payment-channels/${id}`));
}

export function createAdminPaymentChannel(payload: CreatePaymentChannelRequest) {
  return requestJson<PaymentChannelResponse>(adminPath('/payment-channels'), {
    method: 'POST',
    json: payload,
  });
}

export function updateAdminPaymentChannel(id: number, payload: UpdatePaymentChannelRequest) {
  return requestJson<PaymentChannelResponse>(adminPath(`/payment-channels/${id}`), {
    method: 'PATCH',
    json: payload,
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
  return requestJson<RefundOrderResponse>(adminPath(`/orders/${id}/refund`), {
    method: 'POST',
    json: payload,
  });
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
