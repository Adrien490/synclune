import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";

/**
 * Loading skeleton pour la page detail commande admin
 */
export default function OrderDetailLoading() {
	return (
		<div className="space-y-6">
			{/* Bouton retour mobile */}
			<Link
				href="/admin/ventes/commandes"
				className="md:hidden flex items-center gap-1 text-sm text-muted-foreground"
			>
				<ChevronLeft className="h-4 w-4" aria-hidden="true" />
				Retour aux commandes
			</Link>

			{/* Breadcrumb */}
			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/ventes/commandes">Commandes</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<Skeleton className="h-4 w-24" />
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-32" />
				</div>
				<div className="flex flex-wrap gap-2">
					<Skeleton className="h-9 w-24" />
					<Skeleton className="h-9 w-24" />
					<Skeleton className="h-9 w-24" />
				</div>
			</div>

			{/* Progress Stepper */}
			<div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="flex items-center gap-2">
						<Skeleton className="h-8 w-8 rounded-full" />
						<Skeleton className="h-4 w-16 hidden sm:block" />
					</div>
				))}
			</div>

			{/* Status Badges */}
			<div className="flex flex-wrap gap-2">
				<Skeleton className="h-6 w-24 rounded-full" />
				<Skeleton className="h-6 w-28 rounded-full" />
				<Skeleton className="h-6 w-20 rounded-full" />
			</div>

			{/* Grid */}
			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column - 2/3 */}
				<div className="lg:col-span-2 space-y-6">
					{/* Order Items Card */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-32" />
						</CardHeader>
						<CardContent className="space-y-4">
							{Array.from({ length: 3 }).map((_, i) => (
								<div key={i} className="flex gap-4 py-2">
									<Skeleton className="h-16 w-16 rounded-md" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-48" />
										<Skeleton className="h-3 w-32" />
									</div>
									<Skeleton className="h-4 w-16" />
								</div>
							))}
							<div className="border-t pt-4 space-y-2">
								<div className="flex justify-between">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-4 w-16" />
								</div>
								<div className="flex justify-between">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-16" />
								</div>
								<div className="flex justify-between">
									<Skeleton className="h-5 w-16 font-medium" />
									<Skeleton className="h-5 w-20" />
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Right column - 1/3 */}
				<div className="space-y-6">
					{/* Customer Card */}
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-24" />
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded-full" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-40" />
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Refunds Card */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-8 w-24" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-4 w-full" />
						</CardContent>
					</Card>

					{/* Address Card */}
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-36" />
						</CardHeader>
						<CardContent className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-48" />
							<Skeleton className="h-4 w-24" />
						</CardContent>
					</Card>

					{/* Payment Card */}
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-24" />
						</CardHeader>
						<CardContent className="space-y-2">
							<Skeleton className="h-4 w-40" />
							<Skeleton className="h-4 w-32" />
						</CardContent>
					</Card>

					{/* History Timeline */}
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-28" />
						</CardHeader>
						<CardContent className="space-y-4">
							{Array.from({ length: 3 }).map((_, i) => (
								<div key={i} className="flex gap-3">
									<Skeleton className="h-4 w-4 rounded-full" />
									<div className="space-y-1 flex-1">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-24" />
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
