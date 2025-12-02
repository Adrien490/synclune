"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { COLLECTION_STATUS_LABELS } from "@/modules/collections/constants/collection-status.constants";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { useAppForm } from "@/shared/components/forms";
import { createCollection } from "@/modules/collections/actions/create-collection";
import { updateCollection } from "@/modules/collections/actions/update-collection";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

export const COLLECTION_DIALOG_ID = "collection-form";

interface CollectionDialogData extends Record<string, unknown> {
	collection?: {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		status: CollectionStatus;
	};
}

export function CollectionFormDialog() {
	const router = useRouter();
	const { isOpen, close, data } =
		useDialog<CollectionDialogData>(COLLECTION_DIALOG_ID);
	const collection = data?.collection;
	const isUpdateMode = !!collection;

	// Single form instance
	const form = useAppForm({
		defaultValues: {
			name: "",
			description: "",
			status: CollectionStatus.DRAFT as CollectionStatus,
		},
	});

	// Create action
	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createCollection,
			createToastCallbacks({
				showSuccessToast: false,
				onSuccess: (result) => {
					close();
					form.reset();
					const data = result?.data as { collectionStatus?: CollectionStatus } | undefined;
					const statusActionLabels: Record<CollectionStatus, string> = {
						[CollectionStatus.DRAFT]: "Voir les brouillons",
						[CollectionStatus.PUBLIC]: "Voir les publiées",
						[CollectionStatus.ARCHIVED]: "Voir les archivées",
					};
					toast.success(result?.message || "Collection créée avec succès", {
						action: data?.collectionStatus
							? {
									label: statusActionLabels[data.collectionStatus],
									onClick: () =>
										router.push(
											`/admin/catalogue/collections?status=${data.collectionStatus}`
										),
								}
							: undefined,
					});
				},
			})
		),
		undefined
	);

	// Update action
	const [, updateAction, isUpdatePending] = useActionState(
		withCallbacks(
			updateCollection,
			createToastCallbacks({
				onSuccess: () => {
					close();
				},
			})
		),
		undefined
	);

	const isPending = isCreatePending || isUpdatePending;
	const action = isUpdateMode ? updateAction : createAction;

	// Reset form values when collection data changes
	useEffect(() => {
		if (collection) {
			form.reset({
				name: collection.name,
				description: collection.description ?? "",
				status: collection.status,
			});
		} else {
			form.reset({
				name: "",
				description: "",
				status: CollectionStatus.DRAFT,
			});
		}
	}, [collection, form]);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isPending) {
					close();
				}
			}}
		>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isUpdateMode ? "Modifier la collection" : "Créer une collection"}
					</DialogTitle>
				</DialogHeader>

				<form
					action={action}
					className="space-y-6"
					onSubmit={() => form.handleSubmit()}
				>
					{/* Hidden fields for update mode */}
					{isUpdateMode && collection && (
						<>
							<input type="hidden" name="id" value={collection.id} />
							<input type="hidden" name="slug" value={collection.slug} />
						</>
					)}

					{/* Champ caché pour sérialiser le status */}
					<form.Subscribe selector={(state) => [state.values.status]}>
						{([status]) => (
							<input type="hidden" name="status" value={status} />
						)}
					</form.Subscribe>

					<RequiredFieldsNote />

					<div className="space-y-4">
						{/* Name Field */}
						<form.AppField
							name="name"
							validators={{
								onChange: ({ value }) => {
									if (!value || value.length < 1) {
										return "Le nom est requis";
									}
									if (value.length > 100) {
										return "Le nom ne peut pas dépasser 100 caractères";
									}
									return undefined;
								},
							}}
						>
							{(field) => (
								<field.InputField
									label="Nom"
									type="text"
									placeholder="ex: Nouveautés 2025, Collection Été"
									disabled={isPending}
									required
								/>
							)}
						</form.AppField>

						{/* Description Field */}
						<form.AppField
							name="description"
							validators={{
								onChange: ({ value }) => {
									if (value && value.length > 1000) {
										return "La description ne peut pas dépasser 1000 caractères";
									}
									return undefined;
								},
							}}
						>
							{(field) => (
								<field.TextareaField
									label="Description"
									placeholder="Décrivez cette collection..."
									disabled={isPending}
									rows={5}
								/>
							)}
						</form.AppField>

						{/* Status Field - ARCHIVED only in edit mode */}
						<form.AppField name="status">
							{(field) => {
								const availableStatuses = isUpdateMode
									? Object.values(CollectionStatus)
									: [CollectionStatus.DRAFT, CollectionStatus.PUBLIC];

								return (
									<div className="space-y-2">
										<Label htmlFor="collection-status">Statut</Label>
										<Select
											value={field.state.value}
											onValueChange={(value) => field.handleChange(value as CollectionStatus)}
											disabled={isPending}
										>
											<SelectTrigger id="collection-status" className="w-full">
												<SelectValue placeholder="Sélectionner un statut" />
											</SelectTrigger>
											<SelectContent>
												{availableStatuses.map((status) => (
													<SelectItem key={status} value={status}>
														{COLLECTION_STATUS_LABELS[status]}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<p className="text-xs text-muted-foreground">
											Seules les collections publiées sont visibles sur le site.
											L&apos;image de la collection sera celle du produit vedette.
										</p>
									</div>
								);
							}}
						</form.AppField>
					</div>

					{/* Submit button */}
					<div className="flex justify-end pt-4">
						<form.Subscribe selector={(state) => [state.canSubmit]}>
							{([canSubmit]) => (
								<Button
									disabled={!canSubmit || isPending}
									type="submit"
								>
									{isPending
										? "Enregistrement..."
										: isUpdateMode
											? "Enregistrer"
											: "Créer"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
