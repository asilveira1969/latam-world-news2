"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LOCAL_NEWS_IMAGE_FALLBACK, resolveCardImage } from "@/lib/images";

type NewsImageProps = {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

export default function NewsImage({ src, alt, sizes, className, priority }: NewsImageProps) {
  const safeSrc = resolveCardImage(src);
  const [currentSrc, setCurrentSrc] = useState(safeSrc);

  useEffect(() => {
    setCurrentSrc(safeSrc);
  }, [safeSrc]);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => {
        if (currentSrc !== LOCAL_NEWS_IMAGE_FALLBACK) {
          setCurrentSrc(LOCAL_NEWS_IMAGE_FALLBACK);
        }
      }}
    />
  );
}
