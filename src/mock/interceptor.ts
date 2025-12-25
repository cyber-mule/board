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
  Plan,
  UserSubscription,
  Announcement,
  Order,
  Node,
  SubscriptionTemplateSummary,
  AdminOrderDetail,
  SecuritySetting,
  CreatePlanRequest,
  UpdatePlanRequest,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  PublishAnnouncementRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  PublishTemplateRequest,
  PayOrderRequest,
  CancelOrderRequest,
  UpdateSecuritySettingsRequest,
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

// Check if request matches a path pattern
function matchPath(url: string, pattern: string): boolean {
  const urlPath = new URL(url).pathname;
  const regex = new RegExp('^' + pattern.replace(/\{[^}]+\}/g, '([^/]+)') + '$');
  return regex.test(urlPath);
}

// Extract ID from URL path
function extractId(url: string, pattern: string): number {
  const urlPath = new URL(url).pathname;
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
      
      const response: LoginResponse = {
        user,
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
      
      const response: LoginResponse = {
        user: newUser,
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        expires_in: 3600,
      };
      
      return mockResponse(response);
    }
  }

  if (matchPath(url, `${API_PREFIX}/auth/refresh`)) {
    if (method === 'POST' && currentUser) {
      const mockAccessToken = `mock-access-token-${currentUser.id}-refreshed`;
      setTokens(mockAccessToken, null);
      
      return mockResponse({
        access_token: mockAccessToken,
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
      return mockResponse({
        subscriptions: userSubs,
        pagination: { page: 1, per_page: 20, total: userSubs.length, has_next: false },
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/user/orders`)) {
    if (method === 'GET' && currentUser) {
      const userOrders = mockOrders.filter((o) => o.user_id === currentUser.id);
      return mockResponse({
        orders: userOrders,
        pagination: { page: 1, per_page: 20, total: userOrders.length, has_next: false },
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/user/balance`)) {
    if (method === 'GET' && currentUser) {
      return mockResponse({ balance_cents: currentUser.balance_cents, currency: 'USD' });
    }
  }

  // Public endpoints
  if (matchPath(url, `${API_PREFIX}/plans`)) {
    if (method === 'GET') {
      const visiblePlans = mockPlans.filter((p) => p.is_visible && p.status === 'active');
      return mockResponse({
        plans: visiblePlans,
        pagination: { page: 1, per_page: 20, total: visiblePlans.length, has_next: false },
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/announcements`)) {
    if (method === 'GET') {
      const published = mockAnnouncements.filter((a) => a.status === 'published');
      return mockResponse({
        announcements: published,
        pagination: { page: 1, per_page: 20, total: published.length, has_next: false },
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/nodes`)) {
    if (method === 'GET') {
      return mockResponse({
        nodes: mockNodes,
        pagination: { page: 1, per_page: 20, total: mockNodes.length, has_next: false },
      });
    }
  }

  // Admin endpoints
  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/plans`)) {
    if (method === 'GET') {
      return mockResponse({
        plans: mockPlans,
        pagination: { page: 1, per_page: 20, total: mockPlans.length, has_next: false },
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
      return mockResponse({ plan: newPlan }, 201);
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/plans/{id}`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/plans/{id}`);
    
    if (method === 'GET') {
      const plan = mockPlans.find((p) => p.id === id);
      if (!plan) return mockError('Plan not found', 404);
      return mockResponse({ plan });
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
      return mockResponse({ plan: mockPlans[planIndex] });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/announcements`)) {
    if (method === 'GET') {
      return mockResponse({
        announcements: mockAnnouncements,
        pagination: { page: 1, per_page: 20, total: mockAnnouncements.length, has_next: false },
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

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/templates`)) {
    if (method === 'GET') {
      return mockResponse({
        templates: mockTemplates,
        pagination: { page: 1, per_page: 20, total: mockTemplates.length, has_next: false },
      });
    }
    
    if (method === 'POST') {
      const data = body as CreateTemplateRequest;
      const newTemplate: SubscriptionTemplateSummary = {
        id: generateId(),
        name: data.name,
        client_type: data.client_type,
        format: data.format,
        version: 'v1',
        is_default: data.is_default || false,
        is_published: false,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      mockTemplates.push(newTemplate);
      return mockResponse({ template: newTemplate }, 201);
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/templates/{id}`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/templates/{id}`);
    
    if (method === 'PATCH') {
      const templateIndex = mockTemplates.findIndex((t) => t.id === id);
      if (templateIndex === -1) return mockError('Template not found', 404);
      
      const data = body as UpdateTemplateRequest;
      mockTemplates[templateIndex] = {
        ...mockTemplates[templateIndex],
        name: data.name ?? mockTemplates[templateIndex].name,
        is_default: data.is_default ?? mockTemplates[templateIndex].is_default,
        updated_at: Date.now(),
      };
      return mockResponse({ template: mockTemplates[templateIndex] });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/templates/{id}/publish`)) {
    const id = extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/templates/{id}/publish`);
    
    if (method === 'POST') {
      const templateIndex = mockTemplates.findIndex((t) => t.id === id);
      if (templateIndex === -1) return mockError('Template not found', 404);
      
      const data = body as PublishTemplateRequest;
      const currentVersion = mockTemplates[templateIndex].version || 'v1';
      const versionNum = parseInt(currentVersion.replace('v', ''), 10);
      const newVersion = `v${versionNum + 1}`;
      
      mockTemplates[templateIndex] = {
        ...mockTemplates[templateIndex],
        version: newVersion,
        is_published: true,
        published_at: Date.now(),
        updated_at: Date.now(),
      };
      return mockResponse({ template: mockTemplates[templateIndex] });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/templates/{id}/history`)) {
    if (method === 'GET') {
      return mockResponse({
        history: [
          {
            id: 1,
            template_id: extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/templates/{id}/history`),
            version: 'v3',
            changelog: 'Updated configuration format',
            published_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
          },
          {
            id: 2,
            template_id: extractId(url, `${API_PREFIX}/${ADMIN_PREFIX}/templates/{id}/history`),
            version: 'v2',
            changelog: 'Added new protocol support',
            published_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
          },
        ],
      });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/orders`)) {
    if (method === 'GET') {
      return mockResponse({
        orders: mockOrders,
        pagination: { page: 1, per_page: 20, total: mockOrders.length, has_next: false },
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
      return mockResponse({ settings: mockSecuritySettings });
    }
    
    if (method === 'PATCH') {
      const data = body as UpdateSecuritySettingsRequest;
      Object.assign(mockSecuritySettings, {
        ...data,
        updated_at: Date.now(),
      });
      return mockResponse({ settings: mockSecuritySettings });
    }
  }

  if (matchPath(url, `${API_PREFIX}/${ADMIN_PREFIX}/nodes`)) {
    if (method === 'GET') {
      return mockResponse({
        nodes: mockNodes,
        pagination: { page: 1, per_page: 20, total: mockNodes.length, has_next: false },
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
