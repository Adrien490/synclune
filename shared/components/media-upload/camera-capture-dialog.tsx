"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { useCameraStream, type CameraStreamError } from "@/modules/media/hooks/use-camera-stream";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { Camera, Check, RefreshCcw, RotateCcw, SwitchCamera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CameraCaptureDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Triggered when a photo is captured — dialog auto-closes afterwards */
	onCapture: (file: File) => void;
	/** Optional label for the title */
	title?: string;
}

function ErrorPanel({ error, onRetry }: { error: CameraStreamError; onRetry: () => void }) {
	return (
		<div
			role="alert"
			className="bg-destructive/10 flex flex-col items-center gap-3 rounded-xl p-6 text-center"
		>
			<p className="text-destructive text-sm font-medium">{error.message}</p>
			{error.kind === "permission-denied" && (
				<p className="text-muted-foreground text-xs">
					Ouvrez les paramètres du navigateur pour autoriser la caméra, puis réessayez.
				</p>
			)}
			<Button type="button" variant="outline" onClick={onRetry} className="min-h-11 gap-2">
				<RefreshCcw className="size-4" aria-hidden="true" />
				Réessayer
			</Button>
		</div>
	);
}

/**
 * In-app camera preview + capture dialog. Uses getUserMedia for live preview
 * and Canvas API to grab a still frame as a File.
 *
 * Fallback: if permission is denied or getUserMedia is unsupported, the caller
 * should switch to `<input capture="environment">` (see UploadActionSheet).
 */
export function CameraCaptureDialog({
	open,
	onOpenChange,
	onCapture,
	title = "Prendre une photo",
}: CameraCaptureDialogProps) {
	const haptic = useHaptic();
	const [isCapturing, setIsCapturing] = useState(false);
	const [preview, setPreviewState] = useState<{ file: File; url: string } | null>(null);
	const previewRef = useRef<{ file: File; url: string } | null>(null);
	const setPreview = (next: { file: File; url: string } | null) => {
		const prev = previewRef.current;
		if (prev) URL.revokeObjectURL(prev.url);
		previewRef.current = next;
		setPreviewState(next);
	};
	const clearPreview = () => setPreview(null);
	const { videoRef, start, stop, capture, toggleFacing, facing, error, isStreaming } =
		useCameraStream({ autoStart: false, facingMode: "environment" });

	useEffect(() => {
		if (open) {
			void start();
		} else {
			stop();
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setIsCapturing(false);
			clearPreview();
		}
		return () => {
			if (!open) stop();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	// Revoke object URL on unmount
	useEffect(() => {
		return () => {
			const current = previewRef.current;
			if (current) URL.revokeObjectURL(current.url);
		};
	}, []);

	const handleCapture = async () => {
		if (isCapturing) return;
		setIsCapturing(true);
		haptic("medium");
		try {
			const file = await capture();
			if (file) {
				haptic("success");
				// Stop the stream while previewing — saves battery + matches iOS Camera.app (P2.4)
				stop();
				setPreview({ file, url: URL.createObjectURL(file) });
			} else {
				haptic("error");
			}
		} finally {
			setIsCapturing(false);
		}
	};

	const handleRetake = async () => {
		haptic("light");
		clearPreview();
		await start();
	};

	const handleKeep = () => {
		if (!preview) return;
		haptic("success");
		onCapture(preview.file);
		clearPreview();
		onOpenChange(false);
	};

	const handleToggleFacing = async () => {
		haptic("selection");
		await toggleFacing();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-xl p-0 sm:max-w-2xl"
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<DialogHeader className="p-4 pb-2">
					<DialogTitle className="pr-8">{title}</DialogTitle>
					<DialogDescription className="sr-only">
						Prévisualisez votre photo et capturez-la. Vous pourrez la retirer avant l&apos;envoi.
					</DialogDescription>
				</DialogHeader>

				<div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
					{error ? (
						<div className="absolute inset-0 flex items-center justify-center p-6">
							<ErrorPanel error={error} onRetry={() => void start()} />
						</div>
					) : preview ? (
						// eslint-disable-next-line @next/next/no-img-element -- blob preview not for optimisation
						<img
							src={preview.url}
							alt="Capture — vérifiez avant de garder"
							className="h-full w-full object-cover"
						/>
					) : (
						<video
							ref={videoRef}
							autoPlay
							muted
							playsInline
							className="h-full w-full object-cover"
							aria-label="Prévisualisation caméra"
						/>
					)}

					{/* Floating controls */}
					<div
						className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4"
						style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
					>
						{preview ? (
							// Refaire / Garder mode (P2.4 — pattern iOS Camera.app)
							<>
								<Button
									type="button"
									variant="secondary"
									onClick={handleRetake}
									className="text-foreground gap-2 rounded-full bg-white/80 px-5 backdrop-blur hover:bg-white"
									aria-label="Refaire la photo"
								>
									<RotateCcw className="size-4" aria-hidden="true" />
									Refaire
								</Button>
								<Button
									type="button"
									variant="default"
									onClick={handleKeep}
									className="gap-2 rounded-full px-5"
									aria-label="Garder la photo"
								>
									<Check className="size-4" aria-hidden="true" />
									Garder
								</Button>
								<DialogClose asChild>
									<Button
										type="button"
										variant="secondary"
										size="icon"
										onClick={() => haptic("light")}
										className="text-foreground size-11 rounded-full bg-white/80 backdrop-blur hover:bg-white"
										aria-label="Fermer la caméra"
									>
										<X className="size-5" aria-hidden="true" />
									</Button>
								</DialogClose>
							</>
						) : (
							<>
								<Button
									type="button"
									variant="secondary"
									size="icon"
									onClick={handleToggleFacing}
									disabled={!isStreaming || !!error}
									className="text-foreground size-11 rounded-full bg-white/80 backdrop-blur hover:bg-white"
									aria-label={
										facing === "environment"
											? "Basculer sur la caméra avant"
											: "Basculer sur la caméra arrière"
									}
								>
									<SwitchCamera className="size-5" aria-hidden="true" />
								</Button>

								<button
									type="button"
									onClick={handleCapture}
									disabled={!isStreaming || isCapturing || !!error}
									aria-label="Capturer la photo"
									className="relative flex size-16 items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-50"
								>
									<span className="size-12 rounded-full bg-white" aria-hidden="true" />
								</button>

								<DialogClose asChild>
									<Button
										type="button"
										variant="secondary"
										size="icon"
										onClick={() => haptic("light")}
										className="text-foreground size-11 rounded-full bg-white/80 backdrop-blur hover:bg-white"
										aria-label="Fermer la caméra"
									>
										<X className="size-5" aria-hidden="true" />
									</Button>
								</DialogClose>
							</>
						)}
					</div>
				</div>

				{!error && !isStreaming && (
					<div className="flex items-center justify-center gap-2 p-4">
						<Camera className="text-muted-foreground size-4" aria-hidden="true" />
						<p className="text-muted-foreground text-sm">Démarrage de la caméra…</p>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
