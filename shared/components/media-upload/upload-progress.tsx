"use client";

import { Progress } from "@/shared/components/ui/progress";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";

interface UploadProgressProps {
	/** Progress percentage (0-100) */
	progress: number;
	/** Display variant */
	variant?: "default" | "compact";
	/** Additional CSS classes */
	className?: string;
	/** If true, shows "Traitement..." even at 100% (server processing in progress) */
	isProcessing?: boolean;
}

/**
 * Upload progress display component.
 * Used in media drop zones.
 *
 * Features:
 * - Full accessibility (aria-live, role, aria-busy)
 * - Reduced-motion support
 * - Completion state at 100%
 * - Responsive mobile/desktop
 *
 * Variants:
 * - default: Spinner + progress bar + percentage (for empty dropzone)
 * - compact: Spinner + percentage only (for thumbnail zone in grid)
 */
export function UploadProgress({
	progress,
	variant = "default",
	className,
	isProcessing = false,
}: UploadProgressProps) {
	const shouldReduceMotion = useReducedMotion();
	// Three states: uploading (0-99%), processing (100% + isProcessing), complete (100% + !isProcessing)
	const isComplete = progress >= 100 && !isProcessing;
	const isServerProcessing = progress >= 100 && isProcessing;

	// Accessible text for screen readers
	const srText = isComplete
		? "Téléversement terminé"
		: isServerProcessing
			? "Traitement du fichier en cours"
			: `Téléversement en cours, ${progress} pourcent`;

	if (variant === "compact") {
		return (
			<div
				role="status"
				aria-live="polite"
				aria-busy={!isComplete}
				className={cn("flex flex-col items-center gap-2 sm:gap-1.5", className)}
			>
				{/* Screen reader text */}
				<span className="sr-only">{srText}</span>

				{/* Icon - Spinner or Check */}
				{isComplete ? (
					<div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 sm:h-5 sm:w-5">
						<Check className="h-4 w-4 text-emerald-600 sm:h-3 sm:w-3" aria-hidden="true" />
					</div>
				) : (
					<Loader2
						className={cn(
							"text-primary h-7 w-7 sm:h-5 sm:w-5",
							!shouldReduceMotion && "animate-spin",
						)}
						aria-hidden="true"
					/>
				)}

				{/* Percentage or state */}
				<span
					className={cn(
						"text-sm font-medium sm:text-xs",
						isComplete ? "text-emerald-600" : "text-foreground/70",
						!isServerProcessing && "tabular-nums",
					)}
					aria-hidden="true"
				>
					{isComplete ? "OK" : isServerProcessing ? "Traitement..." : `${progress}%`}
				</span>
			</div>
		);
	}

	return (
		<div
			role="status"
			aria-live="polite"
			aria-busy={!isComplete}
			className={cn(
				"flex w-full max-w-60 flex-col items-center gap-4 sm:max-w-50 sm:gap-3",
				className,
			)}
		>
			{/* Screen reader text */}
			<span className="sr-only">{srText}</span>

			{/* Icon - Spinner or Check */}
			{isComplete ? (
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 sm:h-10 sm:w-10">
					<Check className="h-6 w-6 text-emerald-600 sm:h-5 sm:w-5" aria-hidden="true" />
				</div>
			) : (
				<Loader2
					className={cn(
						"text-primary h-10 w-10 sm:h-8 sm:w-8",
						!shouldReduceMotion && "animate-spin",
					)}
					aria-hidden="true"
				/>
			)}

			{/* Progress bar + text */}
			<div className="w-full space-y-2 sm:space-y-1.5">
				<Progress
					value={progress}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={progress}
					aria-label="Progression du téléversement"
					className={cn(
						"h-2 sm:h-1.5",
						isComplete && "[&>[data-slot=progress-indicator]]:bg-emerald-500",
					)}
				/>
				<p
					className={cn(
						"text-center text-base font-medium sm:text-sm",
						isComplete ? "text-emerald-600" : "text-foreground",
						!isServerProcessing && "tabular-nums",
					)}
					aria-hidden="true"
				>
					{isComplete
						? "Terminé"
						: isServerProcessing
							? "Traitement..."
							: `Téléversement... ${progress}%`}
				</p>
			</div>
		</div>
	);
}
