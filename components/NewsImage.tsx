"use client";

import { useEffect, useState } from "react";
import { LOCAL_NEWS_IMAGE_FALLBACK, isFallbackImage, resolveCardImage } from "@/lib/images";

type NewsImageProps = {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  fallbackTone?: "default" | "subtle";
};

export default function NewsImage({
  src,
  alt,
  sizes,
  className,
  priority,
  fallbackTone = "default"
}: NewsImageProps) {
  const safeSrc = resolveCardImage(src);
  const [currentSrc, setCurrentSrc] = useState(safeSrc);

  useEffect(() => {
    setCurrentSrc(safeSrc);
  }, [safeSrc]);

  const fallbackClassName =
    fallbackTone === "subtle" && isFallbackImage(currentSrc)
      ? "bg-slate-100 object-contain p-8 opacity-70"
      : "";
  const mergedClassName = [className, fallbackClassName].filter(Boolean).join(" ");

  return (
    <img
      key={currentSrc}
      src={currentSrc}
      alt={alt}
      className={mergedClassName}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      onError={() => {
        if (currentSrc !== LOCAL_NEWS_IMAGE_FALLBACK) {
          setCurrentSrc(LOCAL_NEWS_IMAGE_FALLBACK);
        }
      }}
    />
  );
}
