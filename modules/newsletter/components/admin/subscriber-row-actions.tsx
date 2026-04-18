"use client";

import { CircleX, EllipsisVertical, LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";

import { NewsletterStatus } from "@/app/generated/prisma/browser";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";

import { useAdminDeleteNewsletterSubscriber } from "../../hooks/use-admin-delete-newsletter-subscriber";
import { useAdminUnsubscribeNewsletter } from "../../hooks/use-admin-unsubscribe-newsletter";

interface SubscriberRowActionsProps {
	subscriber: {
		id: string;
		email: string;
		status: NewsletterStatus;
	};
}

export function SubscriberRowActions({ subscriber }: SubscriberRowActionsProps) {
	const [unsubscribeDialogOpen, setUnsubscribeDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const { action: unsubscribeAction, isPending: isUnsubscribePending } =
		useAdminUnsubscribeNewsletter({
			onSuccess: () => setUnsubscribeDialogOpen(false),
		});

	const { action: deleteAction, isPending: isDeletePending } = useAdminDeleteNewsletterSubscriber({
		onSuccess: () => setDeleteDialogOpen(false),
	});

	const isPending = isUnsubscribePending || isDeletePending;
	const isAlreadyUnsubscribed = subscriber.status === NewsletterStatus.UNSUBSCRIBED;

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				{
					key: "unsubscribe",
					label: "Désabonner",
					icon: CircleX,
					disabled: isPending || isAlreadyUnsubscribed,
					onSelect: () => setUnsubscribeDialogOpen(true),
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer (RGPD)",
					description: "Anonymisation pour conformité légale",
					icon: Trash2,
					variant: "destructive",
					disabled: isPending,
					onSelect: () => setDeleteDialogOpen(true),
				},
			],
		},
	];

	return (
		<>
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-11 w-11 p-0"
						aria-label={`Actions pour ${subscriber.email}`}
					>
						<EllipsisVertical className="h-4 w-4" />
					</Button>
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent
					title="Actions abonné"
					description={subscriber.email}
					sections={sections}
				/>
			</ResponsiveActionMenu>

			<AlertDialog open={unsubscribeDialogOpen} onOpenChange={setUnsubscribeDialogOpen}>
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

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<form action={deleteAction}>
						<input type="hidden" name="subscriberId" value={subscriber.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer l&apos;abonné</AlertDialogTitle>
							<AlertDialogDescription>
								Supprimer définitivement <span className="font-semibold">{subscriber.email}</span>{" "}
								de la liste newsletter (conformité RGPD) ?
								<br />
								<br />
								L&apos;enregistrement sera conservé de manière anonymisée pour la conformité légale.
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
