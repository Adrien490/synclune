import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Table } from "@/shared/components/ui/table";
import { cn } from "@/shared/utils/cn";
import type { ReactNode } from "react";
import { ADMIN_LIST_PENDING_CLASS } from "@/shared/components/admin-list-pending.styles";

interface AdminDataTablePagination {
	perPage: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	currentPageSize: number;
	nextCursor: string | null;
	prevCursor: string | null;
	/** Total cross-pages — affiche "X sur N résultats" quand fourni. */
	totalCount?: number;
	/**
	 * Options du sélecteur « par page ». À fournir via `perPageOptionsUpTo(cap)` quand
	 * le module plafonne sous `PAGINATION_LIMITS.MAX_ADMIN`, sinon le sélecteur propose
	 * une valeur que le schéma refuse (clamp silencieux vers la valeur par défaut).
	 */
	perPageOptions?: number[];
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
		<Card className={cn("hidden md:block", ADMIN_LIST_PENDING_CLASS, className)}>
			<CardContent>
				{/* En-têtes collants : le `<thead>` s'ancre au conteneur scrollable
				    (`overflow-x-auto` en fait déjà un contexte de défilement, le sticky
				    ne peut donc pas viser le scroll de la page). `max-h-[70vh]` borne la
				    hauteur pour qu'un défilement interne existe ; en-dessous de ce seuil
				    la table s'affiche entière et le sticky ne se déclenche jamais.
				    Appliqué via un variant descendant plutôt qu'une prop sur chaque
				    `<TableHeader>` : les 11 tables l'obtiennent sans modification. */}
				<TableScrollContainer label={caption} maxHeightClassName="max-h-[70vh]">
					<Table
						caption={caption}
						striped
						noRegion
						className={cn(
							"min-w-full table-fixed [&>caption]:sr-only",
							"[&_thead]:bg-background [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:shadow-sm",
						)}
					>
						{children}
					</Table>
				</TableScrollContainer>

				{/* Compteur rendu ICI et non dans `CursorPagination` : la barre
				    entière disparaît quand la liste tient sur une page (cas normal à
				    faible volume), le compteur y serait donc invisible la plupart du
				    temps.

				    Pas de `role=status` — mais la raison a changé : l'ancienne
				    justification (« déjà portée par la live region de
				    `CursorPagination` ») était fausse dans ce cas précis, puisque
				    cette barre est justement absente ici. L'annonce appartient
				    désormais à `ResultCountLiveRegion`, montée au niveau page.
				    Audit recherche 2026-07-26. */}
				<p className="text-muted-foreground mt-4 text-sm">
					<span className="text-foreground font-medium">{pagination.currentPageSize}</span>
					{typeof pagination.totalCount === "number" &&
						pagination.totalCount > pagination.currentPageSize && (
							<>
								<span> sur </span>
								<span className="text-foreground font-medium">{pagination.totalCount}</span>
							</>
						)}
					<span>
						{" "}
						résultat{(pagination.totalCount ?? pagination.currentPageSize) > 1 ? "s" : ""}
					</span>
				</p>

				<div className="mt-2">
					<CursorPagination
						perPage={pagination.perPage}
						{...(pagination.perPageOptions ? { perPageOptions: pagination.perPageOptions } : {})}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={pagination.currentPageSize}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
						totalCount={pagination.totalCount}
						showCount={false}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
