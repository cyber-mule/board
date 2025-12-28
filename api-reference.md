# Zero Network Panel API 参考

> 本文档基于 `internal/handler/routes.go` 与 `internal/types` 整理，描述当前实现的接口与字段。
> 自动生成的 Markdown 文档可通过 `./scripts/gen-api-docs.sh` 生成，输出到 `docs/api-generated/`。
> 时间字段统一为 Unix 秒（UTC）。以下字段未标注 `可选` 即默认必填，实际校验以服务端错误提示为准。

## 基础信息

- Base URL：`http(s)://<host>:<port>/api/v1`
- 管理端前缀：`/api/v1/{adminPrefix}`，默认 `admin`，由 `Admin.RoutePrefix` 配置。
- 内容类型：`Content-Type: application/json`

## 鉴权

- 登录：`POST /api/v1/auth/login` 获取 `access_token` 与 `refresh_token`。
- 刷新：`POST /api/v1/auth/refresh` 换取新令牌。
- 注册：`POST /api/v1/auth/register` 创建账号，若要求验证会返回 `requires_verification=true`。
- 验证：`POST /api/v1/auth/verify` 使用验证码激活账号并返回令牌。
- 找回：`POST /api/v1/auth/forgot` 获取验证码，`POST /api/v1/auth/reset` 完成重置。
- 鉴权方式：`Authorization: Bearer <access_token>`
- 角色约束：
  - 管理端接口需要 `admin` 角色。
  - 用户端接口需要 `user` 角色。

## 错误响应

- 业务错误返回：`{"message": "..."}`，并带有对应 HTTP 状态码。
- 常见状态码：
  - `400` 参数非法
  - `401` 未登录或令牌失效
  - `403` 权限不足或访问受限
  - `404` 资源不存在
  - `409` 冲突（并发/状态不允许）
  - `429` 超出速率限制（管理端 IP 限流/验证码频控）
  - `500` 未捕获错误

## 第三方签名与加密（可选）

当 `security_settings.third_party_api_enabled = true` 且 `api_key/api_secret` 生效时，`/api/v1/user/*` 接口需要签名校验。

必填头部：

- `X-ZNP-API-Key`
- `X-ZNP-Timestamp`（Unix 秒）
- `X-ZNP-Nonce`（随机字符串）
- `X-ZNP-Signature`

签名规则：

```
METHOD\nPATH\nRAW_QUERY\nTIMESTAMP\nNONCE\nBASE64(BODY)
```

- `METHOD` 为大写 HTTP 方法。
- `PATH` 为请求路径（不含 host）。
- `RAW_QUERY` 为原始查询串（无则为空）。
- `BODY` 为原始请求体（空 body 也需要参与签名）。
- 使用 `HMAC-SHA256` 以 `api_secret` 计算，结果 Base64 编码后填入 `X-ZNP-Signature`。

可选加密：

- 头部：`X-ZNP-Encrypted: true`、`X-ZNP-IV: <base64>`
- 算法：AES-256-GCM
- key：`SHA256(api_secret)`
- body 为密文，服务端会在验签通过后解密。

## 分页与通用字段

- `page`、`per_page` 默认 `1/20`，最大 `100`。
- 分页响应：
  - `page`、`per_page`、`total_count`、`has_next`、`has_prev`

## 通用数据结构

### PaginationMeta

- `page` int
- `per_page` int
- `total_count` int64
- `has_next` bool
- `has_prev` bool

### AuthenticatedUser

- `id` uint64
- `email` string
- `display_name` string
- `roles` []string
- `created_at` int64
- `updated_at` int64

### BalanceSnapshot

- `user_id` uint64
- `balance_cents` int64
- `currency` string
- `updated_at` int64

### BalanceTransactionSummary

- `id` uint64
- `entry_type` string
- `amount_cents` int64
- `currency` string
- `balance_after_cents` int64
- `reference` string
- `description` string
- `metadata` object
- `created_at` int64

### OrderItem

- `id` uint64
- `order_id` uint64
- `item_type` string
- `item_id` uint64
- `name` string
- `quantity` int
- `unit_price_cents` int64
- `currency` string
- `subtotal_cents` int64
- `metadata` object
- `created_at` int64

### OrderRefund

- `id` uint64
- `order_id` uint64
- `amount_cents` int64
- `reason` string
- `reference` string
- `metadata` object
- `created_at` int64

### OrderPayment

- `id` uint64
- `order_id` uint64
- `provider` string
- `method` string
- `intent_id` string
- `reference` string
- `status` string
- `amount_cents` int64
- `currency` string
- `failure_code` string
- `failure_message` string
- `metadata` object（常见字段：`pay_url`、`qr_code`、`gateway_intent_id`、`notify_url`、`return_url`）
- `created_at` int64
- `updated_at` int64

### OrderDetail

- `id` uint64
- `number` string
- `user_id` uint64
- `status` string（示例：`pending_payment`、`paid`、`payment_failed`、`cancelled`、`partially_refunded`、`refunded`）
- `payment_status` string（示例：`pending`、`succeeded`、`failed`）
- `payment_method` string（示例：`balance`、`external`、`manual`）
- `payment_intent_id` string（可选）
- `payment_reference` string（可选）
- `payment_failure_code` string（可选）
- `payment_failure_message` string（可选）
- `total_cents` int64
- `refunded_cents` int64
- `currency` string
- `plan_id` uint64（可选）
- `plan_snapshot` object（可选）
- `metadata` object（可选）
- `paid_at` int64（可选）
- `cancelled_at` int64（可选）
- `refunded_at` int64（可选）
- `created_at` int64
- `updated_at` int64
- `items` []OrderItem
- `refunds` []OrderRefund
- `payments` []OrderPayment

## 接口参考

### 系统

#### GET /api/v1/ping

- 说明：健康检查
- 响应：`PingResponse`
  - `status` string
  - `service` string
  - `version` string
  - `site_name` string
  - `logo_url` string
  - `timestamp` int64

### 认证

#### POST /api/v1/auth/login

- 说明：用户登录并获取访问令牌
- 请求体：
  - `email` string
  - `password` string
- 响应：
  - `access_token` string
  - `refresh_token` string
  - `token_type` string
  - `expires_in` int64
  - `refresh_expires_in` int64
  - `user` AuthenticatedUser

#### POST /api/v1/auth/refresh

- 说明：刷新访问令牌
- 请求体：
  - `refresh_token` string
- 响应：同 `auth/login`

#### POST /api/v1/auth/register

- 说明：注册账号
- 请求体：
  - `email` string
  - `password` string
  - `display_name` string（可选）
  - `invite_code` string（可选）
- 备注：当 `Auth.Registration.InviteOnly=true` 时，必须提供 `invite_code`。
- 响应：
  - `requires_verification` bool
  - `access_token` string（可选）
  - `refresh_token` string（可选）
  - `token_type` string（可选）
  - `expires_in` int64（可选）
  - `refresh_expires_in` int64（可选）
  - `user` AuthenticatedUser

#### POST /api/v1/auth/verify

- 说明：邮箱验证码验证
- 请求体：
  - `email` string
  - `code` string
- 响应：同 `auth/login`

#### POST /api/v1/auth/forgot

- 说明：发送密码重置验证码
- 请求体：
  - `email` string
- 响应：
  - `message` string

#### POST /api/v1/auth/reset

- 说明：使用验证码重置密码
- 请求体：
  - `email` string
  - `code` string
  - `password` string
- 响应：
  - `message` string

### 管理端（需要 admin 权限）

> 实际路径：`/api/v1/{adminPrefix}`

#### GET /api/v1/{adminPrefix}/dashboard

- 说明：获取后台模块清单
- 响应：
  - `modules` []AdminModule
    - `key` string
    - `name` string
    - `description` string
    - `icon` string
    - `route` string
    - `permissions` []string

#### GET /api/v1/{adminPrefix}/users

- 说明：用户列表
- 查询参数：`page`、`per_page`、`q`、`status`、`role`
- 响应：
  - `users` []AdminUserSummary
  - `pagination` PaginationMeta

AdminUserSummary 字段：

- `id`、`email`、`display_name`、`roles`、`status`
- `email_verified_at`（可选）、`failed_login_attempts`
- `locked_until`（可选）、`last_login_at`（可选）
- `created_at`、`updated_at`

#### POST /api/v1/{adminPrefix}/users

- 说明：创建用户
- 请求体：
  - `email` string
  - `password` string
  - `display_name` string（可选）
  - `roles` []string（可选）
  - `status` string（可选）
  - `email_verified` bool（可选）
- 响应：
  - `user` AdminUserSummary

#### PATCH /api/v1/{adminPrefix}/users/{id}/status

- 说明：更新用户状态
- 请求体：
  - `status` string（示例：`active`、`disabled`、`pending`）
- 响应：
  - `user` AdminUserSummary

#### PATCH /api/v1/{adminPrefix}/users/{id}/roles

- 说明：更新用户角色
- 请求体：
  - `roles` []string
- 响应：
  - `user` AdminUserSummary

#### POST /api/v1/{adminPrefix}/users/{id}/reset-password

- 说明：重置用户密码
- 请求体：
  - `password` string
- 响应：
  - `message` string

#### POST /api/v1/{adminPrefix}/users/{id}/force-logout

- 说明：强制下线用户
- 响应：
  - `message` string

#### GET /api/v1/{adminPrefix}/nodes

- 说明：节点列表
- 查询参数：`page`、`per_page`、`sort`、`direction`、`q`、`status`、`protocol`
- `sort` 可选：`name`、`region`、`last_synced_at`、`capacity_mbps`
- 响应：
  - `nodes` []NodeSummary
  - `pagination` PaginationMeta

NodeSummary 字段：

- `id`、`name`、`region`、`country`、`isp`、`status`、`tags`、`protocols`
- `capacity_mbps`、`description`、`last_synced_at`、`updated_at`

#### GET /api/v1/{adminPrefix}/nodes/{id}/kernels

- 说明：节点内核配置列表
- 路径参数：`id` uint64
- 响应：
  - `node_id` uint64
  - `kernels` []NodeKernelSummary

NodeKernelSummary 字段：

- `protocol`、`endpoint`、`revision`、`status`、`config`、`last_synced_at`

#### POST /api/v1/{adminPrefix}/nodes/{id}/kernels/sync

- 说明：触发节点与内核同步
- 路径参数：`id` uint64
- 请求体：
  - `protocol` string（可选，空表示同步默认协议）
- 响应：
  - `node_id` uint64
  - `protocol` string
  - `revision` string
  - `synced_at` int64
  - `message` string

#### GET /api/v1/{adminPrefix}/subscriptions

- 说明：订阅列表
- 查询参数：`page`、`per_page`、`q`、`status`、`user_id`、`plan_name`、`template_id`
- 响应：
  - `subscriptions` []AdminSubscriptionSummary
  - `pagination` PaginationMeta

AdminSubscriptionUserSummary 字段：

- `id`、`email`、`display_name`

AdminSubscriptionSummary 字段：

- `id`、`user`
- `name`、`plan_name`、`status`
- `template_id`、`available_template_ids`
- `token`、`expires_at`
- `traffic_total_bytes`、`traffic_used_bytes`
- `devices_limit`、`last_refreshed_at`
- `created_at`、`updated_at`

#### GET /api/v1/{adminPrefix}/subscriptions/{id}

- 说明：订阅详情
- 路径参数：`id` uint64
- 响应：
  - `subscription` AdminSubscriptionSummary

#### POST /api/v1/{adminPrefix}/subscriptions

- 说明：创建订阅
- 请求体：
  - `user_id` uint64
  - `name` string
  - `plan_name` string
  - `status` string（可选）
  - `template_id` uint64
  - `available_template_ids` []uint64（可选）
  - `token` string（可选）
  - `expires_at` int64
  - `traffic_total_bytes` int64
  - `traffic_used_bytes` int64（可选）
  - `devices_limit` int
- 响应：
  - `subscription` AdminSubscriptionSummary

#### PATCH /api/v1/{adminPrefix}/subscriptions/{id}

- 说明：更新订阅
- 路径参数：`id` uint64
- 请求体（字段均可选）：
  - `name`、`plan_name`、`status`
  - `template_id`、`available_template_ids`
  - `token`、`expires_at`
  - `traffic_total_bytes`、`traffic_used_bytes`
  - `devices_limit`
- 响应：
  - `subscription` AdminSubscriptionSummary

#### POST /api/v1/{adminPrefix}/subscriptions/{id}/disable

- 说明：禁用订阅
- 路径参数：`id` uint64
- 请求体：
  - `reason` string（可选）
- 响应：
  - `subscription` AdminSubscriptionSummary

#### POST /api/v1/{adminPrefix}/subscriptions/{id}/extend

- 说明：延长订阅有效期（`extend_days`/`extend_hours` 与 `expires_at` 二选一）
- 路径参数：`id` uint64
- 请求体：
  - `extend_days` int（可选）
  - `extend_hours` int（可选）
  - `expires_at` int64（可选）
- 响应：
  - `subscription` AdminSubscriptionSummary

#### GET /api/v1/{adminPrefix}/subscription-templates

- 说明：订阅模板列表
- 查询参数：`page`、`per_page`、`sort`、`direction`、`q`、`client_type`、`format`、`include_drafts`
- `sort` 可选：`name`、`client_type`、`version`、`created_at`
- 响应：
  - `templates` []SubscriptionTemplateSummary
  - `pagination` PaginationMeta

TemplateVariable 字段：

- `value_type` string
- `required` bool
- `description` string
- `default_value` any

SubscriptionTemplateSummary 字段：

- `id`、`name`、`description`、`client_type`、`format`
- `content`（可选）
- `variables` map[string]TemplateVariable
- `is_default` bool
- `version` uint32
- `updated_at` int64
- `published_at` int64
- `last_published_by` string

#### POST /api/v1/{adminPrefix}/subscription-templates

- 说明：创建订阅模板
- 请求体：
  - `name` string
  - `description` string（可选）
  - `client_type` string
  - `format` string
  - `content` string
  - `variables` map[string]TemplateVariable（可选）
  - `is_default` bool（可选）
- 响应：SubscriptionTemplateSummary

#### PATCH /api/v1/{adminPrefix}/subscription-templates/{id}

- 说明：更新订阅模板
- 路径参数：`id` uint64
- 请求体：
  - `name` string（可选）
  - `description` string（可选）
  - `format` string（可选）
  - `content` string（可选）
  - `variables` map[string]TemplateVariable（可选）
  - `is_default` bool（可选）
- 响应：SubscriptionTemplateSummary

#### POST /api/v1/{adminPrefix}/subscription-templates/{id}/publish

- 说明：发布订阅模板
- 路径参数：`id` uint64
- 请求体：
  - `changelog` string（可选）
  - `operator` string（可选）
- 响应：
  - `template` SubscriptionTemplateSummary
  - `history` SubscriptionTemplateHistoryEntry

SubscriptionTemplateHistoryEntry 字段：

- `version` uint32
- `changelog` string
- `published_at` int64
- `published_by` string
- `variables` map[string]TemplateVariable

#### GET /api/v1/{adminPrefix}/subscription-templates/{id}/history

- 说明：查看模板发布历史
- 路径参数：`id` uint64
- 响应：
  - `template_id` uint64
  - `history` []SubscriptionTemplateHistoryEntry

#### GET /api/v1/{adminPrefix}/plans

- 说明：套餐列表
- 查询参数：`page`、`per_page`、`sort`、`direction`、`q`、`status`、`visible`
- `sort` 可选：`price`、`name`、`updated`
- 响应：
  - `plans` []PlanSummary
  - `pagination` PaginationMeta

PlanSummary 字段：

- `id`、`name`、`slug`、`description`、`tags`、`features`
- `price_cents`、`currency`、`duration_days`
- `traffic_limit_bytes`、`devices_limit`
- `sort_order`、`status`、`visible`
- `created_at`、`updated_at`

#### POST /api/v1/{adminPrefix}/plans

- 说明：创建套餐
- 请求体：
  - `name` string
  - `slug` string（可选）
  - `description` string（可选）
  - `tags` []string（可选）
  - `features` []string（可选）
  - `price_cents` int64
  - `currency` string
  - `duration_days` int
  - `traffic_limit_bytes` int64（可选）
  - `devices_limit` int（可选）
  - `sort_order` int（可选）
  - `status` string（可选，默认 draft）
  - `visible` bool（可选）
- 响应：PlanSummary

#### PATCH /api/v1/{adminPrefix}/plans/{id}

- 说明：更新套餐
- 路径参数：`id` uint64
- 请求体（字段均可选）：
  - `name`、`slug`、`description`、`tags`、`features`
  - `price_cents`、`currency`、`duration_days`
  - `traffic_limit_bytes`、`devices_limit`
  - `sort_order`、`status`、`visible`
- 响应：PlanSummary

#### GET /api/v1/{adminPrefix}/payment-channels

- 说明：支付通道列表
- 查询参数：`page`、`per_page`、`q`、`provider`、`enabled`、`sort`、`direction`
- `sort` 可选：`name`、`created`、`updated`
- 响应：
  - `channels` []PaymentChannelSummary
  - `pagination` PaginationMeta

PaymentChannelSummary 字段：

- `id`、`name`、`code`、`provider`
- `enabled`、`sort_order`、`config`
- `created_at`、`updated_at`

支付通道 `config`（外部支付发起）示例：

```json
{
  "mode": "http",
  "notify_url": "https://example.com/api/v1/payments/callback?order_id={{order_id}}&payment_id={{payment_id}}",
  "return_url": "https://example.com/orders/{{order_number}}",
  "http": {
    "endpoint": "https://gateway.example.com/pay",
    "method": "POST",
    "body_type": "json",
    "headers": {
      "Content-Type": "application/json"
    },
    "payload": {
      "order_no": "{{order_number}}",
      "amount": "{{amount}}",
      "notify_url": "{{notify_url}}",
      "return_url": "{{return_url}}"
    }
  },
  "response": {
    "pay_url": "data.pay_url",
    "qr_code": "data.qr_code",
    "reference": "data.reference"
  }
}
```

`notify_url`/`return_url`/`payload` 支持模板变量：`{{order_id}}`、`{{order_number}}`、`{{payment_id}}`、`{{payment_intent_id}}`、`{{amount_cents}}`、`{{amount}}`、`{{currency}}`、`{{user_id}}`、`{{plan_id}}`、`{{plan_name}}`、`{{quantity}}`、`{{payment_channel}}`、`{{payment_provider}}`。

`response` 字段支持点路径（如 `data.pay_url`），`pay_url` 设为 `$` 可直接使用原始响应体字符串。

#### GET /api/v1/{adminPrefix}/payment-channels/{id}

- 说明：支付通道详情
- 路径参数：`id` uint64
- 响应：PaymentChannelSummary

#### POST /api/v1/{adminPrefix}/payment-channels

- 说明：创建支付通道
- 请求体：
  - `name` string
  - `code` string
  - `provider` string（可选）
  - `enabled` bool（可选）
  - `sort_order` int（可选）
  - `config` object（可选）
- 响应：PaymentChannelSummary

#### PATCH /api/v1/{adminPrefix}/payment-channels/{id}

- 说明：更新支付通道
- 路径参数：`id` uint64
- 请求体：
  - `name` string（可选）
  - `code` string（可选）
  - `provider` string（可选）
  - `enabled` bool（可选）
  - `sort_order` int（可选）
  - `config` object（可选）
- 响应：PaymentChannelSummary

#### GET /api/v1/{adminPrefix}/announcements

- 说明：公告列表
- 查询参数：`page`、`per_page`、`status`、`category`、`audience`、`q`、`sort`、`direction`
- `sort` 可选：`created`、`title`、`priority`
- 响应：
  - `announcements` []AnnouncementSummary
  - `pagination` PaginationMeta

AnnouncementSummary 字段：

- `id`、`title`、`content`、`category`、`status`、`audience`
- `is_pinned`、`priority`
- `visible_from`、`visible_to`（可选）
- `published_at`（可选）
- `published_by`、`created_by`、`updated_by`
- `created_at`、`updated_at`

#### POST /api/v1/{adminPrefix}/announcements

- 说明：创建公告
- 请求体：
  - `title` string
  - `content` string
  - `category` string（可选）
  - `audience` string（可选）
  - `is_pinned` bool（可选）
  - `priority` int（可选）
  - `created_by` string（可选）
- 响应：AnnouncementSummary

#### POST /api/v1/{adminPrefix}/announcements/{id}/publish

- 说明：发布公告
- 路径参数：`id` uint64
- 请求体：
  - `visible_to` int64（可选）
  - `operator` string（可选）
- 响应：AnnouncementSummary

#### GET /api/v1/{adminPrefix}/site-settings

- 说明：查询站点配置
- 响应：
  - `setting` SiteSetting

SiteSetting 字段：

- `id`、`name`、`logo_url`
- `created_at`、`updated_at`

#### PATCH /api/v1/{adminPrefix}/site-settings

- 说明：更新站点配置
- 请求体：
  - `name` string（可选）
  - `logo_url` string（可选）
- 响应：同 GET

#### GET /api/v1/{adminPrefix}/security-settings

- 说明：查询第三方安全配置
- 响应：
  - `setting` SecuritySetting

SecuritySetting 字段：

- `id`、`third_party_api_enabled`
- `api_key`、`api_secret`
- `encryption_algorithm`
- `nonce_ttl_seconds`
- `created_at`、`updated_at`

#### PATCH /api/v1/{adminPrefix}/security-settings

- 说明：更新第三方安全配置
- 请求体：
  - `third_party_api_enabled` bool（可选）
  - `api_key` string（可选）
  - `api_secret` string（可选）
  - `encryption_algorithm` string（可选）
  - `nonce_ttl_seconds` int（可选）
- 响应：同 GET

#### GET /api/v1/{adminPrefix}/orders

- 说明：订单列表
- 查询参数：`page`、`per_page`、`status`、`payment_method`、`payment_status`、`number`、`sort`、`direction`、`user_id`
- `sort` 可选：`updated`、`total`
- 响应：
  - `orders` []AdminOrderDetail
  - `pagination` PaginationMeta

AdminOrderDetail 字段：

- 字段同 OrderDetail，另含 `user`（`id`、`email`、`display_name`）

#### GET /api/v1/{adminPrefix}/orders/{id}

- 说明：订单详情
- 路径参数：`id` uint64
- 响应：
  - `order` AdminOrderDetail

#### POST /api/v1/{adminPrefix}/orders/{id}/pay

- 说明：人工标记订单已支付
- 路径参数：`id` uint64
- 请求体：
  - `payment_method` string（可选，线下支付可用 `manual`）
  - `paid_at` int64（可选）
  - `note` string（可选）
  - `reference` string（可选）
  - `charge_balance` bool（可选，是否影响余额）
- 响应：
  - `order` AdminOrderDetail

#### POST /api/v1/{adminPrefix}/orders/{id}/cancel

- 说明：取消订单
- 路径参数：`id` uint64
- 请求体：
  - `reason` string（可选）
  - `cancelled_at` int64（可选）
- 响应：
  - `order` AdminOrderDetail

#### POST /api/v1/{adminPrefix}/orders/{id}/refund

- 说明：退款（余额退款）
- 路径参数：`id` uint64
- 请求体：
  - `amount_cents` int64
  - `reason` string（可选）
  - `metadata` object（可选）
  - `refund_at` int64（可选）
  - `credit_balance` bool（可选）
- 响应：
  - `order` AdminOrderDetail

#### POST /api/v1/{adminPrefix}/orders/payments/callback

- 说明：外部支付回调（Webhook 专用）
- 认证：`X-ZNP-Webhook-Token` 或 `Stripe-Signature`（取决于 `Webhook` 配置）
- 请求体：
  - `order_id` uint64
  - `payment_id` uint64
  - `status` string
  - `reference` string（可选）
  - `failure_code` string（可选）
  - `failure_message` string（可选）
  - `paid_at` int64（可选）
- 响应：
  - `order` AdminOrderDetail

#### POST /api/v1/payments/callback

- 说明：外部支付回调（免登录，Webhook 专用）
- 认证：`X-ZNP-Webhook-Token` 或 `Stripe-Signature`（取决于 `Webhook` 配置）
- 请求体：同 `/api/v1/{adminPrefix}/orders/payments/callback`
- 响应：同上

### 用户端（需要 user 权限）

#### GET /api/v1/user/subscriptions

- 说明：订阅列表
- 查询参数：`page`、`per_page`、`sort`、`direction`、`q`、`status`
- `sort` 可选：`name`、`plan_name`、`status`、`expires_at`、`created_at`
- 响应：
  - `subscriptions` []UserSubscriptionSummary
  - `pagination` PaginationMeta

UserSubscriptionSummary 字段：

- `id`、`name`、`plan_name`、`status`
- `template_id`、`available_template_ids`
- `expires_at`、`traffic_total_bytes`、`traffic_used_bytes`
- `devices_limit`、`last_refreshed_at`

#### GET /api/v1/user/subscriptions/{id}/preview

- 说明：订阅预览
- 路径参数：`id` uint64
- 查询参数：`template_id`（可选）
- 响应：
  - `subscription_id` uint64
  - `template_id` uint64
  - `content` string
  - `content_type` string
  - `etag` string
  - `generated_at` int64

#### POST /api/v1/user/subscriptions/{id}/template

- 说明：切换订阅模板
- 路径参数：`id` uint64
- 请求体：
  - `template_id` uint64
- 响应：
  - `subscription_id` uint64
  - `template_id` uint64
  - `updated_at` int64

#### GET /api/v1/user/plans

- 说明：可购买套餐列表
- 查询参数：`q`（可选）
- 响应：
  - `plans` []UserPlanSummary

UserPlanSummary 字段：

- `id`、`name`、`description`、`features`
- `price_cents`、`currency`、`duration_days`
- `traffic_limit_bytes`、`devices_limit`、`tags`

#### GET /api/v1/user/announcements

- 说明：有效公告列表
- 查询参数：`audience`（可选）、`limit`（可选，默认 20，最大 100）
- 响应：
  - `announcements` []UserAnnouncementSummary

UserAnnouncementSummary 字段：

- `id`、`title`、`content`、`category`、`audience`
- `is_pinned`、`priority`
- `visible_from`、`visible_to`（可选）
- `published_at`（可选）

#### GET /api/v1/user/account/balance

- 说明：用户余额与流水
- 查询参数：`page`、`per_page`、`entry_type`
- 响应：
  - `user_id` uint64
  - `balance_cents` int64
  - `currency` string
  - `updated_at` int64
  - `transactions` []BalanceTransactionSummary
  - `pagination` PaginationMeta

#### GET /api/v1/user/payment-channels

- 说明：用户侧支付通道列表（仅返回启用通道）
- 查询参数：`provider`（可选）
- 响应：
  - `channels` []UserPaymentChannelSummary

UserPaymentChannelSummary 字段：

- `id`、`name`、`code`、`provider`
- `sort_order`、`config`

#### POST /api/v1/user/orders

- 说明：下单
- 请求体：
  - `plan_id` uint64
  - `quantity` int
  - `payment_method` string（可选，默认 `balance`；线下可用 `manual`）
  - `payment_channel` string（可选，外部支付通道）
  - `payment_return_url` string（可选）
  - `idempotency_key` string（可选，幂等键）
- 外部支付说明：
  - `payment_method=external` 且金额大于 0 时，需传启用的 `payment_channel` 且通道 `config` 已配置网关发起信息。
  - 响应 `order.payments[].metadata` 将包含 `pay_url` 或 `qr_code`，用于跳转支付页或展示二维码。
- 响应：
  - `order` OrderDetail
  - `balance` BalanceSnapshot
  - `transaction` BalanceTransactionSummary（可选，仅余额扣费时返回）

#### POST /api/v1/user/orders/{id}/cancel

- 说明：取消用户订单
- 路径参数：`id` uint64
- 请求体：
  - `reason` string（可选）
- 响应：
  - `order` OrderDetail
  - `balance` BalanceSnapshot

#### GET /api/v1/user/orders

- 说明：用户订单列表
- 查询参数：`page`、`per_page`、`status`、`payment_method`、`payment_status`、`number`、`sort`、`direction`
- `sort` 可选：`updated`、`total`
- 响应：
  - `orders` []OrderDetail
  - `pagination` PaginationMeta

#### GET /api/v1/user/orders/{id}

- 说明：订单详情
- 路径参数：`id` uint64
- 响应：
  - `order` OrderDetail
  - `balance` BalanceSnapshot
  - `transaction` BalanceTransactionSummary（可选）

#### GET /api/v1/user/orders/{id}/payment-status

- 说明：确认订单支付状态
- 路径参数：`id` uint64
- 响应：
  - `order_id` uint64
  - `status` string
  - `payment_status` string
  - `payment_method` string
  - `payment_intent_id` string（可选）
  - `payment_reference` string（可选）
  - `payment_failure_code` string（可选）
  - `payment_failure_message` string（可选）
  - `paid_at` int64（可选）
  - `cancelled_at` int64（可选）
  - `refunded_cents` int64
  - `refunded_at` int64（可选）
  - `updated_at` int64
