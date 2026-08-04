"use client";

import { Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { withViewTransition } from "@/shared/utils/view-transition";

import type { StoreSettingsAdmin } from "../../types/store-settings.types";
import { EditClosureMessageForm } from "./edit-closure-message-form";
import { EditReopensAtForm } from "./edit-reopens-at-form";
import { REOPEN_STORE_DIALOG_ID, ReopenStoreDialog } from "./reopen-store-dialog";
import { APP_TIME_ZONE } from "@/shared/utils/timezone";

interface StoreSettingsFormProps {
	settings: StoreSettingsAdmin;
}

// `timeZone` explicite : sinon SSR (UTC) ≠ client (Paris) → mismatch d'hydratation.
const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: APP_TIME_ZONE,
});

export function StoreSettingsForm({ settings }: StoreSettingsFormProps) {
	const router = useRouter();
	const reopenDialog = useAlertDialog(REOPEN_STORE_DIALOG_ID);
	const previousFocusRef = useRef<HTMLElement | null>(null);

	const handleOpenReopenDialog = () => {
		previousFocusRef.current = document.activeElement as HTMLElement | null;
		reopenDialog.open();
	};

	const closedAtFormatted = settings.closedAt
		? dateTimeFormatter.format(new Date(settings.closedAt))
		: null;

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* ─── Section 1 : Statut actuel ─────────────────────────────────── */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between gap-3">
						<CardTitle>Statut actuel</CardTitle>
						{settings.isClosed ? (
							<Badge
								variant="destructive"
								className="gap-1"
								style={{ viewTransitionName: "store-status-badge" }}
							>
								<Lock className="size-3" aria-hidden="true" />
								Fermée
							</Badge>
						) : (
							<Badge
								variant="success"
								className="gap-1"
								style={{ viewTransitionName: "store-status-badge" }}
							>
								<Unlock className="size-3" aria-hidden="true" />
								Ouverte
							</Badge>
						)}
					</div>
					<CardDescription>
						{settings.isClosed
							? "Les clients voient une page d'indisponibilité et ne peuvent pas commander."
							: "La boutique accepte les commandes normalement."}
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-4">
					{settings.isClosed ? (
						<>
							{closedAtFormatted && settings.closedBy && (
								<p className="text-muted-foreground text-xs wrap-anywhere">
									Fermée par{" "}
									<span className="text-foreground font-medium break-all">{settings.closedBy}</span>{" "}
									le {closedAtFormatted}
								</p>
							)}

							<div className="space-y-4 border-t pt-4 sm:space-y-6">
								<EditClosureMessageForm currentMessage={settings.closureMessage ?? ""} />
								<div className="border-t pt-4">
									<EditReopensAtForm currentReopensAt={settings.reopensAt} />
								</div>
							</div>

							<div className="border-t pt-4 sm:flex sm:justify-end">
								<Button
									type="button"
									onClick={handleOpenReopenDialog}
									className="min-h-11 w-full transition-transform duration-150 active:scale-[0.98] sm:w-auto"
								>
									<Unlock className="mr-2 size-4" />
									Réouvrir la boutique
								</Button>
							</div>
						</>
					) : (
						<div className="sm:flex sm:justify-end">
							<Button
								variant="destructive"
								render={
									<Link
										href="/admin/configuration/boutique/fermer"
										onClick={(event) => {
											if (
												event.defaultPrevented ||
												event.button !== 0 ||
												event.metaKey ||
												event.ctrlKey ||
												event.shiftKey ||
												event.altKey
											) {
												return;
											}
											event.preventDefault();
											triggerHaptic("light");
											withViewTransition(() => router.push("/admin/configuration/boutique/fermer"));
										}}
										style={{ viewTransitionName: "store-status-action" }}
									/>
								}
								className="min-h-11 w-full transition-transform duration-150 active:scale-[0.98] sm:w-auto"
							>
								<Lock className="mr-2 size-4" />
								Fermer la boutique
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<ReopenStoreDialog previousFocusRef={previousFocusRef} reopensAt={settings.reopensAt} />
		</div>
	);
}
