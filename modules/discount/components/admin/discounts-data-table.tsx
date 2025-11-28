import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import type { GetDiscountsReturn } from "@/modules/discount/data/get-discounts";
import { DISCOUNT_TYPE_LABELS } from "@/modules/discount/constants/discount.constants";
import { DiscountType } from "@/app/generated/prisma/client";
import { Ticket } from "lucide-react";
import { ViewTransition } from "react";
import { DiscountRowActions } from "./discount-row-actions";
import { DiscountsSelectionToolbar } from "./discounts-selection-toolbar";
import { DiscountsTableSelectionCell } from "./discounts-table-selection-cell";
import { CreateDiscountButton } from "./create-discount-button";

interface DiscountsDataTableProps {
	discountsPromise: Promise<GetDiscountsReturn>;
}

export async function DiscountsDataTable({
	discountsPromise,
}: DiscountsDataTableProps) {
	const { discounts, pagination } = await discountsPromise;
	const discountIds = discounts.map((discount) => discount.id);
	const discountsData = discounts.map((discount) => ({
		id: discount.id,
		code: discount.code,
		usageCount: discount.usageCount,
	}));

	// Helper pour formater les prix en euros (format français)
	const formatPrice = (priceInCents: number) => {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "EUR",
		}).format(priceInCents / 100);
	};

	const formatValue = (type: DiscountType, value: number) => {
		if (type === DiscountType.PERCENTAGE) {
			return `${value}%`;
		}
		return formatPrice(value);
	};

	const formatUsage = (usageCount: number, maxUsageCount: number | null) => {
		if (maxUsageCount === null) {
			return `${usageCount} / ∞`;
		}
		return `${usageCount} / ${maxUsageCount}`;
	};

	const formatDateRange = (startsAt: Date, endsAt: Date | null) => {
		const start = new Date(startsAt).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "short",
		});
		if (!endsAt) {
			return `Depuis ${start}`;
		}
		const end = new Date(endsAt).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "short",
		});
		return `${start} → ${end}`;
	};

	const isExpired = (endsAt: Date | null) => {
		if (!endsAt) return false;
		return new Date(endsAt) < new Date();
	};

	if (discounts.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Ticket />
					</EmptyMedia>
					<EmptyTitle>Aucun code promo trouvé</EmptyTitle>
					<EmptyDescription>
						Aucun code promo ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<CreateDiscountButton />
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<DiscountsSelectionToolbar
					discountIds={discountIds}
					discounts={discountsData}
				/>
				<div className="overflow-x-auto">
					<Table role="table" aria-label="Liste des codes promo" className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead key="select" scope="col" role="columnheader" className="w-[5%]">
									<DiscountsTableSelectionCell
										type="header"
										discountIds={discountIds}
									/>
								</TableHead>
								<TableHead
									key="code"
									scope="col"
									role="columnheader"
									className="w-[20%]"
								>
									Code
								</TableHead>
								<TableHead
									key="type"
									scope="col"
									role="columnheader"
									className="hidden sm:table-cell w-[15%]"
								>
									Type
								</TableHead>
								<TableHead
									key="value"
									scope="col"
									role="columnheader"
									className="w-[12%]"
								>
									Valeur
								</TableHead>
								<TableHead
									key="usage"
									scope="col"
									role="columnheader"
									className="hidden md:table-cell w-[15%] text-center"
								>
									Utilisations
								</TableHead>
								<TableHead
									key="validity"
									scope="col"
									role="columnheader"
									className="hidden lg:table-cell w-[18%]"
								>
									Validité
								</TableHead>
								<TableHead
									key="status"
									scope="col"
									role="columnheader"
									className="w-[10%] text-center"
								>
									Statut
								</TableHead>
								<TableHead
									key="actions"
									scope="col"
									role="columnheader"
									className="w-[10%] text-right"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
								{discounts.map((discount) => {
								const expired = isExpired(discount.endsAt);

								return (
									<TableRow key={discount.id}>
										<TableCell role="gridcell">
											<DiscountsTableSelectionCell
												type="row"
												discountId={discount.id}
											/>
										</TableCell>
										<TableCell role="gridcell">
											<ViewTransition name={`admin-discount-${discount.id}`}>
												<code className="font-mono text-sm font-semibold bg-muted px-2 py-1 rounded">
													{discount.code}
												</code>
											</ViewTransition>
										</TableCell>
										<TableCell role="gridcell" className="hidden sm:table-cell">
											<span className="text-sm text-muted-foreground">
												{DISCOUNT_TYPE_LABELS[discount.type]}
											</span>
										</TableCell>
										<TableCell role="gridcell">
											<span className="text-sm font-medium">
												{formatValue(discount.type, discount.value)}
											</span>
										</TableCell>
										<TableCell role="gridcell" className="hidden md:table-cell text-center">
											<span className="text-sm">
												{formatUsage(discount.usageCount, discount.maxUsageCount)}
											</span>
										</TableCell>
										<TableCell role="gridcell" className="hidden lg:table-cell">
											<span className="text-sm text-muted-foreground">
												{formatDateRange(discount.startsAt, discount.endsAt)}
											</span>
										</TableCell>
										<TableCell role="gridcell" className="text-center">
											{expired ? (
												<Badge variant="outline" className="text-muted-foreground">
													Expiré
												</Badge>
											) : discount.isActive ? (
												<Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
													Actif
												</Badge>
											) : (
												<Badge variant="secondary">
													Inactif
												</Badge>
											)}
										</TableCell>
										<TableCell role="gridcell">
											<div className="flex justify-end">
												<DiscountRowActions
													discount={discount}
												/>
											</div>
										</TableCell>
									</TableRow>
								);
								})}
						</TableBody>
					</Table>
				</div>

				<div className="mt-4">
					<CursorPagination
						perPage={discounts.length}
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
