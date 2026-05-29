"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenuBadge, SidebarMenuButton } from "@/shared/components/ui/sidebar";
import { LoadingIndicator } from "@/shared/components/navigation/loading-indicator";
import { isRouteActive } from "@/shared/lib/navigation";

interface NavMainClientProps {
	url: string;
	tooltip: string;
	/** Compteur de files actionnables (commandes/remboursements en attente). */
	badge?: number;
	children: React.ReactNode;
}

/**
 * Client Component pour gérer l'état actif de la navigation
 * Séparé du Server Component NavMain pour permettre usePathname()
 */
export function NavMainClient({ url, tooltip, badge, children }: NavMainClientProps) {
	const pathname = usePathname();

	// Déterminer si le lien est actif
	const isActive = isRouteActive(pathname, url);

	const showBadge = typeof badge === "number" && badge > 0;
	// N3 : en mode replié (icône), le badge visuel est masqué — exposer le
	// compteur dans le tooltip pour le conserver côté sighted users.
	const tooltipText = showBadge ? `${tooltip} (${badge} en attente)` : tooltip;

	// Override la barre active shadcn par défaut (h-5 w-0.5) : pleine hauteur 3px + fade-in opacité.
	// Fragment : le parent fournit le <SidebarMenuItem relative> ; le SidebarMenuBadge
	// (peer sibling, décoratif) s'auto-masque en mode icône.
	return (
		<>
			<SidebarMenuButton
				asChild
				isActive={isActive}
				tooltip={tooltipText}
				className="before:bg-primary data-[active=true]:bg-primary/10 data-[active=true]:[&_svg]:text-primary relative before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full before:opacity-0 data-[active=true]:before:opacity-100 motion-safe:before:transition-opacity"
			>
				<Link href={url} aria-current={isActive ? "page" : undefined}>
					{children}
					{/* Compteur rattaché au NOM ACCESSIBLE du lien (le badge visuel et le
					    dot sont aria-hidden). Le label « Commandes » porte déjà le nom,
					    « (N en attente) » suffit donc sans répéter le substantif. */}
					{showBadge && <span className="sr-only">({badge} en attente)</span>}
					{/* N2 : dot d'alerte visible uniquement en mode replié (icône),
					    quand le badge numérique est masqué. */}
					{showBadge && (
						<span
							aria-hidden="true"
							className="bg-primary absolute top-1 right-1 hidden size-2 rounded-full group-data-[collapsible=icon]:block"
						/>
					)}
					<LoadingIndicator />
				</Link>
			</SidebarMenuButton>
			{/* N1 : badge numérique visuel en sidebar étendue (parité mobile).
			    aria-hidden : l'info est déjà dans le nom accessible du lien ci-dessus. */}
			{showBadge && (
				<SidebarMenuBadge
					aria-hidden="true"
					className="bg-primary text-primary-foreground rounded-full"
				>
					{badge > 99 ? "99+" : badge}
				</SidebarMenuBadge>
			)}
		</>
	);
}
