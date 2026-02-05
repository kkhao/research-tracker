"""Auto-tagging for papers and posts."""
import re
from typing import Sequence

# 研究方向标签：tag -> 匹配关键词（title/abstract/summary 中不区分大小写）
PAPER_TAG_KEYWORDS: dict[str, list[str]] = {
    "3DGS": ["3d gaussian", "3dgs"],
    "4DGS": ["4d gaussian", "4dgs", "4d gaussian splatting", "dynamic gaussian"],
    "NeRF": ["nerf", "neural radiance", "neural radiance field"],
    "世界模型": ["world model", "world-model", "worldmodel"],
    "视频生成": ["video generation", "video synthesis", "video model"],
    "物理仿真": ["physics simulation", "physics-based", "physical simulation", "mpm", "material point method"],
    "具身智能": ["embodied ai", "embodied intelligence", "robot", "robotics"],
    "大模型": ["llm", "large language model", "foundation model"],
    "多模态": ["multimodal", "vision-language", "vlm"],
    "扩散模型": ["diffusion model", "diffusion 3d", "generative ai", "生成式ai"],
    "3D重建": ["3d reconstruction", "scene reconstruction"],
    "3D生成": ["3d generation", "3d gen"],
    "实时渲染": ["real-time", "realtime", "real-time rendering"],
    "场景理解": ["scene understanding"],
    "VR/AR": ["virtual reality", "augmented reality", "vr ", " ar ", "mixed reality"],
    "可重光照": ["relighting", "relightable", "lighting editing", "光照编辑"],
    "逆渲染": ["inverse rendering", "inverse render"],
    "人体/角色": ["human avatar", "character animation", "3d human", "digital human", "人体建模", "角色动画"],
    "3DGS编辑": ["gaussian splatting edit", "3dgs edit", "splat editing"],
    "水下建模": ["underwater", "水下", "underwater 3d"],
}

# 社区/公司通用关键词
POST_TAG_KEYWORDS: dict[str, list[str]] = {
    "3DGS": ["3d gaussian", "3dgs", "gaussian splatting"],
    "4DGS": ["4d gaussian", "4dgs", "4d gaussian splatting"],
    "NeRF": ["nerf", "neural radiance"],
    "世界模型": ["world model"],
    "视频生成": ["video generation", "video synthesis", "gen-3", "sora", "runway", "pika"],
    "物理仿真": ["physics simulation", "physical simulation", "mpm", "material point method"],
    "具身智能": ["embodied", "robot", "robotics", "figure"],
    "大模型": ["llm", "大模型", "gpt", "claude", "通义", "豆包", "glm"],
    "扩散模型": ["diffusion", "扩散模型", "stable diffusion"],
    "3D生成": ["3d generation", "3d gen", "tripo", "meshy", "luma", "wonder3d"],
    "VR/AR": ["vr", "ar", "virtual reality", "augmented reality"],
    "可重光照": ["relighting", "relightable", "光照编辑"],
    "逆渲染": ["inverse rendering"],
    "人体/角色": ["avatar", "digital human", "character animation", "人体", "角色"],
    "3DGS编辑": ["gaussian splatting edit", "3dgs edit"],
}

# 公司方向 -> 展示标签
COMPANY_DIRECTION_LABELS: dict[str, str] = {
    "3d_gen": "3D生成",
    "video_world": "视频/世界模型",
    "3d_design": "3D设计",
    "llm": "大模型",
    "embodied": "具身智能",
}


def _match_keywords(text: str, tag_keywords: dict[str, list[str]]) -> list[str]:
    """Match text against tag keywords, return matched tags."""
    if not text:
        return []
    text_lower = text.lower().strip()
    tags = []
    for tag, keywords in tag_keywords.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                tags.append(tag)
                break
    return list(dict.fromkeys(tags))  # preserve order, dedupe


def tag_paper(
    title: str,
    abstract: str,
    categories: str,
    keywords: str,
    source: str,
) -> list[str]:
    """Compute tags for a paper from title, abstract, categories, keywords."""
    tags = []
    combined = f"{title or ''} {abstract or ''} {categories or ''} {keywords or ''}"
    tags.extend(_match_keywords(combined, PAPER_TAG_KEYWORDS))
    if source:
        tags.append(source.upper())
    return list(dict.fromkeys(tags))


def tag_post(
    title: str,
    summary: str,
    source: str,
    channel: str | None,
) -> list[str]:
    """Compute tags for a community post."""
    tags = []
    combined = f"{title or ''} {summary or ''}"
    tags.extend(_match_keywords(combined, POST_TAG_KEYWORDS))
    if source:
        sl = source.lower()
        if sl == "hn":
            tags.append("HN")
        elif sl == "reddit":
            tags.append("Reddit")
        elif sl == "github":
            tags.append("GitHub")
        elif sl == "youtube":
            tags.append("YouTube")
        elif sl == "huggingface":
            tags.append("Hugging Face")
    if channel:
        tags.append(channel)
    return list(dict.fromkeys(tags))


def tag_company_post(
    title: str,
    summary: str,
    channel: str,
    author: str,
    company_directions: dict[str, list[str]],
) -> list[str]:
    """Compute tags for a company post. channel=company name."""
    tags = []
    combined = f"{title or ''} {summary or ''}"
    tags.extend(_match_keywords(combined, POST_TAG_KEYWORDS))
    for direction, companies in company_directions.items():
        if channel in companies:
            label = COMPANY_DIRECTION_LABELS.get(direction, direction)
            if label and label not in tags:
                tags.append(label)
            break
    if channel and channel not in tags:
        tags.append(channel)
    return list(dict.fromkeys(tags))


def tags_to_str(tags: Sequence[str]) -> str:
    """Serialize tags list to comma-separated string for DB storage."""
    if not tags:
        return ""
    return ",".join(str(t).strip() for t in tags if str(t).strip())


def str_to_tags(s: str | None) -> list[str]:
    """Parse tags from comma-separated string."""
    if not s or not s.strip():
        return []
    return [t.strip() for t in s.split(",") if t.strip()]
