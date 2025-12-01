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

export function DiscountsDataTableSkeleton() {
	return (
		<Card>
			<CardContent>
				<div className="overflow-x-auto">
					<Table className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead className="w-[5%]">
									<Skeleton className="h-4 w-4" />
								</TableHead>
								<TableHead className="w-[20%]">Code</TableHead>
								<TableHead className="hidden sm:table-cell w-[15%]">Type</TableHead>
								<TableHead className="w-[12%]">Valeur</TableHead>
								<TableHead className="hidden md:table-cell w-[15%]">Utilisations</TableHead>
								<TableHead className="hidden lg:table-cell w-[18%]">Validité</TableHead>
								<TableHead className="w-[10%]">Statut</TableHead>
								<TableHead className="w-[10%]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 10 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell>
										<Skeleton className="h-4 w-4" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-6 w-24" />
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										<Skeleton className="h-4 w-20" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-12" />
									</TableCell>
									<TableCell className="hidden md:table-cell">
										<Skeleton className="h-4 w-16" />
									</TableCell>
									<TableCell className="hidden lg:table-cell">
										<Skeleton className="h-4 w-28" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-14" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-8 w-8" />
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
