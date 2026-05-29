"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/shared/utils/cn";

const isImageOrVideo = (f: File) => f.type.startsWith("image/") || f.type.startsWith("video/");

interface NativeDropzoneProps {
	/**
	 * Called with files chosen via click, drag-drop, or paste.
	 * The caller is responsible for type/size/count validation (the unified `useMediaUpload`
	 * pipeline already does this) — this component only collects files.
	 */
	onFiles: (files: File[]) => void;
	/**
	 * `accept` filter for the hidden input (default `"image/*"`).
	 * HEIC/HEIF are appended automatically for image flows so iOS lists Camera Roll items
	 * even when the MIME is dropped by the browser.
	 */
	accept?: string;
	/** Allow selecting multiple files (default `true`). */
	multiple?: boolean;
	/** Disable the zone entirely (no click, drag, paste, or keyboard activation). */
	disabled?: boolean;
	/** Idle primary label. */
	primaryLabel?: string;
	/** Label shown while a file is dragged over the zone. */
	dropLabel?: string;
	/** Secondary hint line under the label (optional). */
	hint?: React.ReactNode;
	/** Accessible label of the zone. */
	ariaLabel?: string;
	/** Filter applied to pasted files before forwarding (default: images + videos). */
	pasteFilter?: (file: File) => boolean;
	/** Optional leading icon rendered above the label. */
	icon?: React.ReactNode;
	/** Extra classes merged onto the zone. */
	className?: string;
}

/**
 * Minimal native HTML5 drop zone — click, drag&drop and paste, all routed through `onFiles`.
 *
 * Replaces UploadThing's `UploadDropzone` so the upload path goes through the unified
 * `useMediaUpload` pipeline (HEIC compression, retry, bytes-based progress, offline queue,
 * failedFiles tracking) on desktop, exactly like mobile. Self-contained: owns its hidden
 * `<input>`, drag-over state and window-level paste listener.
 */
export function NativeDropzone({
	onFiles,
	accept = "image/*",
	multiple = true,
	disabled = false,
	primaryLabel = "Glissez vos fichiers ou cliquez",
	dropLabel = "Relâchez pour ajouter",
	hint,
	ariaLabel = "Zone d'upload (glissez ou cliquez)",
	pasteFilter = isImageOrVideo,
	icon,
	className,
}: NativeDropzoneProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDropTarget, setIsDropTarget] = useState(false);

	// Append HEIC/HEIF to image-accepting inputs (iOS interop).
	const acceptWithHeic = accept.includes("image/")
		? `${accept},image/heic,image/heif,.heic,.heif`
		: accept;

	// Window-level paste → forward matching files. Skip when focus is on a text field
	// (the user is pasting text, not media). Keep a ref so the listener stays stable.
	const onFilesRef = useRef(onFiles);
	useEffect(() => {
		onFilesRef.current = onFiles;
	});
	useEffect(() => {
		if (disabled) return;
		const handlePaste = (e: ClipboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (target) {
				const tag = target.tagName;
				if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
			}
			const items = e.clipboardData?.files;
			if (!items || items.length === 0) return;
			const files = Array.from(items).filter(pasteFilter);
			if (files.length === 0) return;
			e.preventDefault();
			onFilesRef.current(files);
		};
		window.addEventListener("paste", handlePaste);
		return () => window.removeEventListener("paste", handlePaste);
	}, [disabled, pasteFilter]);

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
			onClick={pickFiles}
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
				accept={acceptWithHeic}
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
