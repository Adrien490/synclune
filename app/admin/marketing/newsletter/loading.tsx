import { PageHeader } from "@/shared/components/page-header";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Toolbar } from "@/shared/components/toolbar";

/**
 * Loading skeleton pour la page Newsletter
 * Structure: Header + Stats Cards + Tabs (Send Newsletter + Subscribers List)
 */
export default function NewsletterLoading() {
	return (
		<div className="space-y-6">
			{/* Page Header */}
			<PageHeader
				title="Newsletter"
				description="Envoyez des emails à vos abonnés et gérez votre liste de diffusion"
				variant="compact"
			/>

			{/* Statistics Section - 3 cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{/* Total subscribers */}
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div className="space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-8 w-16" />
							</div>
							<Skeleton className="h-10 w-10 rounded-full" />
						</div>
					</CardContent>
				</Card>

				{/* Active subscribers - highlighted */}
				<Card className="border-secondary">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-8 w-16" />
							</div>
							<Skeleton className="h-10 w-10 rounded-full" />
						</div>
					</CardContent>
				</Card>

				{/* Unsubscribed/Inactive */}
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div className="space-y-2">
								<Skeleton className="h-4 w-36" />
								<Skeleton className="h-8 w-16" />
							</div>
							<Skeleton className="h-10 w-10 rounded-full" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Tabs Section */}
			<Tabs defaultValue="send" className="space-y-6">
				<TabsList>
					<TabsTrigger value="send" disabled>
						Envoyer une newsletter
					</TabsTrigger>
					<TabsTrigger value="subscribers" disabled>
						Abonnés (0)
					</TabsTrigger>
				</TabsList>

				{/* Tab 1: Send Newsletter */}
				<TabsContent value="send" className="space-y-6">
					<Card>
						<CardContent className="p-6 space-y-6">
							{/* Header */}
							<div className="space-y-2">
								<Skeleton className="h-6 w-56" />
								<Skeleton className="h-4 w-80" />
							</div>

							{/* Form */}
							<div className="space-y-4">
								{/* Subject */}
								<div className="space-y-2">
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-10 w-full" />
								</div>

								{/* Content */}
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-48 w-full" />
								</div>

								{/* Submit button */}
								<Skeleton className="h-10 w-32" />
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Tab 2: Subscribers List */}
				<TabsContent value="subscribers" className="space-y-6">
					{/* Toolbar */}
					<Toolbar ariaLabel="Barre d'outils de gestion des abonnés">
						<div className="flex flex-1 flex-wrap items-center gap-2">
							{/* Search */}
							<Skeleton className="h-10 w-full sm:max-w-md" />

							{/* Sort */}
							<Skeleton className="h-10 w-full sm:min-w-[180px] sm:max-w-[200px]" />

							{/* Export button */}
							<Skeleton className="h-10 w-[120px]" />
						</div>
					</Toolbar>

					{/* Data Table */}
					<div className="rounded-md border">
						{/* Table Header */}
						<div className="border-b bg-muted/50 p-4">
							<div className="flex items-center gap-4">
								<div className="flex-[0.4]">
									<Skeleton className="h-4 w-12" />
								</div>
								<div className="flex-[0.15]">
									<Skeleton className="h-4 w-16" />
								</div>
								<div className="flex-[0.225]">
									<Skeleton className="h-4 w-32" />
								</div>
								<div className="flex-[0.225]">
									<Skeleton className="h-4 w-28" />
								</div>
							</div>
						</div>

						{/* Table Rows */}
						<div className="divide-y">
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={i} className="p-4">
									<div className="flex items-center gap-4">
										{/* Email */}
										<div className="flex-[0.4]">
											<Skeleton className="h-4 w-48" />
										</div>

										{/* Status */}
										<div className="flex-[0.15]">
											<div className="flex items-center gap-2">
												<Skeleton className="h-4 w-4 rounded-full" />
												<Skeleton className="h-4 w-16" />
											</div>
										</div>

										{/* Subscription Date */}
										<div className="flex-[0.225]">
											<Skeleton className="h-4 w-28" />
										</div>

										{/* Last Updated */}
										<div className="flex-[0.225]">
											<Skeleton className="h-4 w-28" />
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
				</TabsContent>
			</Tabs>
		</div>
	);
}
