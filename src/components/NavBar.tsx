"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "홈" },
  { href: "/idea", label: "아이디어" },
  { href: "/scenario", label: "시나리오" },
  { href: "/plan", label: "지도안" },
  { href: "/settings", label: "설정" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-cream/70 bg-cream/90 border-b border-ink/10">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-ink/90 hover:text-ink">
          AI 융합 수업지도안 도구
        </Link>
        <ul className="flex items-center gap-1">
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-peach-200/70 text-ink shadow-sm"
                      : "text-ink/70 hover:text-ink hover:bg-peach-100/80"
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}