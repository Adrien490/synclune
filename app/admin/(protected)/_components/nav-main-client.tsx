"use client";

// GuardedLink : consulte le registre de NavigationGuardProvider avant de naviguer,
// pour ne pas perdre la saisie d'un formulaire admin dirty (cf. audit 2026-07-26).
import { GuardedLink as Link } from "@/shared/components/navigation/guarded-link";
import { usePathname } from "next/navigation";
import { SidebarMenuBadge, SidebarMenuButton } from "@/shared/components/ui/sidebar";
import { LoadingIndicator } from "@/shared/components/navigation/loading-indicator";
import { isRouteActive } from "@/shared/lib/navigation";
import { badgePendingLabel } from "./navigation-config";

interface NavMainClientProps {
	url: string;
	tooltip: string;
	/** Compteur de files actionnables (commandes/remboursements en attente). */
	badge?: number;
	/** Destination de la pastille quand elle diffère du lien (cf. `NavItem.badgeUrl`). */
	badgeUrl?: string;
	children: React.ReactNode;
}

/**
 * Client Component pour gérer l'état actif de la navigation
 * Séparé du Server Component NavMain pour permettre usePathname()
 */
export function NavMainClient({ url, tooltip, badge, badgeUrl, children }: NavMainClientProps) {
	const pathname = usePathname();

	// Déterminer si le lien est actif
	const isActive = isRouteActive(pathname, url);

	// `null` plutôt qu'un booléen séparé : porte la valeur ET la condition, donc
	// TypeScript narrow le compteur dans tout le JSX ci-dessous.
	const badgeCount = typeof badge === "number" && badge > 0 ? badge : null;
	// Formulation SSOT (`navigation-config`), pas une chaîne locale.
	const pendingLabel = badgeCount === null ? null : badgePendingLabel(badgeCount);
	// N3 : en mode replié (icône), le badge visuel est masqué — exposer le
	// compteur dans le tooltip pour le conserver côté sighted users.
	const tooltipText = pendingLabel ? `${tooltip} (${pendingLabel})` : tooltip;

	// Override la barre active shadcn par défaut (h-5 w-0.5) : pleine hauteur 3px + fade-in opacité.
	// Fragment : le parent fournit le <SidebarMenuItem relative> ; le SidebarMenuBadge
	// (peer sibling, décoratif) s'auto-masque en mode icône.
	return (
		<>
			<SidebarMenuButton
				render={<Link href={url} aria-current={isActive ? "page" : undefined} />}
				isActive={isActive}
				tooltip={tooltipText}
				className="before:bg-primary data-active:bg-primary/10 data-active:[&_svg]:text-primary relative before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full before:opacity-0 data-active:before:opacity-100 motion-safe:before:transition-opacity"
			>
				{children}
				{/* Compteur rattaché au NOM ACCESSIBLE du lien (le badge visuel et le
					    dot sont aria-hidden). Le label « Commandes » porte déjà le nom,
					    « (N en attente) » suffit donc sans répéter le substantif. */}
				{pendingLabel && <span className="sr-only">({pendingLabel})</span>}
				{/* N2 : dot d'alerte visible uniquement en mode replié (icône),
					    quand le badge numérique est masqué. */}
				{badgeCount !== null && (
					<span
						aria-hidden="true"
						className="bg-primary absolute top-1 right-1 hidden size-2 rounded-full group-data-[collapsible=icon]:block"
					/>
				)}
				<LoadingIndicator />
			</SidebarMenuButton>
			{/* N1 : badge numérique visuel en sidebar étendue (parité mobile).
			    Quand `badgeUrl` est fourni, le compteur devient CLIQUABLE et mène à la
			    file qu'il compte (le libellé continue de mener à la liste complète) —
			    sinon l'admin atterrissait sur une liste non filtrée et devait repérer
			    les lignes concernées à l'œil. `pointer-events-auto` annule le
			    `pointer-events-none` du slot shadcn.
			    Non cliquable → reste purement décoratif (`aria-hidden`), l'info étant
			    déjà dans le nom accessible du lien ci-dessus. */}
			{badgeCount !== null &&
				(badgeUrl ? (
					// `h-6 min-w-6` (24px) : la pastille CLIQUABLE doit atteindre le
					// minimum WCAG 2.5.8 — les 20px du slot (`h-5 min-w-5`) faisaient
					// échouer `target-size` sur toutes les pages admin dès qu'une
					// commande était en attente (attrapé par l'audit axe e2e, lot 7).
					// `top-1` recentre les 24px dans le bouton de 32px.
					<SidebarMenuBadge className="pointer-events-auto h-6 min-w-6 p-0 peer-data-[size=default]/menu-button:top-1">
						<Link
							href={badgeUrl}
							aria-label={`Voir les ${pendingLabel}`}
							className="bg-primary text-primary-foreground focus-ring flex size-full items-center justify-center rounded-full"
						>
							<span aria-hidden="true">{badgeCount > 99 ? "99+" : badgeCount}</span>
						</Link>
					</SidebarMenuBadge>
				) : (
					<SidebarMenuBadge
						aria-hidden="true"
						className="bg-primary text-primary-foreground rounded-full"
					>
						{badgeCount > 99 ? "99+" : badgeCount}
					</SidebarMenuBadge>
				))}
		</>
	);
}
