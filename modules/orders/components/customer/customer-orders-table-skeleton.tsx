import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";

export function CustomerOrdersTableSkeleton() {
	return (
		<div className="overflow-hidden rounded-lg border">
			<TableScrollContainer>
				<Table className="min-w-full">
					<TableHeader>
						<TableRow>
							<TableHead className="w-[25%] sm:w-[15%]">Commande</TableHead>
							<TableHead className="hidden w-[15%] sm:table-cell">Date</TableHead>
							<TableHead className="w-[20%] sm:w-[15%]">Statut</TableHead>
							<TableHead className="hidden w-[15%] lg:table-cell">Livraison</TableHead>
							<TableHead className="hidden w-[10%] text-center sm:table-cell">Articles</TableHead>
							<TableHead className="w-[15%] text-right sm:w-[10%]">Total</TableHead>
							<TableHead className="w-[20%] text-right sm:w-[10%]">
								<span className="sr-only">Actions</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: 5 }).map((_, index) => (
							<TableRow key={index}>
								<TableCell>
									<Skeleton className="h-4 w-24" />
								</TableCell>
								<TableCell className="hidden sm:table-cell">
									<Skeleton className="h-4 w-20" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-6 w-20 rounded-full" />
								</TableCell>
								<TableCell className="hidden lg:table-cell">
									<Skeleton className="h-6 w-20 rounded-full" />
								</TableCell>
								<TableCell className="hidden text-center sm:table-cell">
									<Skeleton className="mx-auto h-4 w-6" />
								</TableCell>
								<TableCell className="text-right">
									<Skeleton className="ml-auto h-4 w-16" />
								</TableCell>
								<TableCell className="text-right">
									<Skeleton className="ml-auto h-8 w-16" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableScrollContainer>
		</div>
	);
}
