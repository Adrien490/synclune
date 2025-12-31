"use client";

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
import { useDialog } from "@/shared/providers/dialog-store-provider";
import {
	CheckCircle,
	Clock,
	Copy,
	Loader2,
	Mail,
	MoreVertical,
	StickyNote,
	XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useUpdateCustomizationStatus } from "../../hooks/use-update-customization-status";
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
	IN_PROGRESS: Loader2,
	COMPLETED: CheckCircle,
	CANCELLED: XCircle,
};

const ALL_STATUSES: CustomizationRequestStatus[] = [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
];

export function CustomizationRowActions({
	request,
}: CustomizationRowActionsProps) {
	const notesDialog = useDialog(UPDATE_NOTES_DIALOG_ID);
	const { action, isPending } = useUpdateCustomizationStatus();

	const clientName = request.firstName;

	const handleStatusChange = (newStatus: CustomizationRequestStatus) => {
		if (newStatus === request.status) return;

		const formData = new FormData();
		formData.set("requestId", request.id);
		formData.set("status", newStatus);
		action(formData);
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
			`mailto:${request.email}?subject=RE: Demande de personnalisation - Synclune`,
			"_blank"
		);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-11 w-11 p-0 active:scale-95 transition-transform" aria-label="Actions">
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				<DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
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
											className={`inline-flex items-center justify-center h-4 w-4 rounded-full ${colors.dot}`}
										>
											<Icon className="h-3 w-3 text-white" />
										</span>
										{CUSTOMIZATION_STATUS_LABELS[status]}
										{isCurrentStatus && (
											<span className="ml-auto text-xs text-muted-foreground">
												actuel
											</span>
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
					{request.adminNotes && (
						<span className="ml-auto h-2 w-2 rounded-full bg-primary" />
					)}
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
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
