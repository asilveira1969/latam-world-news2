"use client";

import type { FormHTMLAttributes, ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

type SearchFormProps = FormHTMLAttributes<HTMLFormElement> & {
  children: ReactNode;
};

export default function SearchForm({ children, onSubmit, ...props }: SearchFormProps) {
  return (
    <form
      {...props}
      onSubmit={(event) => {
        onSubmit?.(event);
        if (event.defaultPrevented) {
          return;
        }

        const formData = new FormData(event.currentTarget);
        const query = formData.get("q");
        const searchTerm = typeof query === "string" ? query.trim() : "";

        if (!searchTerm) {
          return;
        }

        trackEvent("search", {
          search_term: searchTerm
        });
      }}
    >
      {children}
    </form>
  );
}
