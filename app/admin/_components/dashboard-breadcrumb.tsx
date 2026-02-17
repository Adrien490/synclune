"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { navigationData } from "./navigation-config";

interface BreadcrumbSegment {
	label: string;
	href: string;
	isCurrentPage: boolean;
}

/** Nombre max de segments visibles avant collapse */
const MAX_VISIBLE_SEGMENTS = 4;

/**
 * Génère les segments de breadcrumb basés sur le pathname actuel
 * Utilise la configuration de navigation pour obtenir les labels appropriés
 */
function generateBreadcrumbs(pathname: string): BreadcrumbSegment[] {
	const segments: BreadcrumbSegment[] = [];

	// Toujours inclure "Tableau de bord" comme premier élément
	segments.push({
		label: "Tableau de bord",
		href: "/admin",
		isCurrentPage: pathname === "/admin",
	});

	// Si on est sur la page d'accueil du dashboard, retourner uniquement le premier segment
	if (pathname === "/admin") {
		return segments;
	}

	// Découper le pathname en parties
	const parts = pathname.split("/").filter(Boolean);
	// Retirer "admin" car déjà ajouté
	parts.shift();

	// Construire les breadcrumbs en parcourant les parties
	let currentPath = "/admin";

	for (let i = 0; i < parts.length; i++) {
		currentPath += `/${parts[i]}`;
		const isLast = i === parts.length - 1;

		// Chercher le label dans la configuration de navigation
		let label = parts[i];
		let found = false;

		// Chercher dans tous les groupes de navigation
		for (const group of navigationData.navGroups) {
			for (const item of group.items) {
				if (item.url === currentPath) {
					label = item.title;
					found = true;
					break;
				}
			}
			if (found) break;
		}

		// Si pas trouvé dans la config, formatter le segment
		if (!found) {
			// Gérer les cas spéciaux
			if (parts[i] === "nouveau") {
				label = "Nouveau";
			} else if (parts[i] === "modifier") {
				label = "Modifier";
			} else if (parts[i] === "variantes") {
				label = "Variantes";
			} else {
				// Formater : "types-de-bijoux" → "Types de bijoux"
				label = parts[i]
					.split("-")
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(" ");
			}
		}

		segments.push({
			label,
			href: currentPath,
			isCurrentPage: isLast,
		});
	}

	return segments;
}

/**
 * Breadcrumb dynamique pour le dashboard
 * S'affiche dans le header et se met à jour automatiquement en fonction de la route
 *
 * **Responsive** :
 * - Mobile : Bouton back + page actuelle uniquement
 * - Desktop : Breadcrumb complet avec collapse si trop long
 *
 * **Collapse** :
 * - Si plus de 4 segments, les segments intermédiaires sont collapsés
 * - Un dropdown permet d'accéder aux segments cachés
 */
export function DashboardBreadcrumb() {
	const pathname = usePathname();
	const breadcrumbs = generateBreadcrumbs(pathname);

	// Déterminer si on doit collapser les segments
	const shouldCollapse = breadcrumbs.length > MAX_VISIBLE_SEGMENTS;

	// Segments à afficher
	let visibleSegments: BreadcrumbSegment[];
	let collapsedSegments: BreadcrumbSegment[] = [];

	if (shouldCollapse) {
		// Garder le premier segment et les 2 derniers
		visibleSegments = [
			breadcrumbs[0], // Tableau de bord
			...breadcrumbs.slice(-2), // 2 derniers
		];
		// Segments cachés (tous sauf le premier et les 2 derniers)
		collapsedSegments = breadcrumbs.slice(1, -2);
	} else {
		visibleSegments = breadcrumbs;
	}

	return (
		<Breadcrumb className="hidden md:block min-w-0" aria-label="Fil d'Ariane">
				<BreadcrumbList className="flex-nowrap">
					{/* Premier segment (Tableau de bord) */}
					<BreadcrumbItem className="shrink-0">
						{visibleSegments[0].isCurrentPage ? (
							<BreadcrumbPage title={visibleSegments[0].label}>
								{visibleSegments[0].label}
							</BreadcrumbPage>
						) : (
							<BreadcrumbLink
								href={visibleSegments[0].href}
								title={visibleSegments[0].label}
							>
								{visibleSegments[0].label}
							</BreadcrumbLink>
						)}
					</BreadcrumbItem>

					{/* Segments collapsés avec dropdown */}
					{shouldCollapse && collapsedSegments.length > 0 && (
						<>
							<BreadcrumbSeparator className="shrink-0" />
							<BreadcrumbItem className="shrink-0">
								<DropdownMenu>
									<DropdownMenuTrigger
										className="flex items-center gap-1 hover:text-foreground transition-colors"
										aria-label="Afficher plus de segments"
									>
										<MoreHorizontal className="h-4 w-4" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start">
										{collapsedSegments.map((segment) => (
											<DropdownMenuItem key={segment.href} asChild>
												<Link href={segment.href}>{segment.label}</Link>
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							</BreadcrumbItem>
						</>
					)}

					{/* Remaining visible segments (skip the first one) */}
					{visibleSegments.slice(1).map(
						(segment, index) => (
							<Fragment key={segment.href}>
								<BreadcrumbSeparator className="shrink-0" />
								<BreadcrumbItem className="min-w-0">
									{segment.isCurrentPage ? (
										<BreadcrumbPage
											className="max-w-45 truncate"
											title={segment.label}
										>
											{segment.label}
										</BreadcrumbPage>
									) : (
										<BreadcrumbLink
											href={segment.href}
											className="max-w-35 truncate"
											title={segment.label}
										>
											{segment.label}
										</BreadcrumbLink>
									)}
								</BreadcrumbItem>
							</Fragment>
						)
					)}
				</BreadcrumbList>
		</Breadcrumb>
	);
}
