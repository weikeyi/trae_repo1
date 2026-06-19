# 多门店设备报修与备件调拨系统

基于 Vue 3 + TypeScript + Express + Prisma + SQLite 的完整全栈设备报修与备件管理系统。

## 功能特性

### 用户角色
- **系统管理员 (ADMIN)**：全系统管理，设备档案、备件库存、用户管理、SLA 规则、操作日志
- **门店店长 (STORE_MANAGER)**：提交工单、管理本门店设备、验收维修结果
- **维修员 (TECHNICIAN)**：接单、维修进度更新、备件申请

### 工单管理
- ✅ 门店提交故障工单（设备、故障类型、紧急程度、图片、期望上门时间）
- ✅ **自动派单推荐**：基于门店区域、维修员技能、当前负载、紧急程度智能推荐维修员
- ✅ 管理员手动派单/改派
- ✅ 维修员拒单（重新派单）
- ✅ 完整状态流转：`待派单 → 已派单 → 到场 → 诊断中 → 等待备件 → 维修中 → 维修完成/无法维修 → 验收通过/驳回`
- ✅ **重复报修检测与合并**
- ✅ **SLA 超时自动升级**
- ✅ 门店验收（通过/驳回，驳回可重修）
- ✅ 工单取消（含备件锁定自动释放）
- ✅ 状态变更历史全记录
- ✅ CSV 导出

### 备件库存与调拨
- ✅ 备件档案管理
- ✅ 多门店库存管理（总部仓 + 各门店仓）
- ✅ **可用性检查**：优先本门店、其次总部、再其次附近门店
- ✅ 库存锁定与释放（申请 → 锁定；取消/拒绝 → 释放）
- ✅ 备件申请流程：提交 → 批准/拒绝/缺货待补 → 部分出库/全部完成
- ✅ 库存调拨：创建调拨单 → 发货 → 收货（自动增加目标库存、自动回写申请完成量）
- ✅ 调拨取消（库存自动回退）
- ✅ 库存预警（安全库存提醒）

### 系统管理
- ✅ 用户、门店、设备档案管理
- ✅ SLA 规则配置（按紧急程度配置响应/解决/升级时限）
- ✅ 完整操作日志（所有写操作记录）
- ✅ 统计看板（工单趋势、状态分布、维修员负载、库存预警等）
- ✅ 角色权限控制（中间件 + 路由守卫）

## 技术栈

### 后端
- Node.js + Express 4
- TypeScript
- Prisma 5 (ORM)
- SQLite (数据库)
- JWT (认证)
- Zod (参数校验)
- bcryptjs (密码加密)
- csv-writer (CSV 导出)
- Jest + Supertest (测试)

### 前端
- Vue 3 (Composition API)
- TypeScript
- Vite 5
- Element Plus (UI 组件库)
- Pinia (状态管理)
- Vue Router 4
- Axios
- ECharts (图表)
- Day.js

## 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装与初始化

```bash
# 1. 安装后端依赖
cd server
npm install

# 2. 初始化数据库（迁移 + 种子数据）
npx prisma migrate dev --name init
npx prisma generate
npx ts-node prisma/seed.ts

# 3. 安装前端依赖
cd ../web
npm install
```

### 启动开发环境

```bash
# 启动后端 (端口 3000)
cd server
npm run dev

# 启动前端 (端口 5173)
cd ../web
npm run dev
```

访问 http://localhost:5173 即可使用系统。

### 运行测试

```bash
cd server
npm test
```

### 生产构建

```bash
# 后端
cd server
npm run build
npm start

# 前端
cd ../web
npm run build
```

## 默认账号

种子数据已预置以下账号：

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 系统管理员 | admin | admin123 | 全系统权限 |
| 门店店长(浦东店) | store1 | store123 | 上海浦东店 |
| 门店店长(徐汇店) | store2 | store123 | 上海徐汇店 |
| 维修员(华东-王) | tech1 | tech123 | 技能：空调/制冷/电器，区域：华东 |
| 维修员(华东/华北-赵) | tech2 | tech123 | 技能：空调/暖通，区域：华东/华北 |
| 维修员(华南-刘) | tech3 | tech123 | 技能：电气/电路，区域：华南 |

## 项目结构

```
.
├── server/                          # 后端
│   ├── prisma/
│   │   ├── schema.prisma            # Prisma 数据模型
│   │   └── seed.ts                  # 种子数据
│   ├── src/
│   │   ├── config/                  # 配置（Prisma、端口等）
│   │   ├── controllers/             # 控制器层
│   │   │   ├── authController.ts
│   │   │   ├── userController.ts
│   │   │   ├── storeController.ts
│   │   │   ├── equipmentController.ts
│   │   │   ├── ticketController.ts      # 工单（核心）
│   │   │   ├── inventoryController.ts   # 库存/备件/调拨（核心）
│   │   │   ├── statsController.ts       # 统计看板
│   │   │   ├── logController.ts         # 操作日志
│   │   │   └── slaController.ts
│   │   ├── middleware/              # 中间件
│   │   │   ├── auth.ts              # JWT 认证
│   │   │   ├── permission.ts        # 角色权限
│   │   │   ├── validate.ts          # 参数校验
│   │   │   └── error.ts             # 错误处理
│   │   ├── routes/                  # 路由
│   │   ├── services/                # 业务服务层
│   │   │   ├── ticketService.ts     # 派单推荐、状态流转校验、SLA
│   │   │   └── logService.ts
│   │   ├── types/                   # TypeScript 类型
│   │   ├── utils/                   # 工具函数
│   │   ├── validation/              # Zod 校验 Schema
│   │   └── index.ts                 # 入口
│   └── tests/                       # 测试
├── web/                             # 前端
│   ├── src/
│   │   ├── api/                     # API 封装
│   │   ├── components/              # 组件
│   │   ├── constants/               # 常量（状态标签、类型映射等）
│   │   ├── layouts/                 # 布局
│   │   ├── router/                  # 路由（含权限守卫）
│   │   ├── store/                   # Pinia 状态
│   │   ├── styles/                  # 全局样式
│   │   ├── types/                   # 前端类型
│   │   ├── utils/                   # Axios 封装等
│   │   └── views/                   # 页面
│   │       ├── Login.vue
│   │       ├── Dashboard.vue            # 统计看板
│   │       ├── tickets/                 # 工单（列表/创建/详情）
│   │       ├── spareparts/              # 备件/库存/申请/调拨
│   │       ├── StoreList.vue
│   │       ├── EquipmentList.vue
│   │       ├── UserList.vue
│   │       ├── SlaList.vue
│   │       └── LogList.vue
│   └── ...
└── README.md
```

## 核心业务流程

### 1. 工单流程
```
门店提交工单 → 系统推荐维修员 → 管理员派单（或手动选择）
    → 维修员接收/拒单
        → 拒单：重新派单
        → 接收：到场 → 诊断
            → 需要备件：申请备件 → 等待备件 → 收货 → 维修
            → 无需备件：直接维修
    → 维修完成 / 无法维修
→ 门店验收
    → 通过：工单结束
    → 驳回：返回维修员重修
```

### 2. 备件流程
```
维修员诊断后申请备件 → 系统检查各门店库存（优先本门店→总部→其他）
    → 库存充足：自动锁定 → 管理员批准 → 创建调拨单
        → 发货 → 收货（目标门店库存增加，申请完成量更新）
    → 库存不足：标记缺货待补，释放锁定
→ 工单取消：自动释放已锁定库存
```

### 3. 自动派单策略
推荐分数 = (技能匹配 50 分 + 区域匹配 + 负载反比 30 分 + 评分 5 分) × 紧急程度权重

### 4. 状态流转规则
系统严格限制非法状态转换，例如：
- 不能直接从"待派单"跳到"维修完成"
- 只有被指派的维修员可以更新维修进度
- 只有门店可以验收
- 只有管理员可以派单、合并工单

## API 概览

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/auth/login | 登录 | 公开 |
| GET | /api/users/me | 当前用户信息 | 登录 |
| GET/POST/PUT/DELETE | /api/users | 用户管理 | ADMIN |
| GET/POST/PUT/DELETE | /api/stores | 门店管理 | ADMIN |
| GET/POST/PUT/DELETE | /api/equipments | 设备管理 | 门店/ADMIN |
| GET/POST | /api/tickets | 工单列表/创建 | 登录 |
| GET | /api/tickets/:id | 工单详情 | 登录 |
| POST | /api/tickets/:id/assign | 派单 | ADMIN |
| POST | /api/tickets/:id/status | 更新状态 | 按角色 |
| POST | /api/tickets/:id/merge | 合并工单 | ADMIN |
| GET | /api/tickets/recommend-technicians | 推荐维修员 | 登录 |
| GET | /api/tickets/export | 导出CSV | 登录 |
| GET/POST/PUT/DELETE | /api/spare-parts | 备件管理 | ADMIN |
| GET/PUT | /api/inventories | 库存管理 | ADMIN |
| GET | /api/inventories/check-availability | 库存可用性 | 登录 |
| GET/POST/PUT | /api/inventories/requests | 备件申请 | 登录 |
| POST | /api/inventories/requests/:id/cancel | 取消申请 | 创建人/ADMIN |
| GET/POST/PUT | /api/inventories/transfers | 调拨管理 | ADMIN |
| POST | /api/inventories/transfers/:id/receive | 收货 | 门店/ADMIN |
| GET | /api/stats/dashboard | 看板统计 | 登录 |
| GET | /api/stats/* | 各种统计接口 | ADMIN/登录 |
| GET | /api/logs | 操作日志 | ADMIN |
| GET/POST/PUT/DELETE | /api/sla | SLA 规则 | ADMIN |

## 设计亮点

1. **事务完整性**：库存变动、状态变更等所有写操作均在 Prisma transaction 中执行，保证数据一致性
2. **状态机严谨**：通过 `STATUS_TRANSITIONS` 和 `canUserTransition` 双重校验，杜绝非法状态变更
3. **库存乐观控制**：备件申请即锁定库存，避免超卖；取消/拒绝自动释放
4. **操作可追溯**：所有写操作自动写入操作日志，含新旧值对比
5. **权限分层**：接口级中间件 + 前端路由守卫 + 按钮级权限显示
6. **种子数据完善**：预置 5 家门店、3 类角色、多个维修员/设备/备件/SLA 规则，开箱即用
7. **基础测试覆盖**：认证、用户、门店、设备、工单、统计均有 API 测试

## License

MIT
