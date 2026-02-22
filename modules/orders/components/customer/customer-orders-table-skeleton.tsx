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
		<div className="border rounded-lg overflow-hidden">
			<TableScrollContainer>
				<Table className="min-w-full">
					<TableHeader>
						<TableRow>
							<TableHead className="w-[25%] sm:w-[15%]">Commande</TableHead>
							<TableHead className="hidden sm:table-cell w-[15%]">
								Date
							</TableHead>
							<TableHead className="w-[20%] sm:w-[15%]">Statut</TableHead>
							<TableHead className="hidden lg:table-cell w-[15%]">
								Livraison
							</TableHead>
							<TableHead className="hidden sm:table-cell w-[10%] text-center">
								Articles
							</TableHead>
							<TableHead className="w-[15%] sm:w-[10%] text-right">
								Total
							</TableHead>
							<TableHead className="w-[20%] sm:w-[10%] text-right">
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
								<TableCell className="hidden sm:table-cell text-center">
									<Skeleton className="h-4 w-6 mx-auto" />
								</TableCell>
								<TableCell className="text-right">
									<Skeleton className="h-4 w-16 ml-auto" />
								</TableCell>
								<TableCell className="text-right">
									<Skeleton className="h-8 w-16 ml-auto" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableScrollContainer>
		</div>
	);
}
