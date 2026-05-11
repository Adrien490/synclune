"use client";

import { useEffect } from "react";

import { cn } from "@/shared/utils/cn";

interface NativeReviewDropzoneProps {
	remaining: number;
	isDropTarget: boolean;
	setIsDropTarget: (v: boolean) => void;
	disabled: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onFiles: (files: File[]) => void;
	onPickFiles: () => void;
	onPaste: (files: File[]) => void;
}

/**
 * Minimal native HTML5 drop zone — replaces the previous UploadThing UploadDropzone
 * so the desktop pipeline goes through useMediaUpload (HEIC compression, retry,
 * bytes-based progress, failedFiles tracking).
 */
export function NativeReviewDropzone({
	remaining,
	isDropTarget,
	setIsDropTarget,
	disabled,
	fileInputRef,
	onFiles,
	onPickFiles,
	onPaste,
}: NativeReviewDropzoneProps) {
	useEffect(() => {
		const handlePaste = (e: ClipboardEvent) => {
			if (disabled) return;
			const items = e.clipboardData?.files;
			if (!items || items.length === 0) return;
			const files = Array.from(items).filter((f) => f.type.startsWith("image/"));
			if (files.length > 0) {
				e.preventDefault();
				onPaste(files);
			}
		};
		window.addEventListener("paste", handlePaste);
		return () => window.removeEventListener("paste", handlePaste);
	}, [disabled, onPaste]);

	return (
		<div
			role="button"
			tabIndex={disabled ? -1 : 0}
			aria-label="Zone d'upload des photos pour l'avis (glissez ou cliquez)"
			aria-disabled={disabled}
			onKeyDown={(e) => {
				if (disabled) return;
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onPickFiles();
				}
			}}
			onClick={() => {
				if (disabled) return;
				onPickFiles();
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
				"flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 motion-safe:transition-colors",
				"hover:border-primary/50 hover:bg-muted/50",
				"focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
				isDropTarget && "border-primary bg-primary/5",
				disabled && "cursor-not-allowed opacity-50",
			)}
		>
			<p className="text-sm font-medium">
				{isDropTarget ? "Relâchez pour ajouter" : "Glissez vos photos ou cliquez"}
			</p>
			<p className="text-muted-foreground text-xs">
				{remaining} restante{remaining > 1 ? "s" : ""} (max 4 Mo) — collez aussi avec Ctrl/Cmd+V
			</p>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*,image/heic,image/heif,.heic,.heif"
				multiple={remaining > 1}
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
