"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/shared/components/ui/button";
import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { createAnnouncement } from "../../actions/create-announcement";
import { updateAnnouncement } from "../../actions/update-announcement";
import { ANNOUNCEMENT_FORM_DIALOG_ID } from "../../constants/dialog";
import type { AnnouncementDialogData } from "../../types/content.types";
import { AnnouncementPreview } from "./announcement-preview";

function formatDateForInput(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function AnnouncementFormDialog() {
	const { isOpen, close, data } = useDialog<AnnouncementDialogData>(ANNOUNCEMENT_FORM_DIALOG_ID);
	const announcement = data?.announcement;
	const isUpdateMode = !!announcement;

	const form = useAppForm({
		defaultValues: {
			message: "",
			link: "",
			linkText: "",
			startsAt: "",
			endsAt: "",
			dismissDurationHours: "24",
		},
	});

	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createAnnouncement,
			createToastCallbacks({
				onSuccess: () => {
					close();
					form.reset();
				},
			}),
		),
		undefined,
	);

	const [, updateAction, isUpdatePending] = useActionState(
		withCallbacks(
			updateAnnouncement,
			createToastCallbacks({
				onSuccess: () => {
					close();
				},
			}),
		),
		undefined,
	);

	const isPending = isCreatePending || isUpdatePending;
	const action = isUpdateMode ? updateAction : createAction;

	useEffect(() => {
		if (announcement) {
			form.reset({
				message: announcement.message,
				link: announcement.link ?? "",
				linkText: announcement.linkText ?? "",
				startsAt: formatDateForInput(new Date(announcement.startsAt)),
				endsAt: announcement.endsAt ? formatDateForInput(new Date(announcement.endsAt)) : "",
				dismissDurationHours: String(announcement.dismissDurationHours),
			});
		} else {
			form.reset({
				message: "",
				link: "",
				linkText: "",
				startsAt: "",
				endsAt: "",
				dismissDurationHours: "24",
			});
		}
	}, [announcement, form]);

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			close();
		}
	};

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle>
						{isUpdateMode ? "Modifier l'annonce" : "Nouvelle annonce"}
					</ResponsiveDialogTitle>
				</ResponsiveDialogHeader>

				<form action={action} className="flex min-h-0 flex-1 flex-col">
					<div className="flex-1 space-y-6 overflow-y-auto pr-2">
						{isUpdateMode && <input type="hidden" name="id" value={announcement!.id} />}
						<RequiredFieldsNote />

						<form.AppField name="message">
							{(field) => (
								<field.TextareaField
									label="Message"
									placeholder="Ex: Livraison offerte dès 50€ d'achat !"
									required
									maxLength={200}
								/>
							)}
						</form.AppField>

						<div className="grid gap-4 sm:grid-cols-2">
							<form.AppField name="link">
								{(field) => (
									<field.InputField
										label="Lien (URL)"
										placeholder="Ex: /boutique/collections/soldes"
										optional
									/>
								)}
							</form.AppField>

							<form.AppField name="linkText">
								{(field) => (
									<field.InputField label="Texte du lien" placeholder="Ex: En profiter" optional />
								)}
							</form.AppField>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<form.AppField name="startsAt">
								{(field) => (
									<field.DateTimeField label="Date de début" optional placeholder="Maintenant" />
								)}
							</form.AppField>

							<form.AppField name="endsAt">
								{(field) => (
									<field.DateTimeField label="Date de fin" optional placeholder="Pas de fin" />
								)}
							</form.AppField>
						</div>

						<form.AppField name="dismissDurationHours">
							{(field) => (
								<field.InputField
									label="Durée avant réapparition (heures)"
									type="number"
									required
								/>
							)}
						</form.AppField>

						<form.Subscribe selector={(state) => [state.values.message, state.values.linkText]}>
							{([message, linkText]) => (
								<AnnouncementPreview message={message ?? ""} linkText={linkText ?? null} />
							)}
						</form.Subscribe>
					</div>

					<div className="mt-4 flex shrink-0 justify-end border-t pt-4">
						<Button disabled={isPending} type="submit">
							{isPending ? "Enregistrement..." : isUpdateMode ? "Enregistrer" : "Créer l'annonce"}
						</Button>
					</div>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
