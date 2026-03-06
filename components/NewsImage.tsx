"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  LOCAL_NEWS_IMAGE_FALLBACK,
  isFallbackImage,
  resolveCardImage
} from "@/lib/images";

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
    <Image
      src={currentSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={mergedClassName}
      onError={() => {
        if (currentSrc !== LOCAL_NEWS_IMAGE_FALLBACK) {
          setCurrentSrc(LOCAL_NEWS_IMAGE_FALLBACK);
        }
      }}
    />
  );
}
