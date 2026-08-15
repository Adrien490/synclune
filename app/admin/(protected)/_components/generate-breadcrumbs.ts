// Dérivation pure des segments de breadcrumb, extraite de
// `dashboard-breadcrumb.tsx` : un fichier de composants qui exporte aussi des
// non-composants casse le Fast Refresh.
import { navigationData } from "./navigation-config";

export interface BreadcrumbSegment {
	label: string;
	href: string;
	isCurrentPage: boolean;
}

/** Nombre max de segments visibles avant collapse */
export const MAX_VISIBLE_SEGMENTS = 4;

/**
 * Overrides explicites pour les segments d'URL qui n'apparaissent pas dans
 * `navigationData` mais doivent recevoir un label lisible (FR, contextuel).
 * Sans override, le fallback split/uppercase produit un Title Case acceptable
 * pour la majorité des segments (ex. "prix" → "Prix").
 */
const SEGMENT_LABEL_OVERRIDES: Record<string, string> = {
	nouveau: "Nouveau",
	modifier: "Modifier",
	variantes: "Variantes",
	retractations: "Rétractations",
};

/**
 * Génère les segments de breadcrumb basés sur le pathname actuel
 * Utilise la configuration de navigation pour obtenir les labels appropriés
 */
export function generateBreadcrumbs(pathname: string): BreadcrumbSegment[] {
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
		const part = parts[i] ?? "";
		currentPath += `/${part}`;
		const isLast = i === parts.length - 1;

		// Chercher le label dans la configuration de navigation
		let label = part;
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
			const override = SEGMENT_LABEL_OVERRIDES[part];
			if (override) {
				label = override;
			} else {
				// Fallback : "types-de-bijoux" → "Types De Bijoux"
				label = part
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
