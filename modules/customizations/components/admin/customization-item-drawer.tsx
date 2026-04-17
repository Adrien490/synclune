"use client";

import { startTransition, useState } from "react";
import {
	CircleCheck,
	CircleX,
	Clock,
	Copy,
	Eye,
	LoaderCircle,
	Mail,
	StickyNote,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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
import { cn } from "@/shared/utils/cn";

import { useDeleteCustomizationRequest } from "../../hooks/use-delete-customization-request";
import { useUpdateCustomizationStatus } from "../../hooks/use-update-customization-status";
import {
	CUSTOMIZATION_STATUS_COLORS,
	CUSTOMIZATION_STATUS_LABELS,
} from "../../constants/status.constants";
import type { CustomizationRequestStatus } from "../../types/customization.types";
import { UPDATE_NOTES_DIALOG_ID } from "./update-notes-dialog";

export const CUSTOMIZATION_ITEM_DRAWER_ID = "customization-item-drawer";

export interface CustomizationItemDrawerData {
	request: {
		id: string;
		firstName: string;
		email: string;
		status: CustomizationRequestStatus;
		adminNotes: string | null;
		productTypeLabel: string;
		inspirationCount: number;
		createdAt: Date;
	};
	[key: string]: unknown;
}

const STATUS_ICONS: Record<CustomizationRequestStatus, typeof Clock> = {
	PENDING: Clock,
	IN_PROGRESS: LoaderCircle,
	COMPLETED: CircleCheck,
	CANCELLED: CircleX,
};

const ALL_STATUSES: CustomizationRequestStatus[] = [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
];

export function CustomizationItemDrawer() {
	const drawer = useDialog<CustomizationItemDrawerData>(CUSTOMIZATION_ITEM_DRAWER_ID);
	const notesDialog = useDialog(UPDATE_NOTES_DIALOG_ID);
	const { action, isPending } = useUpdateCustomizationStatus();
	const [deleteOpen, setDeleteOpen] = useState(false);
	const { action: deleteAction, isPending: isDeletePending } = useDeleteCustomizationRequest({
		onSuccess: () => setDeleteOpen(false),
	});

	const request = drawer.data?.request;

	if (!request) {
		return (
			<AdminItemDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="">
				{null}
			</AdminItemDrawer>
		);
	}

	const clientName = request.firstName;
	const statusLabel = CUSTOMIZATION_STATUS_LABELS[request.status];
	const statusColors = CUSTOMIZATION_STATUS_COLORS[request.status];
	const StatusIcon = STATUS_ICONS[request.status];

	const handleStatusChange = (newStatus: CustomizationRequestStatus) => {
		if (newStatus === request.status) return;
		const formData = new FormData();
		formData.set("requestId", request.id);
		formData.set("status", newStatus);
		startTransition(() => action(formData));
	};

	const handleOpenNotes = () => {
		drawer.close();
		notesDialog.open({
			requestId: request.id,
			clientName,
			currentNotes: request.adminNotes,
		});
	};

	const handleCopyEmail = async () => {
		try {
			await navigator.clipboard.writeText(request.email);
			toast.success("Email copié");
		} catch {
			toast.error("Impossible de copier l'email");
		}
	};

	const handleReplyEmail = () => {
		window.open(
			`mailto:${encodeURIComponent(request.email)}?subject=${encodeURIComponent("RE: Demande de personnalisation - Synclune")}`,
			"_blank",
		);
	};

	const handleDelete = () => {
		drawer.close();
		setDeleteOpen(true);
	};

	return (
		<>
			<AdminItemDrawer
				open={drawer.isOpen}
				onOpenChange={(o) => !o && drawer.close()}
				title={clientName}
				description={`${request.email} · ${statusLabel}`}
			>
				<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
					<dt className="text-muted-foreground">Email</dt>
					<dd className="truncate">{request.email}</dd>
					<dt className="text-muted-foreground">Type</dt>
					<dd>{request.productTypeLabel}</dd>
					<dt className="text-muted-foreground">Statut</dt>
					<dd className="flex items-center gap-1.5">
						<span
							className={cn(
								"inline-flex h-4 w-4 items-center justify-center rounded-full",
								statusColors.dot,
							)}
						>
							<StatusIcon className="h-3 w-3 text-white" aria-hidden="true" />
						</span>
						<Badge variant="secondary">{statusLabel}</Badge>
					</dd>
					<dt className="text-muted-foreground">Inspirations</dt>
					<dd>{request.inspirationCount}</dd>
					{request.adminNotes ? (
						<>
							<dt className="text-muted-foreground">Notes</dt>
							<dd className="text-pretty whitespace-pre-wrap">{request.adminNotes}</dd>
						</>
					) : null}
				</dl>

				<div role="group" aria-label="Changer le statut" className="space-y-2">
					<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						Changer le statut
					</p>
					<div className="grid grid-cols-2 gap-2">
						{ALL_STATUSES.map((status) => {
							const Icon = STATUS_ICONS[status];
							const isCurrent = status === request.status;
							const colors = CUSTOMIZATION_STATUS_COLORS[status];
							return (
								<Button
									key={status}
									variant={isCurrent ? "default" : "outline"}
									size="sm"
									className="h-10 justify-start gap-2"
									onClick={() => handleStatusChange(status)}
									disabled={isPending || isCurrent}
								>
									<span
										className={cn(
											"inline-flex h-4 w-4 items-center justify-center rounded-full",
											colors.dot,
										)}
									>
										<Icon className="h-3 w-3 text-white" aria-hidden="true" />
									</span>
									<span className="truncate">{CUSTOMIZATION_STATUS_LABELS[status]}</span>
								</Button>
							);
						})}
					</div>
				</div>

				<div role="group" aria-label="Actions" className="flex flex-col gap-2">
					<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
						<Link
							href={`/admin/marketing/personnalisations/${request.id}`}
							onClick={() => drawer.close()}
						>
							<Eye className="size-4" aria-hidden="true" />
							Voir la demande
						</Link>
					</Button>
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleOpenNotes}
					>
						<StickyNote className="size-4" aria-hidden="true" />
						Notes internes
						{request.adminNotes ? (
							<span className="bg-primary ml-auto size-2 rounded-full" aria-hidden="true" />
						) : null}
					</Button>
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleCopyEmail}
					>
						<Copy className="size-4" aria-hidden="true" />
						Copier l&apos;email
					</Button>
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleReplyEmail}
					>
						<Mail className="size-4" aria-hidden="true" />
						Répondre par email
					</Button>
					<Button
						variant="outline"
						size="lg"
						className="text-destructive hover:text-destructive h-12 justify-start gap-3"
						onClick={handleDelete}
						disabled={isPending || isDeletePending}
					>
						<Trash2 className="size-4" aria-hidden="true" />
						Supprimer
					</Button>
				</div>
			</AdminItemDrawer>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<form action={deleteAction}>
						<input type="hidden" name="requestId" value={request.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer la demande</AlertDialogTitle>
							<AlertDialogDescription>
								Supprimer la demande de <span className="font-semibold">{request.firstName}</span> (
								{request.email}) ? Cette action est irréversible. La demande sera définitivement
								supprimée.
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
