import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";

export default function OrderDetailLoading() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Chargement..."
				description="Détails et suivi de votre commande"
				breadcrumbs={[
					{ label: "Mon compte", href: "/compte" },
					{ label: "Commandes", href: "/commandes" },
					{ label: "...", href: "/commandes" },
				]}
				action={
					<Button variant="outline" asChild>
						<Link href="/commandes">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Retour
						</Link>
					</Button>
				}
			/>

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-3 gap-6">
						{/* Main content */}
						<div className="lg:col-span-2 space-y-6">
							{/* Timeline skeleton */}
							<Card>
								<CardHeader>
									<Skeleton className="h-6 w-40" />
								</CardHeader>
								<CardContent>
									<div className="space-y-6">
										{Array.from({ length: 5 }).map((_, i) => (
											<div key={i} className="flex gap-4">
												<Skeleton className="h-8 w-8 rounded-full" />
												<div className="space-y-2">
													<Skeleton className="h-4 w-32" />
													<Skeleton className="h-3 w-24" />
												</div>
											</div>
										))}
									</div>
								</CardContent>
							</Card>

							{/* Items skeleton */}
							<Card>
								<CardHeader>
									<Skeleton className="h-6 w-48" />
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{Array.from({ length: 3 }).map((_, i) => (
											<div key={i} className="flex gap-4">
												<Skeleton className="h-20 w-20 rounded-lg" />
												<div className="flex-1 space-y-2">
													<Skeleton className="h-4 w-3/4" />
													<Skeleton className="h-3 w-1/2" />
													<Skeleton className="h-3 w-1/4" />
												</div>
												<Skeleton className="h-4 w-16" />
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							{/* Summary skeleton */}
							<Card>
								<CardHeader>
									<Skeleton className="h-6 w-32" />
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										{Array.from({ length: 4 }).map((_, i) => (
											<div key={i} className="flex justify-between">
												<Skeleton className="h-4 w-20" />
												<Skeleton className="h-4 w-16" />
											</div>
										))}
									</div>
								</CardContent>
							</Card>

							{/* Addresses skeleton */}
							<Card>
								<CardHeader>
									<Skeleton className="h-6 w-24" />
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-full" />
										<Skeleton className="h-3 w-3/4" />
										<Skeleton className="h-3 w-1/2" />
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
