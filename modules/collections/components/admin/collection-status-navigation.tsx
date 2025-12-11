import { CollectionStatus } from "@/app/generated/prisma/client";
import { TabNavigation } from "@/shared/components/tab-navigation";

interface CollectionStatusNavigationProps {
	currentStatus: CollectionStatus | undefined;
	pathname?: string;
	searchParams?: Record<string, string | string[] | undefined>;
}

const STATUS_LABELS: Record<CollectionStatus, string> = {
	[CollectionStatus.PUBLIC]: "Publiées",
	[CollectionStatus.DRAFT]: "Brouillons",
	[CollectionStatus.ARCHIVED]: "Archivées",
};

/**
 * Composant de navigation par onglets pour les statuts de collections
 * Server Component pur avec Next.js Links
 */
export function CollectionStatusNavigation({
	currentStatus,
	pathname = "/admin/catalogue/collections",
	searchParams = {},
}: CollectionStatusNavigationProps) {
	// Construire les URLs avec les query params existants
	const buildHref = (status: CollectionStatus | "all") => {
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

		// Ajouter le nouveau status (sauf pour "all")
		if (status !== "all") {
			params.set("status", status);
		}

		const queryString = params.toString();
		return queryString ? `${pathname}?${queryString}` : pathname;
	};

	// Onglet "Toutes" en premier, puis les statuts individuels
	const items = [
		{
			label: "Toutes",
			value: "all" as const,
			href: buildHref("all"),
		},
		...Object.values(CollectionStatus).map((status) => ({
			label: STATUS_LABELS[status],
			value: status,
			href: buildHref(status),
		})),
	];

	return (
		<TabNavigation
			items={items}
			activeValue={currentStatus ?? "all"}
			ariaLabel="Navigation par statuts de collections"
		/>
	);
}
