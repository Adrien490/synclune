import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { CustomizationRequestList } from "@/modules/customizations/components/customer/customization-request-list"
import { getUserCustomizationRequests } from "@/modules/customizations/data/get-user-customization-requests"
import { PageHeader } from "@/shared/components/page-header"
import { Button } from "@/shared/components/ui/button"
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton"

export const metadata: Metadata = {
	title: "Mes demandes",
}

function CustomizationRequestListSkeleton() {
	return (
		<SkeletonGroup label="Chargement des demandes">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={i}
						className="rounded-xl border border-border bg-card p-6 space-y-3"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="space-y-2 flex-1">
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-3 w-24" />
							</div>
							<Skeleton className="h-5 w-16 rounded-full" />
						</div>
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
					</div>
				))}
			</div>
		</SkeletonGroup>
	)
}

export default async function MesDemandesPage() {
	const requestsPromise = getUserCustomizationRequests()

	return (
		<>
			<PageHeader
				title="Mes demandes"
				variant="compact"
				actions={
					<Button asChild size="sm">
						<Link href="/personnalisation">Nouvelle demande</Link>
					</Button>
				}
			/>

			<Suspense fallback={<CustomizationRequestListSkeleton />}>
				<CustomizationRequestList requestsPromise={requestsPromise} />
			</Suspense>
		</>
	)
}
