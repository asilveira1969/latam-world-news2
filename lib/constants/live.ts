import type { LiveStreamSource } from "@/components/LiveStream";

export const LIVE_STREAM_SOURCES: LiveStreamSource[] = [
  {
    key: "france24",
    label: "France 24 ES",
    embedUrl: "https://www.youtube.com/embed/l8PMl7tUDIE?autoplay=0",
    sourceUrl: "https://www.france24.com/es/en-vivo"
  },
  {
    key: "dw",
    label: "DW ES",
    embedUrl: "https://www.youtube.com/embed/NvqKZHpKs-g?autoplay=0",
    sourceUrl: "https://www.dw.com/es/streaming"
  },
  {
    key: "rt",
    label: "RT ES",
    embedUrl: "https://www.youtube.com/embed/JNpB8zqJp0A?autoplay=0",
    sourceUrl: "https://actualidad.rt.com/en_vivo"
  }
];
