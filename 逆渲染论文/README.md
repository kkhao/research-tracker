# Awesome Inverse Rendering

## About the survey *From physical fidelity to generative priors: a comprehensive survey on inverse rendering*

**Inverse rendering** recovers scene quantities that a forward renderer needs—geometry, surface materials, lighting, environment, etc.—from observed images so that re-projection, relighting, or edits stay visually consistent. The task is usually severely ill-posed and relies on explicit or implicit assumptions and priors.

The survey's narrative runs from **physical fidelity**—physical shading, **differentiable rendering**, and explicit or semi-explicit representations fit in an optimization loop to match the imaging model—toward **generative priors**: neural representations learned at scale (e.g. radiance fields), explicit point or Gaussian primitives, and diffusion and other generative models that reduce ambiguity and improve recovery in real captures. On that basis it typically organizes methods, capabilities (decomposition granularity, editability, novel views), and trends.

<h2 id="contents">Contents</h2>

- [Physical fidelity — explicit geometry / differentiable rendering](#toc-explicit)
- [Neural implicit — NeRF-style decomposition](#toc-nerf)
- [3D Gaussian splatting](#toc-3dgs)
  - [Representation baseline — Gaussian Surfels](#toc-3dgs-ref)
  - [Inverse rendering — diffuse-dominated & simple appearance](#toc-3dgs-diffuse)
  - [Inverse rendering — specular, highlights & transparency](#toc-3dgs-specular)
- [Generative priors — intrinsics, diffusion & generative models](#toc-generative)
  - [Methods](#toc-generative-methods)
  - [Data & benchmarks](#toc-generative-data)
- [Direct prediction — end-to-end & classical pipelines](#toc-direct)

---

<h2 id="toc-explicit"><a href="#contents">Physical fidelity — explicit geometry / differentiable rendering</a></h2>

### 2025

- **MIRReS** — *Mirror-aware Inverse Rendering with Synthetic-data Supervision* · **[ICLR'25]** [\[Paper\]](https://scholar.google.com/scholar?q=MIRReS+Mirror-aware+Inverse+Rendering+Synthetic+data+Supervision+ICLR+2025)

### 2022–2021

- **NVdiffrec** — *Extracting Triangular 3D Models, Materials, and Lighting From Images* · **[CVPR'22]** [\[Paper\]](https://arxiv.org/abs/2204.01053) [\[Code\]](https://github.com/NVlabs/nvdiffrec)
- **NVdiffrecmc** — *Extracting Objects and Their Materials From Images Using Differentiable Rendering and Denoising* · **[NeurIPS'22]** [\[Paper\]](https://arxiv.org/abs/2212.03648) [\[Code\]](https://github.com/NVlabs/nvdiffrecmc)
- **DIB-R++** — *Learning to Predict 3D Objects With an Interpolation-Based Differentiable Renderer* · **[NeurIPS'21]** [\[Paper\]](https://scholar.google.com/scholar?q=Learning+to+Predict+3D+Objects+Interpolation-Based+Differentiable+Renderer+NeurIPS+2021)

---

<h2 id="toc-nerf"><a href="#contents">Neural implicit — NeRF-style decomposition</a></h2>

### 2023–2022

- **JOC** — *Joint Objective-Consistent Inverse Rendering* · **[SIGGRAPH'23]** [\[Paper\]](https://scholar.google.com/scholar?q=Joint+Objective-Consistent+Inverse+Rendering+SIGGRAPH+2023)
- **INvRender** — **[CVPR'22]** [\[Paper\]](https://scholar.google.com/scholar?q=INvRender+inverse+rendering+CVPR+2022)

### 2021

- **NeRD** — *NeRD: Neural Reflectance Decomposition from Image Collections* · **[ICCV'21]** [\[Paper\]](http://openaccess.thecvf.com/content/ICCV2021/html/Boss_NeRD_Neural_Reflectance_Decomposition_From_Image_Collections_ICCV_2021_paper.html) [\[Project Page\]](https://markboss.me/publication/2021-nerd/) [\[Code\]](https://github.com/cgtuebingen/nerd-neural-reflectance-decomposition)
- **PhySG** — *PhySG: Inverse Rendering with Spherical Gaussians for Physics-based Material Editing and Relighting* · **[CVPR'21]** [\[Paper\]](https://arxiv.org/abs/2104.09663) [\[Code\]](https://github.com/papagina/PhySG)
- **NeRFactor** — *NeRFactor: Neural Factorization of Shape and Reflectance Under an Unknown Illumination* · **[SIGGRAPH Asia / TOG'21]** [\[Paper\]](https://arxiv.org/abs/2106.01970) [\[Project Page\]](https://xiuming.info/projects/nerfactor/) [\[Code\]](https://github.com/google/nerfactor)
- **TensoIR** — *TensoIR: Tensorial Inverse Rendering* · [\[Paper\]](https://scholar.google.com/scholar?q=TensoIR+Tensorial+Inverse+Rendering)
- **TensoSDF** — [\[Paper\]](https://scholar.google.com/scholar?q=TensoSDF+inverse+rendering)

---

<h2 id="toc-3dgs"><a href="#contents">3D Gaussian splatting</a></h2>

<p>Gaussian splatting is closely related to inverse rendering. The inverse-rendering block is split by <strong>material / appearance complexity</strong>: <em>diffuse-dominated and simpler appearance</em> vs <em>specular highlights, transmission, and harder BRDFs</em>.</p>

<h3 id="toc-3dgs-ref"><a href="#contents">Representation baseline — Gaussian Surfels</a></h3>

- **Gaussian Surfels** — *High-quality Surface Reconstruction using Gaussian Surfels* · **[SIGGRAPH'24]** [\[Paper\]](https://arxiv.org/abs/2404.17774) [\[Project Page\]](https://turandai.github.io/projects/gaussian_surfels/)

<h3 id="toc-3dgs-diffuse"><a href="#contents">Inverse rendering — diffuse-dominated & simple appearance</a></h3>

- **GlossGau** — [\[Paper\]](https://scholar.google.com/scholar?q=GlossGau+3D+Gaussian+inverse+rendering)
- **GlossyGS** — *Inverse Rendering of Glossy Objects with 3D Gaussian Splatting* · **[TVCG'25]** [\[Paper\]](https://arxiv.org/abs/2410.13349) [\[Project Page\]](https://letianhuang.github.io/glossygs/)
- **GS-2DGS** — **[CVPR'25]** [\[Paper\]](https://scholar.google.com/scholar?q=GS-2DGS+2D+Gaussian+CVPR+2025)
- **gs-ssr** — [\[Paper\]](https://scholar.google.com/scholar?q=gs-ssr+gaussian+splatting+inverse+rendering)
- **GUS-IR** — [\[Paper\]](https://scholar.google.com/scholar?q=GUS-IR+3D+Gaussian+inverse+rendering)
- **InvGS** — [\[Paper\]](https://scholar.google.com/scholar?q=InvGS+inverse+rendering+Gaussian+Splatting)
- **RGS-DR** — [\[Paper\]](https://scholar.google.com/scholar?q=RGS-DR+Gaussian+inverse+rendering)

<h3 id="toc-3dgs-specular"><a href="#contents">Inverse rendering — specular, highlights & transparency</a></h3>

- **Geosplatting** — **[ICCV'25]** [\[Paper\]](https://scholar.google.com/scholar?q=Geosplatting+ICCV+2025+Gaussian)
- **GI-GS** — **[ICLR'25]** [\[Paper\]](https://scholar.google.com/scholar?q=GI-GS+Gaussian+ICLR+2025)
- **GIR** — **[TPAMI'24]** [\[Paper\]](https://scholar.google.com/scholar?q=GIR+Gaussian+inverse+rendering+TPAMI+2024)
- **GS-IR** — *3D Gaussian Splatting for Inverse Rendering* · **[CVPR'24]** [\[Paper\]](https://arxiv.org/abs/2311.16473) [\[Project Page\]](https://lzhnb.github.io/project-pages/gs-ir.html) [\[Code\]](https://github.com/lzhnb/GS-IR)
- **PhyGap** — **[CVPR'26]** [\[Paper\]](https://scholar.google.com/scholar?q=PhyGap+Gaussian+CVPR+2026)
- **Ref-Gaussian** — **[ICLR'25]** [\[Paper\]](https://scholar.google.com/scholar?q=Ref-Gaussian+ICLR+2025)
- **Ref-GS** — **[CVPR'25]** [\[Paper\]](https://scholar.google.com/scholar?q=Ref-GS+Gaussian+CVPR+2025)
- **RTR-GS** — [\[Paper\]](https://scholar.google.com/scholar?q=RTR-GS+Gaussian+Splatting)
- **Sun SVG-IR** — **[CVPR'25]** [\[Paper\]](https://scholar.google.com/scholar?q=SVG-IR+Sun+Gaussian+inverse+rendering+CVPR+2025)
- **SVG-IR Supplementary** — (same work as Sun / SVG-IR; supplementary PDF only)
- **TransparentGS** — **[SIGGRAPH'25]** [\[Paper\]](https://scholar.google.com/scholar?q=TransparentGS+Gaussian+SIGGRAPH+2025)

---

<h2 id="toc-generative"><a href="#contents">Generative priors — intrinsics, diffusion & generative models</a></h2>

<p>Image-space and learned-prior methods (diffusion, intrinsic decomposition); complements explicit 3D + differentiable rendering sections.</p>

<h3 id="toc-generative-methods"><a href="#contents">Methods</a></h3>

- **Diffusion Ren** — **[CVPR'25]** [\[Paper\]](https://scholar.google.com/scholar?q=Diffusion+ren+intrinsic+inverse+rendering+CVPR+2025)
- **DNF-Intrins** — **[ICCV'25]** [\[Paper\]](https://scholar.google.com/scholar?q=DNF+Intrins+ICCV+2025)
- **IntrinsicAnything** — [\[Paper\]](https://scholar.google.com/scholar?q=IntrinsicAnything+intrinsic+decomposition)
- **IntrinsicDiffusion** — [\[Paper\]](https://scholar.google.com/scholar?q=IntrinsicDiffusion+intrinsic+image+diffusion)
- **Kocsis** — **[CVPR'24]** [\[Paper\]](https://scholar.google.com/scholar?q=Kocsis+intrinsic+CVPR+2024)
- **MaterialFusion** — [\[Paper\]](https://scholar.google.com/scholar?q=MaterialFusion+intrinsic+material)
- **rgbx** — [\[Paper\]](https://scholar.google.com/scholar?q=rgbx+intrinsic+reflectance+decomposition)

<h3 id="toc-generative-data"><a href="#contents">Data & benchmarks</a></h3>

- **DL3DV-10K** — *A Large-Scale Scene Dataset for Deep Learning-based 3D Vision* · **[CVPR'24]** (large-scale scene video; common for 3D / inverse rendering / NVS) · [\[Paper\]](https://arxiv.org/abs/2312.16256) [\[Project Page\]](https://dl3dv-10k.github.io/DL3DV-10K/) [\[Code\]](https://github.com/DL3DV-10K/Dataset)

---

<h2 id="toc-direct"><a href="#contents">Direct prediction — end-to-end & classical pipelines</a></h2>

- **1612.08510** — [\[Paper\]](https://arxiv.org/abs/1612.08510)
- **2211.03017** — [\[Paper\]](https://arxiv.org/abs/2211.03017)
- **Direct Intrinsics Learning** — **[ICCV'15]** [\[Paper\]](https://scholar.google.com/scholar?q=Direct+Intrinsics+Learning+ICCV+2015)
- **free-view** — **[TOG'21]** [\[Paper\]](https://scholar.google.com/scholar?q=free-view+inverse+rendering+TOG+2021)
- **Inverse Rendering for Complex Indoor Scenes** — **[CVPR'20]** [\[Paper\]](https://openaccess.thecvf.com/content_CVPR_2020/html/Li_Inverse_Rendering_for_Complex_Indoor_Scenes_Shape_Spatially-Varying_Lighting_and_CVPR_2020_paper.html) · *Two duplicate PDF copies; same paper—keep one.*
