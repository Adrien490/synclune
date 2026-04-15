"use client";

"use client";

import { startTransition } from "react";
import type { CustomizationRequestStatus } from "../../types/customization.types";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
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
import { useDialog } from "@/shared/providers/dialog-store-provider";
import {
	CircleCheck,
	Clock,
	Copy,
	LoaderCircle,
	Mail,
	EllipsisVertical,
	StickyNote,
	CircleX,
	Trash2,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { toast } from "sonner";
import { useState } from "react";

import { useUpdateCustomizationStatus } from "../../hooks/use-update-customization-status";
import { useDeleteCustomizationRequest } from "../../hooks/use-delete-customization-request";
import {
	CUSTOMIZATION_STATUS_LABELS,
	CUSTOMIZATION_STATUS_COLORS,
} from "../../constants/status.constants";
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

const ALL_STATUSES: CustomizationRequestStatus[] = [
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

	const handleOpenNotes = () => {
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

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-11 w-11 p-0 transition-transform active:scale-95"
						aria-label="Actions"
					>
						<EllipsisVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-52">
					<DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
						{clientName}
					</DropdownMenuLabel>
					<DropdownMenuSeparator />

					{/* Changer le statut */}
					<DropdownMenuSub>
						<DropdownMenuSubTrigger disabled={isPending}>
							<Clock className="h-4 w-4" />
							Changer le statut
						</DropdownMenuSubTrigger>
						<DropdownMenuPortal>
							<DropdownMenuSubContent>
								{ALL_STATUSES.map((status) => {
									const Icon = STATUS_ICONS[status];
									const isCurrentStatus = status === request.status;
									const colors = CUSTOMIZATION_STATUS_COLORS[status];

									return (
										<DropdownMenuItem
											key={status}
											onClick={() => handleStatusChange(status)}
											disabled={isPending || isCurrentStatus}
											className={isCurrentStatus ? "bg-muted" : ""}
										>
											<span
												className={cn(
													"inline-flex h-4 w-4 items-center justify-center rounded-full",
													colors.dot,
												)}
											>
												<Icon className="h-3 w-3 text-white" />
											</span>
											{CUSTOMIZATION_STATUS_LABELS[status]}
											{isCurrentStatus && (
												<span className="text-muted-foreground ml-auto text-xs">actuel</span>
											)}
										</DropdownMenuItem>
									);
								})}
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>

					{/* Notes internes */}
					<DropdownMenuItem onClick={handleOpenNotes}>
						<StickyNote className="h-4 w-4" />
						Notes internes
						{request.adminNotes && <span className="bg-primary ml-auto h-2 w-2 rounded-full" />}
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					{/* Actions email */}
					<DropdownMenuItem onClick={handleCopyEmail}>
						<Copy className="h-4 w-4" />
						Copier l'email
					</DropdownMenuItem>

					<DropdownMenuItem onClick={handleReplyEmail}>
						<Mail className="h-4 w-4" />
						Répondre par email
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						variant="destructive"
						onClick={() => setDeleteDialogOpen(true)}
						disabled={isPending || isDeletePending}
					>
						<Trash2 className="h-4 w-4" />
						Supprimer
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

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
