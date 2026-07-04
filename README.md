<!--markdownlint-disable MD001 MD033 MD041 MD051-->

<div align="center">

![banner](https://coss.crabapi.cn/crabmtr/file/mornheisland/Github%20Banner.png)

# <img src="https://coss.crabapi.cn/crabmtr/mmexport1782563887148.gif" alt="Good 莫宁" height="28"/> MornheIsland · 莫宁岛

一款第三方的 ClassIsland 集控平台，支持一班一策 / 一机一策

[![Stars](https://img.shields.io/github/stars/HeyCrab3/MornheIsland?label=Stars)](https://github.com/HeyCrab3/MornheIsland)
![GitHub Repo size](https://img.shields.io/github/repo-size/HeyCrab3/MornheIsland?style=flat-square&color=3cb371)
[![GitHub Repo Languages](https://img.shields.io/github/languages/top/HeyCrab3/MornheIsland?style=flat-square)](https://github.com/HeyCrab3/MornheIsland/search)

</div>

---

## 功能

- **可视化课表编辑** — 拖拽式编辑器，时间表 × 课程表 × 星期网格，点击/拖拽填入科目
- **时间表管理** — 可拖拽排序的时段列表，每段可指定默认科目，课表自动继承
- **课程表（科目库）** — 开箱即用 13 门标准科目（UUID 格式），支持自定义扩展
- **策略集中管控** — 8 项策略开关 + JSON 双向同步，一键下发到所有设备
- **设备实时追踪** — 查看每台 ClassIsland 客户端的连接时间和请求记录
- **历史版本** — 每次修改自动存档，随时预览和恢复任意历史版本
- **多租户 SaaS** — 每用户独立数据隔离，支持多所学校/组织
- **配置一键下发** — 生成 `ManagementPreset.json`，在 ClassIsland 的集控选项内导入即可一键关联

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Nuxt 3 · Vue 3 · TypeScript · Element Plus · Tailwind CSS · Pinia |
| 后端 | Express · TypeScript · MongoDB · JWT |
| 部署 | Docker · Nginx |

## 项目结构

```
MornheIsland/                  # 前端 (Nuxt 3)
├── pages/                     # 页面路由
│   ├── login.vue              #   登录页（产品介绍 + OAuth）
│   ├── index.vue              #   仪表盘
│   ├── classplan/             #   课表编辑（可视化网格）
│   ├── timelayout/            #   时间表编辑（拖拽时段）
│   ├── subjects/              #   课程表（科目列表）
│   ├── policy/                #   策略编辑（开关 + JSON）
│   ├── classes/               #   班级管理
│   ├── devices.vue            #   设备追踪
│   ├── org.vue                #   组织设置 + 配置下发
│   └── profile.vue            #   用户中心
├── components/                # 组件
│   ├── ResourceEditor.vue     #   通用资源编辑器（含历史版本）
│   ├── ResourceList.vue       #   通用资源列表
│   ├── ClassPlanEditor.vue    #   课表可视化编辑器
│   ├── TimeLayoutEditor.vue   #   时间表拖拽编辑器
│   └── SubjectsEditor.vue     #   科目列表编辑器
├── composables/               # 组合式函数
├── layouts/                   # 布局
└── stores/                    # Pinia 状态

MornheIsland-Backend/          # 后端 (Express)
├── server.ts                  #   入口
├── router/
│   ├── ci/                    #   公开端点（ClassIsland 客户端拉取）
│   └── console/ci/            #   管理后台端点（JWT 鉴权）
└── util/                      # 工具
```

## 快速开始

### 前置要求

- Node.js ≥ 20
- pnpm
- MongoDB

### 后端

```bash
cd backend
cp config.ts.example config.ts   # 编辑数据库连接等信息
pnpm install
pnpm start                        # 默认端口 7000
```

### 前端

```bash
cd MornheIsland
pnpm install
pnpm dev                          # 默认端口 6003，API 代理到 7000
```

## ClassIsland 集成

1. 在 MornheIsland 中创建班级，配置课表、时间表、策略
2. 进入「组织设置」→ 复制 `ManagementPreset.json` 内容
3. 将该文件放置于 ClassIsland 应用目录
4. 启动 ClassIsland → 设置 → 加入管理 → 自动拉取配置

ClassIsland 客户端的 URL 模板 `{id}` 会被替换为班级的 ObjectId，所有配置按版本号增量更新，仅在变更时重新下载。

## 许可

AGPLv3 License · Copyright © 2019-2026 Crab Studio
