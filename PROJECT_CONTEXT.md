# Gift Platform 项目上下文

## 项目概述
邀请任务制礼物平台 - "好礼相送"
用户通过邀请好友、完成任务来赚取积分/现金，兑换礼物。

## 技术栈

### 前端 (client/)
- React 19 + React Router 7 + Vite 8
- Tailwind CSS 4
- Zustand（状态管理）
- Axios（HTTP 请求）
- react-hot-toast（提示）
- i18next（多语言：中文、英文等）
- lucide-react（图标）
- 移动端优先，暗色模式支持
- BottomTab 导航（首页/任务/我的）

### 后端 (server/)
- Express 5 + sql.js（SQLite 本地数据库）
- JWT 认证（access token 24h + refresh token 7d）
- bcryptjs 密码加密
- QRCode 生成
- Multer 文件上传

## 项目结构

```
gift-platform/
├── client/
│   ├── src/
│   │   ├── api/          # API 封装 (auth, gifts, claims, referral, admin)
│   │   ├── store/        # Zustand 状态 (authStore)
│   │   ├── components/   # 共享组件 (Layout, shared)
│   │   ├── pages/        # 页面
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── HomePage.jsx        # 首页（礼物大厅）
│   │   │   ├── TasksPage.jsx       # 任务/邀请页面
│   │   │   ├── MinePage.jsx        # 我的（个人中心）
│   │   │   ├── TeamPage.jsx        # 团队/邀请列表
│   │   │   ├── WalletPage.jsx      # 钱包
│   │   │   ├── WithdrawPage.jsx    # 提现
│   │   │   ├── StakingPage.jsx     # 质押
│   │   │   ├── GiftDetailPage.jsx  # 礼物详情
│   │   │   ├── VipPage.jsx         # VIP
│   │   │   ├── KycPage.jsx         # KYC 实名
│   │   │   ├── SecurityPage.jsx    # 安全设置
│   │   │   ├── InvitePage.jsx      # 邀请页面
│   │   │   ├── admin/              # 管理后台
│   │   │   │   ├── AdminDashboardPage.jsx
│   │   │   │   ├── AdminUsersPage.jsx
│   │   │   │   ├── AdminGiftsPage.jsx
│   │   │   │   ├── AdminClaimsPage.jsx
│   │   │   │   └── AdminWithdrawalsPage.jsx
│   │   └── i18n/           # 多语言
│   ├── dist/               # 构建产物
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── app.js          # 入口，挂载所有路由
│   │   ├── config.js       # 配置（PORT=3001, JWT, DB路径等）
│   │   ├── db/
│   │   │   ├── database.js  # sql.js 初始化
│   │   │   ├── migrate.js   # 数据库迁移
│   │   │   └── seed.js      # 种子数据
│   │   ├── models/          # 数据模型（user, gift, userGift, invitation, settings）
│   │   ├── routes/          # API 路由
│   │   │   ├── auth.js       # 登录/注册/重置密码
│   │   │   ├── users.js      # 用户信息
│   │   │   ├── gifts.js      # 礼物管理
│   │   │   ├── claims.js     # 领取记录
│   │   │   ├── tasks.js      # 任务系统
│   │   │   ├── referral.js   # 邀请系统（最多3级）
│   │   │   ├── wallet.js     # 钱包
│   │   │   ├── kyc.js        # KYC 实名
│   │   │   ├── proofs.js     # 证明材料
│   │   │   ├── staking.js    # 质押
│   │   │   ├── notifications.js
│   │   │   ├── withdrawals.js # 提现
│   │   │   ├── admin.js       # 管理后台 API
│   │   │   └── adminPanel.js  # 管理后台页面
│   │   ├── middleware/       # auth, admin, errorHandler
│   │   └── utils/            # jwt, password, referralCode
│   ├── uploads/              # 上传文件目录
│   ├── data/                 # SQLite 数据库文件
│   └── package.json
│
└── PROJECT_CONTEXT.md        # 本文件
```

## 核心功能
1. **邀请制奖励**: 用户生成邀请码，邀请好友注册赚佣金（最多3级分润）
2. **任务系统**: 每日任务、一次性任务
3. **礼物大厅**: 浏览和兑换礼物
4. **钱包/提现**: 余额管理、提现申请
5. **质押**: Staking 功能
6. **VIP**: 等级系统
7. **KYC**: 实名认证
8. **管理后台**: 用户/礼物/提现/领取管理

## 启动方式

### 后端
```bash
cd gift-platform/server
npm run dev      # 开发模式 (node --watch)
npm run migrate  # 数据库迁移
npm run seed     # 添加种子数据
```
API 运行在 http://localhost:3001

### 前端
```bash
cd gift-platform/client
npm run dev      # Vite 开发服务器，默认 http://localhost:5173
npm run build    # 构建到 dist/
```
Vite 自动代理 /api 到 localhost:3001（需配置 vite.config.js）

## 部署

### 后端部署
- 服务器: Node.js 环境
- 数据库: SQLite（文件存储在 server/data/）
- 上传文件: server/uploads/
- 生产环境应修改 config.js 中的 JWT_SECRET 和 CORS_ORIGIN

### 前端部署
- `npm run build` 输出到 client/dist/
- 后端 app.js 已有 SPA fallback（非 /api/ 路由返回 client/dist/index.html）
- 可部署为单体应用：前端构建后，后端直接 serve 整个应用

### Netlify 部署（仅前端）
- 构建命令: `cd gift-platform/client && npm run build`
- 发布目录: `gift-platform/client/dist`
- API 需要单独部署后端服务器

## 当前状态
- 前后端代码完整，功能齐全
- 数据库使用本地 SQLite，无需外部数据库
- 邀请系统支持 3 级分润
- 管理后台页面在 server/src/views/admin.html 和 /api/admin 路由
- 多语言支持（i18next）
- 移动端 H5 优先

## 待做事宜
- 部署到生产环境（需要选服务器/域名方案）
- 生产环境安全配置（JWT_SECRET 等）
- 如需部署到线上，SQLite 可能需要替换为 PostgreSQL（若多实例部署）
