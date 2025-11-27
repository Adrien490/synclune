import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";

export function RecentOrdersSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-9 w-24" />
			</div>

			<div className="border rounded-lg">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Commande</TableHead>
							<TableHead>Statut</TableHead>
							<TableHead className="hidden sm:table-cell">Date</TableHead>
							<TableHead className="hidden md:table-cell">Articles</TableHead>
							<TableHead className="text-right">Total</TableHead>
							<TableHead className="w-[50px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: 3 }).map((_, i) => (
							<TableRow key={i}>
								<TableCell>
									<Skeleton className="h-5 w-24" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-6 w-24 rounded-full" />
								</TableCell>
								<TableCell className="hidden sm:table-cell">
									<Skeleton className="h-4 w-28" />
								</TableCell>
								<TableCell className="hidden md:table-cell">
									<Skeleton className="h-4 w-20" />
								</TableCell>
								<TableCell className="text-right">
									<Skeleton className="h-5 w-16 ml-auto" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-4" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
