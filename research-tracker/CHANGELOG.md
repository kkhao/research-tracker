# 更新日志

## [Unreleased]

### 新增

- **论文**支持按**标签**抓取：选定标签时，仅用该标签对应关键词抓取 arXiv（OpenReview、S2 仍抓全部）
- 社区动态支持按**标签**抓取：选定标签时，仅用该标签对应关键词抓取 HN、YouTube（Reddit 无关键词搜索，按标签时跳过）
- 社区动态支持按**来源**抓取：选定来源（hn/reddit/youtube）时，仅抓取对应平台

### 变更

- 社区动态时间范围调整为**近一周 / 近两周 / 近一个月**（7/14/30 天），不再支持近 90 天和全部
- 社区动态抓取默认 `days` 改为 7

### 性能优化

- **代码抓取**：GitHub 与 Hugging Face 并行请求，耗时约减半（22s → 9s）
- **社区抓取**：HN、Reddit、YouTube 三源并行，总耗时显著降低
- **论文抓取**：arXiv、OpenReview、Semantic Scholar 三源并行
- Hugging Face API：limit 上限改为 50，避免 400 Bad Request

### API

- `POST /api/refresh` 新增 Query 参数：`tag`（选定标签时仅抓取该标签 arXiv）
- `POST /api/refresh-posts` 新增 Query 参数：`tag`、`source`

---

## 历史版本

（此前无独立版本记录，功能持续迭代）
