"use client";

import { Lock, Unlock } from "lucide-react";
import Link from "next/link";
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

import type { StoreSettingsAdmin } from "../../types/store-settings.types";
import { EditClosureMessageForm } from "./edit-closure-message-form";
import { EditReopensAtForm } from "./edit-reopens-at-form";
import { REOPEN_STORE_DIALOG_ID, ReopenStoreDialog } from "./reopen-store-dialog";

interface StoreSettingsFormProps {
	settings: StoreSettingsAdmin;
}

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "medium",
	timeStyle: "short",
});

export function StoreSettingsForm({ settings }: StoreSettingsFormProps) {
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
		<div className="space-y-6">
			{/* ─── Section 1 : Statut actuel ─────────────────────────────────── */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between gap-3">
						<CardTitle>Statut actuel</CardTitle>
						{settings.isClosed ? (
							<Badge variant="destructive" className="gap-1">
								<Lock className="size-3" aria-hidden="true" />
								Fermée
							</Badge>
						) : (
							<Badge variant="success" className="gap-1">
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
								<p className="text-muted-foreground text-xs">
									Fermée par{" "}
									<span className="text-foreground font-medium">{settings.closedBy}</span> le{" "}
									{closedAtFormatted}
								</p>
							)}

							<div className="space-y-6 border-t pt-4">
								<EditClosureMessageForm currentMessage={settings.closureMessage ?? ""} />
								<div className="border-t pt-4">
									<EditReopensAtForm currentReopensAt={settings.reopensAt} />
								</div>
							</div>

							<div className="flex justify-end border-t pt-4">
								<Button type="button" onClick={handleOpenReopenDialog} className="min-h-11">
									<Unlock className="mr-2 size-4" />
									Réouvrir la boutique
								</Button>
							</div>
						</>
					) : (
						<div className="flex justify-end">
							<Button variant="destructive" asChild className="min-h-11">
								<Link
									href="/admin/configuration/boutique/fermer"
									onClick={() => triggerHaptic("light")}
									style={{ viewTransitionName: "store-status-action" }}
								>
									<Lock className="mr-2 size-4" />
									Fermer la boutique
								</Link>
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<ReopenStoreDialog previousFocusRef={previousFocusRef} />
		</div>
	);
}
