"use client";

import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";
import { AlertTriangle, Check, LoaderCircle, RefreshCw, X } from "lucide-react";

export type UploadPhase = "validating" | "uploading" | "generating-thumbnails" | "done";

interface UploadProgressProps {
	/** Progress percentage (0-100) */
	progress: number;
	/** Display variant */
	variant?: "default" | "compact";
	/** Additional CSS classes */
	className?: string;
	/** If true, shows "Traitement..." even at 100% (server processing in progress) */
	isProcessing?: boolean;
	/** Number of files waiting in queue */
	queuedCount?: number;
	/** Current upload phase — drives the status label */
	phase?: UploadPhase;
	/** Currently processed file name — shown in default variant */
	currentFileName?: string;
	/** If provided, renders a 44px cancel button (X icon) — variant default only */
	onCancel?: () => void;
}

/**
 * Upload progress display component.
 * Used in media drop zones.
 */
export function UploadProgress({
	progress,
	variant = "default",
	className,
	isProcessing = false,
	queuedCount = 0,
	phase,
	currentFileName,
	onCancel,
}: UploadProgressProps) {
	const shouldReduceMotion = useReducedMotion();
	const haptic = useHaptic();
	const isComplete = progress >= 100 && !isProcessing && phase !== "generating-thumbnails";
	const isThumbnailing = phase === "generating-thumbnails";
	const isServerProcessing = (progress >= 100 && isProcessing) || isThumbnailing;

	const handleCancel = () => {
		haptic("medium");
		onCancel?.();
	};

	const queueText = queuedCount > 0 ? `, ${queuedCount} en attente` : "";
	const srText = isComplete
		? "Téléversement terminé"
		: isThumbnailing
			? "Génération des miniatures vidéo en cours"
			: isServerProcessing
				? "Traitement du fichier en cours"
				: `Téléversement en cours, ${progress} pourcent${queueText}`;

	const phaseLabel = isComplete
		? "Terminé"
		: isThumbnailing
			? "Génération des miniatures…"
			: isServerProcessing
				? "Traitement…"
				: `Téléversement… ${progress}%`;

	if (variant === "compact") {
		return (
			<div
				role="status"
				aria-live="polite"
				aria-busy={!isComplete}
				className={cn("flex flex-col items-center gap-2 sm:gap-1.5", className)}
			>
				<span className="sr-only">{srText}</span>

				{isComplete ? (
					<div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 sm:h-5 sm:w-5">
						<Check className="h-4 w-4 text-emerald-600 sm:h-3 sm:w-3" aria-hidden="true" />
					</div>
				) : (
					<LoaderCircle
						className={cn(
							"text-primary h-7 w-7 sm:h-5 sm:w-5",
							!shouldReduceMotion && "animate-spin",
						)}
						aria-hidden="true"
					/>
				)}

				<span
					className={cn(
						"text-sm font-medium sm:text-xs",
						isComplete ? "text-emerald-600" : "text-foreground/70",
						!isServerProcessing && "tabular-nums",
					)}
					aria-hidden="true"
				>
					{isComplete ? "OK" : isServerProcessing ? "Traitement…" : `${progress}%`}
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
			<span className="sr-only">{srText}</span>

			{isComplete ? (
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 sm:h-10 sm:w-10">
					<Check className="h-6 w-6 text-emerald-600 sm:h-5 sm:w-5" aria-hidden="true" />
				</div>
			) : (
				<LoaderCircle
					className={cn(
						"text-primary h-10 w-10 sm:h-8 sm:w-8",
						!shouldReduceMotion && "animate-spin",
					)}
					aria-hidden="true"
				/>
			)}

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
					{phaseLabel}
				</p>
				{currentFileName && !isComplete && (
					<p
						className="text-muted-foreground truncate text-center text-xs"
						aria-hidden="true"
						title={currentFileName}
					>
						{currentFileName}
					</p>
				)}
				{queuedCount > 0 && !isComplete && (
					<p className="text-muted-foreground text-center text-xs" aria-hidden="true">
						+{queuedCount} en attente
					</p>
				)}
			</div>

			{onCancel && !isComplete && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleCancel}
					className="h-11 min-w-11 gap-1.5 px-3"
					aria-label="Annuler l'upload"
				>
					<X className="h-4 w-4" aria-hidden="true" />
					<span className="text-xs">Annuler</span>
				</Button>
			)}
		</div>
	);
}

interface UploadErrorBannerProps {
	/** List of failed files */
	failedFiles: { fileName: string; error: string }[];
	/** Triggered when user clicks the retry CTA */
	onRetry: () => void;
	/** Triggered when user dismisses the banner */
	onDismiss: () => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Banner displayed when one or more uploads failed.
 * Lists file names + provides a retry CTA.
 * 44px minimum touch targets, role=alert.
 */
export function UploadErrorBanner({
	failedFiles,
	onRetry,
	onDismiss,
	className,
}: UploadErrorBannerProps) {
	const haptic = useHaptic();
	if (failedFiles.length === 0) return null;

	const handleRetry = () => {
		haptic("medium");
		onRetry();
	};

	const handleDismiss = () => {
		haptic("light");
		onDismiss();
	};

	const count = failedFiles.length;
	const previewNames = failedFiles
		.slice(0, 3)
		.map((f) => f.fileName)
		.join(", ");
	const suffix = count > 3 ? ` et ${count - 3} autre(s)` : "";

	return (
		<div
			role="alert"
			aria-live="assertive"
			className={cn(
				"border-destructive/40 bg-destructive/5 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
				className,
			)}
		>
			<div className="flex items-start gap-2 sm:items-center">
				<AlertTriangle
					className="text-destructive mt-0.5 size-5 shrink-0 sm:mt-0"
					aria-hidden="true"
				/>
				<div className="min-w-0">
					<p className="text-destructive text-sm font-medium">
						{count} fichier{count > 1 ? "s" : ""} en échec
					</p>
					<p className="text-muted-foreground truncate text-xs" title={previewNames}>
						{previewNames}
						{suffix}
					</p>
				</div>
			</div>
			<div className="flex shrink-0 gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleRetry}
					className="min-h-11 gap-1.5"
				>
					<RefreshCw className="size-3.5" aria-hidden="true" />
					Réessayer
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={handleDismiss}
					className="size-11"
					aria-label="Ignorer les erreurs d'upload"
				>
					<X className="size-4" aria-hidden="true" />
				</Button>
			</div>
		</div>
	);
}
