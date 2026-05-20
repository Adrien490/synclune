"use client";

import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { CloudOff, RefreshCw, X } from "lucide-react";
import { useState } from "react";

interface OfflineQueueBannerProps {
	/** Number of files currently held in the offline IndexedDB queue */
	queuedCount: number;
	/** Whether the browser currently reports offline */
	isOffline: boolean;
	/** Triggered when user wants to drain the queue and re-upload now */
	onReplay: () => void;
	/** Triggered when user dismisses the banner (forgets queued entries via drop()) */
	onDismiss?: () => void;
	/** Disable CTAs while a replay is in flight */
	disabled?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Banner shown when the offline upload queue contains pending files.
 *
 * Pairs with `useOfflineUploadQueue` + `useMediaUpload({ enableOfflineQueue: true })`.
 * Displays "Hors-ligne" badge when navigator.onLine === false; otherwise prompts
 * the user to replay the queue.
 *
 * Le dismiss vide définitivement la file IndexedDB — il passe donc par une
 * confirmation `ResponsiveAlertDialog` (tone destructive) pour éviter la perte
 * accidentelle des fichiers en attente.
 */
export function OfflineQueueBanner({
	queuedCount,
	isOffline,
	onReplay,
	onDismiss,
	disabled = false,
	className,
}: OfflineQueueBannerProps) {
	const haptic = useHaptic();
	const [confirmOpen, setConfirmOpen] = useState(false);
	if (queuedCount <= 0) return null;

	const handleReplay = () => {
		haptic("medium");
		onReplay();
	};

	const handleDismiss = () => {
		haptic("light");
		setConfirmOpen(true);
	};

	const confirmDismiss = () => {
		onDismiss?.();
		setConfirmOpen(false);
	};

	return (
		<>
			<div
				role="status"
				aria-live="polite"
				className={cn(
					"flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 sm:flex-row sm:items-center sm:justify-between",
					className,
				)}
			>
				<div className="flex items-start gap-2 sm:items-center">
					<CloudOff className="mt-0.5 size-5 shrink-0 text-amber-600 sm:mt-0" aria-hidden="true" />
					<div className="min-w-0">
						<p className="text-sm font-medium text-amber-700">
							{queuedCount} fichier{queuedCount > 1 ? "s" : ""} en attente de connexion
						</p>
						<p className="text-muted-foreground text-xs">
							{isOffline
								? "Vos téléversements reprendront automatiquement au retour en ligne."
								: "Connexion rétablie — vous pouvez relancer l'envoi."}
						</p>
					</div>
				</div>
				<div className="flex shrink-0 gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleReplay}
						disabled={disabled || isOffline}
						className="min-h-11 gap-1.5"
						aria-label="Relancer les téléversements en attente"
					>
						<RefreshCw className="size-3.5" aria-hidden="true" />
						Relancer
					</Button>
					{onDismiss && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={handleDismiss}
							disabled={disabled}
							className="size-11"
							aria-label="Vider la file d'attente hors-ligne"
						>
							<X className="size-4" aria-hidden="true" />
						</Button>
					)}
				</div>
			</div>

			{onDismiss && (
				<ResponsiveAlertDialog open={confirmOpen} onOpenChange={setConfirmOpen} tone="destructive">
					<ResponsiveAlertDialogContent>
						<ResponsiveAlertDialogHeader>
							<ResponsiveAlertDialogTitle>
								Vider la file d&apos;attente ?
							</ResponsiveAlertDialogTitle>
							<ResponsiveAlertDialogDescription>
								{queuedCount} fichier{queuedCount > 1 ? "s" : ""} en attente{" "}
								{queuedCount > 1 ? "seront retirés" : "sera retiré"} définitivement de la file
								hors-ligne. Cette action est irréversible.
							</ResponsiveAlertDialogDescription>
						</ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogFooter>
							<ResponsiveAlertDialogCancel>Annuler</ResponsiveAlertDialogCancel>
							<ResponsiveAlertDialogAction onClick={confirmDismiss}>
								Vider la file
							</ResponsiveAlertDialogAction>
						</ResponsiveAlertDialogFooter>
					</ResponsiveAlertDialogContent>
				</ResponsiveAlertDialog>
			)}
		</>
	);
}
