"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenuButton } from "@/shared/components/ui/sidebar";
import { isRouteActive } from "@/shared/lib/navigation";

interface NavMainClientProps {
	url: string;
	children: React.ReactNode;
}

/**
 * Client Component pour gérer l'état actif de la navigation
 * Séparé du Server Component NavMain pour permettre usePathname()
 */
export function NavMainClient({ url, children }: NavMainClientProps) {
	const pathname = usePathname();

	// Déterminer si le lien est actif
	const isActive = isRouteActive(pathname, url);

	return (
		<SidebarMenuButton asChild isActive={isActive} className="h-9">
			<Link href={url} aria-current={isActive ? "page" : undefined}>
				{children}
			</Link>
		</SidebarMenuButton>
	);
}
