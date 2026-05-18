"use client";

import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import {
	formatBytesShort,
	formatEtaLabel,
	formatSpeedLabel,
} from "@/modules/media/utils/format-eta";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, LoaderCircle, RefreshCw, X } from "lucide-react";
import type { FileProgress } from "@/modules/media/types/hooks.types";

export type UploadPhase =
	| "validating"
	| "compressing"
	| "uploading"
	| "generating-thumbnails"
	| "finalizing"
	| "done";

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
	/** Number of files successfully uploaded — enriches the completion SR announcement */
	completedCount?: number;
	/** Per-file progress entries — when provided, renders a scrollable list (variant default only) */
	files?: FileProgress[];
	/** Bytes uploaded across all files — drives the "X Mo / Y Mo" label (P0.1) */
	bytesUploaded?: number;
	/** Total bytes to upload (P0.1) */
	bytesTotal?: number;
	/** Bytes-per-second over a sliding window — drives the speed label (P1.1) */
	bytesPerSecond?: number | null;
	/** Estimated seconds until completion — drives the ETA label (P1.1) */
	etaSeconds?: number | null;
	/** Per-file cancellation hook — when provided, renders an X button on queued/uploading items (P1.5) */
	onCancelOne?: (fileName: string) => void;
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
	completedCount,
	files,
	bytesUploaded,
	bytesTotal,
	bytesPerSecond,
	etaSeconds,
	onCancelOne,
}: UploadProgressProps) {
	const shouldReduceMotion = useReducedMotion();
	const haptic = useHaptic();
	const isComplete =
		progress >= 100 &&
		!isProcessing &&
		phase !== "generating-thumbnails" &&
		phase !== "compressing" &&
		phase !== "finalizing";
	const isThumbnailing = phase === "generating-thumbnails";
	const isCompressing = phase === "compressing";
	const isFinalizing = phase === "finalizing";
	const isServerProcessing =
		(progress >= 100 && isProcessing) || isThumbnailing || isCompressing || isFinalizing;

	const handleCancel = () => {
		haptic("light");
		onCancel?.();
	};

	const queueText = queuedCount > 0 ? `, ${queuedCount} en attente` : "";
	const completedText =
		completedCount !== undefined && completedCount > 0
			? `${completedCount} fichier${completedCount > 1 ? "s" : ""} envoyé${completedCount > 1 ? "s" : ""}`
			: "Envoi terminé";
	const srText = isComplete
		? completedText
		: isCompressing
			? "Optimisation des clichés en cours"
			: isThumbnailing
				? "Préparation des aperçus vidéo en cours"
				: isFinalizing
					? "Polissage final à l'atelier en cours"
					: isServerProcessing
						? "Optimisation à l'atelier en cours"
						: `Envoi en cours, ${progress} pourcent${queueText}`;

	const phaseLabel = isComplete
		? "Terminé"
		: isCompressing
			? "Optimisation…"
			: isThumbnailing
				? "Préparation des aperçus…"
				: isFinalizing
					? "Polissage à l'atelier…"
					: isServerProcessing
						? "Optimisation à l'atelier…"
						: `Envoi… ${progress}%`;

	const etaLabel = !isComplete && phase === "uploading" ? formatEtaLabel(etaSeconds ?? null) : null;
	const speedLabel =
		!isComplete && phase === "uploading" ? formatSpeedLabel(bytesPerSecond ?? null) : null;
	const bytesLabel =
		!isComplete && phase === "uploading" && bytesTotal && bytesTotal > 0
			? `${formatBytesShort(bytesUploaded ?? 0)} / ${formatBytesShort(bytesTotal)}`
			: null;

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
					<div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/20 sm:size-5">
						<Check className="size-4 text-emerald-600 sm:size-3" aria-hidden="true" />
					</div>
				) : (
					<LoaderCircle
						className={cn("text-primary size-7 sm:size-5", !shouldReduceMotion && "animate-spin")}
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
					{isComplete ? "OK" : isServerProcessing ? "Optimisation…" : `${progress}%`}
				</span>

				{currentFileName && !isComplete && (
					<p
						className="text-muted-foreground text-2xs max-w-[10rem] truncate text-center"
						aria-hidden="true"
						title={currentFileName}
					>
						{currentFileName}
					</p>
				)}
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
				<div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/20 sm:size-10">
					<Check className="size-6 text-emerald-600 sm:size-5" aria-hidden="true" />
				</div>
			) : (
				<LoaderCircle
					className={cn("text-primary size-10 sm:size-8", !shouldReduceMotion && "animate-spin")}
					aria-hidden="true"
				/>
			)}

			<div className="w-full space-y-2 sm:space-y-1.5">
				<Progress
					value={isServerProcessing ? undefined : progress}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={isServerProcessing ? undefined : progress}
					aria-label={isServerProcessing ? "Optimisation à l'atelier" : "Progression de l'envoi"}
					className={cn(
						"h-2 sm:h-1.5",
						isComplete && "[&>[data-slot=progress-indicator]]:bg-emerald-500",
						isServerProcessing &&
							!shouldReduceMotion &&
							"[&>[data-slot=progress-indicator]]:w-1/3 [&>[data-slot=progress-indicator]]:motion-safe:animate-[progress-indeterminate_1.4s_ease-in-out_infinite]",
					)}
				/>
				<AnimatePresence mode="wait" initial={false}>
					<m.p
						key={phaseLabel}
						initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
						transition={{ duration: 0.18 }}
						className={cn(
							"text-center text-base font-medium sm:text-sm",
							isComplete ? "text-emerald-600" : "text-foreground",
							!isServerProcessing && "tabular-nums",
						)}
						aria-hidden="true"
					>
						{phaseLabel}
					</m.p>
				</AnimatePresence>
				{currentFileName && !isComplete && (
					<p
						className="text-muted-foreground truncate text-center text-xs"
						aria-hidden="true"
						title={currentFileName}
					>
						{currentFileName}
					</p>
				)}
				{(bytesLabel ?? etaLabel ?? speedLabel) && (
					<div
						className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 text-center text-xs tabular-nums"
						aria-hidden="true"
					>
						{bytesLabel && <span>{bytesLabel}</span>}
						{etaLabel && (
							<>
								<span aria-hidden="true">•</span>
								<span>{etaLabel}</span>
							</>
						)}
						{speedLabel && (
							<>
								<span aria-hidden="true">•</span>
								<span>{speedLabel}</span>
							</>
						)}
					</div>
				)}
				{queuedCount > 0 && !isComplete && (
					<p className="text-muted-foreground text-center text-xs" aria-hidden="true">
						+{queuedCount} en attente
					</p>
				)}
			</div>

			{files && files.length > 0 && !isComplete && (
				<FileProgressList
					files={files}
					reducedMotion={shouldReduceMotion}
					onCancelOne={onCancelOne}
				/>
			)}

			{onCancel && !isComplete && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleCancel}
					className="h-11 min-w-11 gap-1.5 px-3"
					aria-label="Annuler l'envoi"
				>
					<X className="size-4" aria-hidden="true" />
					<span className="text-xs">Annuler</span>
				</Button>
			)}
		</div>
	);
}

// ----------------------------------------------------------------------------
// Per-file progress list
// ----------------------------------------------------------------------------

interface FileProgressListProps {
	files: FileProgress[];
	reducedMotion: boolean | null;
	onCancelOne?: (fileName: string) => void;
}

function FileProgressList({ files, reducedMotion, onCancelOne }: FileProgressListProps) {
	return (
		<ul
			className="bg-muted/20 flex max-h-40 w-full flex-col gap-1 overflow-y-auto overscroll-contain rounded-md border p-2 text-xs"
			aria-label="Détails par fichier"
		>
			{files.map((file) => (
				<FileProgressItem
					key={file.fileName}
					file={file}
					reducedMotion={reducedMotion}
					onCancel={onCancelOne}
				/>
			))}
		</ul>
	);
}

const stateLabels: Record<FileProgress["state"], string> = {
	queued: "En attente",
	validating: "Validation",
	compressing: "Compression",
	uploading: "Envoi",
	done: "OK",
	failed: "Échec",
};

interface FileProgressItemProps {
	file: FileProgress;
	reducedMotion: boolean | null;
	onCancel?: (fileName: string) => void;
}

function FileProgressItem({ file, reducedMotion, onCancel }: FileProgressItemProps) {
	const haptic = useHaptic();
	const isDone = file.state === "done";
	const isFailed = file.state === "failed";
	const isActive = file.state === "uploading" || file.state === "compressing";
	const canCancel = onCancel && (file.state === "queued" || file.state === "uploading");

	const handleCancel = () => {
		haptic("light");
		onCancel?.(file.fileName);
	};

	return (
		<li
			className={cn(
				"flex items-center gap-2 rounded-sm px-1.5 py-1",
				!reducedMotion && "transition-colors duration-200",
				isDone && "bg-emerald-500/10",
				isFailed && "bg-destructive/10",
			)}
			data-state={file.state}
		>
			<span
				className={cn(
					"flex size-4 shrink-0 items-center justify-center rounded-full",
					isDone && "bg-emerald-500/30",
					isFailed && "bg-destructive/30",
					isActive && "bg-primary/20",
					!isDone && !isFailed && !isActive && "bg-muted",
				)}
				aria-hidden="true"
			>
				{isDone ? (
					<Check className="size-3 text-emerald-700" />
				) : isFailed ? (
					<AlertTriangle className="text-destructive size-3" />
				) : isActive ? (
					<LoaderCircle className={cn("text-primary size-3", !reducedMotion && "animate-spin")} />
				) : null}
			</span>
			<span className="flex-1 truncate" title={file.fileName}>
				{file.fileName}
			</span>
			{isActive && file.percent > 0 && file.percent < 100 && (
				<span className="text-muted-foreground tabular-nums">{file.percent}%</span>
			)}
			<span
				className={cn(
					"text-muted-foreground tabular-nums",
					isDone && "text-emerald-700",
					isFailed && "text-destructive",
				)}
			>
				{stateLabels[file.state]}
			</span>
			{canCancel && (
				<button
					type="button"
					onClick={handleCancel}
					aria-label={`Annuler ${file.fileName}`}
					className={cn(
						"text-muted-foreground hover:text-destructive focus-visible:ring-primary relative flex size-6 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none",
						"after:absolute after:-inset-2 after:content-['']",
					)}
				>
					<X className="size-3" aria-hidden="true" />
				</button>
			)}
		</li>
	);
}

interface UploadErrorBannerProps {
	/** List of failed files */
	failedFiles: { fileName: string; error: string; file?: File }[];
	/** Triggered when user clicks the retry CTA */
	onRetry: () => void;
	/** Triggered when user dismisses the banner */
	onDismiss: () => void;
	/** When provided, renders per-file cards with individual retry buttons */
	onRetryOne?: (file: File) => void;
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
	onRetryOne,
	className,
}: UploadErrorBannerProps) {
	const haptic = useHaptic();
	if (failedFiles.length === 0) return null;

	const handleRetry = () => {
		haptic("light");
		onRetry();
	};

	const handleDismiss = () => {
		haptic("light");
		onDismiss();
	};

	const handleRetryOne = (file: File) => {
		haptic("light");
		onRetryOne?.(file);
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
				"border-destructive/40 bg-destructive/5 flex flex-col gap-3 rounded-lg border p-3",
				className,
			)}
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-start gap-2 sm:items-center">
					<AlertTriangle
						className="text-destructive mt-0.5 size-5 shrink-0 sm:mt-0"
						aria-hidden="true"
					/>
					<div className="min-w-0">
						<p className="text-destructive text-sm font-medium">
							{count} fichier{count > 1 ? "s" : ""} en échec
						</p>
						{!onRetryOne && (
							<p className="text-muted-foreground truncate text-xs" title={previewNames}>
								{previewNames}
								{suffix}
							</p>
						)}
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
						Tout réessayer
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

			{onRetryOne && (
				<ul
					className="bg-background/50 flex max-h-40 flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-md border p-2 text-xs"
					aria-label="Fichiers en échec"
				>
					{failedFiles.map((entry) => (
						<li key={entry.fileName} className="flex items-start gap-2 rounded-sm px-2 py-1.5">
							<AlertTriangle
								className="text-destructive mt-0.5 size-3.5 shrink-0"
								aria-hidden="true"
							/>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium" title={entry.fileName}>
									{entry.fileName}
								</p>
								<p className="text-muted-foreground text-xs">{entry.error}</p>
							</div>
							{entry.file && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => handleRetryOne(entry.file!)}
									className="min-h-11 shrink-0 gap-1 px-2 text-xs"
									aria-label={`Réessayer ${entry.fileName}`}
								>
									<RefreshCw className="size-3" aria-hidden="true" />
									<span className="hidden sm:inline">Réessayer</span>
								</Button>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
