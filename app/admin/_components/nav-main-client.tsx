"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenuButton } from "@/shared/components/ui/sidebar";
import { isRouteActive } from "@/shared/lib/navigation";

interface NavMainClientProps {
	url: string;
	tooltip: string;
	children: React.ReactNode;
}

/**
 * Client Component pour gérer l'état actif de la navigation
 * Séparé du Server Component NavMain pour permettre usePathname()
 */
export function NavMainClient({ url, tooltip, children }: NavMainClientProps) {
	const pathname = usePathname();

	// Déterminer si le lien est actif
	const isActive = isRouteActive(pathname, url);

	return (
		<SidebarMenuButton
			asChild
			isActive={isActive}
			tooltip={tooltip}
			className="before:bg-primary relative h-9 before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full before:opacity-0 before:transition-opacity data-[active=true]:before:opacity-100"
		>
			<Link href={url} aria-current={isActive ? "page" : undefined}>
				{children}
			</Link>
		</SidebarMenuButton>
	);
}
