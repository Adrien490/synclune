import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";

/**
 * Skeleton pour la table d'inventaire
 * Reproduit exactement la structure de InventoryDataTable pour éviter le CLS
 */
export function InventoryDataTableSkeleton() {
	return (
		<Card>
			<CardContent>
				<div className="overflow-x-auto">
					<Table className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead className="hidden sm:table-cell w-[12%] lg:w-[8%]">
									Image
								</TableHead>
								<TableHead className="w-auto sm:w-[35%] lg:w-[25%]">
									Produit
								</TableHead>
								<TableHead className="hidden sm:table-cell w-[15%] lg:w-[12%]">
									Couleur
								</TableHead>
								<TableHead className="hidden lg:table-cell w-[12%]">
									Matériau
								</TableHead>
								<TableHead className="text-center w-[15%] sm:w-[10%]">
									Stock
								</TableHead>
								<TableHead className="hidden sm:table-cell text-right w-[12%]">
									Prix
								</TableHead>
								<TableHead className="w-12 sm:w-[10%] lg:w-[8%]">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 10 }).map((_, i) => (
								<TableRow key={i}>
									{/* Image - 80x80 */}
									<TableCell className="hidden sm:table-cell py-3">
										<Skeleton className="h-20 w-20 rounded-md" />
									</TableCell>
									{/* Produit */}
									<TableCell>
										<div className="space-y-1.5 overflow-hidden">
											<Skeleton className="h-5 w-40" />
											<Skeleton className="h-4 w-28" />
										</div>
									</TableCell>
									{/* Couleur */}
									<TableCell className="hidden sm:table-cell">
										<div className="flex items-center gap-2">
											<Skeleton className="h-5 w-5 rounded-full shrink-0" />
											<Skeleton className="h-4 w-20" />
										</div>
									</TableCell>
									{/* Matériau */}
									<TableCell className="hidden lg:table-cell">
										<Skeleton className="h-4 w-20" />
									</TableCell>
									{/* Stock */}
									<TableCell className="text-center">
										<Skeleton className="h-6 w-10 rounded-full mx-auto" />
									</TableCell>
									{/* Prix */}
									<TableCell className="hidden sm:table-cell text-right">
										<Skeleton className="h-4 w-16 ml-auto" />
									</TableCell>
									{/* Actions */}
									<TableCell className="text-right">
										<Skeleton className="h-8 w-8 ml-auto" />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				{/* Pagination skeleton */}
				<div className="mt-4 flex items-center justify-between">
					<Skeleton className="h-4 w-32" />
					<div className="flex gap-2">
						<Skeleton className="h-8 w-24" />
						<Skeleton className="h-8 w-24" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
