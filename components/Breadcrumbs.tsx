import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link href={item.href} className="hover:text-brand hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-800">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
