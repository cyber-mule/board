/**
 * Mock Data Store
 * 
 * Contains all mock data for the application
 */

import type {
  User,
  UserSubscription,
  Plan,
  Order,
  Announcement,
  Node,
  ProtocolConfigSummary,
  ProtocolBindingSummary,
  SubscriptionTemplateSummary,
  AdminOrderDetail,
  SecuritySetting,
  PaymentChannelSummary,
} from '../api/types';

// Mock Users
export const mockUsers: User[] = [
  {
    id: 1,
    email: 'user@example.com',
    display_name: 'Test User',
    role: 'user',
    roles: ['user'],
    status: 'active',
    balance_cents: 100000, // $1000
    email_verified_at: Date.now() - 20 * 24 * 60 * 60 * 1000,
    failed_login_attempts: 0,
    last_login_at: Date.now() - 2 * 24 * 60 * 60 * 1000,
    created_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updated_at: Date.now(),
  },
  {
    id: 2,
    email: 'admin@example.com',
    display_name: 'Admin User',
    role: 'admin',
    roles: ['admin'],
    status: 'active',
    balance_cents: 0,
    email_verified_at: Date.now() - 80 * 24 * 60 * 60 * 1000,
    failed_login_attempts: 1,
    last_login_at: Date.now() - 6 * 60 * 60 * 1000,
    created_at: Date.now() - 90 * 24 * 60 * 60 * 1000,
    updated_at: Date.now(),
  },
  {
    id: 3,
    email: 'admin@demo.com',
    display_name: 'Demo Admin',
    role: 'admin',
    roles: ['admin'],
    status: 'active',
    balance_cents: 0,
    email_verified_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
    failed_login_attempts: 0,
    last_login_at: Date.now() - 12 * 60 * 60 * 1000,
    created_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updated_at: Date.now(),
  },
  {
    id: 4,
    email: 'user@demo.com',
    display_name: 'Demo User',
    role: 'user',
    roles: ['user'],
    status: 'active',
    balance_cents: 50000,
    email_verified_at: Date.now() - 8 * 24 * 60 * 60 * 1000,
    failed_login_attempts: 0,
    last_login_at: Date.now() - 5 * 24 * 60 * 60 * 1000,
    created_at: Date.now() - 20 * 24 * 60 * 60 * 1000,
    updated_at: Date.now(),
  },
];

// Mock Plans
export const mockPlans: Plan[] = [
  {
    id: 1,
    name: 'Starter Plan',
    slug: 'starter',
    description: 'Perfect for beginners and light usage',
    price_cents: 999,
    currency: 'USD',
    duration_days: 30,
    traffic_limit_bytes: 50 * 1024 * 1024 * 1024, // 50GB
    device_limit: 3,
    tags: ['popular', 'starter'],
    features: ['High-speed connection', 'Email support', 'Basic encryption'],
    binding_ids: [1, 3],
    status: 'active',
    is_visible: true,
    sort_order: 1,
    created_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: 2,
    name: 'Professional Plan',
    slug: 'professional',
    description: 'Great for professionals and small teams',
    price_cents: 2999,
    currency: 'USD',
    duration_days: 30,
    traffic_limit_bytes: 200 * 1024 * 1024 * 1024, // 200GB
    device_limit: 10,
    tags: ['recommended', 'professional'],
    features: [
      'Ultra high-speed connection',
      'Priority support',
      'Advanced encryption',
      'Multiple protocols',
      'No throttling',
    ],
    binding_ids: [1, 2, 3, 4],
    status: 'active',
    is_visible: true,
    sort_order: 2,
    created_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: 3,
    name: 'Enterprise Plan',
    slug: 'enterprise',
    description: 'Unlimited power for enterprises',
    price_cents: 9999,
    currency: 'USD',
    duration_days: 30,
    traffic_limit_bytes: 1024 * 1024 * 1024 * 1024, // 1TB
    device_limit: 50,
    tags: ['enterprise', 'unlimited'],
    features: [
      'Unlimited bandwidth',
      '24/7 dedicated support',
      'Enterprise encryption',
      'Custom protocols',
      'Dedicated IP',
      'SLA guarantee',
    ],
    binding_ids: [1, 2, 3, 4, 5],
    status: 'active',
    is_visible: true,
    sort_order: 3,
    created_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
];

// Mock Subscriptions
export const mockSubscriptions: UserSubscription[] = [
  {
    id: 1,
    user_id: 1,
    plan_id: 2,
    plan: mockPlans[1],
    status: 'active',
    template_id: 1,
    token: 'abc123',
    started_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
    expires_at: Date.now() + 20 * 24 * 60 * 60 * 1000,
    traffic_used_bytes: 50 * 1024 * 1024 * 1024, // 50GB used
    traffic_limit_bytes: 200 * 1024 * 1024 * 1024,
    device_count: 3,
    device_limit: 10,
    subscribe_url: 'https://example.com/subscribe/abc123',
    created_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updated_at: Date.now(),
  },
];

// Mock Orders
export const mockOrders: AdminOrderDetail[] = [
  {
    id: 1,
    number: 'ORD-2024-001',
    user_id: 1,
    user: mockUsers[0],
    plan_id: 2,
    plan: mockPlans[1],
    status: 'paid',
    payment_status: 'succeeded',
    payment_method: 'balance',
    total_cents: 2999,
    currency: 'USD',
    created_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
    paid_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
    payments: [
      {
        id: 1,
        order_id: 1,
        method: 'balance',
        status: 'succeeded',
        amount_cents: 2999,
        currency: 'USD',
        created_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
      },
    ],
    refunds: [],
  },
  {
    id: 2,
    number: 'ORD-2024-002',
    user_id: 1,
    user: mockUsers[0],
    plan_id: 1,
    plan: mockPlans[0],
    status: 'pending_payment',
    payment_status: 'pending',
    total_cents: 999,
    currency: 'USD',
    created_at: Date.now() - 2 * 60 * 60 * 1000,
    updated_at: Date.now() - 2 * 60 * 60 * 1000,
    payments: [],
    refunds: [],
  },
];

// Mock Announcements
export const mockAnnouncements: Announcement[] = [
  {
    id: 1,
    title: 'Welcome to Zero Network Panel',
    content:
      'We are excited to welcome you to our platform. Get started by exploring our plans and subscribing to one that fits your needs.',
    category: 'feature',
    audience: 'all',
    priority: 1,
    is_pinned: true,
    status: 'published',
    published_at: Date.now() - 5 * 24 * 60 * 60 * 1000,
    created_at: Date.now() - 5 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: 2,
    title: 'Scheduled Maintenance - December 26, 2024',
    content:
      'We will be performing scheduled maintenance on December 26, 2024 from 02:00 to 04:00 UTC. Services may be temporarily unavailable during this time.',
    category: 'maintenance',
    audience: 'all',
    priority: 2,
    is_pinned: false,
    status: 'published',
    published_at: Date.now() - 1 * 24 * 60 * 60 * 1000,
    expires_at: Date.now() + 2 * 24 * 60 * 60 * 1000,
    created_at: Date.now() - 2 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: 3,
    title: 'New Features Released',
    content:
      'Check out our latest features including advanced traffic analytics, multi-device support, and improved connection speeds.',
    category: 'feature',
    audience: 'user',
    priority: 3,
    is_pinned: false,
    status: 'draft',
    created_at: Date.now() - 12 * 60 * 60 * 1000,
    updated_at: Date.now() - 1 * 60 * 60 * 1000,
  },
];

// Mock Nodes
export const mockNodes: Node[] = [
  {
    id: 1,
    name: 'US West - Los Angeles',
    location: 'Los Angeles, CA',
    region: 'us-west',
    country: 'United States',
    isp: 'Cloudflare',
    status: 'online',
    protocols: ['vless', 'vmess', 'trojan'],
    capacity_mbps: 1000,
    description: 'West coast node with high bandwidth',
    access_address: 'la-edge.example.com',
    control_endpoint: 'https://kernel-la.example.com/api',
    load_percent: 45,
    online_user_count: 234,
    traffic_rate_mbps: 1250,
    last_synced_at: Math.floor((Date.now() - 5 * 60 * 1000) / 1000),
    created_at: Date.now() - 90 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 5 * 60 * 1000,
    kernels: [
      {
        protocol: 'vless',
        endpoint: 'vless://example.com:443',
        revision: 'v1.8.0',
        status: 'online',
        last_synced_at: Math.floor((Date.now() - 5 * 60 * 1000) / 1000),
      },
      {
        protocol: 'vmess',
        endpoint: 'vmess://example.com:444',
        revision: 'v1.7.5',
        status: 'online',
        last_synced_at: Math.floor((Date.now() - 5 * 60 * 1000) / 1000),
      },
      {
        protocol: 'trojan',
        endpoint: 'trojan://example.com:445',
        revision: 'v1.16.0',
        status: 'online',
        last_synced_at: Math.floor((Date.now() - 5 * 60 * 1000) / 1000),
      },
    ],
  },
  {
    id: 2,
    name: 'US East - New York',
    location: 'New York, NY',
    region: 'us-east',
    country: 'United States',
    isp: 'DigitalOcean',
    status: 'online',
    protocols: ['vless', 'shadowsocks'],
    capacity_mbps: 2000,
    description: 'East coast node optimized for low latency',
    access_address: 'ny-edge.example.com',
    control_endpoint: 'https://kernel-ny.example.com/api',
    load_percent: 62,
    online_user_count: 456,
    traffic_rate_mbps: 2100,
    last_synced_at: Math.floor((Date.now() - 3 * 60 * 1000) / 1000),
    created_at: Date.now() - 90 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 3 * 60 * 1000,
    kernels: [
      {
        protocol: 'vless',
        endpoint: 'vless://ny.example.com:443',
        revision: 'v1.8.0',
        status: 'online',
        last_synced_at: Math.floor((Date.now() - 3 * 60 * 1000) / 1000),
      },
      {
        protocol: 'shadowsocks',
        endpoint: 'ss://ny.example.com:8388',
        revision: 'v1.15.2',
        status: 'online',
        last_synced_at: Math.floor((Date.now() - 3 * 60 * 1000) / 1000),
      },
    ],
  },
  {
    id: 3,
    name: 'EU - Frankfurt',
    location: 'Frankfurt, Germany',
    region: 'eu-central',
    country: 'Germany',
    isp: 'Hetzner',
    status: 'online',
    protocols: ['trojan', 'hysteria'],
    capacity_mbps: 1500,
    description: 'European node with GDPR compliance',
    access_address: 'de-edge.example.com',
    control_endpoint: 'https://kernel-de.example.com/api',
    load_percent: 38,
    online_user_count: 189,
    traffic_rate_mbps: 980,
    last_synced_at: Math.floor((Date.now() - 2 * 60 * 1000) / 1000),
    created_at: Date.now() - 80 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 2 * 60 * 1000,
    kernels: [
      {
        protocol: 'trojan',
        endpoint: 'trojan://de.example.com:443',
        revision: 'v1.16.0',
        status: 'online',
        last_synced_at: Math.floor((Date.now() - 2 * 60 * 1000) / 1000),
      },
      {
        protocol: 'hysteria',
        endpoint: 'hysteria://de.example.com:36712',
        revision: 'v2.0.3',
        status: 'online',
        last_synced_at: Math.floor((Date.now() - 2 * 60 * 1000) / 1000),
      },
    ],
  },
  {
    id: 4,
    name: 'Asia - Singapore',
    location: 'Singapore',
    region: 'asia-southeast',
    country: 'Singapore',
    isp: 'AWS',
    status: 'maintenance',
    protocols: ['vless'],
    capacity_mbps: 800,
    description: 'Asian node under maintenance',
    access_address: 'sg-edge.example.com',
    control_endpoint: 'https://kernel-sg.example.com/api',
    load_percent: 0,
    online_user_count: 0,
    traffic_rate_mbps: 0,
    last_synced_at: Math.floor((Date.now() - 60 * 60 * 1000) / 1000),
    created_at: Date.now() - 70 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 1 * 60 * 1000,
    kernels: [
      {
        protocol: 'vless',
        endpoint: 'vless://sg.example.com:443',
        revision: 'v1.8.0',
        status: 'offline',
        last_synced_at: Math.floor((Date.now() - 60 * 60 * 1000) / 1000),
      },
    ],
  },
];

export const mockProtocolConfigs: ProtocolConfigSummary[] = [
  {
    id: 101,
    name: 'VLESS Edge Default',
    protocol: 'vless',
    status: 'active',
    tags: ['edge'],
    description: 'Default VLESS edge profile',
    profile: {
      transport: 'grpc',
      tls: true,
    },
    created_at: Date.now() - 70 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
  },
  {
    id: 102,
    name: 'VMess Edge',
    protocol: 'vmess',
    status: 'active',
    tags: ['edge'],
    description: 'VMess profile for legacy clients',
    profile: {
      transport: 'ws',
      tls: true,
    },
    created_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 9 * 24 * 60 * 60 * 1000,
  },
  {
    id: 103,
    name: 'VLESS NYC',
    protocol: 'vless',
    status: 'active',
    tags: ['us-east'],
    description: 'NYC VLESS profile',
    profile: {
      transport: 'tcp',
      tls: true,
    },
    created_at: Date.now() - 55 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: 104,
    name: 'Trojan EU',
    protocol: 'trojan',
    status: 'active',
    tags: ['eu'],
    description: 'Trojan profile for EU nodes',
    profile: {
      transport: 'tcp',
      tls: true,
    },
    created_at: Date.now() - 50 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 6 * 24 * 60 * 60 * 1000,
  },
  {
    id: 105,
    name: 'VLESS SG',
    protocol: 'vless',
    status: 'maintenance',
    tags: ['asia'],
    description: 'Singapore maintenance profile',
    profile: {
      transport: 'grpc',
      tls: true,
    },
    created_at: Date.now() - 45 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
];

export const mockProtocolBindings: ProtocolBindingSummary[] = [
  {
    id: 1,
    name: 'LA vless',
    node_id: 1,
    node_name: 'US West - Los Angeles',
    protocol_config_id: 101,
    protocol: 'vless',
    role: 'edge',
    kernel_id: 'vless-la',
    access_port: 443,
    status: 'online',
    sync_status: 'synced',
    health_status: 'healthy',
    last_synced_at: Math.floor((Date.now() - 5 * 60 * 1000) / 1000),
    created_at: Date.now() - 70 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 5 * 60 * 1000,
  },
  {
    id: 2,
    name: 'LA vmess',
    node_id: 1,
    node_name: 'US West - Los Angeles',
    protocol_config_id: 102,
    protocol: 'vmess',
    role: 'edge',
    kernel_id: 'vmess-la',
    access_port: 8443,
    status: 'online',
    sync_status: 'synced',
    health_status: 'healthy',
    last_synced_at: Math.floor((Date.now() - 5 * 60 * 1000) / 1000),
    created_at: Date.now() - 70 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 5 * 60 * 1000,
  },
  {
    id: 3,
    name: 'NY vless',
    node_id: 2,
    node_name: 'US East - New York',
    protocol_config_id: 103,
    protocol: 'vless',
    role: 'edge',
    kernel_id: 'vless-ny',
    access_port: 443,
    status: 'online',
    sync_status: 'synced',
    health_status: 'healthy',
    last_synced_at: Math.floor((Date.now() - 3 * 60 * 1000) / 1000),
    created_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 3 * 60 * 1000,
  },
  {
    id: 4,
    name: 'DE trojan',
    node_id: 3,
    node_name: 'EU - Frankfurt',
    protocol_config_id: 104,
    protocol: 'trojan',
    role: 'edge',
    kernel_id: 'trojan-de',
    access_port: 443,
    status: 'online',
    sync_status: 'synced',
    health_status: 'healthy',
    last_synced_at: Math.floor((Date.now() - 2 * 60 * 1000) / 1000),
    created_at: Date.now() - 55 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 2 * 60 * 1000,
  },
  {
    id: 5,
    name: 'SG vless',
    node_id: 4,
    node_name: 'Asia - Singapore',
    protocol_config_id: 105,
    protocol: 'vless',
    role: 'edge',
    kernel_id: 'vless-sg',
    access_port: 443,
    status: 'maintenance',
    sync_status: 'pending',
    health_status: 'degraded',
    last_synced_at: Math.floor((Date.now() - 60 * 60 * 1000) / 1000),
    created_at: Date.now() - 50 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 60 * 60 * 1000,
  },
];

// Mock Subscription Templates
export const mockTemplates: SubscriptionTemplateSummary[] = [
  {
    id: 1,
    name: 'Clash Premium',
    client_type: 'clash',
    format: 'yaml',
    version: 'v3',
    is_default: true,
    is_published: true,
    published_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
    created_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 30 * 24 * 60 * 60 * 1000,
  },
  {
    id: 2,
    name: 'V2Ray Standard',
    client_type: 'v2ray',
    format: 'json',
    version: 'v1',
    is_default: false,
    is_published: true,
    published_at: Date.now() - 20 * 24 * 60 * 60 * 1000,
    created_at: Date.now() - 50 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 20 * 24 * 60 * 60 * 1000,
  },
  {
    id: 3,
    name: 'Shadowsocks Basic',
    client_type: 'shadowsocks',
    format: 'json',
    version: 'v1',
    is_default: false,
    is_published: false,
    created_at: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
];

// Mock Payment Channels
export const mockPaymentChannels: PaymentChannelSummary[] = [
  {
    id: 1,
    name: 'Stripe Checkout',
    code: 'stripe_checkout',
    provider: 'stripe',
    enabled: true,
    sort_order: 1,
    config: {
      mode: 'http',
      notify_url:
        'https://example.com/api/v1/payments/callback?order_id={{order_id}}&payment_id={{payment_id}}',
      return_url: 'https://example.com/orders/{{order_number}}',
      http: {
        endpoint: 'https://gateway.example.com/pay',
        method: 'POST',
        body_type: 'json',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          order_no: '{{order_number}}',
          amount: '{{amount}}',
          notify_url: '{{notify_url}}',
          return_url: '{{return_url}}',
        },
      },
      response: {
        pay_url: 'data.pay_url',
        qr_code: 'data.qr_code',
        reference: 'data.reference',
      },
    },
    created_at: Date.now() - 35 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: 2,
    name: 'Manual Transfer',
    code: 'manual_transfer',
    provider: 'offline',
    enabled: false,
    sort_order: 2,
    config: {
      mode: 'manual',
      instructions: 'Bank transfer or offline settlement.',
    },
    created_at: Date.now() - 20 * 24 * 60 * 60 * 1000,
    updated_at: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
];

// Mock Security Settings
export const mockSecuritySettings: SecuritySetting = {
  id: 1,
  enable_api: false,
  api_key: '',
  api_secret: '',
  signature_algorithm: 'hmac-sha256',
  nonce_ttl_seconds: 300,
  updated_at: Date.now() - 7 * 24 * 60 * 60 * 1000,
};

// Current user state (for authentication)
export let currentUser: User | null = null;
export let accessToken: string | null = null;
export let refreshToken: string | null = null;

export function setCurrentUser(user: User | null) {
  currentUser = user;
}

export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
}

// Helper to get user by email
export function getUserByEmail(email: string): User | undefined {
  return mockUsers.find((u) => u.email === email);
}

// Helper to generate mock IDs
let nextId = 1000;
export function generateId(): number {
  return nextId++;
}

// Helper to generate mock order number
let orderCounter = 100;
export function generateOrderNumber(): string {
  return `ORD-2024-${String(orderCounter++).padStart(3, '0')}`;
}
