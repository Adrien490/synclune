"use client";

import { useRef, useState } from "react";

import { ACCEPT_ATTRIBUTE_CATALOG } from "@/modules/media/constants/media-limits.constants";
import { cn } from "@/shared/utils/cn";

interface NativeDropzoneProps {
	/**
	 * Called with files chosen via click or drag-drop.
	 * The caller is responsible for type/size/count validation (the unified `useMediaUpload`
	 * pipeline already does this) — this component only collects files.
	 */
	onFiles: (files: File[]) => void;
	/**
	 * `accept` filter for the hidden input. Défaut : la SSOT catalogue.
	 *
	 * ⚠️ Passer une liste MIME explicite (cf. `ACCEPT_ATTRIBUTE_*`), jamais un joker
	 * `image/*,video/*` : le picker natif proposerait alors des formats que le
	 * serveur refuse (`.mov`, `.svg`), et le fichier ne serait rejeté qu'après avoir
	 * été téléversé en entier.
	 */
	accept?: string;
	/** Allow selecting multiple files (default `true`). */
	multiple?: boolean;
	/** Disable the zone entirely (no click, drag, or keyboard activation). */
	disabled?: boolean;
	/** Idle primary label. */
	primaryLabel?: string;
	/** Label shown while a file is dragged over the zone. */
	dropLabel?: string;
	/** Secondary hint line under the label (optional). */
	hint?: React.ReactNode;
	/** Accessible label of the zone. */
	ariaLabel?: string;
	/** Optional leading icon rendered above the label. */
	icon?: React.ReactNode;
	/** Extra classes merged onto the zone. */
	className?: string;
}

/**
 * Minimal native HTML5 drop zone — click and drag&drop, routed through `onFiles`.
 *
 * Replaces UploadThing's `UploadDropzone` so the upload path goes through the unified
 * `useMediaUpload` pipeline (HEIC compression, retry, bytes-based progress, offline queue,
 * failedFiles tracking) on desktop, exactly like mobile. Owns its hidden `<input>` and
 * its drag-over state.
 *
 * ⚠️ Le **collage** n'est PAS géré ici : il passe par `useWindowPasteFiles`, monté par
 * la surface. Un listener `window` porté par ce composant était ajouté deux fois dès
 * qu'une surface rendait ses branches mobile et desktop simultanément (gating CSS),
 * et chaque fichier collé arrivait en double.
 */
export function NativeDropzone({
	onFiles,
	accept = ACCEPT_ATTRIBUTE_CATALOG,
	multiple = true,
	disabled = false,
	primaryLabel = "Glisse tes fichiers ou clique",
	dropLabel = "Relâche pour ajouter",
	hint,
	ariaLabel = "Zone d'upload (glisse ou clique)",
	icon,
	className,
}: NativeDropzoneProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDropTarget, setIsDropTarget] = useState(false);

	const pickFiles = () => {
		if (disabled) return;
		inputRef.current?.click();
	};

	return (
		<div
			role="button"
			tabIndex={disabled ? -1 : 0}
			aria-label={ariaLabel}
			aria-disabled={disabled}
			onKeyDown={(e) => {
				if (disabled) return;
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					pickFiles();
				}
			}}
			onClick={(e) => {
				// ⚠️ L'`<input>` caché est un ENFANT de cette zone : le clic programmatique
				// de `pickFiles()` remonte donc jusqu'ici et rappelle le handler, qui
				// re-clique l'input… Le sélecteur de fichiers s'ouvrait deux fois par clic.
				// Ignorer les événements dont la cible EST l'input casse la boucle.
				if (e.target === inputRef.current) return;
				pickFiles();
			}}
			onDragOver={(e) => {
				if (disabled) return;
				if (!e.dataTransfer.types.includes("Files")) return;
				e.preventDefault();
				e.dataTransfer.dropEffect = "copy";
				setIsDropTarget(true);
			}}
			onDragLeave={(e) => {
				if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
				setIsDropTarget(false);
			}}
			onDrop={(e) => {
				if (disabled) return;
				if (e.dataTransfer.files.length === 0) return;
				e.preventDefault();
				setIsDropTarget(false);
				onFiles(Array.from(e.dataTransfer.files));
			}}
			className={cn(
				"flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 motion-safe:transition-colors",
				"hover:border-primary/50 hover:bg-muted/50",
				"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
				isDropTarget && "border-primary bg-primary/5",
				disabled && "cursor-not-allowed opacity-50",
				className,
			)}
		>
			{icon}
			<p className="text-center text-sm font-medium">{isDropTarget ? dropLabel : primaryLabel}</p>
			{hint && <p className="text-muted-foreground text-center text-xs">{hint}</p>}
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				multiple={multiple}
				hidden
				aria-hidden="true"
				tabIndex={-1}
				onChange={(e) => {
					const files = e.target.files;
					if (!files || files.length === 0) return;
					const arr = Array.from(files);
					e.target.value = "";
					onFiles(arr);
				}}
			/>
		</div>
	);
}
