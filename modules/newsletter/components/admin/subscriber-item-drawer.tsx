"use client";

import { useState } from "react";
import { CircleCheck, CircleX, Clock, LoaderCircle, Trash2 } from "lucide-react";

import { NewsletterStatus } from "@/app/generated/prisma/browser";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatDateShort } from "@/shared/utils/dates";

import { useAdminDeleteNewsletterSubscriber } from "../../hooks/use-admin-delete-newsletter-subscriber";
import { useAdminUnsubscribeNewsletter } from "../../hooks/use-admin-unsubscribe-newsletter";
import { NEWSLETTER_STATUS_LABELS } from "../../constants/newsletter-status.constants";

export const SUBSCRIBER_ITEM_DRAWER_ID = "subscriber-item-drawer";

export interface SubscriberItemDrawerData {
	subscriber: {
		id: string;
		email: string;
		status: NewsletterStatus;
		subscribedAt: Date;
	};
	[key: string]: unknown;
}

type AlertKind = "unsubscribe" | "delete" | null;

export function SubscriberItemDrawer() {
	const drawer = useDialog<SubscriberItemDrawerData>(SUBSCRIBER_ITEM_DRAWER_ID);
	const [alertKind, setAlertKind] = useState<AlertKind>(null);

	const { action: unsubscribeAction, isPending: isUnsubscribePending } =
		useAdminUnsubscribeNewsletter({
			onSuccess: () => setAlertKind(null),
		});
	const { action: deleteAction, isPending: isDeletePending } = useAdminDeleteNewsletterSubscriber({
		onSuccess: () => setAlertKind(null),
	});

	const subscriber = drawer.data?.subscriber;

	if (!subscriber) {
		return (
			<AdminItemDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="">
				{null}
			</AdminItemDrawer>
		);
	}

	const isAlreadyUnsubscribed = subscriber.status === NewsletterStatus.UNSUBSCRIBED;
	const statusLabel = NEWSLETTER_STATUS_LABELS[subscriber.status];

	const openAlert = (kind: Exclude<AlertKind, null>) => () => {
		drawer.close();
		setAlertKind(kind);
	};

	return (
		<>
			<AdminItemDrawer
				open={drawer.isOpen}
				onOpenChange={(o) => !o && drawer.close()}
				title={subscriber.email}
				description={statusLabel}
			>
				<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
					<dt className="text-muted-foreground">Email</dt>
					<dd className="truncate">{subscriber.email}</dd>
					<dt className="text-muted-foreground">Statut</dt>
					<dd className="flex items-center gap-1.5">
						{subscriber.status === NewsletterStatus.CONFIRMED ? (
							<CircleCheck className="size-4 text-green-600" aria-hidden="true" />
						) : subscriber.status === NewsletterStatus.PENDING ? (
							<Clock className="size-4 text-yellow-700" aria-hidden="true" />
						) : (
							<CircleX className="text-muted-foreground size-4" aria-hidden="true" />
						)}
						<Badge variant="secondary">{statusLabel}</Badge>
					</dd>
					<dt className="text-muted-foreground">Inscrit le</dt>
					<dd>{formatDateShort(subscriber.subscribedAt)}</dd>
				</dl>

				<div role="group" aria-label="Actions" className="flex flex-col gap-2">
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={openAlert("unsubscribe")}
						disabled={isAlreadyUnsubscribed}
					>
						<CircleX className="size-4" aria-hidden="true" />
						Désabonner
					</Button>
					<Button
						variant="outline"
						size="lg"
						className="text-destructive hover:text-destructive h-12 justify-start gap-3"
						onClick={openAlert("delete")}
					>
						<Trash2 className="size-4" aria-hidden="true" />
						Supprimer (RGPD)
					</Button>
				</div>
			</AdminItemDrawer>

			<AlertDialog
				open={alertKind === "unsubscribe"}
				onOpenChange={(o) => (!o ? setAlertKind(null) : null)}
			>
				<AlertDialogContent>
					<form action={unsubscribeAction}>
						<input type="hidden" name="subscriberId" value={subscriber.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Désabonner</AlertDialogTitle>
							<AlertDialogDescription>
								Désabonner <span className="font-semibold">{subscriber.email}</span> de la
								newsletter ?
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isUnsubscribePending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isUnsubscribePending}>
								{isUnsubscribePending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Désabonnement...
									</>
								) : (
									"Confirmer"
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={alertKind === "delete"}
				onOpenChange={(o) => (!o ? setAlertKind(null) : null)}
			>
				<AlertDialogContent>
					<form action={deleteAction}>
						<input type="hidden" name="subscriberId" value={subscriber.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer l&apos;abonné</AlertDialogTitle>
							<AlertDialogDescription>
								Supprimer définitivement <span className="font-semibold">{subscriber.email}</span>{" "}
								de la liste newsletter (conformité RGPD) ? L&apos;enregistrement sera conservé de
								manière anonymisée pour la conformité légale.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isDeletePending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" variant="destructive" disabled={isDeletePending}>
								{isDeletePending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Suppression...
									</>
								) : (
									<>
										<Trash2 className="mr-2 h-4 w-4" />
										Supprimer
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
