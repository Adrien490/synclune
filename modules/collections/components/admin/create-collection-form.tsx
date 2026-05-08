"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { COLLECTION_STATUS_LABELS } from "@/modules/collections/constants/collection-status.constants";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { Button } from "@/shared/components/ui/button";
import { useAppForm } from "@/shared/components/forms";
import { createCollection } from "@/modules/collections/actions/create-collection";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { cn } from "@/shared/utils/cn";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { toast } from "@/shared/utils/toast";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface CreateCollectionFormProps {
	/** Callback appelé après succès */
	onSuccess?: () => void;
	/** Rediriger vers la liste après succès (défaut: true) */
	redirectOnSuccess?: boolean;
	/** Classes CSS additionnelles */
	className?: string;
}

export function CreateCollectionForm({
	onSuccess,
	redirectOnSuccess = true,
	className,
}: CreateCollectionFormProps = {}) {
	const router = useRouter();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const form = useAppForm({
		defaultValues: {
			name: "",
			description: "",
			status: CollectionStatus.DRAFT as CollectionStatus,
		},
	});

	const [, action, isPending] = useActionState(
		withCallbacks(
			createCollection,
			createToastCallbacks({
				loadingMessage: "Création de la collection…",
				showSuccessToast: false,
				onSuccess: (result) => {
					form.reset();
					const data = (result as { data?: { collectionStatus?: CollectionStatus } }).data;
					const statusActionLabels: Record<CollectionStatus, string> = {
						[CollectionStatus.DRAFT]: "Voir les brouillons",
						[CollectionStatus.PUBLIC]: "Voir les publiées",
						[CollectionStatus.ARCHIVED]: "Voir les archivées",
					};
					toast.success(
						(result as { message?: string }).message ?? "Collection créée avec succès",
						{
							action: data?.collectionStatus
								? {
										label: statusActionLabels[data.collectionStatus],
										onClick: () =>
											router.push(`/admin/catalogue/collections?status=${data.collectionStatus}`),
									}
								: undefined,
						},
					);
					onSuccess?.();
					if (redirectOnSuccess) {
						setTimeout(
							() => withViewTransition(() => router.push("/admin/catalogue/collections")),
							FORM_SUCCESS_REDIRECT_DELAY_MS,
						);
					}
				},
			}),
		),
		undefined,
	);

	return (
		<form
			ref={formRef}
			action={action}
			className={cn("space-y-4", className)}
			onInvalidCapture={onInvalidCapture}
			onSubmit={() => {
				void form.handleSubmit();
				if (!form.state.canSubmit) {
					focusFirstInvalid();
				}
			}}
		>
			{/* Hidden field pour status */}
			<form.Subscribe selector={(state) => [state.values.status]}>
				{([status]) => <input type="hidden" name="status" value={status as string} />}
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
						autoCapitalize="words"
						enterKeyHint="next"
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
						placeholder="Décrivez cette collection…"
						disabled={isPending}
						rows={4}
					/>
				)}
			</form.AppField>

			{/* Status Field - Only DRAFT and PUBLIC for creation */}
			<form.AppField name="status">
				{(field) => (
					<field.SelectField
						label="Statut"
						options={[CollectionStatus.DRAFT, CollectionStatus.PUBLIC].map((s) => ({
							value: s,
							label: COLLECTION_STATUS_LABELS[s],
						}))}
						disabled={isPending}
					/>
				)}
			</form.AppField>

			<AdminFormFooter pending={isPending}>
				<div className="flex justify-end">
					<form.Subscribe selector={(state) => [state.canSubmit]}>
						{([canSubmit]) => (
							<Button type="submit" disabled={!canSubmit || isPending} className="min-w-35">
								{isPending ? "Création…" : "Créer"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</AdminFormFooter>
		</form>
	);
}
