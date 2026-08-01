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
import { formatBytesShort } from "@/modules/media/utils/format-eta";
import { cn } from "@/shared/utils/cn";
import { CloudOff, RefreshCw, X } from "lucide-react";
import { useState } from "react";

/**
 * Âge de la file en langage courant. `null` sous une minute : « en attente depuis
 * 0 minute » est du bruit.
 */
function formatQueueAge(oldestQueuedAt: number | null | undefined): string | null {
	if (oldestQueuedAt === null || oldestQueuedAt === undefined) return null;
	const elapsedMs = Date.now() - oldestQueuedAt;
	if (elapsedMs < 60_000) return null;

	const minutes = Math.floor(elapsedMs / 60_000);
	if (minutes < 60) return `En attente depuis ${minutes} min.`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `En attente depuis ${hours} h.`;

	const days = Math.floor(hours / 24);
	return `En attente depuis ${days} jour${days > 1 ? "s" : ""}.`;
}

interface OfflineQueueBannerProps {
	/** Number of files currently held in the offline IndexedDB queue */
	queuedCount: number;
	/** Whether the browser currently reports offline */
	isOffline: boolean;
	/** Triggered when user wants to drain the queue and re-upload now */
	onReplay: () => void;
	/** Triggered when user dismisses the banner (forgets queued entries via drop()) */
	onDismiss?: () => void;
	/** Total size of the queued files, in bytes — shown so the user knows what's held */
	queuedBytes?: number;
	/** Epoch ms of the oldest queued entry — shown so a stale queue is recognisable */
	oldestQueuedAt?: number | null;
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
 *
 * ⚠️ La copie annonce une reprise automatique : elle n'est vraie que parce que les
 * appelants passent `autoReplayOnReconnect: true` à `useOfflineUploadQueue`. Ce
 * texte a longtemps menti — l'option existait, son défaut était `false`, et aucune
 * surface ne la passait. Ne pas réécrire l'un sans vérifier l'autre.
 */
export function OfflineQueueBanner({
	queuedCount,
	isOffline,
	onReplay,
	onDismiss,
	queuedBytes,
	oldestQueuedAt,
	disabled = false,
	className,
}: OfflineQueueBannerProps) {
	const haptic = useHaptic();
	const [confirmOpen, setConfirmOpen] = useState(false);
	if (queuedCount <= 0) return null;

	// `queuedAt` était stocké et jamais affiché : rien ne distinguait une file
	// d'il y a trente secondes d'une file oubliée depuis trois jours.
	const ageLabel = formatQueueAge(oldestQueuedAt);

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
					"border-warning/40 bg-warning/5 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
					className,
				)}
			>
				<div className="flex items-start gap-2 sm:items-center">
					<CloudOff className="text-warning mt-0.5 size-5 shrink-0 sm:mt-0" aria-hidden="true" />
					<div className="min-w-0">
						<p className="text-warning text-sm font-medium">
							{queuedCount} fichier{queuedCount > 1 ? "s" : ""} en attente de connexion
							{queuedBytes !== undefined && queuedBytes > 0 && (
								<span className="font-normal"> · {formatBytesShort(queuedBytes)}</span>
							)}
						</p>
						<p className="text-muted-foreground text-xs">
							{isOffline
								? "L'envoi reprendra tout seul dès que tu seras de nouveau en ligne."
								: "Connexion rétablie — l'envoi va reprendre. Tu peux aussi le relancer maintenant."}
							{ageLabel && <span> {ageLabel}</span>}
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
