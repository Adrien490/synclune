import { use } from "react";
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
import { Button } from "@/shared/components/ui/button";
import { Sparkles, StickyNote } from "lucide-react";
import Link from "next/link";

import { CustomizationRowActions } from "./customization-row-actions";
import { CustomizationSelectionToolbar } from "./customization-selection-toolbar";
import { CustomizationStatusBadge } from "./customization-status-badge";
import { UpdateNotesDialog } from "./update-notes-dialog";

interface CustomizationsDataTableProps {
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
				title="Aucune demande trouvée"
				description="Aucune demande de personnalisation ne correspond aux critères de recherche."
				actionElement={
					<Button variant="outline" asChild>
						<Link href="/admin/marketing/personnalisations">Réinitialiser les filtres</Link>
					</Button>
				}
			/>
		);
	}

	return (
		<Card className="hidden md:block">
			<CardContent>
				<CustomizationSelectionToolbar />
				<TableScrollContainer>
					<Table
						aria-label="Liste des demandes de personnalisation"
						caption="Liste des personnalisations"
						striped
						className="min-w-full table-fixed"
					>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[4%]">
									<SelectAllCheckbox itemIds={requestIds} />
								</TableHead>
								<TableHead className="w-[18%]">Client</TableHead>
								<TableHead className="w-[14%]">Type</TableHead>
								<TableHead className="w-[14%]">Statut</TableHead>
								<TableHead className="w-[10%]">Inspirations</TableHead>
								<TableHead className="w-[5%]">Notes</TableHead>
								<TableHead className="w-[12%]">Date</TableHead>
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
											<p className="font-medium">{request.firstName}</p>
											<p className="text-muted-foreground text-sm">{request.email}</p>
										</div>
									</TableCell>
									<TableCell className="text-sm">{request.productTypeLabel}</TableCell>
									<TableCell>
										<CustomizationStatusBadge status={request.status} />
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{request._count.inspirationProducts > 0 ? (
											<span>{request._count.inspirationProducts} produit(s)</span>
										) : (
											<span className="text-muted-foreground/50">-</span>
										)}
									</TableCell>
									<TableCell>
										{request.adminNotes ? (
											<StickyNote className="text-primary h-4 w-4" />
										) : (
											<span className="text-muted-foreground/50">-</span>
										)}
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
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
