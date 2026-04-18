"use client";

import { CalendarClock, Clock, MessageSquare, X } from "lucide-react";
import { useRef } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import {
	CANCEL_SCHEDULED_CLOSURE_DIALOG_ID,
	CancelScheduledClosureDialog,
} from "./cancel-scheduled-closure-dialog";

interface ScheduledClosureCardProps {
	scheduledCloseAt: Date;
	closureMessage: string | null;
	reopensAt: Date | null;
}

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "full",
	timeStyle: "short",
});

export function ScheduledClosureCard({
	scheduledCloseAt,
	closureMessage,
	reopensAt,
}: ScheduledClosureCardProps) {
	const cancelDialog = useAlertDialog(CANCEL_SCHEDULED_CLOSURE_DIALOG_ID);
	const previousFocusRef = useRef<HTMLElement | null>(null);

	const handleOpenCancel = () => {
		previousFocusRef.current = document.activeElement as HTMLElement | null;
		cancelDialog.open();
	};

	return (
		<>
			<div className="border-primary/40 bg-primary/5 space-y-4 rounded-xl border p-4">
				<div className="flex items-start gap-3">
					<CalendarClock className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
					<div className="flex-1 space-y-1">
						<div className="flex items-center gap-2">
							<h3 className="text-foreground text-sm font-medium">Fermeture programmée</h3>
							<Badge variant="secondary" className="text-xs">
								À venir
							</Badge>
						</div>
						<p className="text-muted-foreground text-sm">
							La boutique fermera automatiquement le{" "}
							<time
								dateTime={scheduledCloseAt.toISOString()}
								className="text-foreground font-medium"
							>
								{dateTimeFormatter.format(scheduledCloseAt)}
							</time>
							.
						</p>
					</div>
				</div>

				{closureMessage && (
					<div className="flex items-start gap-3 border-t pt-3">
						<MessageSquare
							className="text-muted-foreground mt-0.5 size-4 shrink-0"
							aria-hidden="true"
						/>
						<div className="flex-1">
							<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
								Message prévu
							</p>
							<p className="text-foreground text-sm">{closureMessage}</p>
						</div>
					</div>
				)}

				{reopensAt && (
					<div className="flex items-start gap-3 border-t pt-3">
						<Clock className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<div className="flex-1">
							<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
								Réouverture automatique
							</p>
							<p className="text-foreground text-sm">
								<time dateTime={reopensAt.toISOString()}>
									{dateTimeFormatter.format(reopensAt)}
								</time>
							</p>
						</div>
					</div>
				)}

				<div className="flex justify-end border-t pt-3">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handleOpenCancel}
						className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-11"
					>
						<X className="mr-1 size-4" />
						Annuler la programmation
					</Button>
				</div>
			</div>

			<CancelScheduledClosureDialog previousFocusRef={previousFocusRef} />
		</>
	);
}
