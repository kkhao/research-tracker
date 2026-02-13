# 生日礼物网站

送给妻子的 32 岁生日礼物（2026.02.18），围绕「时光」「爱」「庆典」三个主题。

## 功能

- **首页**：主视觉「小羊送 32 朵玫瑰给两只小狗」（属相场景，可配 Lottie）；流星雨、烟花、漂浮玫瑰、粒子背景；生日贺卡与蛋糕、吹蜡烛纸屑与生日歌、背景音乐、祝福语轮播
- **我们的时光**：家庭时间线，可展开查看文字/图片/音频
- **家庭愿望板**：未来一年想一起做的事

## 运行

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:3000

## 自定义内容

1. **祝福语**：编辑 `src/data/blessings.json`
2. **时间线**：编辑 `src/data/timeline.json`，可为每个事件添加 `media[].url`（图片/视频）和 `audio.url`（旁白）
3. **愿望**：编辑 `src/data/wishes.json`
4. **音频**：将 `birthday-song.mp3`（吹蜡烛后播放）、`birthday-bg.mp3`（背景音乐）放入 `public/`，详见 `public/README-AUDIO.txt`
5. **主视觉角色**：小羊与小狗支持 **MP4 视频**或 **Lottie JSON**（MP4 优先）。将文件放入 `public/`：
   - 小羊：`sheep.mp4` 或 `sheep.json`
   - 妻子：`dog1.mp4` 或 `dog1.json`
   - 女儿：`dog2.mp4` 或 `dog2.json`  
   未放置时显示 🐑 🐕 表情。视频请使用循环短片、静音以便自动播放。

## 部署

可部署到 Vercel：在项目根目录执行 `vercel` 或连接 GitHub 仓库自动部署。
