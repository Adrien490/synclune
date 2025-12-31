"use client";

import { use } from "react";
import type { CustomizationRequestStatus } from "../../types/customization.types";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { ItemCheckbox } from "@/shared/components/item-checkbox";
import { SelectAllCheckbox } from "@/shared/components/select-all-checkbox";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Card, CardContent } from "@/shared/components/ui/card";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import type { GetCustomizationRequestsResult } from "@/modules/customizations/data/get-customization-requests";
import { formatDateShort } from "@/shared/utils/dates";
import {
	CUSTOMIZATION_STATUS_LABELS,
	CUSTOMIZATION_STATUS_COLORS,
} from "@/modules/customizations/constants/status.constants";
import { Sparkles, StickyNote } from "lucide-react";

import { CustomizationRowActions } from "./customization-row-actions";
import { CustomizationSelectionToolbar } from "./customization-selection-toolbar";
import { UpdateNotesDialog } from "./update-notes-dialog";

export interface CustomizationsDataTableProps {
	requestsPromise: Promise<GetCustomizationRequestsResult>;
	perPage: number;
}

export function CustomizationsDataTable({
	requestsPromise,
	perPage,
}: CustomizationsDataTableProps) {
	const { items: requests, pagination } = use(requestsPromise);
	const requestIds = requests.map((r) => r.id);

	if (requests.length === 0) {
		return (
			<TableEmptyState
				icon={Sparkles}
				title="Aucune demande trouvee"
				description="Aucune demande de personnalisation ne correspond aux criteres de recherche."
			/>
		);
	}

	return (
		<Card>
			<CardContent>
				<CustomizationSelectionToolbar />
				<TableScrollContainer>
					<Table aria-label="Liste des demandes de personnalisation" striped>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[5%]">
									<SelectAllCheckbox itemIds={requestIds} />
								</TableHead>
								<TableHead className="w-[18%]">Client</TableHead>
								<TableHead className="w-[15%]">Type</TableHead>
								<TableHead className="w-[15%]">Statut</TableHead>
								<TableHead className="hidden md:table-cell w-[10%]">Inspirations</TableHead>
								<TableHead className="hidden lg:table-cell w-[5%]">Notes</TableHead>
								<TableHead className="hidden sm:table-cell w-[12%]">Date</TableHead>
								<TableHead className="w-[8%] text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{requests.map((request) => (
								<TableRow key={request.id}>
									<TableCell>
										<ItemCheckbox itemId={request.id} />
									</TableCell>
									<TableCell>
										<div className="space-y-0.5">
											<p className="font-medium">
												{request.firstName}
											</p>
											<p className="text-sm text-muted-foreground">
												{request.email}
											</p>
										</div>
									</TableCell>
									<TableCell className="text-sm">
										{request.productTypeLabel}
									</TableCell>
									<TableCell>
										<StatusBadge status={request.status} />
									</TableCell>
									<TableCell className="hidden md:table-cell text-sm text-muted-foreground">
										{request._count.inspirationProducts > 0 ? (
											<span>{request._count.inspirationProducts} produit(s)</span>
										) : (
											<span className="text-muted-foreground/50">-</span>
										)}
									</TableCell>
									<TableCell className="hidden lg:table-cell">
										{request.adminNotes ? (
											<StickyNote className="h-4 w-4 text-primary" />
										) : (
											<span className="text-muted-foreground/50">-</span>
										)}
									</TableCell>
									<TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
										{formatDateShort(request.createdAt)}
									</TableCell>
									<TableCell className="text-right">
										<CustomizationRowActions
											request={{
												id: request.id,
												firstName: request.firstName,
												email: request.email,
												status: request.status,
												adminNotes: request.adminNotes,
											}}
										/>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableScrollContainer>

				{/* Dialog pour les notes */}
				<UpdateNotesDialog />

				<div className="mt-4">
					<CursorPagination
						perPage={perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={requests.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}

function StatusBadge({ status }: { status: CustomizationRequestStatus }) {
	const label = CUSTOMIZATION_STATUS_LABELS[status];
	const colors = CUSTOMIZATION_STATUS_COLORS[status];

	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
		>
			<span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
			{label}
		</span>
	);
}
