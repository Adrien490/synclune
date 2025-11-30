"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Button } from "@/shared/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Fragment } from "react";
import { navigationData } from "./navigation-config";

interface BreadcrumbSegment {
	label: string;
	href: string;
	isCurrentPage: boolean;
}

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

				// Chercher dans les sous-items
				if (item.items) {
					for (const subItem of item.items) {
						if (subItem.url === currentPath) {
							label = subItem.title;
							found = true;
							break;
						}
					}
				}

				if (found) break;
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
 * - Desktop : Breadcrumb complet
 */
export function DashboardBreadcrumb() {
	const pathname = usePathname();
	const router = useRouter();
	const breadcrumbs = generateBreadcrumbs(pathname);

	const currentPage = breadcrumbs[breadcrumbs.length - 1];
	const previousPage = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

	return (
		<>
			{/* Version mobile : Bouton back + page actuelle */}
			<nav className="flex items-center gap-2 md:hidden" aria-label="Fil d'Ariane">
				{previousPage && (
					<Button
						variant="ghost"
						size="sm"
						className="size-9 p-0"
						onClick={() => router.push(previousPage.href)}
						aria-label={`Retour à ${previousPage.label}`}
					>
						<ChevronLeft className="h-4 w-4" aria-hidden="true" />
					</Button>
				)}
				<span
					className="text-sm font-medium truncate max-w-[200px]"
					aria-current="page"
					title={currentPage.label}
				>
					{currentPage.label}
				</span>
			</nav>

			{/* Version desktop : Breadcrumb complet */}
			<Breadcrumb className="hidden md:block" aria-label="Fil d'Ariane">
				<BreadcrumbList>
					{breadcrumbs.map((segment, index) => (
						<Fragment key={segment.href}>
							<BreadcrumbItem>
								{segment.isCurrentPage ? (
									<BreadcrumbPage className="max-w-[200px] truncate" title={segment.label}>
										{segment.label}
									</BreadcrumbPage>
								) : (
									<BreadcrumbLink href={segment.href} className="max-w-[150px] truncate" title={segment.label}>
										{segment.label}
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
							{index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
						</Fragment>
					))}
				</BreadcrumbList>
			</Breadcrumb>
		</>
	);
}
