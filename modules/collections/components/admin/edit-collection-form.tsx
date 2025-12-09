"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { COLLECTION_STATUS_LABELS } from "@/modules/collections/constants/collection-status.constants";
import { Button } from "@/shared/components/ui/button";
import { useAppForm } from "@/shared/components/forms";
import { updateCollection } from "@/modules/collections/actions/update-collection";
import { cn } from "@/shared/utils/cn";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { toast } from "sonner";

/** Type minimal pour la collection en édition */
export interface EditableCollection {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	status: CollectionStatus;
}

interface EditCollectionFormProps {
	collection: EditableCollection;
	/** Callback appelé après succès */
	onSuccess?: () => void;
	/** Rediriger vers la liste après succès (défaut: true) */
	redirectOnSuccess?: boolean;
	/** Classes CSS additionnelles */
	className?: string;
}

export function EditCollectionForm({
	collection,
	onSuccess,
	redirectOnSuccess = true,
	className,
}: EditCollectionFormProps) {
	const router = useRouter();

	const form = useAppForm({
		defaultValues: {
			id: collection.id,
			slug: collection.slug,
			name: collection.name,
			description: collection.description ?? "",
			status: collection.status,
		},
	});

	const [, action, isPending] = useActionState(
		withCallbacks(
			updateCollection,
			createToastCallbacks({
				onSuccess: (result) => {
					
					onSuccess?.();
					if (redirectOnSuccess) {
						setTimeout(() => router.push("/admin/catalogue/collections"), 2000);
					}
				},
			})
		),
		undefined
	);

	return (
		<form
			action={action}
			className={cn("space-y-4", className)}
			onSubmit={() => {
				void form.handleSubmit();
			}}
		>
			{/* Hidden fields */}
			<input type="hidden" name="id" value={collection.id} />
			<input type="hidden" name="slug" value={collection.slug} />
			<form.Subscribe selector={(state) => [state.values.status]}>
				{([status]) => (
					<input type="hidden" name="status" value={status as string} />
				)}
			</form.Subscribe>

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
						rows={4}
					/>
				)}
			</form.AppField>

			{/* Status Field */}
			<form.AppField name="status">
				{(field) => (
					<field.SelectField
						label="Statut"
						options={Object.values(CollectionStatus).map((s) => ({
							value: s,
							label: COLLECTION_STATUS_LABELS[s],
						}))}
						disabled={isPending}
					/>
				)}
			</form.AppField>

			{/* Footer */}
			<div className="flex justify-end pt-4">
				<form.Subscribe selector={(state) => [state.canSubmit]}>
					{([canSubmit]) => (
						<Button
							type="submit"
							disabled={!canSubmit || isPending}
							className="min-w-[140px]"
						>
							{isPending ? "Enregistrement..." : "Enregistrer"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
