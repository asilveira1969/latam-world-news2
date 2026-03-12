"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

type ArticleEngagementTrackerProps = {
  slug: string;
  title: string;
  section: string;
};

export default function ArticleEngagementTracker({
  slug,
  title,
  section
}: ArticleEngagementTrackerProps) {
  useEffect(() => {
    let sentEngaged = false;
    let sentScroll = false;

    const engagedTimer = window.setTimeout(() => {
      sentEngaged = true;
      trackEvent("article_engaged", {
        article_slug: slug,
        article_title: title,
        article_section: section,
        engagement_seconds: 30
      });
    }, 30000);

    function handleScroll() {
      if (sentScroll) {
        return;
      }

      const totalScrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScrollable <= 0) {
        return;
      }

      const progress = window.scrollY / totalScrollable;
      if (progress < 0.75) {
        return;
      }

      sentScroll = true;
      trackEvent("article_scroll_75", {
        article_slug: slug,
        article_title: title,
        article_section: section
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.clearTimeout(engagedTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [section, slug, title]);

  return null;
}
