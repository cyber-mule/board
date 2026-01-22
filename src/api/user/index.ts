import { requestJson } from '../http';
import { userPath } from '../paths';
import { withQuery } from '../query';
import type {
  CancelUserOrderResponse,
  CreateUserOrderRequest,
  CreateUserOrderResponse,
  MessageResponse,
  OrderDetail,
  PaginationMeta,
  RequestUserEmailCodeRequest,
  RotateUserCredentialResponse,
  UpdateUserEmailRequest,
  UpdateUserPasswordRequest,
  UpdateUserProfileRequest,
  UserOrderDetailResponse,
  UserOrderPaymentStatusResponse,
  UserPaymentChannelsResponse,
  UserAnnouncementSummary,
  UserBalanceResponse,
  UserNodesResponse,
  UserPlanSummary,
  UserProfileResponse,
  UserSubscriptionPreview,
  UserSubscriptionSummary,
  UserSubscriptionTemplateUpdate,
  UserSubscriptionTrafficResponse,
} from '../types';

type PaginationQuery = {
  page?: number;
  per_page?: number;
};

type UserSubscriptionsQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  status?: number;
};

type UserSubscriptionTrafficQuery = PaginationQuery & {
  protocol?: string;
  node_id?: number;
  binding_id?: number;
  from?: number;
  to?: number;
};

type UserNodesQuery = PaginationQuery & {
  status?: number;
  protocol?: string;
};

type UserAnnouncementsQuery = {
  audience?: string;
  limit?: number;
};

type UserPaymentChannelsQuery = {
  provider?: string;
};

type UserOrdersQuery = PaginationQuery & {
  status?: number;
  payment_method?: string;
  payment_status?: number;
  number?: string;
  sort?: string;
  direction?: string;
};

type UserBalanceQuery = PaginationQuery & {
  entry_type?: string;
};

type PaginatedResponse<T> = {
  pagination: PaginationMeta;
} & T;

export function fetchUserSubscriptions(query: UserSubscriptionsQuery = {}) {
  return requestJson<PaginatedResponse<{ subscriptions: UserSubscriptionSummary[] }>>(
    withQuery(userPath('/subscriptions'), query),
  );
}

export function fetchUserPlans(query: { q?: string } = {}) {
  return requestJson<{ plans: UserPlanSummary[] }>(
    withQuery(userPath('/plans'), query),
  );
}

export function fetchUserNodes(query: UserNodesQuery = {}) {
  return requestJson<UserNodesResponse>(withQuery(userPath('/nodes'), query));
}

export function fetchUserAnnouncements(query: UserAnnouncementsQuery = {}) {
  return requestJson<{ announcements: UserAnnouncementSummary[] }>(
    withQuery(userPath('/announcements'), query),
  );
}

export function fetchUserPaymentChannels(query: UserPaymentChannelsQuery = {}) {
  return requestJson<UserPaymentChannelsResponse>(
    withQuery(userPath('/payment-channels'), query),
  );
}

export function fetchUserOrders(query: UserOrdersQuery = {}) {
  return requestJson<PaginatedResponse<{ orders: OrderDetail[] }>>(
    withQuery(userPath('/orders'), query),
  );
}

export function fetchUserBalance(query: UserBalanceQuery = {}) {
  return requestJson<UserBalanceResponse>(withQuery(userPath('/account/balance'), query));
}

export function fetchUserProfile() {
  return requestJson<UserProfileResponse>(userPath('/account/profile'));
}

export function updateUserProfile(payload: UpdateUserProfileRequest) {
  return requestJson<UserProfileResponse>(userPath('/account/profile'), {
    method: 'PATCH',
    json: payload,
  });
}

export function updateUserPassword(payload: UpdateUserPasswordRequest) {
  return requestJson<MessageResponse>(userPath('/account/password'), {
    method: 'POST',
    json: payload,
  });
}

export function rotateUserCredentials() {
  return requestJson<RotateUserCredentialResponse>(userPath('/account/credentials/rotate'), {
    method: 'POST',
  });
}

export function requestUserEmailCode(payload: RequestUserEmailCodeRequest) {
  return requestJson<MessageResponse>(userPath('/account/email/code'), {
    method: 'POST',
    json: payload,
  });
}

export function updateUserEmail(payload: UpdateUserEmailRequest) {
  return requestJson<UserProfileResponse>(userPath('/account/email'), {
    method: 'POST',
    json: payload,
  });
}

export function fetchUserSubscriptionPreview(id: number, templateId?: number) {
  const query = templateId ? { template_id: templateId } : {};
  return requestJson<UserSubscriptionPreview>(
    withQuery(userPath(`/subscriptions/${id}/preview`), query),
  );
}

export function fetchUserSubscriptionTraffic(id: number, query: UserSubscriptionTrafficQuery = {}) {
  return requestJson<UserSubscriptionTrafficResponse>(
    withQuery(userPath(`/subscriptions/${id}/traffic`), query),
  );
}

export function updateUserSubscriptionTemplate(id: number, templateId: number) {
  return requestJson<UserSubscriptionTemplateUpdate>(
    userPath(`/subscriptions/${id}/template`),
    {
      method: 'POST',
      json: { template_id: templateId },
    },
  );
}

export function createUserOrder(payload: CreateUserOrderRequest) {
  return requestJson<CreateUserOrderResponse>(userPath('/orders'), {
    method: 'POST',
    json: payload,
  });
}

export function cancelUserOrder(id: number, reason?: string) {
  return requestJson<CancelUserOrderResponse>(userPath(`/orders/${id}/cancel`), {
    method: 'POST',
    json: reason ? { reason } : {},
  });
}

export function fetchUserOrderDetail(id: number) {
  return requestJson<UserOrderDetailResponse>(userPath(`/orders/${id}`));
}

export function fetchUserOrderPaymentStatus(
  id: number,
  options: { toastOnError?: boolean } = {},
) {
  return requestJson<UserOrderPaymentStatusResponse>(userPath(`/orders/${id}/payment-status`), {
    toastOnError: options.toastOnError,
  });
}
