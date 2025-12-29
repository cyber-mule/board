/**
 * Mock API Interceptor
 * 
 * Intercepts API requests and returns mock data
 */

import { API_PREFIX, ADMIN_PREFIX } from '../config/env';
import {
  mockUsers,
  mockPlans,
  mockSubscriptions,
  mockOrders,
  mockAnnouncements,
  mockNodes,
  mockTemplates,
  mockPaymentChannels,
  mockSecuritySettings,
  currentUser,
  setCurrentUser,
  setTokens,
  getUserByEmail,
  generateId,
  generateOrderNumber,
} from './data';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  VerifyRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  MessageResponse,
  Plan,
  UserSubscription,
  Announcement,
  Order,
  Node,
  SubscriptionTemplateSummary,
  AdminOrderDetail,
  AdminUserSummary,
  AdminSubscriptionSummary,
  SecuritySetting,
  CreateAdminUserRequest,
  CreateAdminSubscriptionRequest,
  CreatePlanRequest,
  UpdatePlanRequest,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  PublishAnnouncementRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  PublishTemplateRequest,
  CreatePaymentChannelRequest,
  UpdatePaymentChannelRequest,
  PaymentChannelSummary,
  PayOrderRequest,
  CancelOrderRequest,
  ExtendAdminSubscriptionRequest,
  ResetUserPasswordRequest,
  UpdateSecuritySettingsRequest,
  UpdateAdminSubscriptionRequest,
  UpdateUserRolesRequest,
  UpdateUserStatusRequest,
} from '../api/types';

// Simulate network delay
const MOCK_DELAY = 300;

function delay(ms: number = MOCK_DELAY): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock response wrapper
function mockResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseUrl(url: string): URL | null {
  const baseUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost';

  try {
    return new URL(url, baseUrl);
  } catch (error) {
    return null;
  }
}

function getUrlPath(url: string): string {
  const parsedUrl = parseUrl(url);
  if (parsedUrl) {
    return parsedUrl.pathname;
  }

  const fallback = url.split('?')[0].split('#')[0];
  return fallback.startsWith('/') ? fallback : `/${fallback}`;
}

function parsePagination(url: string): { page: number; perPage: number } {
  const parsedUrl = parseUrl(url);
  if (!parsedUrl) {
    return { page: 1, perPage: 20 };
  }

  const pageValue = Number(parsedUrl.searchParams.get('page') ?? '1');
  const perPageValue = Number(parsedUrl.searchParams.get('per_page') ?? '20');

  const page = Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1;
  const perPage = Number.isFinite(perPageValue) && perPageValue > 0 ? Math.floor(perPageValue) : 20;

  return { page, perPage };
}

function paginate<T>(items: T[], url: string) {
  const { page, perPage } = parsePagination(url);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;

  return {
    data: items.slice(start, start + perPage),
    pagination: {
      page: safePage,
      per_page: perPage,
      total_count: total,
      has_next: safePage < totalPages,
      has_prev: safePage > 1,
    },
  };
}

function normalizePlan(plan: Plan) {
  const planValue = plan as Plan & {
    device_limit?: number;
    devices_limit?: number;
    is_visible?: boolean;
    visible?: boolean;
  };

  return {
    ...planValue,
    devices_limit: planValue.devices_limit ?? planValue.device_limit,
    visible: planValue.visible ?? planValue.is_visible,
  };
}

function normalizeTemplate(template: SubscriptionTemplateSummary): SubscriptionTemplateSummary {
  const rawVersion = template.version ?? 1;
  const parsedVersion =
    typeof rawVersion === 'number'
      ? rawVersion
      : parseInt(String(rawVersion).replace(/^v/i, ''), 10);

  return {
    ...template,
    version: Number.isFinite(parsedVersion) ? parsedVersion : 1,
  };
}

type AdminUserSource = {
  id: number;
  email: string;
  display_name: string;
  role?: string;
  roles?: string[];
  status?: string;
  email_verified_at?: number;
  failed_login_attempts?: number;
  locked_until?: number;
  last_login_at?: number;
  created_at: number;
  updated_at: number;
};

function normalizeAdminUser(user: AdminUserSource): AdminUserSummary {
  const roles = user.roles ?? (user.role ? [user.role] : []);

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    roles,
    status: user.status ?? 'active',
    email_verified_at: user.email_verified_at,
    failed_login_attempts: user.failed_login_attempts ?? 0,
    locked_until: user.locked_until,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function buildSubscriptionSummary(subscription: UserSubscription) {
  const subscriptionValue = subscription as UserSubscription & {
    device_limit?: number;
    devices_limit?: number;
    template_id?: number;
    name?: string;
    plan_name?: string;
    available_template_ids?: number[];
    token?: string;
    subscribe_url?: string;
    subscription_url?: string;
    traffic_total_bytes?: number;
  };
  const plan = subscriptionValue.plan ?? mockPlans.find((item) => item.id === subscriptionValue.plan_id);
  const templateIds = mockTemplates.map((template) => template.id);
  const resolvedTemplateIds = subscriptionValue.available_template_ids ?? templateIds;
  const templateId = subscriptionValue.template_id ?? resolvedTemplateIds[0];

  return {
    id: subscriptionValue.id,
    name: subscriptionValue.name ?? plan?.name ?? `Subscription ${subscription.id}`,
    plan_name: subscriptionValue.plan_name ?? plan?.name,
    status: subscriptionValue.status,
    template_id: templateId,
    available_template_ids: resolvedTemplateIds,
    token: subscriptionValue.token,
    subscription_url: subscriptionValue.subscription_url,
    subscribe_url: subscriptionValue.subscribe_url,
    expires_at: subscriptionValue.expires_at,
    traffic_total_bytes: subscriptionValue.traffic_total_bytes ?? subscriptionValue.traffic_limit_bytes,
    traffic_used_bytes: subscriptionValue.traffic_used_bytes,
    devices_limit: subscriptionValue.devices_limit ?? subscriptionValue.device_limit,
    last_refreshed_at: subscriptionValue.updated_at,
  };
}

function buildAdminSubscriptionSummary(subscription: UserSubscription): AdminSubscriptionSummary {
  const subscriptionValue = subscription as UserSubscription & {
    device_limit?: number;
    devices_limit?: number;
    template_id?: number;
    name?: string;
    plan_name?: string;
    available_template_ids?: number[];
    token?: string;
    subscribe_url?: string;
    subscription_url?: string;
    traffic_total_bytes?: number;
  };
  const plan = subscriptionValue.plan ?? mockPlans.find((item) => item.id === subscriptionValue.plan_id);
  const templateIds = mockTemplates.map((template) => template.id);
  const resolvedTemplateIds = subscriptionValue.available_template_ids ?? templateIds;
  const templateId = subscriptionValue.template_id ?? resolvedTemplateIds[0];
  const targetUser = mockUsers.find((user) => user.id === subscriptionValue.user_id);
  const token =
    subscriptionValue.token ??
    subscriptionValue.subscribe_url?.split('/').filter(Boolean).slice(-1)[0];

  return {
    id: subscriptionValue.id,
    user: targetUser
      ? {
          id: targetUser.id,
          email: targetUser.email,
          display_name: targetUser.display_name,
        }
      : undefined,
    name: subscriptionValue.name ?? plan?.name ?? `Subscription ${subscription.id}`,
    plan_name: subscriptionValue.plan_name ?? plan?.name ?? '-',
    status: subscriptionValue.status,
    template_id: templateId,
    available_template_ids: resolvedTemplateIds,
    token,
    subscription_url: subscriptionValue.subscription_url,
    subscribe_url: subscriptionValue.subscribe_url,
    expires_at: subscriptionValue.expires_at,
    traffic_total_bytes: subscriptionValue.traffic_total_bytes ?? subscriptionValue.traffic_limit_bytes,
    traffic_used_bytes: subscriptionValue.traffic_used_bytes,
    devices_limit: subscriptionValue.devices_limit ?? subscriptionValue.device_limit,
    last_refreshed_at: subscriptionValue.updated_at,
    created_at: subscriptionValue.created_at,
    updated_at: subscriptionValue.updated_at,
  };
}

function buildBalanceSnapshot(user: { id: number; balance_cents?: number }) {
  return {
    user_id: user.id,
    balance_cents: user.balance_cents ?? 0,
    currency: 'USD',
    updated_at: Date.now(),
  };
}

function buildBalanceResponse(user: { id: number; balance_cents?: number }, url: string) {
  const transactions = mockOrders
    .filter((order) => order.user_id === user.id)
    .map((order) => ({
      id: order.id,
      entry_type: order.status === 'paid' ? 'debit' : 'pending',
      amount_cents: order.total_cents,
      currency: order.currency,
      balance_after_cents: user.balance_cents ?? 0,
      reference: order.number,
      description: `Order ${order.number}`,
      created_at: order.created_at,
    }));
  const { data, pagination } = paginate(transactions, url);

  return {
    user_id: user.id,
    balance_cents: user.balance_cents ?? 0,
    currency: 'USD',
    updated_at: Date.now(),
    transactions: data,
    pagination,
  };
}

function normalizeSecuritySettings() {
  const settings = mockSecuritySettings as SecuritySetting & {
    enable_api?: boolean;
    signature_algorithm?: string;
  };

  return {
    ...settings,
    third_party_api_enabled: settings.third_party_api_enabled ?? settings.enable_api ?? false,
    encryption_algorithm:
      settings.encryption_algorithm ?? settings.signature_algorithm ?? 'HMAC-SHA256',
  };
}

// Check if request matches a path pattern
function matchPath(url: string, pattern: string): boolean {
  const urlPath = getUrlPath(url);
  const regex = new RegExp('^' + pattern.replace(/\{[^}]+\}/g, '([^/]+)') + '$');
  return regex.test(urlPath);
}

// Extract ID from URL path
function extractId(url: string, pattern: string): number {
  const urlPath = getUrlPath(url);
  const patternParts = pattern.split('/');
  const urlParts = urlPath.split('/');
  
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith('{') && patternParts[i].endsWith('}')) {
      return parseInt(urlParts[i], 10);
    }
  }
  return 0;
}

/**
 * Main mock interceptor function
 */
export async function mockFetch(url: string, options: RequestInit = {}): Promise<Response> {
  await delay();

  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body as string) : null;
  
  console.log('[MOCK]', method, url, body);
  const adminTemplatePath = `${API_PREFIX}/${ADMIN_PREFIX}/subscription-templates`;
  const adminTemplateLegacyPath = `${API_PREFIX}/${ADMIN_PREFIX}/templates`;

  // Auth endpoints
  if (matchPath(url, `${API_PREFIX}/auth/login`)) {
    if (method === 'POST') {
      const { email, password } = body as LoginRequest;
      const user = getUserByEmail(email);
      
      if (!user || password !== 'P@ssw0rd!') {
        return mockError('Invalid credentials', 401);
      }
      
      setCurrentUser(user);
      const mockAccessToken = `mock-access-token-${user.id}`;
      const mockRefreshToken = `mock-refresh-token-${user.id}`;
      setTokens(mockAccessToken, mockRefreshToken);
      const userRoles = (user as { roles?: string[]; role?: string }).roles;
      const authUser = {
        ...user,
        roles: userRoles ?? (user.role ? [user.role] : []),
      };
      
      const response: LoginResponse = {
        user: authUser,
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        expires_in: 3600,
      };
      
      return mockResponse(response);
    }
  }

  if (matchPath(url, `${API_PREFIX}/auth/register`)) {
    if (method === 'POST') {
      const { email, password, display_name } = body as RegisterRequest;
      
      if (getUserByEmail(email)) {
        return mockError('Email already exists', 400);
      }
      
      const newUser = {
        id: generateId(),
        email,
        display_name: display_name || email.split('@')[0],
        role: 'user' as const,
        balance_cents: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      
      mockUsers.push(newUser);
      setCurrentUser(newUser);
      const mockAccessToken = `mock-access-token-${newUser.id}`;
      const mockRefreshToken = `mock-refresh-token-${newUser.id}`;
      setTokens(mockAccessToken, mockRefreshToken);
      const newUserRoles = (newUser as { roles?: string[]; role?: string }).roles;
      const authUser = {
        ...newUser,
        roles: newUserRoles ?? (newUser.role ? [newUser.role] : []),
      };
      
      const response: LoginResponse = {
        user: authUser,
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        expires_in: 3600,
      };
      
      return mockResponse(response);
    }
  }

  if (matchPath(url, `${API_PREFIX}/auth/verify`)) {
    if (method === 'POST') {
      const { email, code } = body as VerifyRequest;
      const user = getUserByEmail(email);

      if (!email || !code) {
        return mockError('Missing verification details', 400);
      }

      if (!user) {
        return mockError('Account not found', 404);
      }

      setCurrentUser(user);
      const mockAccessToken = `mock-access-token-${user.id}`;
      const mockRefreshToken = `mock-refresh-token-${user.id}`;
      setTokens(mockAccessToken, mockRefreshToken);
      const userRoles = (user as { roles?: string[]; role?: string }).roles;
      const authUser = {
        ...user,
        roles: userRoles ?? (user.role ? [user.role] : []),
      };

      const response: LoginResponse = {
        user: authUser,
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        expires_in: 3600,
      };

      return mockResponse(response);
    }
  }

  if (matchPath(url, `${API_PREFIX}/auth/forgot`)) {
    if (method === 'POST') {
      const { email } = body as ForgotPasswordRequest;

      if (!email) {
        return mockError('Email required', 400);
      }

      const response: MessageResponse = {
        message: '验证码已发送，请检查邮箱。',
      };

      return mockResponse(response);
    }
  }

  if (matchPath(url, `${API_PREFIX}/auth/reset`)) {
    if (method === 'POST') {
      const { email, code, password } = body as ResetPasswordRequest;

      if (!email || !code || !password) {
        return mockError('Missing reset details', 400);
      }

      if (!getUserByEmail(email)) {
        return mockError('Account not found', 404);
      }

      const response: MessageResponse = {
        message: '密码已重置，请使用新密码登录。',
      };

      return mockResponse(response);
    }
  }

  if (matchPath(url, `${API_PREFIX}/auth/refresh`)) {
    if (method === 'POST' && currentUser) {
      const mockAccessToken = `mock-access-token-${currentUser.id}-refreshed`;
      const mockRefreshToken = `mock-refresh-token-${currentUser.id}`;
      setTokens(mockAccessToken, mockRefreshToken);
      
      return mockResponse({
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        expires_in: 3600,
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/auth/logout`)) {
    if (method === 'POST') {
      setCurrentUser(null);
      setTokens(null, null);
      return new Response(null, { status: 204 });
    }
  }

  // User endpoints
  if (matchPath(url, `${API_PREFIX}/user/profile`)) {
    if (method === 'GET' && currentUser) {
      return mockResponse({ user: currentUser });
    }
  }

  if (matchPath(url, `${API_PREFIX}/user/subscriptions`)) {
    if (method === 'GET' && currentUser) {
      const userSubs = mockSubscriptions.filter((s) => s.user_id === currentUser.id);
      const summaries = userSubs.map(buildSubscriptionSummary);
      const { data, pagination } = paginate(summaries, url);
      return mockResponse({
        subscriptions: data,
        pagination,
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/user/subscriptions/{id}/preview`)) {
    if (method === 'GET' && currentUser) {
      const id = extractId(url, `${API_PREFIX}/user/subscriptions/{id}/preview`);
      const parsedUrl = parseUrl(url);
      const templateIdParam = parsedUrl?.searchParams.get('template_id');
      const templateId = templateIdParam ? Number(templateIdParam) : undefined;
      const selectedTemplate = mockTemplates.find((template) => template.id === templateId);
      const fallbackTemplate =
        mockTemplates.find((template) => template.is_default) ?? mockTemplates[0];
      const targetTemplate = selectedTemplate ?? fallbackTemplate;
      const format = targetTemplate?.format ?? 'text';
      const contentType =
        format === 'yaml'
          ? 'text/yaml'
          : format === 'json'
            ? 'application/json'
            : 'text/plain';
      const resolvedTemplateId = targetTemplate?.id ?? templateId ?? 0;

      return mockResponse({
        subscription_id: id,
        template_id: resolvedTemplateId,
        content: targetTemplate?.content ?? `# Mock subscription ${id}\n# Template ${resolvedTemplateId}\n`,
        content_type: contentType,
        etag: `mock-${id}-${resolvedTemplateId}-${Date.now()}`,
        generated_at: Date.now(),
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/user/subscriptions/{id}/template`)) {
    if (method === 'POST' && currentUser) {
      const id = extractId(url, `${API_PREFIX}/user/subscriptions/{id}/template`);
      const payload = body as { template_id?: number };
      const subIndex = mockSubscriptions.findIndex((sub) => sub.id === id);
      if (subIndex === -1) return mockError('Subscription not found', 404);

      const templateId = payload?.template_id ?? mockTemplates[0]?.id ?? 0;
      mockSubscriptions[subIndex] = {
        ...mockSubscriptions[subIndex],
        template_id: templateId,
        updated_at: Date.now(),
      };

      return mockResponse({
        subscription_id: id,
        template_id: templateId,
        updated_at: Date.now(),
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/user/plans`)) {
    if (method === 'GET') {
      const visiblePlans = mockPlans
        .map(normalizePlan)
        .filter((plan) => plan.visible && plan.status === 'active');
      return mockResponse({ plans: visiblePlans });
    }
  }

  if (matchPath(url, `${API_PREFIX}/user/announcements`)) {
    if (method === 'GET') {
      const parsedUrl = parseUrl(url);
      const limitValue = parsedUrl?.searchParams.get('limit');
      const limit = limitValue ? Number(limitValue) : Number.NaN;
      const published = mockAnnouncements.filter((a) => a.status === 'published');
      const announcements =
        Number.isFinite(limit) && limit > 0
          ? published.slice(0, Math.floor(limit))
          : published;
      return mockResponse({ announcements });
    }
  }

  if (matchPath(url, `${API_PREFIX}/user/payment-channels`)) {
    if (method === 'GET') {
      const parsedUrl = parseUrl(url);
      const provider = parsedUrl?.searchParams.get('provider');
      const enabledChannels = mockPaymentChannels.filter((channel) => channel.enabled);
      const channels = provider
        ? enabledChannels.filter((channel) => channel.provider === provider)
        : enabledChannels;
      const paymentMethods = ['balance', 'manual'];
      if (channels.length) {
        paymentMethods.splice(1, 0, 'external');
      }
      return mockResponse({ channels, payment_methods: paymentMethods });
    }
  }

  if (matchPath(url, `${API_PREFIX}/user/orders`)) {
    if (method === 'GET' && currentUser) {
      const userOrders = mockOrders.filter((o) => o.user_id === currentUser.id);
      const { data, pagination } = paginate(userOrders, url);
      return mockResponse({
        orders: data,
        pagination,
      });
    }

    if (method === 'POST' && currentUser) {
      const payload = body as {
        plan_id?: number;
        quantity?: number;
        payment_method?: string;
        payment_channel?: string;
      };
      const plan = mockPlans.find((p) => p.id === payload.plan_id) ?? mockPlans[0];
      const quantity = payload.quantity && payload.quantity > 0 ? payload.quantity : 1;
      const totalCents = (plan?.price_cents ?? 0) * quantity;
      const orderId = generateId();
      const paymentMethod = payload.payment_method ?? 'balance';
      const channel = mockPaymentChannels.find((item) => item.code === payload.payment_channel);
      const isExternal = paymentMethod === 'external' && totalCents > 0;
      const isBalance = paymentMethod === 'balance' || totalCents === 0;
      const isManual = paymentMethod === 'manual';
      const order: AdminOrderDetail = {
        id: orderId,
        number: generateOrderNumber(),
        user_id: currentUser.id,
        user: currentUser,
        plan_id: plan?.id,
        plan,
        status: isBalance ? 'paid' : 'pending_payment',
        payment_status: isBalance ? 'succeeded' : 'pending',
        payment_method: paymentMethod,
        total_cents: totalCents,
        currency: plan?.currency ?? 'USD',
        created_at: Date.now(),
        updated_at: Date.now(),
        payment_intent_id: isExternal ? `intent_${orderId}` : undefined,
        paid_at: isBalance ? Date.now() : undefined,
        items: [
          {
            id: generateId(),
            order_id: orderId,
            item_type: 'plan',
            item_id: plan?.id ?? 0,
            name: plan?.name ?? 'Plan',
            quantity,
            unit_price_cents: plan?.price_cents ?? 0,
            currency: plan?.currency ?? 'USD',
            subtotal_cents: totalCents,
            created_at: Date.now(),
          },
        ],
        payments: isBalance
          ? [
              {
                id: generateId(),
                order_id: orderId,
                method: paymentMethod,
                status: 'succeeded',
                amount_cents: totalCents,
                currency: plan?.currency ?? 'USD',
                created_at: Date.now(),
              },
            ]
          : isExternal
            ? [
                {
                  id: generateId(),
                  order_id: orderId,
                  provider: channel?.provider,
                  method: paymentMethod,
                  intent_id: `intent_${orderId}`,
                  status: 'pending',
                  amount_cents: totalCents,
                  currency: plan?.currency ?? 'USD',
                  metadata: {
                    pay_url: `https://example.com/pay/${orderId}`,
                    qr_code: `https://example.com/qr/${orderId}.png`,
                  },
                  created_at: Date.now(),
                },
              ]
            : isManual
              ? [
                  {
                    id: generateId(),
                    order_id: orderId,
                    method: paymentMethod,
                    status: 'pending',
                    amount_cents: totalCents,
                    currency: plan?.currency ?? 'USD',
                    created_at: Date.now(),
                  },
                ]
              : [],
        refunds: [],
      };

      mockOrders.unshift(order);

      return mockResponse({
        order,
        balance: buildBalanceSnapshot(currentUser),
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/user/orders/{id}`)) {
    if (method === 'GET' && currentUser) {
      const id = extractId(url, `${API_PREFIX}/user/orders/{id}`);
      const order = mockOrders.find((o) => o.id === id && o.user_id === currentUser.id);
      if (!order) return mockError('Order not found', 404);
      return mockResponse({ order, balance: buildBalanceSnapshot(currentUser) });
    }
  }

  if (matchPath(url, `${API_PREFIX}/user/orders/{id}/payment-status`)) {
    if (method === 'GET' && currentUser) {
      const id = extractId(url, `${API_PREFIX}/user/orders/{id}/payment-status`);
      const order = mockOrders.find((o) => o.id === id && o.user_id === currentUser.id);
      if (!order) return mockError('Order not found', 404);
      return mockResponse({
        order_id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        payment_intent_id: order.payment_intent_id,
        payment_reference: order.payment_reference,
        payment_failure_code: order.payment_failure_code,
        payment_failure_message: order.payment_failure_message,
        paid_at: order.paid_at,
        cancelled_at: order.cancelled_at,
        refunded_cents: order.refunded_cents ?? 0,
        refunded_at: order.refunded_at,
        updated_at: order.updated_at ?? order.created_at,
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/user/orders/{id}/cancel`)) {
    if (method === 'POST' && currentUser) {
      const id = extractId(url, `${API_PREFIX}/user/orders/{id}/cancel`);
      const orderIndex = mockOrders.findIndex((o) => o.id === id && o.user_id === currentUser.id);
      if (orderIndex === -1) return mockError('Order not found', 404);

      mockOrders[orderIndex] = {
        ...mockOrders[orderIndex],
        status: 'cancelled',
        payment_status: 'cancelled',
        cancelled_at: Date.now(),
        updated_at: Date.now(),
      };

      return mockResponse({
        order: mockOrders[orderIndex],
        balance: buildBalanceSnapshot(currentUser),
      });
    }
  }

  if (
    matchPath(url, `${API_PREFIX}/user/account/balance`) ||
    matchPath(url, `${API_PREFIX}/user/balance`)
  ) {
    if (method === 'GET' && currentUser) {
      return mockResponse(buildBalanceResponse(currentUser, url));
    }
  }

  // Public endpoints
  if (matchPath(url, `${API_PREFIX}/plans`)) {
    if (method === 'GET') {
      const visiblePlans = mockPlans
        .map(normalizePlan)
        .filter((p) => p.visible && p.status === 'active');
      const { data, pagination } = paginate(visiblePlans, url);
      return mockResponse({
        plans: data,
        pagination,
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/announcements`)) {
    if (method === 'GET') {
      const published = mockAnnouncements.filter((a) => a.status === 'published');
      const { data, pagination } = paginate(published, url);
      return mockResponse({
        announcements: data,
        pagination,
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/nodes`)) {
    if (method === 'GET') {
      const { data, pagination } = paginate(mockNodes, url);
      return mockResponse({
        nodes: data,
        pagination,
      });
    }
  }

  // Admin endpoints
  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/dashboard`)) {
    if (method === 'GET') {
      return mockResponse({
        modules: [
          {
            key: 'users',
            name: 'Users',
            description: 'Manage user accounts, roles, and status.',
            route: '/admin/users',
          },
          {
            key: 'nodes',
            name: 'Nodes',
            description: 'Monitor node health and kernel sync status.',
            route: '/admin/nodes',
          },
          {
            key: 'plans',
            name: 'Plans',
            description: 'Manage pricing plans and availability.',
            route: '/admin/plans',
          },
          {
            key: 'orders',
            name: 'Orders',
            description: 'Track payments, refunds, and order status.',
            route: '/admin/orders',
          },
          {
            key: 'announcements',
            name: 'Announcements',
            description: 'Publish and manage announcements.',
            route: '/admin/announcements',
          },
          {
            key: 'payment_channels',
            name: 'Payment Channels',
            description: 'Configure payment gateways and callback URLs.',
            route: '/admin/payment-channels',
          },
          {
            key: 'templates',
            name: 'Subscription Templates',
            description: 'Manage subscription template configurations.',
            route: '/admin/templates',
          },
          {
            key: 'subscriptions',
            name: 'Subscriptions',
            description: 'Manage active subscriptions and lifecycle actions.',
            route: '/admin/subscriptions',
          },
          {
            key: 'security',
            name: 'Security',
            description: 'Configure third-party API settings.',
            route: '/admin/security',
          },
        ],
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/users`)) {
    if (method === 'GET') {
      const parsedUrl = parseUrl(url);
      const query = parsedUrl?.searchParams;
      const q = query?.get('q')?.trim().toLowerCase();
      const status = query?.get('status')?.trim();
      const role = query?.get('role')?.trim();

      let list = mockUsers.map(normalizeAdminUser);

      if (q) {
        list = list.filter((user) => {
          const email = user.email.toLowerCase();
          const name = user.display_name.toLowerCase();
          return email.includes(q) || name.includes(q);
        });
      }
      if (status) {
        list = list.filter((user) => user.status === status);
      }
      if (role) {
        list = list.filter((user) => user.roles?.includes(role));
      }

      const { data, pagination } = paginate(list, url);
      return mockResponse({
        users: data,
        pagination,
      });
    }

    if (method === 'POST') {
      const data = body as CreateAdminUserRequest;
      const exists = mockUsers.some((user) => user.email === data.email);
      if (exists) {
        return mockError('Email already exists', 400);
      }

      const roles = data.roles && data.roles.length ? data.roles : ['user'];
      const displayName = data.display_name || data.email.split('@')[0];
      const createdAt = Date.now();

      const newUser = {
        id: generateId(),
        email: data.email,
        display_name: displayName,
        role: roles[0],
        roles,
        status: data.status ?? 'active',
        balance_cents: 0,
        email_verified_at: data.email_verified ? createdAt : undefined,
        failed_login_attempts: 0,
        created_at: createdAt,
        updated_at: createdAt,
      };

      mockUsers.push(newUser);
      return mockResponse({ user: normalizeAdminUser(newUser) }, 201);
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/users/{id}/status`)) {
    if (method === 'PATCH') {
      const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/users/{id}/status`);
      const userIndex = mockUsers.findIndex((user) => user.id === id);
      if (userIndex === -1) return mockError('User not found', 404);

      const data = body as UpdateUserStatusRequest;
      mockUsers[userIndex] = {
        ...mockUsers[userIndex],
        status: data.status,
        updated_at: Date.now(),
      };

      return mockResponse({ user: normalizeAdminUser(mockUsers[userIndex]) });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/users/{id}/roles`)) {
    if (method === 'PATCH') {
      const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/users/{id}/roles`);
      const userIndex = mockUsers.findIndex((user) => user.id === id);
      if (userIndex === -1) return mockError('User not found', 404);

      const data = body as UpdateUserRolesRequest;
      const roles = data.roles ?? [];
      mockUsers[userIndex] = {
        ...mockUsers[userIndex],
        roles,
        role: roles[0] ?? mockUsers[userIndex].role,
        updated_at: Date.now(),
      };

      return mockResponse({ user: normalizeAdminUser(mockUsers[userIndex]) });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/users/{id}/reset-password`)) {
    if (method === 'POST') {
      const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/users/{id}/reset-password`);
      const user = mockUsers.find((item) => item.id === id);
      if (!user) return mockError('User not found', 404);

      const data = body as ResetUserPasswordRequest;
      if (!data.password) return mockError('Password required', 400);

      return mockResponse({ message: 'Password reset' });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/users/{id}/force-logout`)) {
    if (method === 'POST') {
      const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/users/{id}/force-logout`);
      const user = mockUsers.find((item) => item.id === id);
      if (!user) return mockError('User not found', 404);

      return mockResponse({ message: 'User logged out' });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/subscriptions`)) {
    if (method === 'GET') {
      const parsedUrl = parseUrl(url);
      const query = parsedUrl?.searchParams;
      const q = query?.get('q')?.trim().toLowerCase();
      const status = query?.get('status')?.trim();
      const userId = Number(query?.get('user_id') ?? '');
      const planName = query?.get('plan_name')?.trim().toLowerCase();
      const templateId = Number(query?.get('template_id') ?? '');

      let list = mockSubscriptions.map(buildAdminSubscriptionSummary);

      if (q) {
        list = list.filter((subscription) => {
          const name = subscription.name.toLowerCase();
          const token = subscription.token?.toLowerCase() ?? '';
          return name.includes(q) || token.includes(q);
        });
      }
      if (status) {
        list = list.filter((subscription) => subscription.status === status);
      }
      if (Number.isFinite(userId) && userId > 0) {
        list = list.filter((subscription) => subscription.user?.id === userId);
      }
      if (planName) {
        list = list.filter((subscription) =>
          subscription.plan_name.toLowerCase().includes(planName),
        );
      }
      if (Number.isFinite(templateId) && templateId > 0) {
        list = list.filter((subscription) => subscription.template_id === templateId);
      }

      const { data, pagination } = paginate(list, url);
      return mockResponse({
        subscriptions: data,
        pagination,
      });
    }

    if (method === 'POST') {
      const data = body as CreateAdminSubscriptionRequest;
      const createdAt = Date.now();
      const newSubscription = {
        id: generateId(),
        user_id: data.user_id,
        name: data.name,
        plan_name: data.plan_name,
        status: data.status ?? 'active',
        template_id: data.template_id,
        available_template_ids: data.available_template_ids,
        token: data.token,
        expires_at: data.expires_at,
        traffic_total_bytes: data.traffic_total_bytes,
        traffic_used_bytes: data.traffic_used_bytes ?? 0,
        device_limit: data.devices_limit,
        created_at: createdAt,
        updated_at: createdAt,
      };

      mockSubscriptions.unshift(newSubscription as UserSubscription);
      return mockResponse({ subscription: buildAdminSubscriptionSummary(newSubscription as UserSubscription) }, 201);
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/subscriptions/{id}`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/subscriptions/{id}`);

    if (method === 'GET') {
      const subscription = mockSubscriptions.find((item) => item.id === id);
      if (!subscription) return mockError('Subscription not found', 404);
      return mockResponse({ subscription: buildAdminSubscriptionSummary(subscription) });
    }

    if (method === 'PATCH') {
      const subscriptionIndex = mockSubscriptions.findIndex((item) => item.id === id);
      if (subscriptionIndex === -1) return mockError('Subscription not found', 404);

      const data = body as UpdateAdminSubscriptionRequest;
      const current = mockSubscriptions[subscriptionIndex] as UserSubscription & {
        plan_name?: string;
        name?: string;
        token?: string;
        available_template_ids?: number[];
        traffic_total_bytes?: number;
        devices_limit?: number;
      };

      mockSubscriptions[subscriptionIndex] = {
        ...current,
        name: data.name ?? current.name,
        plan_name: data.plan_name ?? current.plan_name,
        status: data.status ?? current.status,
        template_id: data.template_id ?? current.template_id,
        available_template_ids: data.available_template_ids ?? current.available_template_ids,
        token: data.token ?? current.token,
        expires_at: data.expires_at ?? current.expires_at,
        traffic_total_bytes: data.traffic_total_bytes ?? current.traffic_total_bytes,
        traffic_used_bytes: data.traffic_used_bytes ?? current.traffic_used_bytes,
        devices_limit: data.devices_limit ?? current.devices_limit,
        device_limit: data.devices_limit ?? current.device_limit,
        updated_at: Date.now(),
      };

      return mockResponse({
        subscription: buildAdminSubscriptionSummary(mockSubscriptions[subscriptionIndex]),
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/subscriptions/{id}/disable`)) {
    if (method === 'POST') {
      const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/subscriptions/{id}/disable`);
      const subscriptionIndex = mockSubscriptions.findIndex((item) => item.id === id);
      if (subscriptionIndex === -1) return mockError('Subscription not found', 404);

      mockSubscriptions[subscriptionIndex] = {
        ...mockSubscriptions[subscriptionIndex],
        status: 'disabled',
        updated_at: Date.now(),
      };

      return mockResponse({
        subscription: buildAdminSubscriptionSummary(mockSubscriptions[subscriptionIndex]),
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/subscriptions/{id}/extend`)) {
    if (method === 'POST') {
      const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/subscriptions/{id}/extend`);
      const subscriptionIndex = mockSubscriptions.findIndex((item) => item.id === id);
      if (subscriptionIndex === -1) return mockError('Subscription not found', 404);

      const data = body as ExtendAdminSubscriptionRequest;
      const current = mockSubscriptions[subscriptionIndex] as UserSubscription & { expires_at?: number };
      const base = current.expires_at ?? Date.now();
      const isMs = base > 1e12;
      const unit = isMs ? 1000 : 1;
      let nextExpiresAt = base;

      if (data.expires_at) {
        nextExpiresAt = data.expires_at;
      } else if (data.extend_days) {
        nextExpiresAt = base + data.extend_days * 24 * 60 * 60 * unit;
      } else if (data.extend_hours) {
        nextExpiresAt = base + data.extend_hours * 60 * 60 * unit;
      }

      mockSubscriptions[subscriptionIndex] = {
        ...mockSubscriptions[subscriptionIndex],
        expires_at: nextExpiresAt,
        updated_at: Date.now(),
      };

      return mockResponse({
        subscription: buildAdminSubscriptionSummary(mockSubscriptions[subscriptionIndex]),
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/plans`)) {
    if (method === 'GET') {
      const { data, pagination } = paginate(mockPlans.map(normalizePlan), url);
      return mockResponse({
        plans: data,
        pagination,
      });
    }
    
    if (method === 'POST') {
      const data = body as CreatePlanRequest;
      const newPlan: Plan = {
        id: generateId(),
        ...data,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      mockPlans.push(newPlan);
      return mockResponse({ plan: normalizePlan(newPlan) }, 201);
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/plans/{id}`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/plans/{id}`);
    
    if (method === 'GET') {
      const plan = mockPlans.find((p) => p.id === id);
      if (!plan) return mockError('Plan not found', 404);
      return mockResponse({ plan: normalizePlan(plan) });
    }
    
    if (method === 'PATCH') {
      const planIndex = mockPlans.findIndex((p) => p.id === id);
      if (planIndex === -1) return mockError('Plan not found', 404);
      
      const data = body as UpdatePlanRequest;
      mockPlans[planIndex] = {
        ...mockPlans[planIndex],
        ...data,
        updated_at: Date.now(),
      };
      return mockResponse({ plan: normalizePlan(mockPlans[planIndex]) });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/payment-channels`)) {
    if (method === 'GET') {
      const parsedUrl = parseUrl(url);
      const query = parsedUrl?.searchParams;
      const q = query?.get('q')?.trim().toLowerCase();
      const provider = query?.get('provider')?.trim().toLowerCase();
      const enabledParam = query?.get('enabled')?.trim();
      const sort = query?.get('sort')?.trim() || 'updated';
      const direction = query?.get('direction')?.trim() || 'desc';

      let list = [...mockPaymentChannels];

      if (q) {
        list = list.filter((channel) => {
          const name = channel.name.toLowerCase();
          const code = channel.code.toLowerCase();
          return name.includes(q) || code.includes(q);
        });
      }

      if (provider) {
        list = list.filter((channel) =>
          (channel.provider || '').toLowerCase().includes(provider),
        );
      }

      if (enabledParam === 'true' || enabledParam === 'false') {
        const enabled = enabledParam === 'true';
        list = list.filter((channel) => (channel.enabled ?? false) === enabled);
      }

      list.sort((a, b) => {
        const multiplier = direction === 'asc' ? 1 : -1;
        if (sort === 'name') {
          return a.name.localeCompare(b.name) * multiplier;
        }
        if (sort === 'created') {
          return ((a.created_at ?? 0) - (b.created_at ?? 0)) * multiplier;
        }
        return ((a.updated_at ?? 0) - (b.updated_at ?? 0)) * multiplier;
      });

      const { data, pagination } = paginate(list, url);
      return mockResponse({ channels: data, pagination });
    }

    if (method === 'POST') {
      const data = body as CreatePaymentChannelRequest;
      if (!data.name || !data.code) return mockError('Name and code required', 400);

      const createdAt = Date.now();
      const newChannel: PaymentChannelSummary = {
        id: generateId(),
        name: data.name,
        code: data.code,
        provider: data.provider,
        enabled: data.enabled ?? true,
        sort_order: data.sort_order ?? 0,
        config: data.config,
        created_at: createdAt,
        updated_at: createdAt,
      };

      mockPaymentChannels.push(newChannel);
      return mockResponse({ channel: newChannel }, 201);
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/payment-channels/{id}`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/payment-channels/{id}`);
    const channelIndex = mockPaymentChannels.findIndex((channel) => channel.id === id);

    if (method === 'GET') {
      if (channelIndex === -1) return mockError('Payment channel not found', 404);
      return mockResponse({ channel: mockPaymentChannels[channelIndex] });
    }

    if (method === 'PATCH') {
      if (channelIndex === -1) return mockError('Payment channel not found', 404);

      const data = body as UpdatePaymentChannelRequest;
      const current = mockPaymentChannels[channelIndex];
      mockPaymentChannels[channelIndex] = {
        ...current,
        name: data.name ?? current.name,
        code: data.code ?? current.code,
        provider: data.provider ?? current.provider,
        enabled: data.enabled ?? current.enabled,
        sort_order: data.sort_order ?? current.sort_order,
        config: data.config ?? current.config,
        updated_at: Date.now(),
      };

      return mockResponse({ channel: mockPaymentChannels[channelIndex] });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/announcements`)) {
    if (method === 'GET') {
      const { data, pagination } = paginate(mockAnnouncements, url);
      return mockResponse({
        announcements: data,
        pagination,
      });
    }
    
    if (method === 'POST') {
      const data = body as CreateAnnouncementRequest;
      const newAnnouncement: Announcement = {
        id: generateId(),
        ...data,
        status: 'draft',
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      mockAnnouncements.push(newAnnouncement);
      return mockResponse({ announcement: newAnnouncement }, 201);
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/announcements/{id}`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/announcements/{id}`);
    
    if (method === 'PATCH') {
      const announcementIndex = mockAnnouncements.findIndex((a) => a.id === id);
      if (announcementIndex === -1) return mockError('Announcement not found', 404);
      
      const data = body as UpdateAnnouncementRequest;
      mockAnnouncements[announcementIndex] = {
        ...mockAnnouncements[announcementIndex],
        ...data,
        updated_at: Date.now(),
      };
      return mockResponse({ announcement: mockAnnouncements[announcementIndex] });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/announcements/{id}/publish`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/announcements/{id}/publish`);
    
    if (method === 'POST') {
      const announcementIndex = mockAnnouncements.findIndex((a) => a.id === id);
      if (announcementIndex === -1) return mockError('Announcement not found', 404);
      
      const data = body as PublishAnnouncementRequest;
      mockAnnouncements[announcementIndex] = {
        ...mockAnnouncements[announcementIndex],
        status: 'published',
        published_at: Date.now(),
        expires_at: data.expires_at,
        updated_at: Date.now(),
      };
      return mockResponse({ announcement: mockAnnouncements[announcementIndex] });
    }
  }

  if (matchPath(url, adminTemplatePath) || matchPath(url, adminTemplateLegacyPath)) {
    if (method === 'GET') {
      const normalizedTemplates = mockTemplates.map(normalizeTemplate);
      const { data, pagination } = paginate(normalizedTemplates, url);
      return mockResponse({
        templates: data,
        pagination,
      });
    }
    
    if (method === 'POST') {
      const data = body as CreateTemplateRequest;
      const newTemplate: SubscriptionTemplateSummary = {
        id: generateId(),
        name: data.name,
        description: data.description,
        client_type: data.client_type,
        format: data.format,
        content: data.content,
        variables: data.variables,
        version: 1,
        is_default: data.is_default || false,
        updated_at: Date.now(),
      };
      mockTemplates.push(newTemplate);
      return mockResponse({ template: newTemplate }, 201);
    }
  }

  const templateDetailPath = `${adminTemplatePath}/{id}`;
  const templateDetailLegacyPath = `${adminTemplateLegacyPath}/{id}`;
  if (matchPath(url, templateDetailPath) || matchPath(url, templateDetailLegacyPath)) {
    const id = extractId(
      url,
      matchPath(url, templateDetailPath) ? templateDetailPath : templateDetailLegacyPath,
    );
    
    if (method === 'PATCH') {
      const templateIndex = mockTemplates.findIndex((t) => t.id === id);
      if (templateIndex === -1) return mockError('Template not found', 404);
      
      const data = body as UpdateTemplateRequest;
      mockTemplates[templateIndex] = {
        ...mockTemplates[templateIndex],
        name: data.name ?? mockTemplates[templateIndex].name,
        description: data.description ?? mockTemplates[templateIndex].description,
        format: data.format ?? mockTemplates[templateIndex].format,
        content: data.content ?? mockTemplates[templateIndex].content,
        variables: data.variables ?? mockTemplates[templateIndex].variables,
        is_default: data.is_default ?? mockTemplates[templateIndex].is_default,
        updated_at: Date.now(),
      };
      return mockResponse({ template: normalizeTemplate(mockTemplates[templateIndex]) });
    }
  }

  const templatePublishPath = `${adminTemplatePath}/{id}/publish`;
  const templatePublishLegacyPath = `${adminTemplateLegacyPath}/{id}/publish`;
  if (matchPath(url, templatePublishPath) || matchPath(url, templatePublishLegacyPath)) {
    const id = extractId(
      url,
      matchPath(url, templatePublishPath) ? templatePublishPath : templatePublishLegacyPath,
    );
    
    if (method === 'POST') {
      const templateIndex = mockTemplates.findIndex((t) => t.id === id);
      if (templateIndex === -1) return mockError('Template not found', 404);
      
      const data = body as PublishTemplateRequest;
      const currentVersion = normalizeTemplate(mockTemplates[templateIndex]).version;
      const newVersion = currentVersion + 1;
      
      mockTemplates[templateIndex] = {
        ...mockTemplates[templateIndex],
        version: newVersion,
        published_at: Date.now(),
        last_published_by: data.operator,
        updated_at: Date.now(),
      };
      return mockResponse({
        template: normalizeTemplate(mockTemplates[templateIndex]),
        history: {
          version: newVersion,
          changelog: data.changelog,
          published_at: Date.now(),
          published_by: data.operator || 'Mock Operator',
          variables: mockTemplates[templateIndex].variables,
        },
      });
    }
  }

  const templateHistoryPath = `${adminTemplatePath}/{id}/history`;
  const templateHistoryLegacyPath = `${adminTemplateLegacyPath}/{id}/history`;
  if (matchPath(url, templateHistoryPath) || matchPath(url, templateHistoryLegacyPath)) {
    if (method === 'GET') {
      const templateId = extractId(
        url,
        matchPath(url, templateHistoryPath) ? templateHistoryPath : templateHistoryLegacyPath,
      );
      return mockResponse({
        template_id: templateId,
        history: [
          {
            version: 3,
            changelog: 'Updated configuration format',
            published_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
            published_by: 'Mock Operator',
          },
          {
            version: 2,
            changelog: 'Added new protocol support',
            published_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
            published_by: 'Mock Operator',
          },
        ],
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/orders`)) {
    if (method === 'GET') {
      const { data, pagination } = paginate(mockOrders, url);
      return mockResponse({
        orders: data,
        pagination,
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/orders/{id}`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/orders/{id}`);
    
    if (method === 'GET') {
      const order = mockOrders.find((o) => o.id === id);
      if (!order) return mockError('Order not found', 404);
      return mockResponse({ order });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/orders/{id}/pay`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/orders/{id}/pay`);
    
    if (method === 'POST') {
      const orderIndex = mockOrders.findIndex((o) => o.id === id);
      if (orderIndex === -1) return mockError('Order not found', 404);
      
      const data = body as PayOrderRequest;
      mockOrders[orderIndex] = {
        ...mockOrders[orderIndex],
        status: 'paid',
        payment_status: 'succeeded',
        payment_method: data.payment_method,
        paid_at: Date.now(),
        updated_at: Date.now(),
        payments: [
          ...mockOrders[orderIndex].payments,
          {
            id: generateId(),
            order_id: id,
            method: data.payment_method,
            status: 'succeeded',
            amount_cents: mockOrders[orderIndex].total_cents,
            currency: mockOrders[orderIndex].currency,
            reference: data.reference,
            created_at: Date.now(),
          },
        ],
      };
      return mockResponse({ order: mockOrders[orderIndex] });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/orders/{id}/cancel`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/orders/{id}/cancel`);
    
    if (method === 'POST') {
      const orderIndex = mockOrders.findIndex((o) => o.id === id);
      if (orderIndex === -1) return mockError('Order not found', 404);
      
      const data = body as CancelOrderRequest;
      mockOrders[orderIndex] = {
        ...mockOrders[orderIndex],
        status: 'cancelled',
        cancelled_at: Date.now(),
        cancellation_reason: data.reason,
        updated_at: Date.now(),
      };
      return mockResponse({ order: mockOrders[orderIndex] });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/orders/{id}/refund`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/orders/{id}/refund`);
    
    if (method === 'POST') {
      const orderIndex = mockOrders.findIndex((o) => o.id === id);
      if (orderIndex === -1) return mockError('Order not found', 404);
      
      const data = body as { amount_cents: number; reason?: string; operator?: string };
      const order = mockOrders[orderIndex];
      
      // Validate refund amount
      const currentRefunded = order.refunded_cents || 0;
      const maxRefundable = order.total_cents - currentRefunded;
      
      if (data.amount_cents <= 0) {
        return mockError('Refund amount must be greater than 0', 400);
      }
      
      if (data.amount_cents > maxRefundable) {
        return mockError(`Refund amount exceeds maximum refundable: ${maxRefundable}`, 400);
      }
      
      const refund = {
        id: generateId(),
        order_id: id,
        amount_cents: data.amount_cents,
        reason: data.reason,
        reference: `REF-${Date.now()}`,
        metadata: { operator: data.operator },
        created_at: Date.now(),
      };
      
      const newRefundedTotal = currentRefunded + data.amount_cents;
      const isFullyRefunded = newRefundedTotal >= order.total_cents;
      
      mockOrders[orderIndex] = {
        ...order,
        status: isFullyRefunded ? 'refunded' : order.status,
        refunded_cents: newRefundedTotal,
        refunded_at: isFullyRefunded ? Date.now() : order.refunded_at,
        updated_at: Date.now(),
        refunds: [...(order.refunds || []), refund],
      };
      
      return mockResponse({ 
        order: mockOrders[orderIndex],
        refund,
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/security-settings`)) {
    if (method === 'GET') {
      return mockResponse({ setting: normalizeSecuritySettings() });
    }
    
    if (method === 'PATCH') {
      const data = body as UpdateSecuritySettingsRequest;
      const updated = {
        ...normalizeSecuritySettings(),
        ...data,
        updated_at: Date.now(),
      };

      Object.assign(mockSecuritySettings, updated, {
        enable_api: updated.third_party_api_enabled,
        signature_algorithm: updated.encryption_algorithm,
      });

      return mockResponse({ setting: normalizeSecuritySettings() });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/nodes`)) {
    if (method === 'GET') {
      const { data, pagination } = paginate(mockNodes, url);
      return mockResponse({
        nodes: data,
        pagination,
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/nodes/{id}/kernels`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/nodes/{id}/kernels`);
    
    if (method === 'GET') {
      const node = mockNodes.find((n) => n.id === id);
      if (!node) return mockError('Node not found', 404);
      
      return mockResponse({
        node_id: id,
        kernels: node.kernels || [],
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/nodes/{id}/kernels/sync`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/nodes/{id}/kernels/sync`);
    
    if (method === 'POST') {
      const nodeIndex = mockNodes.findIndex((n) => n.id === id);
      if (nodeIndex === -1) return mockError('Node not found', 404);
      
      // Update last_synced_at for all kernels
      const updatedKernels = (mockNodes[nodeIndex].kernels || []).map((kernel) => ({
        ...kernel,
        last_synced_at: Math.floor(Date.now() / 1000),
        status: 'online', // Mark as online after sync
      }));
      
      mockNodes[nodeIndex] = {
        ...mockNodes[nodeIndex],
        kernels: updatedKernels,
        last_synced_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      };
      
      return mockResponse({
        node_id: id,
        synced_count: updatedKernels.length,
        kernels: updatedKernels,
      });
    }
  }

  // Default: not found
  return mockError('Mock endpoint not found', 404);
}
