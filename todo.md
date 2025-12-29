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
- 注册：已完成（注册/验证/找回/重置，`src/modules/shared/pages/RegisterPage.vue`）
- 套餐浏览与筛选：已完成（`src/modules/user/pages/UserPlansPage.vue`）
- 下单：已完成（创建订单已接通，`UserPlansPage.vue` + `src/api/user/index.ts`）
- 支付流程：已完成（支付通道选择/支付入口/二维码/状态刷新/取消/失败提示/线下支付提示，`UserPlansPage.vue` + `UserOrdersPage.vue`）
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
- 订阅链接字段需后端明确返回字段（`subscription_url`/`subscribe_url`/`token`）。

## 待办清单（建议按优先级）
P0（功能闭环）
- 用户端补齐注册流程（已完成：注册/验证码/找回密码/同意协议流程）。
- 用户端支付闭环（已完成：订单页“去支付”入口、二维码/链接展示、支付通道选择与状态刷新）。
- 用户端订阅地址二维码入口（已完成，订阅详情支持生成二维码）。
- 管理端支付配置：支付渠道配置与回调信息（已完成）。

P1（体验与可用性）
- 订单/订阅操作的二次确认与结果提示统一化（已覆盖订单取消与订阅模板应用确认，可继续评估其他操作）。

## 支付流程落地拆解（前端对照接口）
1. 下单页（`UserPlansPage.vue`）
   - 支付通道选择：`GET /api/v1/user/payment-channels`（已完成）。
   - 下单请求：补齐 `payment_method/payment_channel/payment_return_url/idempotency_key/coupon_code`（已完成）。
   - 外部支付结果：展示 `order.payments[].metadata.pay_url` 与 `qr_code`（已完成）。
2. 订单页（`UserOrdersPage.vue`）
   - 订单列表：待支付订单提供“去支付”入口（已完成）。
   - 订单详情：展示支付二维码/链接、`payment_failure_code/message`（已完成）。
   - 支付状态刷新：优先轮询 `GET /api/v1/user/orders/{id}/payment-status`，必要时刷新详情（已完成）。
3. 交互提示
   - 外部支付未配置通道时提示（已完成）。
   - 线下支付（`manual`）显示“等待人工确认”说明（已完成）。

P2（体验优化）
- 表单默认值与空态提示优化（已覆盖部分页面，继续完善）。
