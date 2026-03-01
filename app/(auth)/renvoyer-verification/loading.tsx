import { Skeleton } from "@/shared/components/ui/skeleton";

export default function ResendVerificationLoading() {
	return (
		<div className="relative">
			{/* Lien retour skeleton */}
			<div className="absolute top-4 left-4 z-20 sm:top-6 sm:left-6">
				<Skeleton className="h-11 w-45" />
			</div>

			{/* Logo skeleton */}
			<div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
				<Skeleton className="h-11 w-11 rounded-full" />
			</div>

			{/* Contenu principal */}
			<div className="relative z-10 flex min-h-screen justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="my-auto w-full max-w-md space-y-8">
					{/* Header skeleton */}
					<div className="space-y-7 text-center">
						<div className="space-y-3">
							<Skeleton className="mx-auto h-9 w-3/4" />
							<Skeleton className="h-5 w-full" />
						</div>
					</div>

					{/* Card skeleton */}
					<div className="space-y-6">
						<div className="bg-card rounded-lg border p-6 shadow-sm">
							<div className="mb-4 flex items-start gap-3">
								<Skeleton className="h-5 w-5 shrink-0" />
								<div className="flex-1 space-y-1">
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
						<Skeleton className="mx-auto h-9 w-48" />
					</div>
				</div>
			</div>
		</div>
	);
}
