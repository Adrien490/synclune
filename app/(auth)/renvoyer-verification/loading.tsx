import { Skeleton } from "@/shared/components/ui/skeleton";

export default function ResendVerificationLoading() {
	return (
		<div className="relative">
			{/* Lien retour skeleton */}
			<div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
				<Skeleton className="h-[44px] w-[180px]" />
			</div>

			{/* Logo skeleton */}
			<div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
				<Skeleton className="h-[44px] w-[44px] rounded-full" />
			</div>

			{/* Contenu principal */}
			<div className="relative z-10 min-h-screen flex justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="w-full max-w-md space-y-8 my-auto">
					{/* Header skeleton */}
					<div className="text-center space-y-7">
						<div className="space-y-3">
							<Skeleton className="h-9 w-3/4 mx-auto" />
							<Skeleton className="h-5 w-full" />
						</div>
					</div>

					{/* Card skeleton */}
					<div className="space-y-6">
						<div className="rounded-lg border bg-card p-6 shadow-sm">
							<div className="flex items-start gap-3 mb-4">
								<Skeleton className="h-5 w-5 shrink-0" />
								<div className="space-y-1 flex-1">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-full" />
								</div>
							</div>
							{/* Form skeleton */}
							<div className="space-y-4">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						</div>
						<Skeleton className="h-9 w-48 mx-auto" />
					</div>
				</div>
			</div>
		</div>
	);
}
