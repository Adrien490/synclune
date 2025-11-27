import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for auth pages (login/signup/forgot-password/etc.)
 * Matches the real layout: particle system, back link, Logo in top right, centered form
 */
export default function AuthLoading() {
	return (
		<div
			className="min-h-screen relative overflow-hidden bg-background"
			role="status"
			aria-busy="true"
			aria-label="Chargement"
		>
			<span className="sr-only">Chargement...</span>

			{/* Particle system placeholder */}
			<div className="absolute inset-0 z-0 from-muted/5 via-transparent to-muted/5" />

			{/* Back link */}
			<div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
				<Skeleton className="h-5 w-32 bg-muted/40 rounded" />
			</div>

			{/* Logo en haut à droite */}
			<div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
				<Skeleton className="h-10 w-10 rounded-full bg-muted/40" />
			</div>

			{/* Main content */}
			<div className="relative z-10 min-h-screen flex justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="w-full max-w-md space-y-8 my-auto">
					{/* Header */}
					<div className="text-center space-y-7">
						{/* Title and description */}
						<div className="space-y-3">
							<Skeleton className="h-8 w-64 mx-auto bg-muted/50" />
							<Skeleton className="h-5 w-80 mx-auto bg-muted/30" />
						</div>
					</div>

					{/* Formulaires */}
					<div className="space-y-6">
						{/* Social buttons (login/signup) */}
						<div className="space-y-3">
							{Array.from({ length: 2 }).map((_, i) => (
								<Skeleton
									key={i}
									className="h-11 w-full bg-muted/30 rounded-md"
								/>
							))}
						</div>

						{/* Divider */}
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<Skeleton className="h-px w-full bg-border" />
							</div>
							<div className="relative flex justify-center">
								<Skeleton className="h-4 w-32 bg-background px-2" />
							</div>
						</div>

						{/* Form fields */}
						<div className="space-y-4">
							{Array.from({ length: 2 }).map((_, i) => (
								<div key={i} className="space-y-2">
									<Skeleton className="h-4 w-24 bg-muted/40" />
									<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
								</div>
							))}
						</div>

						{/* Checkbox/Link row (login) */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-4 bg-muted/40 rounded" />
								<Skeleton className="h-4 w-24 bg-muted/30" />
							</div>
							<Skeleton className="h-4 w-40 bg-muted/30" />
						</div>

						{/* Submit button */}
						<Skeleton className="h-11 w-full bg-primary/20 rounded-md" />

						{/* Footer link */}
						<div className="text-center pt-4 border-t">
							<Skeleton className="h-4 w-64 mx-auto bg-muted/30" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
