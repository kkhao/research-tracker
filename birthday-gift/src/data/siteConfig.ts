/**
 * 按日期自动切换：2月14日为情人节，其余为生日站
 * 设置 NEXT_PUBLIC_FORCE_VALENTINE=true 可强制显示情人节版（测试用）
 */

export function isValentinesDay(): boolean {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_FORCE_VALENTINE === "true") {
    return true;
  }
  const now = new Date();
  return now.getUTCMonth() === 1 && now.getUTCDate() === 14; // UTC 2月14日，避免服务端/客户端时区不同导致 hydration 不一致
}

export type SiteMode = "valentine" | "birthday";

export type BlessingItem = { text: string; by?: string };

export type SiteConfig = {
  mode: SiteMode;
  /** 心形上方主标题 */
  title: string;
  /** 主标题额外样式（如情人节大号+渐变+特效） */
  titleClassName?: string;
  /** 心形上方副标题 */
  subtitle: string;
  /** 心形中央文案 */
  centerText: string;
  /** section 无障碍描述 */
  ariaLabel: string;
  /** 是否显示生日蛋糕区块 */
  showCake: boolean;
  /** 是否显示「进入我们的时光」「写下我们的愿望」导航 */
  showNav: boolean;
  /** 滚动祝福/文案列表 */
  blessings: BlessingItem[];
  /** 页面 meta 标题 */
  pageTitle: string;
  /** 页面 meta 描述 */
  pageDescription: string;
};

const BIRTHDAY_BLESSINGS: BlessingItem[] = [
  { text: "愿快乐与幸福常伴你左右", by: "爸爸" },
  { text: "新的一岁，遇见更好的自己", by: "爸爸" },
  { text: "妈妈生日快乐！我们永远爱你", by: "宝贝" },
  { text: "谢谢你为这个家付出的一切", by: "爸爸" },
  { text: "愿每一天都像今天一样被爱包围", by: "全家" },
];

const VALENTINE_BLESSINGS: BlessingItem[] = [
  { text: "每一天都爱你多一点", by: "小羊" },
  { text: "有你的每一天都是情人节", by: "小宝" },
  { text: "愿我们永远像今天一样甜蜜", by: "全家" },
  { text: "你是我最珍贵的情人节礼物", by: "小羊" },
  { text: "妈妈，我们永远爱你", by: "小宝" },
  { text: "爱你，不止今天", by: "全家" },
  { text: "心形玫瑰送给你", by: "小羊" },
  { text: "我和爸爸永远陪你", by: "小宝" },
  { text: "一家三口，幸福久久", by: "全家" },
];

const BIRTHDAY_CONFIG: SiteConfig = {
  mode: "birthday",
  title: "大宝，生日快乐 🎉",
  subtitle: "我和宝宝永远爱你",
  centerText: "99 朵玫瑰 · 送给最爱的你",
  ariaLabel: "小羊送 99 朵玫瑰给两只小狗",
  showCake: true,
  showNav: true,
  blessings: BIRTHDAY_BLESSINGS,
  pageTitle: "送给最爱的你 — 生日快乐",
  pageDescription: "我们的时光 · 爱 · 庆典",
};

const VALENTINE_CONFIG: SiteConfig = {
  mode: "valentine",
  title: "亲爱的大宝，情人节快乐，爱你一万年！",
  titleClassName: "text-3xl md:text-4xl lg:text-5xl whitespace-nowrap title-romantic-text title-romantic",
  subtitle: "我和宝宝永远爱你",
  centerText: "99 朵玫瑰 · 送给最爱的你",
  ariaLabel: "小羊送 99 朵玫瑰给两只小狗",
  showCake: false,
  showNav: false,
  blessings: VALENTINE_BLESSINGS,
  pageTitle: "送给最爱的你 — 情人节快乐",
  pageDescription: "情人节 · 爱 · 玫瑰",
};

export function getSiteConfig(): SiteConfig {
  return isValentinesDay() ? VALENTINE_CONFIG : BIRTHDAY_CONFIG;
}
