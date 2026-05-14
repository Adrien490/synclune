"use client";

import { Loader2 } from "lucide-react";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { COLLECTION_STATUS_LABELS } from "@/modules/collections/constants/collection-status.constants";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { Button } from "@/shared/components/ui/button";
import { useAppForm } from "@/shared/components/forms";
import { updateCollection } from "@/modules/collections/actions/update-collection";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { withViewTransition } from "@/shared/utils/with-view-transition";
import type { EditableCollection } from "@/modules/collections/types/editable-collection.types";

export type { EditableCollection };

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
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const form = useAppForm({
		defaultValues: {
			id: collection.id,
			name: collection.name,
			description: collection.description ?? "",
			status: collection.status,
		},
	});

	const isPublic = collection.status === CollectionStatus.PUBLIC;

	const [, action, isPending] = useActionState(
		withCallbacks(
			updateCollection,
			createToastCallbacks({
				loadingMessage: "Mise à jour de la collection…",
				onSuccess: (_result) => {
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

	// Mobile : pas de garde unsaved-changes (les confirms beforeunload/popstate
	// natifs sont peu utiles sur mobile et entrent en conflit avec les gestes
	// swipe-back iOS / Android — UX moins bonne que la perte de saisie).
	useUnsavedChanges(form.state.isDirty, !isPending && !isMobile);

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
			{/* Hidden fields */}
			<input type="hidden" name="id" value={collection.id} />
			<form.Subscribe selector={(state) => [state.values.status]}>
				{([status]) => <input type="hidden" name="status" value={status as string} />}
			</form.Subscribe>

			{/* Name Field */}
			<div className="space-y-1.5">
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
							if (isPublic && value !== collection.name) {
								return "Une collection publiée ne peut pas être renommée (SEO). Repassez-la en brouillon d'abord.";
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
							disabled={isPending || isPublic}
							required
							autoCapitalize="words"
							enterKeyHint="next"
						/>
					)}
				</form.AppField>
				{isPublic && (
					<p className="text-muted-foreground text-xs">
						Le nom est verrouillé tant que la collection est publiée pour préserver l&apos;URL et le
						SEO.
					</p>
				)}
			</div>

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

			<AdminFormFooter pending={isPending}>
				<div className="flex justify-end">
					<form.Subscribe selector={(state) => [state.canSubmit]}>
						{([canSubmit]) => (
							<Button
								type="submit"
								size="input"
								disabled={!canSubmit || isPending}
								onClick={() => haptic("medium")}
								className="w-full sm:w-auto sm:min-w-56"
							>
								{isPending && (
									<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
								)}
								<span>{isPending ? "Enregistrement…" : "Enregistrer"}</span>
							</Button>
						)}
					</form.Subscribe>
				</div>
			</AdminFormFooter>
		</form>
	);
}
