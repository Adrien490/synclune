"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenuButton } from "@/shared/components/ui/sidebar";
import { LoadingIndicator } from "@/shared/components/navigation/loading-indicator";
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

	// Override la barre active shadcn par défaut (h-5 w-0.5) : pleine hauteur 3px + fade-in opacité
	return (
		<SidebarMenuButton
			asChild
			isActive={isActive}
			tooltip={tooltip}
			className="before:bg-primary data-[active=true]:bg-primary/10 data-[active=true]:[&_svg]:text-primary relative before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full before:opacity-0 data-[active=true]:before:opacity-100 motion-safe:before:transition-opacity"
		>
			<Link href={url} aria-current={isActive ? "page" : undefined}>
				{children}
				<LoadingIndicator />
			</Link>
		</SidebarMenuButton>
	);
}
