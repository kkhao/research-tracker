"""Auto-tagging for papers and posts."""
import re
from typing import Sequence

# 3DGS 相关关键词：以下标签需同时匹配 3dgs + 该标签关键词，才打标
THREEDGS_KEYWORDS = ["3d gaussian", "3dgs", "4d gaussian", "4dgs", "4d gaussian splatting", "dynamic gaussian", "gaussian splatting", "neural gaussian"]
# 需同时包含 3dgs 的标签
THREEDGS_REQUIRED_TAGS = frozenset({"3DGS物理仿真", "VR/AR", "3DGS水下建模", "空间智能", "视频/世界模型"})
# 以下标签抓取时不加 3dgs 前缀（组合搜索过窄易返回空，打标仍需 3dgs）
SEARCH_WITHOUT_3DGS_PREFIX = frozenset({"空间智能"})

# 研究方向标签：tag -> 匹配关键词（title/abstract/summary 中不区分大小写）
PAPER_TAG_KEYWORDS: dict[str, list[str]] = {
    "3DGS": ["3d gaussian", "3d gaussian splatting", "3dgs", "4d gaussian", "4d gaussian splatting", "4dgs", "gaussian splatting", "dynamic gaussian", "neural gaussian"],
    "视频/世界模型": ["world model", "world-model", "worldmodel", "video generation", "video model", "text-to-video", "image-to-video", "video diffusion", "generative world model", "aigc", "world simulation"],
    "3DGS物理仿真": ["physics", "physically", "physics simulation", "physics-based", "physical simulation", "mpm", "material point method", "physics-integrated", "generative dynamics", "spring-mass", "elastic", "granular", "fluid simulation", "continuum mechanics", "physics-based simulation"],
    "3D重建/生成/渲染": ["3d reconstruction", "scene reconstruction", "3d generation", "3d gen", "3d rendering", "3d render", "text-to-3d", "image-to-3d", "novel view synthesis", "view synthesis", "3d scene generation", "3d scene reconstruction", "mesh generation", "radiance field", "neural rendering", "multi-view 3d"],
    "VR/AR": ["virtual reality", "augmented reality", "vr ", " ar ", "mixed reality", "extended reality", "xr", "spatial computing", "immersive", "head-mounted", "metaverse", "passthrough", "foveated rendering"],
    "可重光照/逆渲染": [
        "relighting", "relightable", "relight", "lighting editing", "光照编辑",
        "inverse rendering", "inverse-rendering", "inverse render", "inverse-render",
        "svbrdf", "reflectance decomposition", "neural reflectance",
        "material editing", "illumination estimation", "generative relighting",
        "relightable 3d", "environment map", "spatially-varying lighting",
        "intrinsic decomposition",
    ],
    "3D人体/角色": ["human avatar", "character animation", "3d human", "digital human", "人体建模", "角色动画"],
    "3DGS编辑": [
        "gaussian splatting edit", "gaussian edit", "3dgs edit", "splat editing",
        "3d scene editing", "editable gaussian", "gaussian stylization",
        "gaussian manipulation", "text-guided 3d editing",
    ],
    "3DGS水下建模": [
        "underwater", "水下", "underwater 3d",
        "underwater reconstruction", "underwater scene", "underwater scene reconstruction",
        "水下场景", "水下重建",
    ],
    "空间智能": [
        "spatial reasoning", "scene understanding", "spatial understanding", "spatial perception", "spatial intelligence",
        "3d scene understanding", "open-vocabulary 3d", "open-vocabulary scene understanding",
        "3d semantic segmentation", "language-guided 3d",
    ],
}

# 社区/公司通用关键词
POST_TAG_KEYWORDS: dict[str, list[str]] = {
    "3DGS": ["3d gaussian", "3d gaussian splatting", "3dgs", "4d gaussian", "4d gaussian splatting", "4dgs", "gaussian splatting", "dynamic gaussian", "neural gaussian"],
    "视频/世界模型": ["world model", "world-model", "worldmodel", "video generation", "video model", "text-to-video", "image-to-video", "video diffusion", "generative world model", "aigc", "world simulation", "gen-3", "sora", "runway", "pika"],
    "3DGS物理仿真": ["physics", "physically", "physics simulation", "physics-based", "physical simulation", "mpm", "material point method", "physics-integrated", "generative dynamics", "spring-mass", "elastic", "granular", "fluid simulation", "continuum mechanics", "physics-based simulation"],
    "3D重建/生成/渲染": ["3d reconstruction", "scene reconstruction", "3d generation", "3d gen", "3d rendering", "text-to-3d", "image-to-3d", "novel view synthesis", "view synthesis", "3d scene generation", "3d scene reconstruction", "mesh generation", "radiance field", "neural rendering", "multi-view 3d", "tripo", "meshy", "luma", "wonder3d"],
    "VR/AR": ["vr", "ar", "virtual reality", "augmented reality", "mixed reality", "extended reality", "xr", "spatial computing", "immersive", "head-mounted", "metaverse", "passthrough", "foveated rendering", "vision pro"],
    "可重光照/逆渲染": [
        "relighting", "relightable", "relight", "lighting editing", "光照编辑",
        "inverse rendering", "inverse-rendering", "inverse render", "inverse-render",
        "svbrdf", "reflectance decomposition", "neural reflectance", "material editing",
        "illumination estimation", "generative relighting", "relightable 3d",
        "environment map", "spatially-varying lighting", "intrinsic decomposition",
    ],
    "3D人体/角色": ["avatar", "human avatar", "digital human", "character animation", "3d human", "人体", "角色", "人体建模", "角色动画"],
    "3DGS编辑": [
        "gaussian splatting edit", "gaussian edit", "3dgs edit", "splat editing",
        "3d scene editing", "editable gaussian", "gaussian stylization",
        "gaussian manipulation", "text-guided 3d editing",
    ],
    "3DGS水下建模": [
        "underwater", "水下", "underwater 3d",
        "underwater reconstruction", "underwater scene", "underwater scene reconstruction",
        "水下场景", "水下重建",
    ],
    "空间智能": [
        "spatial reasoning", "scene understanding", "spatial understanding", "spatial perception", "spatial intelligence",
        "3d scene understanding", "open-vocabulary 3d", "open-vocabulary scene understanding",
        "3d semantic segmentation", "language-guided 3d",
    ],
}

# 会议标签：仅在 categories/venue 中匹配（避免 abstract 中提及会议误标）
CONFERENCE_TAG_KEYWORDS: dict[str, list[str]] = {
    "CVPR": ["cvpr"],
    "ICCV": ["iccv"],
    "ECCV": ["eccv"],
    "ICLR": ["iclr"],
    "NeurIPS": ["neurips", "nips"],
    "SIGGRAPH": ["siggraph"],
}

# 业务标签集合（用于过滤：无业务标签的论文不入库）
BUSINESS_TAGS = frozenset(PAPER_TAG_KEYWORDS.keys()) | frozenset(CONFERENCE_TAG_KEYWORDS.keys())

# 公司方向 -> 展示标签
COMPANY_DIRECTION_LABELS: dict[str, str] = {
    "3d_gen": "3D重建/生成/渲染",
    "video_world": "视频/世界模型",
    "3d_design": "3D设计",
    "llm": "大模型",
    "embodied": "机器人",
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


def _has_3dgs_keyword(text: str) -> bool:
    """Check if text contains any 3dgs-related keyword."""
    if not text:
        return False
    tl = text.lower()
    return any(kw.lower() in tl for kw in THREEDGS_KEYWORDS)


def tag_paper(
    title: str,
    abstract: str,
    categories: str,
    keywords: str,
    source: str,
    venue: str = "",
) -> list[str]:
    """Compute tags for a paper from title, abstract, categories, keywords, venue."""
    tags = []
    combined = f"{title or ''} {abstract or ''} {categories or ''} {keywords or ''}"
    tags.extend(_match_keywords(combined, PAPER_TAG_KEYWORDS))
    # 3DGS 子标签：需同时包含 3dgs 关键词，否则移除
    if not _has_3dgs_keyword(combined):
        tags = [t for t in tags if t not in THREEDGS_REQUIRED_TAGS]
    # 会议标签：仅在 categories/venue 中匹配
    cats_venue = f"{categories or ''} {venue or ''}".lower()
    for conf, kws in CONFERENCE_TAG_KEYWORDS.items():
        for kw in kws:
            if kw in cats_venue:
                tags.append(conf)
                break
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
    if not _has_3dgs_keyword(combined):
        tags = [t for t in tags if t not in THREEDGS_REQUIRED_TAGS]
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
    if not _has_3dgs_keyword(combined):
        tags = [t for t in tags if t not in THREEDGS_REQUIRED_TAGS]
    for direction, companies in company_directions.items():
        if channel in companies:
            label = COMPANY_DIRECTION_LABELS.get(direction, direction)
            if label and label not in tags:
                tags.append(label)
            break
    if channel and channel not in tags:
        tags.append(channel)
    if author and "微信公众号" in str(author):
        tags.append("微信公众号")
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
