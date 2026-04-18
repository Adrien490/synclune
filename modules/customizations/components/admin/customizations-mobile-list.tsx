import { use } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";
import { Button } from "@/shared/components/ui/button";
import type { GetCustomizationRequestsResult } from "@/modules/customizations/data/get-customization-requests";

import { CustomizationSelectionToolbar } from "./customization-selection-toolbar";
import { CustomizationsMobileListItem } from "./customizations-mobile-list-item";
import { UpdateNotesDialog } from "./update-notes-dialog";

interface CustomizationsMobileListProps {
	requestsPromise: Promise<GetCustomizationRequestsResult>;
	perPage: number;
}

export function CustomizationsMobileList({
	requestsPromise,
	perPage,
}: CustomizationsMobileListProps) {
	const { items: requests, pagination } = use(requestsPromise);
	const requestIds = requests.map((r) => r.id);

	if (requests.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Sparkles}
					title="Aucune demande trouvée"
					description="Aucune demande de personnalisation ne correspond aux critères de recherche."
					actionElement={
						<Button variant="outline" asChild>
							<Link href="/admin/marketing/personnalisations">Réinitialiser les filtres</Link>
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-20 md:hidden md:pb-0">
			<CustomizationSelectionToolbar pageItemIds={requestIds} />

			<ItemGroup aria-label="Demandes de personnalisation" className="gap-2">
				{requests.map((request) => (
					<div key={request.id} role="listitem">
						<CustomizationsMobileListItem request={request} />
					</div>
				))}
			</ItemGroup>

			<UpdateNotesDialog />

			<CursorPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={requests.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
			/>
		</div>
	);
}
