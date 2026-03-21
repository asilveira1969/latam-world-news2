import { cleanPlainText } from "@/lib/text/clean";

const COUNTRY_LABELS: Record<string, string> = {
  ar: "Argentina",
  br: "Brasil",
  cl: "Chile",
  mx: "México",
  py: "Paraguay",
  uy: "Uruguay"
};

export function toTopicSlug(value: string): string {
  return cleanPlainText(value).toLowerCase().replace(/\s+/g, "-");
}

export function getTopicLabel(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, " ");
}

export function getCountryLabel(slug: string): string {
  return COUNTRY_LABELS[decodeURIComponent(slug).toLowerCase()] ?? decodeURIComponent(slug).toUpperCase();
}

export function getCountrySlug(value: string): string {
  return cleanPlainText(value).toLowerCase();
}

export function isLatamCountryCode(value: string): boolean {
  return ["UY", "AR", "BR", "MX", "CL", "PY"].includes(value.toUpperCase());
}
