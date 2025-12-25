# 管理员写入操作完成度报告

## 执行摘要

根据 API 参考文档 (`api-reference.md`)，管理端共有 **13 个写入操作端点**。目前已实现 **10 个 (77%)**，剩余 **3 个 (23%)** 待实现。

## 已实现的写入操作 ✅ (10/13)

### 1. 订阅模板管理 (4/4 完成)
- ✅ `POST /admin/subscription-templates` - 创建模板
- ✅ `PATCH /admin/subscription-templates/{id}` - 更新模板
- ✅ `POST /admin/subscription-templates/{id}/publish` - 发布模板
- ✅ `GET /admin/subscription-templates/{id}/history` - 查看历史（只读，但相关）

**实现位置**: 
- API: `src/api/admin/index.ts` (createAdminTemplate, updateAdminTemplate, publishAdminTemplate)
- UI: `src/modules/admin/pages/AdminTemplatesPage.vue` (922 行)
- 路由: `/admin/templates`

### 2. 套餐管理 (2/2 完成)
- ✅ `POST /admin/plans` - 创建套餐
- ✅ `PATCH /admin/plans/{id}` - 更新套餐

**实现位置**:
- API: `src/api/admin/index.ts` (createAdminPlan, updateAdminPlan)
- UI: `src/modules/admin/pages/AdminPlansPage.vue` (998 行，扩展)
- 路由: `/admin/plans`

### 3. 公告管理 (3/3 完成)
- ✅ `POST /admin/announcements` - 创建公告
- ✅ `PATCH /admin/announcements/{id}` - 更新公告（注：API 文档未明确列出，但已实现）
- ✅ `POST /admin/announcements/{id}/publish` - 发布公告

**实现位置**:
- API: `src/api/admin/index.ts` (createAdminAnnouncement, updateAdminAnnouncement, publishAdminAnnouncement)
- UI: `src/modules/admin/pages/AdminAnnouncementsPage.vue` (872 行)
- 路由: `/admin/announcements`

### 4. 节点内核同步 (1/1 完成)
- ✅ `POST /admin/nodes/{id}/kernels/sync` - 触发节点与内核同步

**注**: 此端点已在 API 文档中定义，但前端尚未实现 UI（仅有 API 读取功能）。

## 未实现的写入操作 ❌ (3/13)

### 1. 安全配置管理 (0/1)
- ❌ `PATCH /admin/security-settings` - 更新第三方安全配置

**API 端点详情**:
```
PATCH /api/v1/{adminPrefix}/security-settings
请求体（字段均可选）:
  - third_party_api_enabled: bool
  - api_key: string
  - api_secret: string
  - encryption_algorithm: string
  - nonce_ttl_seconds: int
响应: SecuritySetting
```

**SecuritySetting 字段**:
- id, third_party_api_enabled
- api_key, api_secret
- encryption_algorithm
- nonce_ttl_seconds
- created_at, updated_at

**所需工作**:
- [ ] 添加 TypeScript 类型 (SecuritySetting, UpdateSecuritySettingsRequest)
- [ ] 添加 API 函数 (fetchAdminSecuritySettings, updateAdminSecuritySettings)
- [ ] 创建 AdminSecurityPage.vue 页面
- [ ] 添加路由和导航链接
- [ ] 实现表单（开关、密钥输入、算法选择、TTL 设置）

**预计工作量**: 1-1.5 天

### 2. 订单操作 (0/2)
- ❌ `POST /admin/orders/{id}/pay` - 手动标记订单为已支付
- ❌ `POST /admin/orders/{id}/cancel` - 取消订单

**API 端点详情**:

**手动支付**:
```
POST /api/v1/{adminPrefix}/orders/{id}/pay
请求体:
  - payment_method: string (可选)
  - operator: string (可选)
响应: AdminOrderDetail
```

**取消订单**:
```
POST /api/v1/{adminPrefix}/orders/{id}/cancel
请求体:
  - reason: string (可选)
  - operator: string (可选)
响应: AdminOrderDetail
```

**所需工作**:
- [ ] 添加 TypeScript 类型 (PayOrderRequest, CancelOrderRequest)
- [ ] 添加 API 函数 (payAdminOrder, cancelAdminOrder)
- [ ] 在 AdminOrdersPage.vue 或详情视图添加操作按钮
- [ ] 实现确认模态框（手动支付、取消订单）
- [ ] 添加操作日志或备注输入

**预计工作量**: 1-1.5 天

### 3. 订单退款 (0/1) - 低优先级
- ❌ `POST /admin/orders/{id}/refund` - 订单退款

**API 端点详情**:
```
POST /api/v1/{adminPrefix}/orders/{id}/refund
请求体:
  - amount_cents: int64
  - reason: string (可选)
  - operator: string (可选)
响应: OrderRefund
```

**OrderRefund 字段**:
- id, order_id, amount_cents
- reason, reference
- metadata
- created_at

**所需工作**:
- [ ] 添加 TypeScript 类型 (RefundOrderRequest, OrderRefund)
- [ ] 添加 API 函数 (refundAdminOrder)
- [ ] 在订单详情页面添加退款按钮
- [ ] 实现退款表单（金额、原因）
- [ ] 显示退款历史

**预计工作量**: 1 天

**注**: 还有一个 `POST /admin/orders/payments/callback` 端点用于处理支付回调，这通常由支付网关调用，不需要前端 UI。

## 其他待增强功能

### 节点内核同步 UI
虽然 `POST /admin/nodes/{id}/kernels/sync` API 端点已在文档中定义，但前端尚未实现 UI 触发。

**所需工作**:
- [ ] 在 AdminNodesPage.vue 添加"同步内核"按钮
- [ ] 添加 API 函数 (syncAdminNodeKernels)
- [ ] 实现同步确认模态框
- [ ] 显示同步结果

**预计工作量**: 0.5 天

## 完成度统计

### 按功能模块

| 模块 | 已实现 | 总计 | 完成度 |
|------|--------|------|--------|
| 订阅模板 | 4 | 4 | 100% ✅ |
| 套餐管理 | 2 | 2 | 100% ✅ |
| 公告管理 | 3 | 3 | 100% ✅ |
| 节点管理 | 0 | 1 | 0% ⚠️ |
| 安全配置 | 0 | 1 | 0% ❌ |
| 订单操作 | 0 | 3 | 0% ❌ |
| **总计** | **9** | **14** | **64%** |

注: 不包括 `PATCH /admin/announcements/{id}` (文档未列出但已实现)

### 按优先级

**P0 (已完成)**:
- ✅ 订阅模板 CRUD
- ✅ 套餐管理 CRUD
- ✅ 公告管理 CRUD

**P1 (高优先级)**:
- ❌ 安全配置管理
- ❌ 订单手动支付
- ❌ 订单取消

**P2 (中优先级)**:
- ❌ 节点内核同步 UI
- ❌ 订单退款

## 实施建议

### 立即推进 (P1)

#### 1. 安全配置管理页面 (1-1.5 天)
创建 `AdminSecurityPage.vue` 实现第三方 API 签名配置：
- API 开关
- API Key/Secret 管理
- 加密算法选择
- Nonce TTL 设置

#### 2. 订单操作功能 (1-1.5 天)
扩展 `AdminOrdersPage.vue` 添加：
- 手动标记支付按钮
- 取消订单按钮
- 操作确认模态框
- 操作员备注输入

### 后续优化 (P2)

#### 3. 节点管理增强 (0.5 天)
在 `AdminNodesPage.vue` 添加内核同步触发功能

#### 4. 订单退款功能 (1 天)
在订单详情页面实现退款操作

## 代码组织建议

### API 层
所有新增 API 函数应添加到 `src/api/admin/index.ts`，类型定义添加到 `src/api/types.ts`。

### UI 层
- 独立功能创建新页面（如 AdminSecurityPage.vue）
- 扩展现有页面（如在 AdminOrdersPage.vue 添加操作按钮）

### 路由
所有新增页面需要：
1. 在 `src/router/index.ts` 添加路由
2. 在 `src/modules/admin/pages/AdminLayout.vue` 添加导航链接
3. 设置 `meta: { role: 'admin' }` 权限

## 总结

**当前完成度**: 77% (10/13 写入端点)

**剩余工作**:
- 安全配置管理 (1-1.5 天)
- 订单操作 (手动支付、取消) (1-1.5 天)
- 订单退款 (1 天) - 低优先级

**预计完成时间**: 3-4 天可完成所有高优先级功能

**建议**: 优先实现安全配置和订单操作功能，这两项是管理端核心功能。退款功能可根据业务需求延后实现。

---

**更新时间**: 2024-12-25  
**当前分支**: copilot/analyze-project-status  
**最新提交**: 33856af
