import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Table } from "@/shared/components/ui/table";
import { cn } from "@/shared/utils/cn";
import type { ReactNode } from "react";

interface AdminDataTablePagination {
	perPage: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	currentPageSize: number;
	nextCursor: string | null;
	prevCursor: string | null;
	/** Total cross-pages — affiche "X sur N résultats" quand fourni. */
	totalCount?: number;
}

interface AdminDataTableProps {
	/**
	 * Caption sémantique de la table (sr-only) ET aria-label de la région
	 * scrollable. Doit décrire le contenu (ex: « Liste des commandes »).
	 */
	caption: string;
	/** Métadonnées de pagination cursor pour `<CursorPagination>`. */
	pagination: AdminDataTablePagination;
	/**
	 * `<TableHeader>` + `<TableBody>` de la table. Les colonnes restent
	 * définies par chaque module pour autonomie sémantique.
	 */
	children: ReactNode;
	/** Classe additionnelle posée sur la `<Card>` racine. */
	className?: string;
}

/**
 * Agrégateur des admin data-tables : absorbe Card +
 * TableScrollContainer + Table (caption/striped/noRegion/table-fixed) +
 * CursorPagination. Permet à chaque admin table de se concentrer sur ses
 * colonnes propres.
 *
 * **Empty state** : géré par le call-site AVANT d'instancier ce composant
 * (`if (items.length === 0) return <TableEmptyState …/>`). Le composant ne
 * gère pas l'état vide pour préserver la flexibilité des CTA contextuels.
 *
 * @example
 * ```tsx
 * <AdminDataTable
 *   caption="Liste des commandes"
 *   pagination={{ perPage, ...pagination, currentPageSize: orders.length }}
 * >
 *   <TableHeader>…</TableHeader>
 *   <TableBody>…</TableBody>
 * </AdminDataTable>
 * ```
 */
export function AdminDataTable({ caption, pagination, children, className }: AdminDataTableProps) {
	return (
		<Card className={cn("hidden md:block", className)}>
			<CardContent>
				<TableScrollContainer label={caption}>
					<Table
						caption={caption}
						striped
						noRegion
						className="min-w-full table-fixed [&>caption]:sr-only"
					>
						{children}
					</Table>
				</TableScrollContainer>

				<div className="mt-4">
					<CursorPagination
						perPage={pagination.perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={pagination.currentPageSize}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
						totalCount={pagination.totalCount}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
