# Zero Network Panel - Frontend

> Vue 3 + TypeScript + Vite 前端项目

一个面向网络节点管理的现代化 Web 应用，提供管理端和用户端双重界面。

## 🚀 快速开始

### 方式 1: Mock 数据模式（推荐用于前端开发）

无需后端服务，3分钟快速体验：

```bash
# 1. 安装依赖
npm install

# 2. 配置Mock模式
cp .env.example .env.local
# 在 .env.local 中设置: VITE_USE_MOCK=true

# 3. 启动开发服务器
npm run dev

# 4. 访问应用并登录
# 浏览器打开: http://localhost:5173
# 用户: user@example.com / P@ssw0rd!
# 管理员: admin@example.com / P@ssw0rd!
```

**📖 Mock模式详细教程**: 查看 [QUICK-START-MOCK.md](./QUICK-START-MOCK.md) 和 [MOCK-DATA-SETUP.md](./MOCK-DATA-SETUP.md)

### 方式 2: 连接真实后端

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 设置后端 API 地址
# VITE_USE_MOCK=false
# VITE_API_BASE_URL=http://localhost:8888

# 3. 启动开发服务器
npm run dev

# 4. 访问应用
# 浏览器打开: http://localhost:5173
```

**📖 详细教程**: 查看 [QUICKSTART.md](./QUICKSTART.md) 获取完整的快速开始指南

## 📚 文档导航

### 核心文档（必读）
- **[SUMMARY.md](./SUMMARY.md)** - 项目分析总览（从这里开始！）
- **[QUICKSTART.md](./QUICKSTART.md)** - 5 分钟快速上手指南
- **[QUICK-START-MOCK.md](./QUICK-START-MOCK.md)** - 🆕 Mock数据模式快速开始（无需后端）
- **[ROADMAP.md](./ROADMAP.md)** - 开发路线图与任务清单
- **[PROJECT-ANALYSIS.md](./PROJECT-ANALYSIS.md)** - 完整的项目分析报告

### 开发文档
- **[MOCK-DATA-SETUP.md](./MOCK-DATA-SETUP.md)** - 🆕 Mock数据配置完整指南
- **[frontend-guide.md](./frontend-guide.md)** - 前端集成指南（API、认证）
- **[api-reference.md](./api-reference.md)** - API 接口详细参考
- **[api-overview.md](./api-overview.md)** - API 模块业务概览
- **[AGENTS.md](./AGENTS.md)** - 代码规范与项目约定

## ✨ 功能特性

### 🎯 Mock数据模式 (新功能！)
- ✅ 无需后端服务即可运行
- ✅ 完整的用户和管理端功能
- ✅ 2个预配置用户（user + admin）
- ✅ 3个套餐、4个节点、3个模板
- ✅ 支持所有CRUD操作
- ✅ 300ms网络延迟模拟
- ✅ 适合前端开发和演示

### 管理端 (Admin Console)
- ✅ 仪表盘总览
- ✅ 节点管理（查看、状态监控）
- ✅ 套餐管理（创建、编辑、完整CRUD）
- ✅ 订单管理（查看、详情、标记支付、取消）
- ✅ 订阅模板管理（创建、编辑、发布、版本控制）
- ✅ 公告管理（创建、编辑、发布、过期管理）
- ✅ 安全配置（API开关、密钥管理、加密设置）

### 用户端 (User Portal)
- ✅ 用户仪表盘
- ✅ 订阅管理（列表、预览、切换模板）
- ✅ 套餐浏览与购买
- ✅ 订单管理（创建、查看、取消）
- ✅ 公告中心
- ✅ 余额查询与流水

## 🛠️ 技术栈

- **框架**: Vue 3.5.24 (Composition API)
- **语言**: TypeScript 5.9.3
- **构建**: Vite 7.2.4
- **路由**: Vue Router 4.5.1
- **样式**: 原生 CSS（计划引入 UI 组件库）

## 📊 项目状态

```
当前版本: 0.0.0
代码行数: ~3,929 行 Vue 组件
功能完成度:
  基础架构:  ████████████████████ 100%
  只读功能:  ████████████████████ 100%
  写操作:    ████░░░░░░░░░░░░░░░░  20%
  测试覆盖:  ░░░░░░░░░░░░░░░░░░░░   0%
```

**详细分析**: 查看 [PROJECT-ANALYSIS.md](./PROJECT-ANALYSIS.md)

## 🎯 下一步计划

### 本周优先级
1. ⚡ 安装依赖并验证环境（15 分钟）
2. 🔨 实现订阅模板管理页面（2-3 天）
3. 📢 完善公告管理功能（1-2 天）
4. 💰 实现套餐 CRUD 操作（1-2 天）

**完整路线图**: 查看 [ROADMAP.md](./ROADMAP.md)

## 🤝 参与贡献

欢迎贡献代码、报告 Bug 或提出改进建议！

### 开发流程
1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

### 代码规范
- 使用 2 空格缩进
- 组件使用 `PascalCase` 命名
- 遵循 `<script setup>` 语法
- 提交信息遵循 Conventional Commits

## 📝 开发命令

```bash
# 开发
npm run dev          # 启动开发服务器（热重载）

# 构建
npm run build        # 构建生产版本
npm run preview      # 预览生产构建

# 代码检查
npx vue-tsc --noEmit # TypeScript 类型检查
```

## 📞 获取帮助

- **新手上路**: 阅读 [QUICKSTART.md](./QUICKSTART.md)
- **任务分配**: 查看 [ROADMAP.md](./ROADMAP.md)
- **技术问题**: 查阅 [PROJECT-ANALYSIS.md](./PROJECT-ANALYSIS.md)
- **API 集成**: 参考 [frontend-guide.md](./frontend-guide.md)

## 📄 许可证

本项目采用 MIT 许可证

---

**Last Updated**: 2025-12-24  
**Maintainer**: Development Team
