import { ProductStatus } from "@/app/generated/prisma/client";
import { TabNavigation } from "@/shared/components/tab-navigation";

interface ProductStatusNavigationProps {
    currentStatus: ProductStatus | undefined;
    pathname?: string;
    searchParams?: Record<string, string | string[] | undefined>;
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
}: ProductStatusNavigationProps) {
    // Construire les URLs avec les query params existants
    const buildHref = (status: ProductStatus | "all") => {
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
        ...Object.values(ProductStatus).map((status) => ({
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
