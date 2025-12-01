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
 * Skeleton pour la table des notifications de stock
 * Reproduit exactement la structure de StockNotificationsDataTable pour éviter le CLS
 */
export function StockNotificationsDataTableSkeleton() {
	return (
		<Card>
			<CardContent>
				{/* Selection toolbar skeleton */}
				<div className="mb-4 h-10" />

				<div className="overflow-x-auto">
					<Table className="min-w-full">
						<TableHeader>
							<TableRow>
								<TableHead className="w-[5%]">
									<Skeleton className="h-4 w-4" />
								</TableHead>
								<TableHead className="w-[22%]">Produit</TableHead>
								<TableHead className="w-[13%]">Variante</TableHead>
								<TableHead className="w-[18%]">Email</TableHead>
								<TableHead className="w-[10%]">Statut</TableHead>
								<TableHead className="w-[8%] text-center">Stock</TableHead>
								<TableHead className="hidden sm:table-cell w-[12%]">Date</TableHead>
								<TableHead className="w-[6%] text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 10 }).map((_, i) => (
								<TableRow key={i}>
									{/* Checkbox */}
									<TableCell>
										<Skeleton className="h-4 w-4" />
									</TableCell>
									{/* Produit (image + nom) */}
									<TableCell>
										<div className="flex items-center gap-3">
											<Skeleton className="h-10 w-10 rounded-md" />
											<Skeleton className="h-4 w-32" />
										</div>
									</TableCell>
									{/* Variante */}
									<TableCell>
										<div className="flex items-center gap-2">
											<Skeleton className="h-4 w-4 rounded-full" />
											<Skeleton className="h-4 w-16" />
										</div>
									</TableCell>
									{/* Email */}
									<TableCell>
										<Skeleton className="h-4 w-40" />
									</TableCell>
									{/* Statut */}
									<TableCell>
										<Skeleton className="h-5 w-16 rounded-full" />
									</TableCell>
									{/* Stock */}
									<TableCell className="text-center">
										<Skeleton className="h-4 w-8 mx-auto" />
									</TableCell>
									{/* Date */}
									<TableCell className="hidden sm:table-cell">
										<Skeleton className="h-4 w-20" />
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
