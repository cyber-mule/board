import { requestJson } from '../http';
import { userPath } from '../paths';
import { withQuery } from '../query';
import type {
  CancelUserOrderResponse,
  CreateUserOrderRequest,
  CreateUserOrderResponse,
  OrderDetail,
  PaginationMeta,
  UserOrderDetailResponse,
  UserAnnouncementSummary,
  UserBalanceResponse,
  UserPlanSummary,
  UserSubscriptionPreview,
  UserSubscriptionSummary,
  UserSubscriptionTemplateUpdate,
} from '../types';

type PaginationQuery = {
  page?: number;
  per_page?: number;
};

type UserSubscriptionsQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  status?: string;
};

type UserAnnouncementsQuery = {
  audience?: string;
  limit?: number;
};

type UserOrdersQuery = PaginationQuery & {
  status?: string;
  payment_method?: string;
  payment_status?: string;
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

export function fetchUserAnnouncements(query: UserAnnouncementsQuery = {}) {
  return requestJson<{ announcements: UserAnnouncementSummary[] }>(
    withQuery(userPath('/announcements'), query),
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

export function fetchUserSubscriptionPreview(id: number, templateId?: number) {
  const query = templateId ? { template_id: templateId } : {};
  return requestJson<UserSubscriptionPreview>(
    withQuery(userPath(`/subscriptions/${id}/preview`), query),
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
