# xboard 对照进度追溯

说明：基于当前前端代码与页面实现评估项目进度。风格已确定，但交互仍需优化（见“交互问题/不合理点”与“待办”）。

## 目标范围（精简版）
- 用户端：选套餐、下单、支付、获取订阅地址、查看订阅、查看余额、查看公告、登录/注册。
- 管理端：订单管理、用户管理、节点管理、套餐管理、订阅管理、支付配置。
  - 现有实现另含公告管理模块（已实现，建议纳入正式范围或标注为扩展）。

## 当前进度对照
状态说明：已完成 / 部分完成 / 缺失

### 用户端
- 登录：已完成（`src/modules/shared/pages/LoginPage.vue`）
- 注册：缺失（暂无注册页面/接口）
- 套餐浏览与筛选：已完成（`src/modules/user/pages/UserPlansPage.vue`）
- 下单：已完成（创建订单已接通，`UserPlansPage.vue` + `src/api/user/index.ts`）
- 支付流程：部分完成
  - 现状：仅支持创建订单与订单状态展示（`UserOrdersPage.vue`），缺少“去支付/支付二维码/支付链接”交互。
  - 待落地（对照 `api-overview.md` / `api-reference.md` / `frontend-guide.md`）：
    - 支付通道：拉取 `GET /api/v1/user/payment-channels`，用于“外部支付”时的渠道选择。
    - 下单字段补齐：`payment_method`、`payment_channel`、`payment_return_url`、`idempotency_key`、`coupon_code`。
    - 外部支付入口：`POST /api/v1/user/orders` 返回的 `order.payments[].metadata.pay_url`/`qr_code` 需支持跳转/二维码展示。
    - 支付状态刷新：轮询 `GET /api/v1/user/orders/{id}/payment-status` 或刷新订单详情以更新 `status/payment_status`。
    - 失败/取消/超时处理：展示 `payment_failure_code/message`，并提供取消入口 `POST /api/v1/user/orders/{id}/cancel`（仅待支付/零金额）。
    - 线下支付提示：`payment_method=manual` 的订单需明确“待人工确认”的状态提示。
- 获取订阅地址：已完成（订阅详情展示地址/Token/二维码，`UserSubscriptionsPage.vue`）
- 查看订阅：已完成（列表/详情/模板切换/预览/下载，`UserSubscriptionsPage.vue`）
- 查看余额：已完成（余额总览 + 明细筛选页，`UserDashboard.vue` + `UserBalancePage.vue`）
- 查看公告：已完成（`UserAnnouncementsPage.vue`）

### 管理端
- 订单管理：已完成（查询/标记支付/取消/退款，`AdminOrdersPage.vue`）
- 用户管理：已完成（用户列表 + 状态/角色/重置密码/强制下线，`AdminUsersPage.vue`）
- 节点管理：已完成（列表/详情/内核同步，`AdminNodesPage.vue`）
- 套餐管理：已完成（创建/编辑/筛选，`AdminPlansPage.vue`）
- 公告管理：已完成（创建/编辑/发布/筛选，`AdminAnnouncementsPage.vue`）
- 订阅管理：已完成（订阅实例管理/禁用/延长，`AdminSubscriptionsPage.vue`）
- 支付配置：已完成（支付通道列表/创建/编辑/启停，`AdminPaymentChannelsPage.vue`）

## 交互问题/不合理点（初步）
- 用户端支付闭环不完整：下单后没有明确的“去支付”动作或支付入口提示，外部支付仅有文案提示。
 - 缺少支付通道选择、支付二维码/跳转与支付状态轮询，失败态提示不足。
- 订阅链接字段需后端明确返回字段（`subscription_url`/`subscribe_url`/`token`）。
- 注册缺失：登录页没有注册/找回密码流程，影响新用户转化与自助找回。

## 待办清单（建议按优先级）
P0（功能闭环）
- 用户端补齐注册流程（注册/验证码/找回密码/同意协议流程，至少注册入口与表单）。
- 用户端支付闭环：在订单详情/列表提供“去支付”入口，支持展示支付链接或二维码，并补齐支付通道选择与支付状态轮询。
- 用户端订阅地址二维码入口（已完成，订阅详情支持生成二维码）。
- 管理端支付配置：支付渠道配置与回调信息（至少基础表单 + 保存接口，已完成）。

P1（体验与可用性）
- 订单/订阅操作的二次确认与结果提示统一化（订单取消已覆盖，订阅侧继续补齐）。

## 支付流程落地拆解（前端对照接口）
1. 下单页（`UserPlansPage.vue`）
   - 支付通道选择：`GET /api/v1/user/payment-channels`。
   - 下单请求：补齐 `payment_method/payment_channel/payment_return_url/idempotency_key/coupon_code`。
   - 外部支付结果：展示 `order.payments[].metadata.pay_url` 与 `qr_code`（跳转/二维码）。
2. 订单页（`UserOrdersPage.vue`）
   - 订单列表：待支付订单提供“去支付”入口。
   - 订单详情：展示支付二维码/链接、`payment_failure_code/message`。
   - 支付状态刷新：优先轮询 `GET /api/v1/user/orders/{id}/payment-status`，必要时刷新详情。
3. 交互提示
   - 外部支付未配置通道时提示。
   - 线下支付（`manual`）显示“等待人工确认”说明。

P2（体验优化）
- 表单默认值与空态提示优化（已覆盖部分页面，继续完善）。
