import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for auth pages (login/signup/forgot-password/etc.)
 * Matches the real layout: back link, Logo in top right, centered form
 */
export default function AuthLoading() {
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
				<Skeleton className="bg-muted/40 h-5 w-32 rounded" />
			</div>

			{/* Logo en haut à droite */}
			<div className="absolute top-4 right-4 sm:top-6 sm:right-6">
				<Skeleton className="bg-muted/40 h-10 w-10 rounded-full" />
			</div>

			{/* Main content */}
			<div className="flex min-h-screen justify-center px-4 pt-16 pb-8 sm:pt-20 sm:pb-12">
				<div className="my-auto w-full max-w-md space-y-8">
					{/* Header */}
					<div className="space-y-7 text-center">
						{/* Title and description */}
						<div className="space-y-3">
							<Skeleton className="bg-muted/50 mx-auto h-8 w-64" />
							<Skeleton className="bg-muted/30 mx-auto h-5 w-80" />
						</div>
					</div>

					{/* Formulaires */}
					<div className="space-y-6">
						{/* Social button (Google only) */}
						<div className="space-y-3">
							<Skeleton className="bg-muted/30 h-11 w-full rounded-md" />
						</div>

						{/* Divider */}
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<Skeleton className="bg-border h-px w-full" />
							</div>
							<div className="relative flex justify-center">
								<Skeleton className="bg-background h-4 w-32 px-2" />
							</div>
						</div>

						{/* Form fields - Matches sign-up form structure */}
						<div className="space-y-4">
							{/* Name */}
							<div className="space-y-2">
								<Skeleton className="bg-muted/40 h-4 w-16" />
								<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
							</div>
							{/* Email */}
							<div className="space-y-2">
								<Skeleton className="bg-muted/40 h-4 w-12" />
								<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
								<Skeleton className="bg-muted/20 h-3 w-80" />
							</div>
							{/* Password */}
							<div className="space-y-2">
								<Skeleton className="bg-muted/40 h-4 w-28" />
								<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
								<Skeleton className="bg-muted/20 h-1.5 w-full rounded-full" />
							</div>
							{/* Confirm password */}
							<div className="space-y-2">
								<Skeleton className="bg-muted/40 h-4 w-44" />
								<Skeleton className="bg-muted/30 h-10 w-full rounded-md" />
							</div>
						</div>

						{/* Terms checkbox */}
						<div className="flex items-center gap-2">
							<Skeleton className="bg-muted/40 h-4 w-4 rounded" />
							<Skeleton className="bg-muted/30 h-4 w-72" />
						</div>

						{/* Submit button */}
						<Skeleton className="bg-primary/20 h-11 w-full rounded-md" />

						{/* Footer link */}
						<div className="border-t pt-4 text-center">
							<Skeleton className="bg-muted/30 mx-auto h-4 w-64" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
