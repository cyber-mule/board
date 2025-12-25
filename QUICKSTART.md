# 快速开始指南

> 面向新加入项目的开发者，5 分钟快速上手 Zero Network Panel 前端项目

## 前置要求

- **Node.js**: >= 18.x (推荐 20.x)
- **npm**: >= 9.x
- **编辑器**: VS Code (推荐) 或其他支持 TypeScript 的 IDE
- **后端服务**: 需要运行 Zero Network Panel 后端服务

---

## 第一步: 克隆项目

```bash
git clone <repository-url>
cd board
```

---

## 第二步: 安装依赖

```bash
npm install
```

**预期输出**: 无错误，安装完成后会生成 `node_modules/` 目录

---

## 第三步: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local 文件
# 设置实际的后端 API 地址
```

**.env.local 示例配置**:
```env
# 后端 API 地址（根据实际情况修改）
VITE_API_BASE_URL=http://localhost:8888

# API 路径前缀（通常不需要改）
VITE_API_PREFIX=/api/v1

# 管理端路由前缀（需要与后端配置一致）
VITE_ADMIN_PREFIX=admin
```

**常见后端地址**:
- 本地开发: `http://localhost:8888`
- 测试环境: `http://test-api.example.com`
- 生产环境: `https://api.example.com`

---

## 第四步: 启动开发服务器

```bash
npm run dev
```

**预期输出**:
```
  VITE v7.2.4  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

打开浏览器访问: `http://localhost:5173/`

---

## 第五步: 登录系统

### 默认测试账号

根据 `frontend-guide.md` 文档，后端提供以下测试账号：

**管理员账号**:
- 邮箱: `admin@example.com`
- 密码: `P@ssw0rd!`
- 权限: 访问管理端 (`/admin`)

**普通用户账号**:
- 邮箱: `user@example.com`
- 密码: `P@ssw0rd!`
- 权限: 访问用户端 (`/user`)

### 登录流程

1. 访问 `http://localhost:5173/login`
2. 输入邮箱和密码
3. 点击"登录"
4. 登录成功后会自动跳转到对应的仪表盘页面

---

## 项目结构一览

```
board/
├── src/
│   ├── api/              # API 客户端层
│   │   ├── admin/        # 管理端 API
│   │   ├── user/         # 用户端 API
│   │   ├── auth.ts       # 认证 API
│   │   ├── http.ts       # HTTP 请求封装
│   │   └── types.ts      # TypeScript 类型定义
│   ├── auth/             # 认证相关
│   │   └── tokens.ts     # Token 管理
│   ├── components/       # 共享组件
│   ├── config/           # 配置文件
│   │   └── env.ts        # 环境变量
│   ├── modules/          # 业务模块
│   │   ├── admin/        # 管理端页面
│   │   ├── user/         # 用户端页面
│   │   └── shared/       # 共享页面（如登录）
│   ├── router/           # 路由配置
│   │   └── index.ts      # 路由定义
│   ├── utils/            # 工具函数
│   ├── App.vue           # 根组件
│   ├── main.ts           # 入口文件
│   └── style.css         # 全局样式
├── public/               # 静态资源
├── .env.example          # 环境变量模板
├── package.json          # 项目配置
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
└── index.html            # HTML 模板
```

---

## 开发常用命令

```bash
# 启动开发服务器（热重载）
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# TypeScript 类型检查
npx vue-tsc --noEmit

# 代码格式化（需要先安装 prettier）
npx prettier --write src/
```

---

## 开发工作流

### 1. 创建新页面

**示例**: 创建一个新的管理端页面

```bash
# 1. 创建页面组件
touch src/modules/admin/pages/AdminNewPage.vue

# 2. 在 router/index.ts 添加路由
# 3. 在 AdminLayout.vue 添加导航链接
```

### 2. 添加新的 API 接口

```bash
# 1. 在 src/api/admin/index.ts 添加函数
# 2. 在 src/api/types.ts 添加类型定义
# 3. 在页面组件中调用
```

### 3. 提交代码

```bash
git add .
git commit -m "feat: add new admin page"
git push origin feature-branch
```

---

## 常见问题排查

### ❌ 问题 1: `npm install` 失败

**可能原因**: 网络问题或 Node 版本不兼容

**解决方案**:
```bash
# 切换 npm 源为淘宝镜像
npm config set registry https://registry.npmmirror.com

# 或使用 nrm 管理源
npm install -g nrm
nrm use taobao

# 清除缓存重试
npm cache clean --force
npm install
```

---

### ❌ 问题 2: 启动时提示 "Cannot find module"

**可能原因**: 依赖未安装或安装不完整

**解决方案**:
```bash
# 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

---

### ❌ 问题 3: 登录后显示 401 错误

**可能原因**: 
1. 后端服务未启动
2. API 地址配置错误
3. 测试账号不存在

**解决方案**:
```bash
# 1. 检查 .env.local 中的 VITE_API_BASE_URL 是否正确
cat .env.local

# 2. 测试后端 API 是否可访问
curl http://localhost:8888/api/v1/ping

# 3. 查看浏览器控制台的网络请求
# 确认请求地址是否正确
```

---

### ❌ 问题 4: TypeScript 类型错误

**可能原因**: 类型定义不完整或版本不一致

**解决方案**:
```bash
# 运行类型检查查看详细错误
npx vue-tsc --noEmit

# 更新类型定义
npm update @types/node
```

---

### ❌ 问题 5: 页面样式混乱

**可能原因**: CSS 冲突或浏览器缓存

**解决方案**:
```bash
# 清除浏览器缓存并硬刷新
# Chrome/Edge: Ctrl+Shift+R (Windows) 或 Cmd+Shift+R (Mac)
# Firefox: Ctrl+F5 (Windows) 或 Cmd+Shift+R (Mac)

# 重启开发服务器
npm run dev
```

---

## 开发规范速查

### 代码风格
- 使用 2 空格缩进
- 使用 `PascalCase` 命名 Vue 组件
- 使用 `kebab-case` 命名文件
- 优先使用 `<script setup>` 语法

### Git 提交规范
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整（不影响功能）
refactor: 代码重构
test: 添加测试
chore: 构建或辅助工具变动
```

### API 调用规范
```typescript
// ✅ 推荐：使用封装的 API 函数
import { adminApi } from '@/api';
const data = await adminApi.fetchAdminNodes();

// ❌ 不推荐：直接使用 fetch
fetch('/api/v1/admin/nodes');
```

---

## 下一步

完成快速开始后，建议阅读以下文档深入了解项目：

1. **[PROJECT-ANALYSIS.md](./PROJECT-ANALYSIS.md)**: 项目完整分析报告
2. **[ROADMAP.md](./ROADMAP.md)**: 开发路线图和任务清单
3. **[frontend-guide.md](./frontend-guide.md)**: 前端集成指南
4. **[api-reference.md](./api-reference.md)**: API 接口参考

---

## 寻求帮助

- **文档问题**: 查看 `PROJECT-ANALYSIS.md` 和 `frontend-guide.md`
- **API 问题**: 查看 `api-reference.md` 和 `api-overview.md`
- **代码规范**: 查看 `AGENTS.md`
- **技术问题**: 联系项目负责人或提交 Issue

---

**快速开始指南版本**: v1.0  
**最后更新**: 2025-12-24  
**维护者**: 开发团队

祝开发愉快！🎉
