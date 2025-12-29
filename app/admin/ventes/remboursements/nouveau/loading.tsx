import { ArrowLeft, Package, RotateCcw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";

/**
 * Loading skeleton pour la page de creation de remboursement
 */
export default function NewRefundLoading() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="sm" disabled>
					<ArrowLeft className="h-4 w-4" />
					Retour
				</Button>
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Nouveau remboursement
					</h1>
					<Skeleton className="h-4 w-48 mt-1" />
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column - Items selection */}
				<div className="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Package className="h-5 w-5" />
									Articles a rembourser
								</CardTitle>
								<CardDescription>
									Selectionnez les articles et quantites
								</CardDescription>
							</div>
							<Skeleton className="h-9 w-32" />
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={i}
										className="flex items-start gap-4 p-4 border rounded-lg"
									>
										<Skeleton className="h-4 w-4 mt-1" />
										<Skeleton className="h-16 w-16 rounded-md" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-5 w-48" />
											<Skeleton className="h-4 w-32" />
											<div className="flex items-center gap-4">
												<Skeleton className="h-8 w-24" />
												<Skeleton className="h-4 w-20" />
											</div>
										</div>
										<Skeleton className="h-5 w-16" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Right column - Summary */}
				<div className="space-y-6">
					{/* Reason */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Motif du remboursement</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-12 w-full rounded" />
						</CardContent>
					</Card>

					{/* Note */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Note (optionnel)</CardTitle>
						</CardHeader>
						<CardContent>
							<Skeleton className="h-20 w-full" />
						</CardContent>
					</Card>

					{/* Summary */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Recapitulatif</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex justify-between">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-8" />
							</div>
							<div className="flex justify-between">
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-4 w-16" />
							</div>
							<Separator />
							<div className="flex justify-between">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-4 w-16" />
							</div>
							<div className="flex justify-between">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-16" />
							</div>
						</CardContent>
					</Card>

					{/* Submit */}
					<Button className="w-full" disabled>
						<RotateCcw className="h-4 w-4" />
						Creer la demande
					</Button>
				</div>
			</div>
		</div>
	);
}
