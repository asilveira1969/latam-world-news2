"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { trackEvent } from "@/lib/analytics";

type TrackedExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName?: string;
  eventParams?: Record<string, string | number | boolean | null | undefined>;
};

export default function TrackedExternalLink({
  eventName = "outbound_click",
  eventParams,
  onClick,
  ...props
}: TrackedExternalLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    trackEvent(eventName, {
      link_url: typeof props.href === "string" ? props.href : null,
      link_text: typeof props.children === "string" ? props.children : null,
      ...eventParams
    });
  }

  return <a {...props} onClick={handleClick} />;
}
