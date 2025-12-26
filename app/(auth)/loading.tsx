import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for auth pages (login/signup/forgot-password/etc.)
 * Matches the real layout: back link, Logo in top right, centered form
 */
export default function AuthLoading() {
	return (
		<div
			className="relative min-h-screen bg-background"
			role="status"
			aria-busy="true"
			aria-label="Chargement"
		>
			<span className="sr-only">Chargement...</span>

			{/* Back link */}
			<div className="absolute top-4 left-4 sm:top-6 sm:left-6">
				<Skeleton className="h-5 w-32 bg-muted/40 rounded" />
			</div>

			{/* Logo en haut à droite */}
			<div className="absolute top-4 right-4 sm:top-6 sm:right-6">
				<Skeleton className="h-10 w-10 rounded-full bg-muted/40" />
			</div>

			{/* Main content */}
			<div className="min-h-screen flex justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
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
						{/* Social button (Google only) */}
						<div className="space-y-3">
							<Skeleton className="h-11 w-full bg-muted/30 rounded-md" />
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

						{/* Form fields - Matches sign-up form structure */}
						<div className="space-y-4">
							{/* Name */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-16 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>
							{/* Email */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-12 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
								<Skeleton className="h-3 w-80 bg-muted/20" />
							</div>
							{/* Password */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-28 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
								<Skeleton className="h-1.5 w-full bg-muted/20 rounded-full" />
							</div>
							{/* Confirm password */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-44 bg-muted/40" />
								<Skeleton className="h-10 w-full bg-muted/30 rounded-md" />
							</div>
						</div>

						{/* Terms checkbox */}
						<div className="flex items-center gap-2">
							<Skeleton className="h-4 w-4 bg-muted/40 rounded" />
							<Skeleton className="h-4 w-72 bg-muted/30" />
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
