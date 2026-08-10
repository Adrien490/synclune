import { PublicationStatus } from "@/app/generated/prisma/client";
import { TabNavigation } from "@/shared/components/tab-navigation";

const EMPTY_SEARCH_PARAMS: Record<string, string | string[] | undefined> = {};

interface ProductStatusNavigationProps {
	currentStatus: PublicationStatus | undefined;
	pathname?: string;
	searchParams?: Record<string, string | string[] | undefined>;
}

// Pluriels d'onglets (« Publics », « Brouillons »…) : variante de présentation
// volontairement locale — les singuliers SSOT vivent dans
// modules/products/constants/product-status-display.ts.
const STATUS_LABELS: Record<PublicationStatus, string> = {
	[PublicationStatus.PUBLIC]: "Publics",
	[PublicationStatus.DRAFT]: "Brouillons",
	[PublicationStatus.ARCHIVED]: "Archivés",
};

/**
 * Composant de navigation par onglets pour les statuts de bijoux
 * Server Component pur avec Next.js Links
 */
export function ProductStatusNavigation({
	currentStatus,
	pathname = "/admin/catalogue/produits",
	searchParams = EMPTY_SEARCH_PARAMS,
}: ProductStatusNavigationProps) {
	// Construire les URLs avec les query params existants
	const buildHref = (status: PublicationStatus | "all") => {
		const params = new URLSearchParams();

		// Copier tous les params existants sauf status, cursor et direction
		Object.entries(searchParams).forEach(([key, value]) => {
			if (key !== "status" && key !== "cursor" && key !== "direction") {
				if (Array.isArray(value)) {
					value.forEach((v) => params.append(key, v));
				} else if (value) {
					params.set(key, value);
				}
			}
		});

		// Ajouter le status (y compris "all" pour afficher tous les produits)
		params.set("status", status);

		const queryString = params.toString();
		return queryString ? `${pathname}?${queryString}` : pathname;
	};

	// Onglet "Tous" en premier, puis les statuts individuels
	const items = [
		{
			label: "Tous",
			value: "all" as const,
			href: buildHref("all"),
		},
		...Object.values(PublicationStatus).map((status) => ({
			label: STATUS_LABELS[status],
			value: status,
			href: buildHref(status),
		})),
	];

	return (
		<TabNavigation
			items={items}
			activeValue={currentStatus ?? "all"}
			ariaLabel="Navigation par statuts de bijoux"
		/>
	);
}
