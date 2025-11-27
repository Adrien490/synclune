import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Plus } from "lucide-react";

/**
 * Loading skeleton pour la page de liste des variantes
 * Structure: Custom Header + Data Table
 */
export default function ProductVariantsLoading() {
	return (
		<div className="space-y-6">
			{/* Custom Header Section */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-5 w-96" />
				<Button disabled>
					<Plus className="mr-2 h-4 w-4" />
					Nouvelle variante
				</Button>
			</div>

			{/* Data Table */}
			<div className="rounded-md border">
				{/* Table Header */}
				<div className="border-b bg-muted/50 p-4">
					<div className="flex items-center gap-4">
						<Skeleton className="h-4 w-4" />
						<div className="w-[10%]">
							<Skeleton className="h-4 w-12" />
						</div>
						<div className="flex-1">
							<Skeleton className="h-4 w-32" />
						</div>
						<div className="w-[10%] text-center">
							<Skeleton className="h-4 w-16 mx-auto" />
						</div>
						<div className="w-[10%] text-center">
							<Skeleton className="h-4 w-12 mx-auto" />
						</div>
						<div className="w-[8%]">
							<Skeleton className="h-4 w-16 ml-auto" />
						</div>
					</div>
				</div>

				{/* Table Rows */}
				<div className="divide-y">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="p-4">
							<div className="flex items-center gap-4">
								{/* Checkbox */}
								<Skeleton className="h-4 w-4" />

								{/* Image */}
								<div className="w-[10%]">
									<Skeleton className="h-12 w-12 rounded-md" />
								</div>

								{/* Variant Info (Color + Material + Size) */}
								<div className="flex-1 space-y-1">
									<div className="flex items-center gap-2">
										<Skeleton className="h-4 w-4 rounded-full" />
										<Skeleton className="h-4 w-24" />
									</div>
									<Skeleton className="h-3 w-32" />
								</div>

								{/* Active Toggle */}
								<div className="w-[10%] flex justify-center">
									<Skeleton className="h-6 w-11 rounded-full" />
								</div>

								{/* Stock */}
								<div className="w-[10%] flex justify-center">
									<Skeleton className="h-4 w-8" />
								</div>

								{/* Actions */}
								<div className="w-[8%] flex justify-end">
									<Skeleton className="h-8 w-8 rounded-md" />
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Pagination */}
				<div className="border-t p-4">
					<div className="flex items-center justify-between">
						<Skeleton className="h-4 w-40" />
						<div className="flex items-center gap-2">
							<Skeleton className="h-9 w-24" />
							<Skeleton className="h-9 w-24" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
