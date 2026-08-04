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
import { useHaptic } from "@/shared/hooks/use-haptic";
import { ACCEPT_ATTRIBUTE_IMAGES_ONLY } from "@/modules/media/constants/media-limits.constants";
import { cn } from "@/shared/utils/cn";
import { Camera, FolderOpen, Image as ImageIcon, Plus } from "lucide-react";
import { useRef, useState } from "react";

interface UploadActionSheetProps {
	/**
	 * `accept` filter for file inputs — liste MIME explicite issue de la SSOT
	 * (`ACCEPT_ATTRIBUTE_CATALOG` / `ACCEPT_ATTRIBUTE_IMAGES_ONLY`), jamais un joker.
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
 * Sous `md`, un bottom-sheet Vaul à 3 sources :
 *   1. Take a photo (camera capture="environment")
 *   2. From Photos / Gallery
 *   3. Browse Files
 *
 * À partir de `md`, le `desktopFallback` (typiquement une `NativeDropzone`).
 *
 * ⚠️ **La bascule est faite en CSS, pas en JS.** Elle passait par `useIsMobile()`,
 * dont le `getServerSnapshot` vaut `false` : sur téléphone, le premier paint rendait
 * donc la zone de dépôt desktop (« Glissez vos fichiers ou cliquez », `min-h-40`,
 * hint formats long) avant de la remplacer par le trigger compact — contenu
 * inadapté visible, puis décalage de mise en page. Même parti pris que
 * `sortable-media-item`, qui gate ses actions en `can-hover:` précisément pour ne
 * pas dépendre de l'hydratation.
 *
 * Corollaire : les deux branches sont montées simultanément. C'est pourquoi le
 * listener de collage a été sorti de `NativeDropzone` vers `useWindowPasteFiles`,
 * monté une seule fois par la surface — sinon chaque fichier collé arrivait en
 * double. Les entrées `<input type="file">` en double sont inoffensives (`hidden`
 * + `tabIndex={-1}`, et `display:none` les retire de l'arbre d'accessibilité).
 */
export function UploadActionSheet({
	accept = ACCEPT_ATTRIBUTE_IMAGES_ONLY,
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
	const haptic = useHaptic();
	const [open, setOpen] = useState(false);

	const cameraInputRef = useRef<HTMLInputElement>(null);
	const galleryInputRef = useRef<HTMLInputElement>(null);
	const filesInputRef = useRef<HTMLInputElement>(null);

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

	return (
		<>
			{/* Branche desktop — rendue et masquée en CSS, jamais conditionnée en JS. */}
			{desktopFallback && <div className="hidden md:block">{desktopFallback}</div>}

			{/*
			 * Branche mobile. `contents` sous `md` pour que le trigger reste, du point de
			 * vue de la mise en page, un enfant direct du parent (comportement du fragment
			 * d'origine) ; `md:hidden` le retire ensuite du flux ET de l'arbre
			 * d'accessibilité — `display:none` fait les deux.
			 */}
			<div className="contents md:hidden">
				<Drawer open={open} onOpenChange={setOpen}>
					<DrawerTrigger
						render={
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
							/>
						}
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
					</DrawerTrigger>
					<DrawerContent onOverlayClick={() => haptic("light")} className="max-h-fit">
						<DrawerHeader>
							<DrawerTitle>{sheetTitle}</DrawerTitle>
							{sheetDescription && <DrawerDescription>{sheetDescription}</DrawerDescription>}
						</DrawerHeader>

						<div className="flex flex-col gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
										<span className="text-sm font-medium">Capturer un cliché</span>
										<span className="text-muted-foreground text-xs">
											Ouvre l&apos;appareil photo
										</span>
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
									<span className="text-sm font-medium">Depuis la pellicule</span>
									<span className="text-muted-foreground text-xs">
										Choisir un cliché de ta galerie
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
									<span className="text-sm font-medium">Parcourir mes fichiers</span>
									<span className="text-muted-foreground text-xs">
										Depuis tes dossiers personnels
									</span>
								</span>
							</button>

							<DrawerClose
								render={
									<Button
										type="button"
										variant="ghost"
										className="mt-2 min-h-12 w-full"
										onClick={() => haptic("light")}
									/>
								}
							>
								Annuler
							</DrawerClose>
						</div>
					</DrawerContent>
				</Drawer>
			</div>

			{/*
			 * Hidden inputs — one per source. iOS uses `capture` to skip the picker prompt.
			 * Laissés hors du wrapper `md:hidden` : ils ne sont jamais cliquables
			 * directement (seuls les boutons du drawer les déclenchent, et ceux-là sont en
			 * `display:none` au-delà de `md`).
			 */}
			{showCamera && (
				<input
					ref={cameraInputRef}
					type="file"
					// ⚠️ Images SEULEMENT, quel que soit l'`accept` de la surface : le bouton
					// promet « Capturer un cliché ». Avec un `accept` qui inclut la vidéo,
					// `capture="environment"` laisse iOS proposer l'enregistrement vidéo — et
					// l'utilisatrice se retrouve avec une vidéo là où le libellé annonçait
					// une photo. Le périphérique doit produire ce que le bouton dit.
					accept={ACCEPT_ATTRIBUTE_IMAGES_ONLY}
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
				accept={accept}
				multiple={multiple}
				hidden
				aria-hidden="true"
				tabIndex={-1}
				onChange={handleFiles}
			/>
			<input
				ref={filesInputRef}
				type="file"
				accept={accept}
				multiple={multiple}
				hidden
				aria-hidden="true"
				tabIndex={-1}
				onChange={handleFiles}
			/>
		</>
	);
}
