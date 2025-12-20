import { requestJson } from '../http';
import { adminPath } from '../paths';
import { withQuery } from '../query';
import type {
  AdminDashboardResponse,
  AdminOrderDetail,
  AdminOrderDetailResponse,
  AnnouncementSummary,
  NodeKernelSummary,
  NodeSummary,
  PaginationMeta,
  PlanSummary,
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

type AdminPlansQuery = PaginationQuery & {
  sort?: string;
  direction?: string;
  q?: string;
  status?: string;
  visible?: boolean;
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

type PaginatedResponse<T> = {
  pagination: PaginationMeta;
} & T;

export function fetchAdminDashboard() {
  return requestJson<AdminDashboardResponse>(adminPath('/dashboard'));
}

export function fetchAdminNodes(query: AdminNodesQuery = {}) {
  return requestJson<PaginatedResponse<{ nodes: NodeSummary[] }>>(
    withQuery(adminPath('/nodes'), query),
  );
}

export function fetchAdminNodeKernels(id: number) {
  return requestJson<{ node_id: number; kernels: NodeKernelSummary[] }>(
    adminPath(`/nodes/${id}/kernels`),
  );
}

export function fetchAdminPlans(query: AdminPlansQuery = {}) {
  return requestJson<PaginatedResponse<{ plans: PlanSummary[] }>>(
    withQuery(adminPath('/plans'), query),
  );
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
