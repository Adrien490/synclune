import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Empty,
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
import type { GetSkuStocksReturn } from "@/modules/products/data/get-sku-stocks";
import { cn } from "@/shared/utils/cn";
import { Boxes } from "lucide-react";
import { ViewTransition } from "react";
import { InventoryRowActions } from "./inventory-row-actions";
import { InventorySelectionToolbar } from "./inventory-selection-toolbar";
import { InventoryTableSelectionCell } from "./inventory-table-selection-cell";

interface InventoryDataTableProps {
	inventoryPromise: Promise<GetSkuStocksReturn>;
}

export async function InventoryDataTable({
	inventoryPromise,
}: InventoryDataTableProps) {
	const { items, pagination } = await inventoryPromise;
	const inventoryIds = items.map((item) => item.id);

	if (items.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Boxes />
					</EmptyMedia>
					<EmptyTitle>Aucun produit trouvé</EmptyTitle>
					<EmptyDescription>
						Aucun produit ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<InventorySelectionToolbar inventoryIds={inventoryIds} />
				<div className="overflow-x-auto">
					<Table role="table" aria-label="Liste de l'inventaire" className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead scope="col" className="w-[5%]">
									<InventoryTableSelectionCell
										type="header"
										inventoryIds={inventoryIds}
									/>
								</TableHead>
								<TableHead scope="col" className="w-[35%] sm:w-[30%]">Produit</TableHead>
								<TableHead scope="col" className="w-[20%] sm:w-[13%] text-center">
									Stock
								</TableHead>
								<TableHead scope="col" className="w-[20%] sm:w-[16%] text-right">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<ViewTransition name="admin-inventory-table-content">
							<TableBody>
								{items.map((item) => {
								const stockLevel =
									item.inventory < 5
										? "critical"
										: item.inventory < 10
											? "low"
											: item.inventory > 50
												? "high"
												: "normal";

								return (
									<TableRow key={item.id}>
										<TableCell>
											<InventoryTableSelectionCell
												type="row"
												inventoryId={item.id}
											/>
										</TableCell>
										<TableCell>
											<div className="space-y-1">
												<div className="font-medium">{item.product.title}</div>
												<div className="text-sm text-muted-foreground">
													{item.product.type?.label && (
														<Badge variant="outline" className="mr-2">
															{item.product.type.label}
														</Badge>
													)}
													{item.color && (
														<span className="mr-2">{item.color.name}</span>
													)}
													{item.material && <span>{item.material}</span>}
													{item.size && (
														<span className="ml-2">{item.size}</span>
													)}
												</div>
											</div>
										</TableCell>
										<TableCell className="text-center">
											<span
												className={cn(
													"font-medium",
													stockLevel === "critical" && "text-red-600",
													stockLevel === "low" && "text-orange-600",
													stockLevel === "high" && "text-green-600"
												)}
											>
												{item.inventory}
											</span>
										</TableCell>
										<TableCell className="text-right">
											<InventoryRowActions item={item} />
										</TableCell>
									</TableRow>
								);
								})}
							</TableBody>
						</ViewTransition>
					</Table>
				</div>

				<div className="mt-4">
					<CursorPagination
						perPage={items.length}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={items.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
