"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";

import { cn } from "@/shared/utils/cn";

import { NativeDropzone } from "@/shared/components/media-upload/native-dropzone";
import { PendingUploadsGrid } from "@/shared/components/media-upload/pending-uploads-grid";
import { UploadActionSheet } from "@/shared/components/media-upload/upload-action-sheet";
import {
	UploadProgress as UploadProgressBar,
	type UploadPhase,
} from "@/shared/components/media-upload/upload-progress";
import {
	ACCEPT_ATTRIBUTE_CATALOG,
	IMAGE_FORMATS_LABEL,
	VIDEO_FORMATS_LABEL,
} from "@/modules/media/constants/media-limits.constants";
import { MAX_UPLOAD_COUNT_VIDEO } from "@/modules/media/constants/upload-size-limits";
import type { FileProgress } from "@/modules/media/types/hooks.types";
// `progressPercent` est la SSOT du pourcentage affiché — dérivé des OCTETS, pas du
// compte de fichiers. Cf. son docblock dans `upload-helpers.ts`.
import { progressPercent } from "@/modules/media/utils/upload-helpers";
import { MEDIA_SIZE_LIMITS } from "@/modules/media/utils/validate-media-file";
import type { MediaField } from "@/modules/products/hooks/use-media-field-upload";
import type { MediaArrayField } from "@/modules/products/types/media-field.types";
import { useWindowPasteFiles } from "@/shared/hooks/use-window-paste-files";
import { toast } from "@/shared/utils/toast";

// SSOT upload-zone copy derived from the size + format constants (F3).
const IMAGE_MAX_MB = Math.round(MEDIA_SIZE_LIMITS.CATALOG_IMAGE / 1024 / 1024);
const VIDEO_MAX_MB = Math.round(MEDIA_SIZE_LIMITS.VIDEO / 1024 / 1024);
/**
 * Long format+size hint (empty-state dropzone).
 *
 * Annonce désormais le **plafond de vidéos par envoi** et la possibilité de coller :
 * le premier était appliqué par le FileRouter sans être écrit nulle part, le second
 * était implémenté (listener `paste`) mais invisible — la surface où une capture
 * d'écran de bijou se colle le plus est justement celle-ci.
 */
const MEDIA_FORMATS_HINT = `Images ${IMAGE_FORMATS_LABEL} (max ${IMAGE_MAX_MB} Mo) · Vidéos ${VIDEO_FORMATS_LABEL} (max ${VIDEO_MAX_MB} Mo, ${MAX_UPLOAD_COUNT_VIDEO} par envoi) · colle aussi avec Ctrl/Cmd+V`;
/** Short size hint (action-sheet trigger description). */
const MEDIA_SIZE_HINT = `Image (${IMAGE_MAX_MB} Mo) / Vidéo (${VIDEO_MAX_MB} Mo)`;
/**
 * Shared accept filter for catalog media — liste MIME explicite issue de la SSOT.
 * ⚠️ Valait `"image/*,video/*"` : le picker natif proposait alors `.mov`, `.svg`,
 * `.webm`… que le serveur refuse après téléversement complet.
 */
const CATALOG_ACCEPT = ACCEPT_ATTRIBUTE_CATALOG;

export interface UploadProgressShape {
	phase: UploadPhase | string;
	completed: number;
	total: number;
	queued: number;
	current?: string;
	files?: FileProgress[];
	bytesUploaded?: number;
	bytesTotal?: number;
	bytesPerSecond?: number | null;
	etaSeconds?: number | null;
}

// ============================================================================
// Bandeau de progression — surface unique, quel que soit l'état d'entrée
// ============================================================================

interface UploadProgressPanelProps {
	uploadProgress: UploadProgressShape;
	onCancel: () => void;
	onCancelOne?: (fileName: string) => void;
	/**
	 * Élément vers lequel rendre le focus quand le bandeau disparaît. Sans lui, le
	 * focus retomberait sur `<body>` et un utilisateur clavier repartirait du début
	 * du document.
	 */
	anchorRef?: React.RefObject<HTMLElement | null>;
	className?: string;
}

/**
 * Bandeau de progression d'upload — **une seule implémentation** pour l'état vide
 * et pour la grille peuplée.
 *
 * ⚠️ Il existait deux niveaux de service : l'état vide rendait tout
 * `UploadProgress` (barre, octets, ETA, liste par fichier, Annuler), tandis que la
 * tuile inline — le cas dominant en édition, dès qu'un média est présent — se
 * contentait d'un spinner et d'un « 0/1 ». Sans pourcentage, sans ETA, sans région
 * live et **sans bouton Annuler** : une fois le premier média en place, on ne
 * pouvait plus interrompre un envoi.
 *
 * Le bandeau prend le focus à l'apparition (il porte déjà `role="status"`, donc
 * l'annonce part, et le bouton Annuler est à un Tab), puis le rend à `anchorRef`
 * quand il disparaît.
 */
export function UploadProgressPanel({
	uploadProgress,
	onCancel,
	onCancelOne,
	anchorRef,
	className,
}: UploadProgressPanelProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const returnFocusRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		// Retenir la cible de retour AVANT de déplacer le focus.
		returnFocusRef.current = anchorRef?.current ?? null;
		containerRef.current?.focus({ preventScroll: true });
		return () => {
			const anchor = returnFocusRef.current;
			if (anchor && document.contains(anchor)) {
				anchor.focus({ preventScroll: true });
			}
		};
		// Montage/démontage uniquement : le bandeau n'est rendu que pendant l'upload.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div
			ref={containerRef}
			tabIndex={-1}
			className={cn(
				"bg-primary/5 border-primary/20 flex flex-col items-center justify-center gap-3 rounded-xl border-2 px-4 py-6",
				"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
				className,
			)}
		>
			<UploadProgressBar
				progress={progressPercent(uploadProgress)}
				phase={uploadProgress.phase as UploadPhase}
				currentFileName={uploadProgress.current}
				queuedCount={uploadProgress.queued}
				completedCount={uploadProgress.completed}
				files={uploadProgress.files}
				bytesUploaded={uploadProgress.bytesUploaded}
				bytesTotal={uploadProgress.bytesTotal}
				bytesPerSecond={uploadProgress.bytesPerSecond}
				etaSeconds={uploadProgress.etaSeconds}
				onCancel={onCancel}
				onCancelOne={onCancelOne}
			/>
		</div>
	);
}

// ============================================================================
// Empty state (dropzone visible quand aucun média uploadé)
// ============================================================================

interface EmptyMediaStateProps {
	field: MediaArrayField;
	isMediaUploading: boolean;
	uploadProgress: UploadProgressShape | null;
	isAtLimit: boolean;
	maxMediaCount: number;
	/** Nombre de médias déjà présents dans le champ — pilote le count "X restants" sur le trigger */
	currentCount?: number;
	handleUpload: (files: File[], field: MediaField) => void;
	onCancel: () => void;
	onCancelOne?: (fileName: string) => void;
}

export function EmptyMediaState({
	field,
	isMediaUploading,
	uploadProgress,
	isAtLimit,
	maxMediaCount,
	currentCount,
	handleUpload,
	onCancel,
	onCancelOne,
}: EmptyMediaStateProps) {
	const remaining = Math.max(0, maxMediaCount - (currentCount ?? field.state.value.length));
	const remainingLabel = `${remaining} restant${remaining > 1 ? "s" : ""}`;
	// Pending-preview (review-before-send) on both mobile and desktop (F2).
	const pendingMode = !isAtLimit && !isMediaUploading;
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);
	const cappedRemaining = Math.max(0, remaining - pendingFiles.length);

	const onPickerFiles = (files: File[]) => {
		if (!pendingMode) {
			handleUpload(files, field);
			return;
		}
		const capped = files.slice(0, cappedRemaining);
		if (capped.length === 0) {
			toast.warning(`Tu as atteint ${maxMediaCount} médias`);
			return;
		}
		if (capped.length < files.length) {
			toast.warning(
				`Seulement ${capped.length} média${capped.length > 1 ? "s" : ""} ajouté${capped.length > 1 ? "s" : ""} à la file`,
			);
		}
		setPendingFiles((prev) => [...prev, ...capped]);
	};

	const handleConfirmPending = () => {
		if (pendingFiles.length === 0) return;
		const toUpload = pendingFiles;
		setPendingFiles([]);
		handleUpload(toUpload, field);
	};

	// Collage porté par la surface, pas par la zone de dépôt : les deux branches de
	// `UploadActionSheet` (mobile et desktop) sont montées simultanément, un listener
	// interne à `NativeDropzone` ajoutait donc chaque fichier collé deux fois.
	useWindowPasteFiles(onPickerFiles, { disabled: isMediaUploading || isAtLimit });

	const rootRef = useRef<HTMLDivElement>(null);

	return (
		<div ref={rootRef} tabIndex={-1} className="space-y-3 focus-visible:outline-none">
			{isMediaUploading && uploadProgress && (
				<UploadProgressPanel
					uploadProgress={uploadProgress}
					onCancel={onCancel}
					onCancelOne={onCancelOne}
					anchorRef={rootRef}
				/>
			)}

			{/* Pending uploads — preview avant upload effectif, mobile + desktop (F2) */}
			{pendingMode && pendingFiles.length > 0 && (
				<PendingUploadsGrid
					files={pendingFiles}
					onRemove={(index) => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
					onConfirm={handleConfirmPending}
					onCancel={() => setPendingFiles([])}
					onReorder={(next) => setPendingFiles(next)}
					disabled={isMediaUploading}
					confirmLabel={`Téléverser ${pendingFiles.length} média${pendingFiles.length > 1 ? "s" : ""}`}
				/>
			)}

			{/* Dropzone — always visible for queueing */}
			{!isAtLimit && (
				<div id="media-upload-zone" className="space-y-3">
					{!isMediaUploading && pendingFiles.length === 0 && (
						<div className="bg-muted/20 border-border flex items-center gap-3 rounded-lg border border-dashed p-3">
							<ImagePlus className="text-muted-foreground/50 size-5" />
							<p className="text-muted-foreground text-sm">
								Confie jusqu'à {maxMediaCount} médias de ton bijou à l'atelier
							</p>
						</div>
					)}

					<UploadActionSheet
						accept={CATALOG_ACCEPT}
						multiple
						disabled={isMediaUploading}
						onFilesSelected={onPickerFiles}
						triggerLabel="Ajouter des médias"
						triggerDescription={`${remainingLabel} • ${MEDIA_SIZE_HINT}`}
						sheetTitle="Ajouter des médias"
						sheetDescription="Choisis les images qui mettront ta pièce en lumière"
						showCamera
						desktopFallback={
							<NativeDropzone
								accept={CATALOG_ACCEPT}
								multiple
								disabled={isMediaUploading}
								onFiles={onPickerFiles}
								ariaLabel="Zone d'upload des médias du bijou"
								primaryLabel="Clique ou glisse-dépose tes médias"
								dropLabel="Relâche pour ajouter"
								hint={MEDIA_FORMATS_HINT}
								icon={<Upload className="text-primary/70 size-12" aria-hidden="true" />}
								className="min-h-40 rounded-xl"
							/>
						}
					/>
				</div>
			)}
			{field.state.meta.errors.length > 0 && (
				<div role="alert" className="text-destructive space-y-1 text-center text-sm">
					{field.state.meta.errors.map((error: unknown) => (
						<p key={String(error)}>{String(error)}</p>
					))}
				</div>
			)}
		</div>
	);
}

// ============================================================================
// Inline zone (à côté de la grille quand au moins 1 média uploadé)
// ============================================================================

interface InlineUploadZoneProps {
	field: MediaField;
	isMediaUploading: boolean;
	handleUpload: (files: File[], field: MediaField) => void;
	/** Nombre total autorisé — pilote le count "X restants" du trigger */
	maxMediaCount?: number;
	/** Nombre de médias déjà présents — pilote le count "X restants" du trigger */
	currentCount?: number;
}

/**
 * Tuile « Ajouter » rendue dans la grille, à côté des médias déjà présents.
 *
 * ⚠️ Elle ne rend **plus** de progression : celle-ci vit dans le
 * `UploadProgressPanel` que `MediaArrayCard` place au-dessus de la grille. La tuile
 * affichait un simple « 0/1 » sans pourcentage, sans octets, sans ETA et sans
 * bouton Annuler — c'est-à-dire que passé le premier média, l'envoi n'était plus
 * interruptible. Un carré de la taille d'une vignette ne peut pas porter cette
 * information ; ne pas l'y remettre.
 */
export function InlineUploadZone({
	field,
	isMediaUploading,
	handleUpload,
	maxMediaCount,
	currentCount,
}: InlineUploadZoneProps) {
	const remaining =
		maxMediaCount !== undefined
			? Math.max(0, maxMediaCount - (currentCount ?? field.state.value.length))
			: null;
	const remainingLabel =
		remaining !== null ? `${remaining} restant${remaining > 1 ? "s" : ""}` : undefined;
	// Pending-preview on both mobile and desktop (F2).
	const pendingMode = !isMediaUploading;
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);
	const cappedRemaining = remaining !== null ? Math.max(0, remaining - pendingFiles.length) : null;

	const onPickerFiles = (files: File[]) => {
		if (!pendingMode) {
			handleUpload(files, field);
			return;
		}
		const capped = cappedRemaining !== null ? files.slice(0, cappedRemaining) : files;
		if (capped.length === 0) {
			toast.warning(`Limite atteinte`);
			return;
		}
		if (capped.length < files.length) {
			toast.warning(
				`Seulement ${capped.length} média${capped.length > 1 ? "s" : ""} ajouté${capped.length > 1 ? "s" : ""} à la file`,
			);
		}
		setPendingFiles((prev) => [...prev, ...capped]);
	};

	const handleConfirmPending = () => {
		if (pendingFiles.length === 0) return;
		const toUpload = pendingFiles;
		setPendingFiles([]);
		handleUpload(toUpload, field);
	};

	// Un seul listener de collage par surface (cf. `EmptyMediaState`).
	useWindowPasteFiles(onPickerFiles, {
		disabled: isMediaUploading || cappedRemaining === 0,
	});

	return (
		<div className="flex h-full w-full flex-col">
			{pendingMode && pendingFiles.length > 0 && (
				<PendingUploadsGrid
					files={pendingFiles}
					onRemove={(index) => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
					onConfirm={handleConfirmPending}
					onCancel={() => setPendingFiles([])}
					onReorder={(next) => setPendingFiles(next)}
					disabled={isMediaUploading}
					confirmLabel={`Téléverser ${pendingFiles.length} média${pendingFiles.length > 1 ? "s" : ""}`}
					className="mb-2"
				/>
			)}
			<UploadActionSheet
				accept={CATALOG_ACCEPT}
				multiple
				disabled={isMediaUploading}
				onFilesSelected={onPickerFiles}
				triggerLabel="Ajouter"
				triggerDescription={remainingLabel}
				triggerClassName="h-full min-h-0 w-full flex-1 border-dashed"
				sheetTitle="Ajouter des médias"
				showCamera
				desktopFallback={
					<NativeDropzone
						accept={CATALOG_ACCEPT}
						multiple
						disabled={isMediaUploading}
						onFiles={onPickerFiles}
						ariaLabel="Zone d'upload des médias du bijou"
						primaryLabel="Ajouter"
						dropLabel="Relâche"
						icon={<Upload className="text-muted-foreground/50 size-6" aria-hidden="true" />}
						className="h-full min-h-0 w-full flex-1 gap-1 border-0 p-2"
					/>
				}
			/>
		</div>
	);
}
