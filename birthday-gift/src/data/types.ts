export interface TimelineEvent {
  id: string;
  year: number;
  title: string;
  shortDesc?: string;
  narrative?: string;
  media: { type: "image" | "video"; url: string; alt?: string }[];
  audio: { url: string; label?: string } | null;
}
