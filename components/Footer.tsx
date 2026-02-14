import Link from "next/link";

export default function Footer() {
  const links = [
    { href: "/acerca", label: "Acerca" },
    { href: "/contacto", label: "Contacto" },
    { href: "/fuentes", label: "Fuentes" },
    { href: "/privacidad", label: "Privacidad" },
    { href: "/terminos", label: "Terminos" }
  ];

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6">
        <p className="text-sm text-slate-600">LATAM World News</p>
        <nav className="flex flex-wrap gap-3 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="font-medium text-slate-700 hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
