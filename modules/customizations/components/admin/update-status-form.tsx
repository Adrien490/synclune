"use client";

import { useActionState, useTransition } from "react";
import type { CustomizationRequestStatus } from "../../types/customization.types";
import { Button } from "@/shared/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { updateCustomizationStatus } from "@/modules/customizations/actions/update-customization-status";
import { CUSTOMIZATION_STATUS_LABELS } from "@/modules/customizations/constants/status.constants";
import { useState } from "react";

interface UpdateStatusFormProps {
	requestId: string;
	currentStatus: CustomizationRequestStatus;
}

export function UpdateStatusForm({
	requestId,
	currentStatus,
}: UpdateStatusFormProps) {
	const [isPending, startTransition] = useTransition();
	const [selectedStatus, setSelectedStatus] = useState<CustomizationRequestStatus>(currentStatus);

	const [, action] = useActionState(
		withCallbacks(updateCustomizationStatus, createToastCallbacks({
			loadingMessage: "Mise à jour du statut...",
		})),
		undefined
	);

	const handleSubmit = () => {
		if (selectedStatus === currentStatus) return;

		startTransition(() => {
			const formData = new FormData();
			formData.set("requestId", requestId);
			formData.set("status", selectedStatus);
			action(formData);
		});
	};

	const statusOptions = Object.entries(CUSTOMIZATION_STATUS_LABELS).map(
		([value, label]) => ({
			value: value as CustomizationRequestStatus,
			label,
		})
	);

	return (
		<div className="space-y-3">
			<div className="space-y-2">
				<Label htmlFor="status">Changer le statut</Label>
				<Select
					value={selectedStatus}
					onValueChange={(value) => setSelectedStatus(value as CustomizationRequestStatus)}
					disabled={isPending}
				>
					<SelectTrigger id="status">
						<SelectValue placeholder="Sélectionner un statut" />
					</SelectTrigger>
					<SelectContent>
						{statusOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<Button
				onClick={handleSubmit}
				disabled={isPending || selectedStatus === currentStatus}
				className="w-full"
			>
				{isPending ? "Mise à jour..." : "Mettre à jour"}
			</Button>
		</div>
	);
}
