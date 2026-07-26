"use client";

import { Megaphone } from "lucide-react";
import { useActionState } from "react";

import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { useAppForm } from "@/shared/components/forms";
import {
	ANNOUNCEMENT_VARIANTS,
	ANNOUNCEMENT_VARIANT_CLASSES,
	ANNOUNCEMENT_VARIANT_LABELS,
	type AnnouncementVariant,
} from "@/shared/constants/announcement";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { updateAnnouncement } from "../../actions/update-announcement";
import type { StoreSettingsAdmin } from "../../types/store-settings.types";
import { formatParisDateForInput } from "../../utils/paris-datetime";

type AnnouncementFormProps = Pick<
	StoreSettingsAdmin,
	| "announcementMessage"
	| "announcementLink"
	| "announcementStartsAt"
	| "announcementEndsAt"
	| "announcementIsActive"
	| "announcementVariant"
>;

export function AnnouncementForm(props: AnnouncementFormProps) {
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const initial = {
		message: props.announcementMessage ?? "",
		link: props.announcementLink ?? "",
		startsAt: formatParisDateForInput(props.announcementStartsAt),
		endsAt: formatParisDateForInput(props.announcementEndsAt),
		isActive: props.announcementIsActive,
		variant: props.announcementVariant,
	};

	const form = useAppForm({ defaultValues: initial });

	const [state, formAction, isPending] = useActionState(
		withCallbacks(updateAnnouncement, createToastCallbacks({ loadingMessage: "Enregistrement…" })),
		undefined,
	);

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus du schéma serveur serait muet.
	const serverErrors = useServerFieldErrors({ state });

	// Gate de soumission : pas d'aller-retour serveur sur formulaire invalide, et
	// une resoumission en vol (touche Entrée) est ignorée.
	const handleGatedSubmit = useGatedFormSubmit({
		form,
		action: formAction,
		isPending,
		focusFirstInvalid,
		context: "AnnouncementForm",
	});

	const isMobile = useIsMobile();
	const { allowNavigation } = useUnsavedChanges(form.state.isDirty, !isPending);

	// Pas de `listPath` : l'annonce est éditée en place dans /admin/contenu/annonces,
	// il n'y a pas de liste parente vers laquelle Échap devrait ramener.
	useAdminFormKeyboard({
		formRef,
		isPending,
		isMobile,
		allowNavigation,
		getIsDirty: () => form.state.isDirty,
		getCanSubmit: () => form.state.canSubmit,
	});

	return (
		<form
			ref={formRef}
			action={formAction}
			onInvalidCapture={onInvalidCapture}
			onSubmit={handleGatedSubmit}
			className="space-y-5"
			aria-busy={isPending}
		>
			<FormServerErrorAlert errors={serverErrors} />

			<form.AppField name="isActive">
				{(field) => (
					<field.SwitchField
						label="Afficher le bandeau"
						description="Active la diffusion si la fenêtre horaire est valide."
						disabled={isPending}
					/>
				)}
			</form.AppField>

			<form.AppField name="message">
				{(field) => (
					<field.TextareaField
						label="Message"
						// Pas de promesse de livraison offerte : le checkout ne connaît pas de
						// seuil de gratuité, et un tarif à 0 casserait l'invariant
						// `shippingCost >= STRIPE_MIN_AMOUNT_EUR_CENTS`.
						placeholder="Nouvelle collection en ligne jusqu'à dimanche"
						maxLength={200}
						showCounter
						rows={2}
						disabled={isPending}
						enterKeyHint="next"
						autoCapitalize="sentences"
						className="resize-none"
					/>
				)}
			</form.AppField>

			<form.AppField name="link">
				{(field) => (
					<field.InputField
						label="Lien (optionnel)"
						placeholder="/collections/promo  ou  https://…"
						type="url"
						inputMode="url"
						disabled={isPending}
						maxLength={2048}
						enterKeyHint="next"
						autoCapitalize="none"
					/>
				)}
			</form.AppField>

			<form.AppField name="variant">
				{(field) => (
					<field.SelectField
						label="Tonalité"
						options={ANNOUNCEMENT_VARIANTS.map((value) => ({
							value,
							label: ANNOUNCEMENT_VARIANT_LABELS[value],
						}))}
						disabled={isPending}
					/>
				)}
			</form.AppField>

			<div className="grid gap-4 sm:grid-cols-2">
				<form.AppField name="startsAt">
					{(field) => (
						<field.DateTimeField
							label="Début (optionnel)"
							placeholder="Sélectionner"
							optional
							disabled={isPending}
							helpText="Vide = immédiat."
						/>
					)}
				</form.AppField>

				<form.AppField name="endsAt">
					{(field) => (
						<field.DateTimeField
							label="Fin (optionnel)"
							placeholder="Sélectionner"
							optional
							disabled={isPending}
							helpText="Un compte à rebours apparaît dans les 24 h avant la fin."
						/>
					)}
				</form.AppField>
			</div>

			<form.Subscribe
				selector={(state) => ({
					values: state.values,
				})}
			>
				{({ values }) => (
					<AnnouncementPreview
						message={values.message}
						isActive={values.isActive}
						variant={values.variant}
					/>
				)}
			</form.Subscribe>

			{/* `AdminFormFooter` et non un `flex justify-end` nu : ce formulaire compte
			    6 champs + une prévisualisation, donc sur mobile le bouton passait sous la
			    ligne de flottaison, derrière l'`AdminMobileBottomBar`. */}
			<AdminFormFooter pending={isPending}>
				<div className="flex justify-end">
					<form.AppForm>
						<form.SubmitButton
							isPending={isPending}
							idleLabel="Enregistrer"
							pendingLabel="Enregistrement…"
							showKbdHint
							className="w-full sm:w-auto sm:min-w-56"
						/>
					</form.AppForm>
				</div>
			</AdminFormFooter>
		</form>
	);
}

function AnnouncementPreview({
	message,
	isActive,
	variant,
}: {
	message: string;
	isActive: boolean;
	variant: AnnouncementVariant;
}) {
	const preview = message.trim() || "Votre message apparaîtra ici.";
	return (
		<div className="space-y-2">
			<div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
				<Megaphone className="size-3.5" aria-hidden="true" />
				<span>Aperçu</span>
			</div>
			<div
				className={cn(
					"relative flex h-11 items-center justify-center overflow-hidden rounded-md px-10 text-center text-sm font-medium tracking-wide",
					ANNOUNCEMENT_VARIANT_CLASSES[variant],
					!isActive && "opacity-50",
				)}
			>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 animate-[announcement-shimmer_3s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent motion-reduce:hidden"
				/>
				<span className="line-clamp-1">{preview}</span>
			</div>
			{!isActive && (
				<p className="text-muted-foreground text-xs">
					Inactif : activez la diffusion pour afficher le bandeau aux visiteurs.
				</p>
			)}
		</div>
	);
}
