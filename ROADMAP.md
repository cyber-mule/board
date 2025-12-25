# 项目推进路线图

> 基于项目分析报告 (PROJECT-ANALYSIS.md) 生成的可执行任务清单

## 立即行动项 (本周内完成)

### ✅ 任务 1: 环境配置与依赖安装
**优先级**: P0 - 必须立即完成  
**预计时间**: 15 分钟  
**责任人**: 开发团队

**步骤**:
```bash
# 1. 安装项目依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local

# 3. 编辑 .env.local，设置后端地址
# VITE_API_BASE_URL=http://localhost:8888  (或实际后端地址)
# VITE_API_PREFIX=/api/v1
# VITE_ADMIN_PREFIX=admin

# 4. 启动开发服务器验证
npm run dev

# 5. 验证生产构建
npm run build
```

**验收标准**:
- [ ] `npm install` 成功无错误
- [ ] 开发服务器启动成功（默认 http://localhost:5173）
- [ ] 生产构建无 TypeScript 错误
- [ ] 浏览器能访问登录页面

---

### ✅ 任务 2: 实现订阅模板管理页面
**优先级**: P1 - 高优先级  
**预计时间**: 2-3 天  
**责任人**: 前端开发

**子任务**:
1. **API 层实现** (4 小时)
   - [ ] 在 `src/api/admin/index.ts` 添加以下函数：
     ```typescript
     export function fetchAdminTemplates(query: AdminTemplatesQuery = {})
     export function createAdminTemplate(payload: CreateTemplateRequest)
     export function updateAdminTemplate(id: number, payload: UpdateTemplateRequest)
     export function publishAdminTemplate(id: number)
     export function fetchAdminTemplateHistory(id: number, query: PaginationQuery = {})
     ```
   - [ ] 在 `src/api/types.ts` 添加相关 TypeScript 类型定义

2. **创建页面组件** (8 小时)
   - [ ] 创建 `src/modules/admin/pages/AdminTemplatesPage.vue`
   - [ ] 实现模板列表展示（表格形式）
   - [ ] 添加搜索、筛选、分页功能
   - [ ] 实现创建模板表单（弹窗或抽屉）
   - [ ] 实现编辑模板功能
   - [ ] 实现发布模板功能
   - [ ] 添加模板历史查看功能

3. **路由配置** (30 分钟)
   - [ ] 在 `src/router/index.ts` 添加路由：
     ```typescript
     { 
       path: 'templates', 
       name: 'admin-templates', 
       component: AdminTemplatesPage 
     }
     ```
   - [ ] 在 `AdminLayout.vue` 或 `AdminDashboard.vue` 添加导航链接

4. **测试验证** (2 小时)
   - [ ] 手动测试所有 CRUD 操作
   - [ ] 验证错误处理
   - [ ] 验证权限控制
   - [ ] 验证表单验证逻辑

**验收标准**:
- [ ] 能够列出所有订阅模板
- [ ] 能够创建新模板（包含所有必填字段验证）
- [ ] 能够编辑草稿模板
- [ ] 能够发布模板并生成新版本
- [ ] 能够查看模板历史版本
- [ ] 所有操作有明确的成功/失败提示

---

### ✅ 任务 3: 实现公告管理完整流程
**优先级**: P1 - 高优先级  
**预计时间**: 1-2 天  
**责任人**: 前端开发

**子任务**:
1. **API 层实现** (2 小时)
   - [ ] 添加 `createAdminAnnouncement(payload)`
   - [ ] 添加 `updateAdminAnnouncement(id, payload)`
   - [ ] 添加 `publishAdminAnnouncement(id)`
   - [ ] 添加相关 TypeScript 类型

2. **页面功能扩展** (6 小时)
   - [ ] 创建 `src/modules/admin/pages/AdminAnnouncementsPage.vue` 或扩展 Dashboard
   - [ ] 实现公告列表展示
   - [ ] 实现创建公告表单（标题、内容、类别、受众、可见时间）
   - [ ] 实现编辑公告功能
   - [ ] 实现发布公告功能
   - [ ] 添加置顶功能支持

3. **可选增强** (如时间允许)
   - [ ] 集成富文本编辑器（如 TinyMCE 或 Quill）
   - [ ] 添加 Markdown 预览

**验收标准**:
- [ ] 能够创建公告草稿
- [ ] 能够编辑未发布的公告
- [ ] 能够发布公告并设置可见时间
- [ ] 能够设置公告置顶
- [ ] 用户端能正确显示已发布公告

---

### ✅ 任务 4: 实现套餐管理 CRUD
**优先级**: P1 - 高优先级  
**预计时间**: 1-2 天  
**责任人**: 前端开发

**子任务**:
1. **API 层实现** (2 小时)
   - [ ] 添加 `createAdminPlan(payload)`
   - [ ] 添加 `updateAdminPlan(id, payload)`
   - [ ] 添加相关 TypeScript 类型（价格、时长、流量限制等）

2. **扩展现有页面** (6 小时)
   - [ ] 在 `AdminPlansPage.vue` 添加"创建套餐"按钮
   - [ ] 实现套餐创建表单（名称、价格、时长、流量、关联模板）
   - [ ] 实现套餐编辑功能
   - [ ] 添加套餐状态切换（draft/active）
   - [ ] 实现表单字段验证（价格 > 0、时长 > 0 等）

**验收标准**:
- [ ] 能够创建新套餐并关联订阅模板
- [ ] 能够编辑已有套餐
- [ ] 价格、流量、时长等字段正确验证
- [ ] 套餐状态能正确切换
- [ ] 用户端能正确显示激活的套餐

---

## 下周计划 (Week 2)

### ✅ 任务 5: 安全配置管理
**优先级**: P1  
**预计时间**: 1 天

**子任务**:
- [ ] 创建 `AdminSecurityPage.vue`
- [ ] 实现 API 密钥配置界面
- [ ] 添加第三方签名开关
- [ ] 实现敏感信息脱敏显示
- [ ] 添加路由和导航

---

### ✅ 任务 6: 管理端订单操作
**优先级**: P1  
**预计时间**: 1-2 天

**子任务**:
- [ ] 实现手动标记支付功能
- [ ] 实现订单取消功能
- [ ] 实现订单退款功能（含退款原因输入）
- [ ] 添加操作确认弹窗
- [ ] 更新订单状态显示

---

### ✅ 任务 7: 引入 UI 组件库
**优先级**: P2  
**预计时间**: 1-2 天

**推荐方案**: Element Plus

**步骤**:
```bash
npm install element-plus
npm install -D unplugin-vue-components unplugin-auto-import
```

**配置**:
- [ ] 配置自动导入（`vite.config.ts`）
- [ ] 逐步迁移现有页面使用 Element Plus 组件
- [ ] 统一表单、表格、按钮等组件样式

---

### ✅ 任务 8: 改进错误处理
**优先级**: P2  
**预计时间**: 1 天

**子任务**:
- [ ] 集成 Toast 通知组件 (如 Element Plus Message)
- [ ] 实现全局错误拦截器
- [ ] 统一 Loading 状态管理
- [ ] 添加网络异常重试机制
- [ ] 优化错误提示文案

---

## 第三周计划 (Week 3)

### ✅ 任务 9: 测试基础设施
**优先级**: P2  
**预计时间**: 1 天 + 持续投入

**步骤**:
```bash
npm install -D vitest @vue/test-utils jsdom
```

**子任务**:
- [ ] 配置 Vitest
- [ ] 为 API 客户端编写单元测试
- [ ] 为格式化工具编写单元测试
- [ ] 为关键业务逻辑编写测试
- [ ] 添加 `npm test` 脚本

---

### ✅ 任务 10: 代码质量工具
**优先级**: P2  
**预计时间**: 半天

**步骤**:
```bash
npm install -D eslint @vue/eslint-config-typescript prettier
npm install -D husky lint-staged
```

**配置**:
- [ ] 配置 ESLint 和 Prettier
- [ ] 配置 Git hooks (pre-commit)
- [ ] 统一代码格式化规则
- [ ] 修复现有代码的 lint 错误

---

### ✅ 任务 11: 节点内核同步功能
**优先级**: P2  
**预计时间**: 半天

**子任务**:
- [ ] 在 `AdminNodesPage.vue` 添加"同步"按钮
- [ ] 实现 `syncAdminNodeKernels(id)` API 调用
- [ ] 添加同步进度提示
- [ ] 处理同步失败错误

---

## 后续优化 (Week 4+)

### 性能优化
- [ ] 实现虚拟滚动（长列表）
- [ ] 添加请求防抖/节流
- [ ] 优化图片加载（懒加载）
- [ ] 路由懒加载优化
- [ ] 代码分割优化

### 状态管理
- [ ] 评估是否需要引入 Pinia
- [ ] 实现全局状态管理方案

### 实时通知
- [ ] 评估 WebSocket 或 SSE 需求
- [ ] 实现订单状态实时推送
- [ ] 实现公告实时推送

### 国际化
- [ ] 安装 vue-i18n
- [ ] 提取所有硬编码文本
- [ ] 支持中英文切换

### 深色模式
- [ ] 设计深色主题样式
- [ ] 实现主题切换功能
- [ ] 持久化用户主题偏好

### 部署与 CI/CD
- [ ] 编写 Dockerfile
- [ ] 配置 GitHub Actions
- [ ] 设置自动化测试流程
- [ ] 实现自动化部署

---

## 关键里程碑

### 🎯 里程碑 1: 基础可用 (Week 1 结束)
- [x] 项目能够正常运行
- [ ] 管理端核心 CRUD 完成 70%
- [ ] 所有页面可访问

### 🎯 里程碑 2: 功能完整 (Week 2 结束)
- [ ] 管理端所有功能完成
- [ ] 引入 UI 组件库
- [ ] 改进用户体验

### 🎯 里程碑 3: 质量保障 (Week 3 结束)
- [ ] 测试覆盖率 > 50%
- [ ] 代码规范检查通过
- [ ] 性能优化完成

### 🎯 里程碑 4: 生产就绪 (Week 4 结束)
- [ ] CI/CD 配置完成
- [ ] Docker 部署就绪
- [ ] 文档完善
- [ ] 生产环境验证通过

---

## 团队分工建议

### 前端开发 A
- 负责管理端页面开发（任务 2、3、4）
- 负责 UI 组件库集成（任务 7）

### 前端开发 B
- 负责安全配置和订单操作（任务 5、6）
- 负责错误处理优化（任务 8）

### 测试工程师
- 负责测试基础设施搭建（任务 9）
- 负责编写自动化测试用例

### DevOps
- 负责 CI/CD 配置
- 负责 Docker 部署支持

---

## 每日站会检查点

1. **昨日完成**: 完成了哪些任务？
2. **今日计划**: 今天要完成哪些任务？
3. **遇到问题**: 有什么阻塞或需要帮助？
4. **风险提示**: 有什么潜在风险需要关注？

---

## 联系方式

- **技术问题**: 参考 `PROJECT-ANALYSIS.md`
- **API 文档**: 参考 `api-reference.md` 和 `frontend-guide.md`
- **项目规范**: 参考 `AGENTS.md`

---

**路线图版本**: v1.0  
**最后更新**: 2025-12-24  
**维护者**: 开发团队
