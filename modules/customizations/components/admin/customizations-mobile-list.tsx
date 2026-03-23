import { use } from "react";
import Link from "next/link";
import { Sparkles, StickyNote, Paperclip } from "lucide-react";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Button } from "@/shared/components/ui/button";
import type { GetCustomizationRequestsResult } from "@/modules/customizations/data/get-customization-requests";
import { formatDateShort } from "@/shared/utils/dates";

import { CustomizationRowActions } from "./customization-row-actions";
import { CustomizationSelectionToolbar } from "./customization-selection-toolbar";
import { CustomizationStatusBadge } from "./customization-status-badge";
import { UpdateNotesDialog } from "./update-notes-dialog";

export interface CustomizationsMobileListProps {
	requestsPromise: Promise<GetCustomizationRequestsResult>;
	perPage: number;
}

export function CustomizationsMobileList({
	requestsPromise,
	perPage,
}: CustomizationsMobileListProps) {
	const { items: requests, pagination } = use(requestsPromise);

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
			<CustomizationSelectionToolbar />

			<ItemGroup aria-label="Demandes de personnalisation" className="gap-2">
				{requests.map((request) => (
					<div key={request.id} role="listitem">
						<Item
							variant="outline"
							size="sm"
							className="gap-3"
							aria-roledescription="carte demande"
						>
							<ItemContent className="min-w-0">
								<ItemTitle>
									<Link
										href={`/admin/marketing/personnalisations/${request.id}`}
										className="truncate hover:underline"
										aria-label={`Voir la demande de ${request.firstName}`}
									>
										{request.firstName}
									</Link>
									<CustomizationStatusBadge status={request.status} />
								</ItemTitle>
								<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
									<span className="truncate">{request.email}</span>
									<span aria-hidden="true">·</span>
									<span>{request.productTypeLabel}</span>
									{request._count.inspirationProducts > 0 && (
										<>
											<span aria-hidden="true">·</span>
											<span className="inline-flex items-center gap-0.5">
												<Paperclip className="size-3" aria-hidden="true" />
												{request._count.inspirationProducts}
											</span>
										</>
									)}
									{request.adminNotes && (
										<StickyNote className="text-primary size-3" aria-label="Notes internes" />
									)}
									<span aria-hidden="true">·</span>
									<span>{formatDateShort(request.createdAt)}</span>
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<CustomizationRowActions
									request={{
										id: request.id,
										firstName: request.firstName,
										email: request.email,
										status: request.status,
										adminNotes: request.adminNotes,
									}}
								/>
							</ItemActions>
						</Item>
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
