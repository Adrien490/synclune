import { ProductStatus } from "@/app/generated/prisma/client";
import { TabNavigation } from "@/shared/components/tab-navigation";
import type { ProductCountsByStatus } from "@/modules/products/types/product-counts.types";

interface ProductStatusNavigationProps {
    currentStatus: ProductStatus;
    pathname?: string;
    searchParams?: Record<string, string | string[] | undefined>;
    /** Compteurs par statut (optionnel) */
    counts?: ProductCountsByStatus;
}

const STATUS_LABELS: Record<ProductStatus, string> = {
    [ProductStatus.PUBLIC]: "Publics",
    [ProductStatus.DRAFT]: "Brouillons",
    [ProductStatus.ARCHIVED]: "Archivés",
};

/**
 * Composant de navigation par onglets pour les statuts de bijoux
 * Server Component pur avec Next.js Links
 */
export function ProductStatusNavigation({
    currentStatus,
    pathname = "/admin/catalogue/produits",
    searchParams = {},
    counts,
}: ProductStatusNavigationProps) {
    // Construire les URLs avec les query params existants
    const buildHref = (status: ProductStatus) => {
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

    const items = Object.values(ProductStatus).map((status) => ({
        label: STATUS_LABELS[status],
        value: status,
        href: buildHref(status),
        count: counts?.[status],
    }));

    return (
        <TabNavigation
            items={items}
            activeValue={currentStatus}
            ariaLabel="Navigation par statuts de bijoux"
        />
    );
}
