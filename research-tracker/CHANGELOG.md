# 更新日志

## [Unreleased]

### 新增

- **论文**支持按**标签**抓取：选定标签时，仅用该标签对应关键词抓取 arXiv（OpenReview、S2 仍抓全部）
- 社区动态支持按**标签**抓取：选定标签时，仅用该标签对应关键词抓取 HN、YouTube（Reddit 无关键词搜索，按标签时跳过）
- 社区动态支持按**来源**抓取：选定来源（hn/reddit/youtube）时，仅抓取对应平台

### 变更

- **3dgs 子标签约束**：3DGS物理仿真、VR/AR、3DGS水下建模、空间智能 打标时需**同时**包含 3dgs 相关词，抓取时自动附加 3dgs AND 约束，避免误标/误抓非 3DGS 论文
- **新增标签**：空间智能（spatial reasoning, scene understanding, spatial understanding, spatial perception, spatial intelligence），需同时含 3dgs
- **移除标签**：多模态、具身智能。公司方向 llm→大模型，embodied→机器人
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
