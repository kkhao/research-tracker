export interface TimelineEvent {
  id: string;
  year: number;
  /** 若有则显示为时间段，如 2019-2025 */
  yearEnd?: number;
  title: string;
  shortDesc?: string;
  narrative?: string;
  media: { type: "image" | "video"; url: string; alt?: string }[];
  audio: { url: string; label?: string } | null;
}
