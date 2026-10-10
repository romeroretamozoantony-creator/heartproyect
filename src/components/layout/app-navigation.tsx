import Link from "next/link";

import { PRIVATE_NAVIGATION } from "@/config/navigation";

export function AppNavigation() {
  return (
    <nav aria-label="Navegación principal" className="overflow-x-auto">
      <ul className="flex min-w-max items-center gap-1">
        {PRIVATE_NAVIGATION.map(({ href, icon: Icon, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
