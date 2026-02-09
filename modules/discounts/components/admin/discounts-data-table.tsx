import { CursorPagination } from "@/shared/components/cursor-pagination";
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
import { Badge } from "@/shared/components/ui/badge";
import type { GetDiscountsReturn } from "@/modules/discounts/data/get-discounts";
import { DISCOUNT_TYPE_LABELS } from "@/modules/discounts/constants/discount.constants";
import { DiscountType } from "@/app/generated/prisma/client";
import { Ticket } from "lucide-react";
import { DiscountRowActions } from "./discount-row-actions";
import { DiscountsSelectionToolbar } from "./discounts-selection-toolbar";
import { TableSelectionCell } from "@/shared/components/table-selection-cell";
import { CreateDiscountButton } from "./create-discount-button";
import { formatEuro } from "@/shared/utils/format-euro";

interface DiscountsDataTableProps {
	discountsPromise: Promise<GetDiscountsReturn>;
	perPage: number;
}

export async function DiscountsDataTable({
	discountsPromise,
	perPage,
}: DiscountsDataTableProps) {
	const { discounts, pagination } = await discountsPromise;
	const discountIds = discounts.map((discount) => discount.id);
	const discountsData = discounts.map((discount) => ({
		id: discount.id,
		code: discount.code,
		usageCount: discount.usageCount,
	}));

	const formatValue = (type: DiscountType, value: number) => {
		if (type === DiscountType.PERCENTAGE) {
			return `${value}%`;
		}
		return formatEuro(value);
	};

	const formatUsage = (usageCount: number, maxUsageCount: number | null) => {
		if (maxUsageCount === null) {
			return `${usageCount} / ∞`;
		}
		return `${usageCount} / ${maxUsageCount}`;
	};

	const getTemporalStatus = (
		startsAt: Date | null,
		endsAt: Date | null,
		isActive: boolean
	): { label: string; variant: "default" | "secondary" | "outline" } => {
		if (!isActive) {
			return { label: "Inactif", variant: "secondary" };
		}
		const now = new Date();
		if (startsAt && new Date(startsAt) > now) {
			return { label: "Planifié", variant: "outline" };
		}
		if (endsAt && new Date(endsAt) < now) {
			return { label: "Expiré", variant: "secondary" };
		}
		return { label: "Actif", variant: "default" };
	};

	if (discounts.length === 0) {
		return (
			<TableEmptyState
				icon={Ticket}
				title="Aucun code promo trouve"
				description="Aucun code promo ne correspond aux criteres de recherche."
				actionElement={<CreateDiscountButton />}
			/>
		);
	}

	return (
		<Card>
			<CardContent>
				<DiscountsSelectionToolbar
					discountIds={discountIds}
					discounts={discountsData}
				/>
				<TableScrollContainer>
					<Table aria-label="Liste des codes promo" striped className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead className="w-[5%]">
									<TableSelectionCell
										type="header"
										itemIds={discountIds}
									/>
								</TableHead>
								<TableHead className="w-[20%]">
									Code
								</TableHead>
								<TableHead className="hidden sm:table-cell w-[15%]">
									Type
								</TableHead>
								<TableHead className="w-[12%]">
									Valeur
								</TableHead>
								<TableHead className="hidden md:table-cell w-[15%] text-center">
									Utilisations
								</TableHead>
								<TableHead className="w-[10%] text-center">
									Statut
								</TableHead>
								<TableHead
									className="w-[10%] text-right"
									aria-label="Actions disponibles pour chaque code promo"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
								{discounts.map((discount) => (
									<TableRow key={discount.id}>
										<TableCell>
											<TableSelectionCell
												type="row"
												itemId={discount.id}
											/>
										</TableCell>
										<TableCell>
										<code className="text-sm font-semibold bg-muted px-2 py-1 rounded">
											{discount.code}
										</code>
									</TableCell>
										<TableCell role="gridcell" className="hidden sm:table-cell">
											<span className="text-sm text-muted-foreground">
												{DISCOUNT_TYPE_LABELS[discount.type]}
											</span>
										</TableCell>
										<TableCell>
											<span className="text-sm font-medium">
												{formatValue(discount.type, discount.value)}
											</span>
										</TableCell>
										<TableCell role="gridcell" className="hidden md:table-cell text-center">
											<span className="text-sm">
												{formatUsage(discount.usageCount, discount.maxUsageCount)}
											</span>
										</TableCell>
										<TableCell role="gridcell" className="text-center">
											{(() => {
												const status = getTemporalStatus(
													discount.startsAt,
													discount.endsAt,
													discount.isActive
												);
												return (
													<Badge
														variant={status.variant}
														className={status.variant === "default" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
													>
														{status.label}
													</Badge>
												);
											})()}
										</TableCell>
										<TableCell>
											<div className="flex justify-end">
												<DiscountRowActions
													discount={discount}
												/>
											</div>
										</TableCell>
									</TableRow>
								))}
						</TableBody>
					</Table>
				</TableScrollContainer>

				<div className="mt-4">
					<CursorPagination
						perPage={perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={discounts.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
