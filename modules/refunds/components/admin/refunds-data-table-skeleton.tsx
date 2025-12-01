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

export function RefundsDataTableSkeleton() {
	return (
		<Card>
			<CardContent>
				<div className="overflow-x-auto">
					<Table className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead className="w-[15%]">Commande</TableHead>
								<TableHead className="hidden sm:table-cell w-[12%]">
									Date
								</TableHead>
								<TableHead className="w-[20%]">Client</TableHead>
								<TableHead className="hidden md:table-cell w-[15%]">
									Raison
								</TableHead>
								<TableHead className="w-[12%]">Statut</TableHead>
								<TableHead className="w-[10%]">Montant</TableHead>
								<TableHead className="w-[10%] text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 10 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell>
										<Skeleton className="h-4 w-20" />
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										<Skeleton className="h-4 w-24" />
									</TableCell>
									<TableCell>
										<div className="space-y-1">
											<Skeleton className="h-4 w-32" />
											<Skeleton className="h-3 w-40" />
										</div>
									</TableCell>
									<TableCell className="hidden md:table-cell">
										<Skeleton className="h-4 w-28" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-6 w-20" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-16" />
									</TableCell>
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
