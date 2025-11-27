import { CollectionStatus } from "@/app/generated/prisma/client";
import { TabNavigation } from "@/shared/components/tab-navigation";
import type { CollectionCountsByStatus } from "@/modules/collections/types/collection-counts.types";

interface CollectionStatusNavigationProps {
	currentStatus: CollectionStatus;
	pathname?: string;
	searchParams?: Record<string, string | string[] | undefined>;
	counts?: CollectionCountsByStatus;
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
	counts,
}: CollectionStatusNavigationProps) {
	// Construire les URLs avec les query params existants
	const buildHref = (status: CollectionStatus) => {
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

		// Ajouter le nouveau status
		params.set("status", status);

		const queryString = params.toString();
		return queryString ? `${pathname}?${queryString}` : pathname;
	};

	const items = Object.values(CollectionStatus).map((status) => ({
		label: STATUS_LABELS[status],
		value: status,
		href: buildHref(status),
		count: counts?.[status],
	}));

	return (
		<TabNavigation
			items={items}
			activeValue={currentStatus}
			ariaLabel="Navigation par statuts de collections"
		/>
	);
}
