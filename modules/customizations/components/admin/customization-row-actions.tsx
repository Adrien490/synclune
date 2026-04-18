"use client";

import {
	CircleCheck,
	CircleX,
	Clock,
	Copy,
	EllipsisVertical,
	LoaderCircle,
	Mail,
	StickyNote,
	Trash2,
} from "lucide-react";
import { startTransition, useState } from "react";
import { toast } from "sonner";

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
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { CUSTOMIZATION_STATUS_LABELS } from "../../constants/status.constants";
import { useDeleteCustomizationRequest } from "../../hooks/use-delete-customization-request";
import { useUpdateCustomizationStatus } from "../../hooks/use-update-customization-status";
import type { CustomizationRequestStatus } from "../../types/customization.types";

import { UPDATE_NOTES_DIALOG_ID } from "./update-notes-dialog";

interface CustomizationRowActionsProps {
	request: {
		id: string;
		firstName: string;
		email: string;
		status: CustomizationRequestStatus;
		adminNotes: string | null;
	};
}

const STATUS_ICONS: Record<CustomizationRequestStatus, typeof Clock> = {
	PENDING: Clock,
	IN_PROGRESS: LoaderCircle,
	COMPLETED: CircleCheck,
	CANCELLED: CircleX,
};

const STATUS_ORDER: CustomizationRequestStatus[] = [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
];

export function CustomizationRowActions({ request }: CustomizationRowActionsProps) {
	const notesDialog = useDialog(UPDATE_NOTES_DIALOG_ID);
	const { action, isPending } = useUpdateCustomizationStatus();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const { action: deleteAction, isPending: isDeletePending } = useDeleteCustomizationRequest({
		onSuccess: () => setDeleteDialogOpen(false),
	});

	const clientName = request.firstName;

	const handleStatusChange = (newStatus: CustomizationRequestStatus) => {
		if (newStatus === request.status) return;
		const formData = new FormData();
		formData.set("requestId", request.id);
		formData.set("status", newStatus);
		startTransition(() => action(formData));
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

	const sections: ActionMenuSection[] = [
		{
			key: "status",
			label: "Statut",
			items: STATUS_ORDER.map((status) => ({
				key: `status-${status}`,
				label: CUSTOMIZATION_STATUS_LABELS[status],
				description: status === request.status ? "Statut actuel" : undefined,
				icon: STATUS_ICONS[status],
				disabled: isPending || status === request.status,
				variant: status === "CANCELLED" ? ("destructive" as const) : ("default" as const),
				onSelect: () => handleStatusChange(status),
			})),
		},
		{
			key: "notes",
			items: [
				{
					key: "notes",
					label: "Notes internes",
					description: request.adminNotes ? "Notes existantes" : undefined,
					icon: StickyNote,
					onSelect: () =>
						notesDialog.open({
							requestId: request.id,
							clientName,
							currentNotes: request.adminNotes,
						}),
				},
			],
		},
		{
			key: "email",
			label: "Email",
			items: [
				{
					key: "copy",
					label: "Copier l'email",
					icon: Copy,
					onSelect: handleCopyEmail,
				},
				{
					key: "reply",
					label: "Répondre par email",
					icon: Mail,
					onSelect: handleReplyEmail,
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer",
					icon: Trash2,
					variant: "destructive",
					disabled: isPending || isDeletePending,
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
						className="h-11 w-11 p-0 transition-transform active:scale-95"
						aria-label="Actions"
					>
						<EllipsisVertical className="h-4 w-4" />
					</Button>
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent
					title="Actions demande"
					description={clientName}
					sections={sections}
				/>
			</ResponsiveActionMenu>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<form action={deleteAction}>
						<input type="hidden" name="requestId" value={request.id} />
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer la demande</AlertDialogTitle>
							<AlertDialogDescription>
								Supprimer la demande de <span className="font-semibold">{request.firstName}</span> (
								{request.email}) ?
								<br />
								<br />
								Cette action est irréversible. La demande sera définitivement supprimée.
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
