"use client";

import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { Camera, FolderOpen, Image as ImageIcon, Plus } from "lucide-react";
import { useRef, useState } from "react";

interface UploadActionSheetProps {
	/**
	 * `accept` filter for file inputs (e.g. `"image/*"` or `"image/*,video/*"`).
	 * Includes HEIC explicitly so iOS lists Camera Roll items even if MIME drops.
	 */
	accept?: string;
	/** Allow multiple file selection */
	multiple?: boolean;
	/** Disable the trigger */
	disabled?: boolean;
	/** Triggered with selected File[] from any of the 3 sources */
	onFilesSelected: (files: File[]) => void;
	/** Trigger label (mobile button text) */
	triggerLabel?: string;
	/** Trigger description shown under label on the trigger */
	triggerDescription?: string;
	/** Trigger className */
	triggerClassName?: string;
	/**
	 * Shown on desktop instead of the trigger+drawer.
	 * Typically a UploadDropzone with native drag&drop.
	 */
	desktopFallback?: React.ReactNode;
	/** Sheet title (default: "Ajouter des photos") */
	sheetTitle?: string;
	/** Sheet description shown under title */
	sheetDescription?: string;
	/** Show camera capture option (default: true). Disable if camera makes no sense for the flow. */
	showCamera?: boolean;
}

/**
 * Mobile-first action sheet for file selection.
 * On mobile (< 768px) renders a Drawer Vaul bottom-sheet with 3 sources:
 *   1. Take a photo (camera capture="environment")
 *   2. From Photos / Gallery
 *   3. Browse Files
 *
 * On desktop (>= 768px), renders the `desktopFallback` (typically UploadDropzone).
 */
export function UploadActionSheet({
	accept = "image/*",
	multiple = true,
	disabled = false,
	onFilesSelected,
	triggerLabel = "Ajouter une photo",
	triggerDescription,
	triggerClassName,
	desktopFallback,
	sheetTitle = "Ajouter des photos",
	sheetDescription,
	showCamera = true,
}: UploadActionSheetProps) {
	const isMobile = useIsMobile();
	const haptic = useHaptic();
	const [open, setOpen] = useState(false);

	const cameraInputRef = useRef<HTMLInputElement>(null);
	const galleryInputRef = useRef<HTMLInputElement>(null);
	const filesInputRef = useRef<HTMLInputElement>(null);

	// On desktop, use the provided fallback (typically a drag&drop dropzone)
	if (!isMobile && desktopFallback) {
		return <>{desktopFallback}</>;
	}

	const handleSourceTap = (ref: React.RefObject<HTMLInputElement | null>) => {
		haptic("selection");
		// Click the hidden input SYNCHRONOUSLY in the same user-gesture tick (P1.6).
		// iOS Safari < 17 strips the gesture handle if the click is deferred via rAF,
		// resulting in the file picker silently failing to open.
		// Order matters: click first, then close — the drawer's exit animation runs
		// concurrently with the native file picker presentation.
		ref.current?.click();
		setOpen(false);
	};

	const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;
		const fileArray = Array.from(files);
		// Reset input so the same file can be re-selected
		e.target.value = "";
		onFilesSelected(fileArray);
	};

	const acceptWithHeic = accept.includes("image/")
		? `${accept},image/heic,image/heif,.heic,.heif`
		: accept;

	return (
		<>
			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerTrigger asChild>
					<Button
						type="button"
						variant="outline"
						disabled={disabled}
						onClick={() => haptic("light")}
						className={cn(
							"flex h-auto w-full items-center justify-start gap-3 rounded-xl border-2 border-dashed p-4 text-left",
							"hover:border-primary/50 hover:bg-muted/50",
							triggerClassName,
						)}
						aria-label={triggerLabel}
					>
						<span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
							<Plus className="size-5" aria-hidden="true" />
						</span>
						<span className="flex min-w-0 flex-col">
							<span className="text-sm font-medium">{triggerLabel}</span>
							{triggerDescription && (
								<span className="text-muted-foreground text-xs">{triggerDescription}</span>
							)}
						</span>
					</Button>
				</DrawerTrigger>
				<DrawerContent onOverlayClick={() => haptic("selection")} className="max-h-[70vh]">
					<DrawerHeader>
						<DrawerTitle>{sheetTitle}</DrawerTitle>
						{sheetDescription && <DrawerDescription>{sheetDescription}</DrawerDescription>}
					</DrawerHeader>

					<div className="flex flex-col gap-2 pb-2">
						{showCamera && (
							<button
								type="button"
								onClick={() => handleSourceTap(cameraInputRef)}
								className="hover:bg-muted/50 active:bg-muted flex min-h-14 w-full items-center gap-4 rounded-xl px-4 py-3 text-left motion-safe:transition-colors"
							>
								<span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
									<Camera className="size-5" aria-hidden="true" />
								</span>
								<span className="flex flex-col">
									<span className="text-sm font-medium">Prendre une photo</span>
									<span className="text-muted-foreground text-xs">Ouvre l&apos;appareil photo</span>
								</span>
							</button>
						)}

						<button
							type="button"
							onClick={() => handleSourceTap(galleryInputRef)}
							className="hover:bg-muted/50 active:bg-muted flex min-h-14 w-full items-center gap-4 rounded-xl px-4 py-3 text-left motion-safe:transition-colors"
						>
							<span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
								<ImageIcon className="size-5" aria-hidden="true" />
							</span>
							<span className="flex flex-col">
								<span className="text-sm font-medium">Depuis Photos</span>
								<span className="text-muted-foreground text-xs">
									Sélectionner dans votre galerie
								</span>
							</span>
						</button>

						<button
							type="button"
							onClick={() => handleSourceTap(filesInputRef)}
							className="hover:bg-muted/50 active:bg-muted flex min-h-14 w-full items-center gap-4 rounded-xl px-4 py-3 text-left motion-safe:transition-colors"
						>
							<span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
								<FolderOpen className="size-5" aria-hidden="true" />
							</span>
							<span className="flex flex-col">
								<span className="text-sm font-medium">Parcourir les fichiers</span>
								<span className="text-muted-foreground text-xs">Documents, téléchargements…</span>
							</span>
						</button>

						<DrawerClose asChild>
							<Button
								type="button"
								variant="ghost"
								className="mt-2 min-h-12 w-full"
								onClick={() => haptic("light")}
							>
								Annuler
							</Button>
						</DrawerClose>
					</div>
				</DrawerContent>
			</Drawer>

			{/* Hidden inputs — one per source. iOS uses `capture` to skip the picker prompt. */}
			{showCamera && (
				<input
					ref={cameraInputRef}
					type="file"
					accept="image/*"
					capture="environment"
					multiple={false}
					hidden
					aria-hidden="true"
					tabIndex={-1}
					onChange={handleFiles}
				/>
			)}
			<input
				ref={galleryInputRef}
				type="file"
				accept={acceptWithHeic}
				multiple={multiple}
				hidden
				aria-hidden="true"
				tabIndex={-1}
				onChange={handleFiles}
			/>
			<input
				ref={filesInputRef}
				type="file"
				accept="*/*"
				multiple={multiple}
				hidden
				aria-hidden="true"
				tabIndex={-1}
				onChange={handleFiles}
			/>
		</>
	);
}
