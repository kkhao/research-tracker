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

## 目录结构

```
research-tracker/
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

1. 将代码推送到 GitHub
2. 登录 [railway.app](https://railway.app)，新建项目并连接仓库
3. **后端**：新建 Service，Root Directory 填 `backend`，Start Command 填 `uvicorn main:app --host 0.0.0.0 --port $PORT`，生成域名
4. **前端**：新建 Service，Root Directory 填 `frontend`，在 Variables 中设置 `NEXT_PUBLIC_API_URL=https://你的后端域名`，生成域名
5. 访问前端域名即可使用

## 定时更新

可使用 Windows 任务计划程序或 cron 每日执行：

```powershell
curl -X POST http://localhost:8000/api/refresh?days=7
```
