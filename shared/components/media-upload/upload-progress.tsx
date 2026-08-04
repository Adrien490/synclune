"use client";

import {
	Attachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentMedia,
	AttachmentTitle,
	type AttachmentState,
} from "@/shared/components/ui/attachment";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { formatBytesShort } from "@/modules/media/utils/format-bytes";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, ImageIcon, RefreshCw, VideoIcon, X } from "lucide-react";
import { Spinner } from "@/shared/components/ui/spinner";
import type { FileProgress, FileProgressState } from "@/modules/media/types/hooks.types";

// Screen reader announcements are throttled to these milestones to avoid spamming
// NVDA/VoiceOver with one annoucement per progress tick during long uploads.
const SR_MILESTONES = [0, 25, 50, 75, 100] as const;

function nearestMilestone(percent: number): (typeof SR_MILESTONES)[number] {
	let nearest: (typeof SR_MILESTONES)[number] = 0;
	for (const m of SR_MILESTONES) {
		if (percent >= m) nearest = m;
	}
	return nearest;
}

export type UploadPhase =
	"validating" | "compressing" | "uploading" | "generating-thumbnails" | "finalizing" | "done";

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
	onCancelOne,
}: UploadProgressProps) {
	const shouldReduceMotion = useReducedMotion();
	const haptic = useHaptic();
	const clampedProgress = Math.min(100, Math.max(0, progress));
	const isComplete =
		clampedProgress >= 100 &&
		!isProcessing &&
		phase !== "generating-thumbnails" &&
		phase !== "compressing" &&
		phase !== "finalizing";
	const isThumbnailing = phase === "generating-thumbnails";
	const isCompressing = phase === "compressing";
	const isFinalizing = phase === "finalizing";
	const isServerProcessing =
		(clampedProgress >= 100 && isProcessing) || isThumbnailing || isCompressing || isFinalizing;

	const handleCancel = () => {
		haptic("light");
		onCancel?.();
	};

	const queueText = queuedCount > 0 ? `, ${queuedCount} en attente` : "";
	const completedText =
		completedCount !== undefined && completedCount > 0
			? `${completedCount} fichier${completedCount > 1 ? "s" : ""} envoyé${completedCount > 1 ? "s" : ""}`
			: "Envoi terminé";
	// Round the spoken percentage to the nearest milestone (0/25/50/75/100) so SR
	// announcements happen at most ~5 times during an upload instead of every tick.
	const announcedPercent = nearestMilestone(clampedProgress);
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
						: `Envoi en cours, ${announcedPercent} pourcent${queueText}`;

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
						: `Envoi… ${clampedProgress}%`;

	const phaseKey = isComplete
		? "done"
		: isCompressing
			? "compressing"
			: isThumbnailing
				? "thumbnailing"
				: isFinalizing
					? "finalizing"
					: isServerProcessing
						? "server-processing"
						: "uploading";

	// Lot 5/S4.4 : plus d'ETA ni de débit — l'octet parcouru suffit à dire que ça
	// avance, et l'estimation était calibrée pour un upload en masse en 3G.
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
					<div className="bg-success/20 flex size-7 items-center justify-center rounded-full sm:size-5">
						<Check className="text-success size-4 sm:size-3" aria-hidden="true" />
					</div>
				) : (
					<Spinner presentational className="text-primary size-7 sm:size-5" />
				)}

				<span
					className={cn(
						"text-sm font-medium sm:text-xs",
						isComplete ? "text-success" : "text-foreground/70",
						!isServerProcessing && "tabular-nums",
					)}
					aria-hidden="true"
				>
					{isComplete ? "OK" : isServerProcessing ? "Optimisation…" : `${clampedProgress}%`}
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
				<div className="bg-success/20 flex size-12 items-center justify-center rounded-full sm:size-10">
					<Check className="text-success size-6 sm:size-5" aria-hidden="true" />
				</div>
			) : (
				<Spinner presentational className="text-primary size-10 sm:size-8" />
			)}

			<div className="w-full space-y-2 sm:space-y-1.5">
				<Progress
					value={isServerProcessing ? undefined : clampedProgress}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={isServerProcessing ? undefined : clampedProgress}
					aria-label={isServerProcessing ? "Optimisation à l'atelier" : "Progression de l'envoi"}
					className={cn(
						"h-2 sm:h-1.5",
						isComplete && "[&>[data-slot=progress-indicator]]:bg-success",
						isServerProcessing &&
							!shouldReduceMotion &&
							"[&>[data-slot=progress-indicator]]:w-1/3 [&>[data-slot=progress-indicator]]:motion-safe:animate-[progress-indeterminate_1.4s_ease-in-out_infinite]",
					)}
				/>
				<AnimatePresence mode="wait" initial={false}>
					<m.p
						key={phaseKey}
						initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
						transition={{ duration: 0.18 }}
						className={cn(
							"text-center text-base font-medium sm:text-sm",
							isComplete ? "text-success" : "text-foreground",
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
				{bytesLabel && (
					<div
						className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 text-center text-xs tabular-nums"
						aria-hidden="true"
					>
						<span>{bytesLabel}</span>
					</div>
				)}
				{queuedCount > 0 && !isComplete && (
					<p className="text-muted-foreground text-center text-xs" aria-hidden="true">
						+{queuedCount} en attente
					</p>
				)}
			</div>

			{files && files.length > 0 && !isComplete && (
				<FileProgressList files={files} onCancelOne={onCancelOne} />
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
	onCancelOne?: (fileName: string) => void;
}

function FileProgressList({ files, onCancelOne }: FileProgressListProps) {
	return (
		<ul
			className="bg-muted/20 flex max-h-52 w-full flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-md border p-2"
			aria-label="Détails par fichier"
		>
			{/* Clé composite : deux fichiers homonymes (IMG_0001.jpg) ne doivent pas
			    fusionner leurs lignes. */}
			{files.map((file, index) => (
				<FileProgressItem key={`${file.fileName}-${index}`} file={file} onCancel={onCancelOne} />
			))}
		</ul>
	);
}

const stateLabels: Record<FileProgressState, string> = {
	queued: "En attente",
	validating: "Validation",
	compressing: "Compression",
	uploading: "Envoi",
	done: "OK",
	failed: "Échec",
};

// Le pipeline distingue 6 phases, la primitive `Attachment` n'en peint que 5 :
// `validating` et `compressing` partagent le même traitement visuel (balayage du
// titre) que le traitement serveur. La phase exacte reste lisible dans la
// description ET sur `data-file-state`.
const attachmentStates: Record<FileProgressState, AttachmentState> = {
	queued: "idle",
	validating: "processing",
	compressing: "processing",
	uploading: "uploading",
	done: "done",
	failed: "error",
};

interface FileProgressItemProps {
	file: FileProgress;
	onCancel?: (fileName: string) => void;
}

function FileProgressItem({ file, onCancel }: FileProgressItemProps) {
	const haptic = useHaptic();
	const isDone = file.state === "done";
	const isFailed = file.state === "failed";
	const isActive =
		file.state === "uploading" || file.state === "compressing" || file.state === "validating";
	const canCancel = onCancel && (file.state === "queued" || file.state === "uploading");
	// Le pourcentage n'a de sens qu'en cours de route : à 0 il n'informe pas, à
	// 100 la phase suivante a déjà pris le relais.
	const showPercent = isActive && file.percent > 0 && file.percent < 100;

	const handleCancel = () => {
		haptic("light");
		onCancel?.(file.fileName);
	};

	return (
		<li className="min-w-0">
			<Attachment
				size="xs"
				state={attachmentStates[file.state]}
				// La phase exacte du pipeline, que `data-state` agrège (cf. `attachmentStates`).
				data-file-state={file.state}
				// Pas de garde `prefers-reduced-motion` ici : `Attachment` porte déjà
				// `transition-colors` en propre, donc la garde ne pilotait que la durée.
				// Et une transition de COULEUR n'est pas un déclencheur vestibulaire —
				// le repo ne gate en `motion-safe:` que le mouvement (cf. la SSOT
				// `spinner-ssot`, qui vise les rotations).
				className={cn("w-full min-w-0", isDone && "border-success/30 bg-success/10")}
			>
				<AttachmentMedia className={cn(isDone && "bg-success/15")}>
					{isDone ? (
						<Check className="text-success" aria-hidden="true" />
					) : isFailed ? (
						<AlertTriangle aria-hidden="true" />
					) : isActive ? (
						<Spinner presentational size="sm" className="text-primary" />
					) : file.mediaType === "VIDEO" ? (
						<VideoIcon className="text-muted-foreground" aria-hidden="true" />
					) : (
						<ImageIcon className="text-muted-foreground" aria-hidden="true" />
					)}
				</AttachmentMedia>
				<AttachmentContent>
					<AttachmentTitle title={file.fileName}>{file.fileName}</AttachmentTitle>
					{/* La description porte le seul retour d'avancement par fichier :
					    phase + pourcentage fusionnés, là où la ligne précédente les
					    séparait en deux colonnes que la troncature du nom écrasait. */}
					<AttachmentDescription className={cn("tabular-nums", isDone && "text-success")}>
						{showPercent
							? `${stateLabels[file.state]} · ${file.percent}%`
							: stateLabels[file.state]}
					</AttachmentDescription>
				</AttachmentContent>
				{canCancel && (
					<AttachmentActions>
						<AttachmentAction
							onClick={handleCancel}
							aria-label={`Annuler ${file.fileName}`}
							className="text-muted-foreground can-hover:hover:text-destructive"
						>
							<X aria-hidden="true" />
						</AttachmentAction>
					</AttachmentActions>
				)}
			</Attachment>
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
						aria-label="Ignorer les erreurs d'envoi"
					>
						<X className="size-4" aria-hidden="true" />
					</Button>
				</div>
			</div>

			{onRetryOne && (
				<ul
					className="flex max-h-40 flex-col gap-1.5 overflow-y-auto overscroll-contain"
					aria-label="Fichiers en échec"
				>
					{failedFiles.map((entry, index) => (
						<li key={`${entry.fileName}-${index}`} className="min-w-0">
							<Attachment state="error" size="sm" className="bg-background w-full min-w-0">
								<AttachmentMedia>
									<AlertTriangle aria-hidden="true" />
								</AttachmentMedia>
								<AttachmentContent>
									<AttachmentTitle title={entry.fileName}>{entry.fileName}</AttachmentTitle>
									{/* Le motif de l'échec ne se tronque pas : c'est lui qui dit
									    quoi corriger avant de réessayer (et il porte l'information
									    que la couleur seule ne transmet pas — WCAG 1.4.1). */}
									<AttachmentDescription className="whitespace-normal">
										{entry.error}
									</AttachmentDescription>
								</AttachmentContent>
								{entry.file && (
									<AttachmentActions>
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
									</AttachmentActions>
								)}
							</Attachment>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
