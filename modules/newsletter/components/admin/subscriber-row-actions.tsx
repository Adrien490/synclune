"use client";

import { NewsletterStatus } from "@/app/generated/prisma/enums";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
	Loader2,
	Mail,
	MailX,
	MoreVertical,
	RefreshCw,
	Trash2,
	UserCheck,
} from "lucide-react";
import { memo, useState } from "react";
import { useSubscriberActions } from "@/modules/newsletter/hooks/use-subscriber-actions";

interface SubscriberRowActionsProps {
	subscriber: {
		id: string;
		email: string;
		status: NewsletterStatus;
		confirmedAt?: Date | null;
	};
}

export const SubscriberRowActions = memo(function SubscriberRowActions({
	subscriber,
}: SubscriberRowActionsProps) {
	const [unsubscribeDialogOpen, setUnsubscribeDialogOpen] = useState(false);
	const [resubscribeDialogOpen, setResubscribeDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const {
		unsubscribe,
		resubscribe,
		resendConfirmation,
		deleteSubscriber,
		isPending,
	} = useSubscriberActions({
		onSuccess: () => {
			setUnsubscribeDialogOpen(false);
			setResubscribeDialogOpen(false);
			setDeleteDialogOpen(false);
		},
	});

	const isConfirmed = subscriber.status === NewsletterStatus.CONFIRMED;
	const canResendConfirmation = subscriber.status === NewsletterStatus.PENDING;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0" aria-label="Actions">
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{/* Renvoyer email de confirmation */}
					{canResendConfirmation && (
						<DropdownMenuItem
							onClick={() => resendConfirmation(subscriber.id)}
							disabled={isPending}
							className="flex items-center cursor-pointer"
						>
							<Mail className="mr-2 h-4 w-4" />
							Renvoyer confirmation
						</DropdownMenuItem>
					)}

					{/* Activer/Désactiver */}
					{isConfirmed ? (
						<DropdownMenuItem
							onClick={() => setUnsubscribeDialogOpen(true)}
							className="flex items-center cursor-pointer"
						>
							<MailX className="mr-2 h-4 w-4" />
							Désabonner
						</DropdownMenuItem>
					) : subscriber.status === NewsletterStatus.UNSUBSCRIBED && subscriber.confirmedAt ? (
						<DropdownMenuItem
							onClick={() => setResubscribeDialogOpen(true)}
							className="flex items-center cursor-pointer"
						>
							<UserCheck className="mr-2 h-4 w-4" />
							Réabonner
						</DropdownMenuItem>
					) : null}

					<DropdownMenuSeparator />

					{/* Supprimer */}
					<DropdownMenuItem
						onClick={() => setDeleteDialogOpen(true)}
						className="flex items-center cursor-pointer text-destructive focus:text-destructive"
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Supprimer
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Unsubscribe Dialog */}
			<AlertDialog open={unsubscribeDialogOpen} onOpenChange={setUnsubscribeDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Désabonner</AlertDialogTitle>
						<AlertDialogDescription>
							Es-tu sûr(e) de vouloir désabonner{" "}
							<span className="font-semibold">{subscriber.email}</span> ?
							<br /><br />
							L'abonné ne recevra plus d'emails de la newsletter.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
						<Button
							onClick={() => unsubscribe(subscriber.id)}
							disabled={isPending}
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Désabonnement...
								</>
							) : (
								<>
									<MailX className="mr-2 h-4 w-4" />
									Désabonner
								</>
							)}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Resubscribe Dialog */}
			<AlertDialog open={resubscribeDialogOpen} onOpenChange={setResubscribeDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Réabonner</AlertDialogTitle>
						<AlertDialogDescription>
							Es-tu sûr(e) de vouloir réabonner{" "}
							<span className="font-semibold">{subscriber.email}</span> ?
							<br /><br />
							L'abonné recevra à nouveau les emails de la newsletter.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
						<Button
							onClick={() => resubscribe(subscriber.id)}
							disabled={isPending}
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Réabonnement...
								</>
							) : (
								<>
									<UserCheck className="mr-2 h-4 w-4" />
									Réabonner
								</>
							)}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer définitivement</AlertDialogTitle>
						<AlertDialogDescription>
							Es-tu sûr(e) de vouloir supprimer définitivement{" "}
							<span className="font-semibold">{subscriber.email}</span> ?
							<br /><br />
							<span className="text-destructive font-medium">
								Cette action est irréversible. Toutes les données seront effacées (RGPD).
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
						<Button
							onClick={() => deleteSubscriber(subscriber.id)}
							disabled={isPending}
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
});
