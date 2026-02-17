import { PageHeader } from "@/shared/components/page-header";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";
import { CustomizationRequestList } from "@/modules/customizations/components/customer/customization-request-list";
import { getUserCustomizationRequests } from "@/modules/customizations/data/get-user-customization-requests";
import { Suspense } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Mes demandes de personnalisation | Synclune",
	description: "Suivez l'avancement de vos demandes de personnalisation",
	robots: {
		index: false,
		follow: true,
	},
};

function CustomizationRequestListSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div className="space-y-2">
					<Skeleton className="h-7 w-36 bg-muted/50" />
					<Skeleton className="h-4 w-72 bg-muted/30" />
				</div>
				<Skeleton className="h-9 w-36 bg-muted/40" />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{[...Array(4)].map((_, i) => (
					<div
						key={i}
						className="rounded-lg border bg-card p-6 space-y-3"
					>
						<div className="flex items-start justify-between">
							<div className="space-y-2">
								<Skeleton className="h-5 w-40 bg-muted/50" />
								<Skeleton className="h-3 w-28 bg-muted/30" />
							</div>
							<Skeleton className="h-5 w-20 bg-muted/40 rounded-full" />
						</div>
						<Skeleton className="h-12 w-full bg-muted/30" />
					</div>
				))}
			</div>
		</div>
	);
}

export default function CustomizationRequestsPage() {
	const requestsPromise = getUserCustomizationRequests();

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mes demandes"
				description="Suivez l'avancement de vos demandes de personnalisation"
				breadcrumbs={[
					{ label: "Mon compte", href: "/compte" },
					{ label: "Mes demandes", href: "/mes-demandes" },
				]}
			/>

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<Suspense fallback={<CustomizationRequestListSkeleton />}>
						<CustomizationRequestList
							requestsPromise={requestsPromise}
						/>
					</Suspense>
				</div>
			</section>
		</div>
	);
}
