# 方矩研报

方矩星辰内部使用，追踪三维视觉、AI 生成、世界模型、物理仿真等方向的前沿研究进展。

## 技术栈

- **前端**: Next.js 14 + TypeScript
- **后端**: FastAPI + SQLite
- **数据源**: arXiv API、HN、Reddit、GitHub、YouTube、Hugging Face

## 快速启动

### 方式一：分步启动（推荐）

**1. 启动后端**

```powershell
cd d:\python_project\research-tracker\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**2. 启动前端**（新开一个终端）

```powershell
cd d:\python_project\research-tracker\frontend
npm install
npm run dev
```

### 方式二：使用 Conda

若已安装 Conda，可复用现有环境：

```powershell
conda activate 3dgrut  # 或你的环境名
cd d:\python_project\research-tracker\backend
pip install fastapi uvicorn requests
uvicorn main:app --reload --port 8000
```

### 首次使用

1. 打开 http://localhost:3000
2. 点击「从 arXiv 更新」获取论文数据（首次需等待约 1-2 分钟）
3. 使用筛选器按分类、时间、关键词过滤
4. 社区动态支持 HN、Reddit、GitHub、**Hugging Face**；**YouTube** 需设置 `YOUTUBE_API_KEY`（[获取](https://console.cloud.google.com/apis/credentials)）
5. **公司动态** 支持 Google News RSS；**微信公众号** 需在 `backend/company_crawler.py` 的 `WECHAT_MP_ALBUMS` 中配置 biz/aid（从公众号文章页 URL 获取），可选设置 `RSSHUB_BASE_URL` 使用自建 RSSHub 实例
6. **公司动态抓不到数据**：Google News 在中国大陆无法直连。可选方案：① 设置环境变量 `HTTPS_PROXY=http://代理地址:端口` 后启动后端；② 部署到 Railway 等海外平台（海外节点可直连 Google）
7. **Reddit 抓不到数据**：Reddit 在中国大陆无法直连，需在 `backend/.env` 中设置 `HTTPS_PROXY` 或部署到海外
8. **YouTube 提示 quota exceeded**：YouTube Data API v3 每日配额有限（默认约 1 万单位，每次 search 约 100 单位）。配额在太平洋时间 0 点重置。可尝试：① 次日再试；② 在 [Google Cloud Console](https://console.cloud.google.com/apis/dashboard) 申请配额提升；③ 新建项目并创建新 API Key

## 功能说明

- [docs/功能说明.md](docs/功能说明.md) - 功能概览
- [docs/标签与抓取逻辑.md](docs/标签与抓取逻辑.md) - 标签分类与各内容抓取逻辑
- [CHANGELOG.md](CHANGELOG.md) - 更新日志

## 目录结构

```
research-tracker/
├── docs/             # 文档
│   ├── 功能说明.md
│   └── 标签与抓取逻辑.md
├── backend/          # FastAPI 后端
│   ├── main.py       # API 入口
│   ├── crawler.py    # arXiv 爬虫
│   ├── database.py   # SQLite 数据库
│   └── papers.db     # 数据库文件（自动生成）
├── frontend/         # Next.js 前端
│   ├── app/
│   └── components/
└── README.md
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/papers | 获取论文列表（支持 category, search, days, limit 参数） |
| POST | /api/refresh | 从 arXiv 抓取最新论文 |
| GET | /api/health | 健康检查 |

## Railway 部署（外网访问）

### 方式一：单服务部署（仅后端）

1. 登录 [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. 选择 `kkhao/research-tracker` 仓库
3. **不要设置** Root Directory，直接部署（仓库根目录有 Dockerfile，会自动构建后端）
4. 部署完成后，在 Service 的 **Settings** → **Networking** → **Generate Domain** 生成公网域名
5. 访问 `https://你的域名/docs` 可查看 API 文档

### 方式二：前后端完整部署

1. **后端**：新建 Service，连接同一仓库，Root Directory 留空（使用根目录 Dockerfile），生成域名
2. **前端**：再新建一个 Service，连接同一仓库，Root Directory 填 `research-tracker/frontend`
3. 在前端 Service 的 **Variables** 中添加：`NEXT_PUBLIC_API_URL=https://后端域名`
4. 为前端生成域名，访问即可使用

## 定时更新

可使用 Windows 任务计划程序或 cron 每日执行：

```powershell
curl -X POST http://localhost:8000/api/refresh?days=7
```
