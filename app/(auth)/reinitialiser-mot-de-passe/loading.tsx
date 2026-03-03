import { Skeleton } from "@/shared/components/ui/skeleton";

export default function ResetPasswordLoading() {
	return (
		<div
			className="bg-background relative min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Chargement"
		>
			<span className="sr-only">Chargement...</span>

			{/* Back link */}
			<div className="absolute top-4 left-4 sm:top-6 sm:left-6">
				<Skeleton className="bg-muted/40 h-5 w-40 rounded" />
			</div>

			{/* Logo */}
			<div className="absolute top-4 right-4 sm:top-6 sm:right-6">
				<Skeleton className="bg-muted/40 h-10 w-10 rounded-full" />
			</div>

			{/* Main content */}
			<div className="flex min-h-screen justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="my-auto w-full max-w-md space-y-8">
					{/* Header */}
					<div className="space-y-7 text-center">
						<div className="space-y-3">
							<Skeleton className="bg-muted/50 mx-auto h-8 w-80" />
							<Skeleton className="bg-muted/30 mx-auto h-5 w-72" />
						</div>
					</div>

					{/* Form */}
					<div className="space-y-6">
						{/* Password field */}
						<div className="space-y-2">
							<Skeleton className="bg-muted/40 h-4 w-36" />
							<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
							<Skeleton className="bg-muted/20 h-1.5 w-full rounded-full" />
						</div>

						{/* Confirm password field */}
						<div className="space-y-2">
							<Skeleton className="bg-muted/40 h-4 w-44" />
							<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
						</div>

						{/* Submit button */}
						<Skeleton className="bg-primary/20 h-11 w-full rounded-md" />

						{/* Footer links */}
						<div className="border-t pt-4 text-center">
							<Skeleton className="bg-muted/30 mx-auto h-4 w-48" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
