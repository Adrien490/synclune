"use client";

import { LoaderCircle, Megaphone } from "lucide-react";
import { useActionState } from "react";

import { useAppForm } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { updateAnnouncement } from "../../actions/update-announcement";
import type { StoreSettingsAdmin } from "../../types/store-settings.types";
import { formatDateForInput } from "../../utils/format-date-for-input";

type AnnouncementFormProps = Pick<
	StoreSettingsAdmin,
	| "announcementMessage"
	| "announcementLink"
	| "announcementStartsAt"
	| "announcementEndsAt"
	| "announcementIsActive"
>;

export function AnnouncementForm(props: AnnouncementFormProps) {
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const initial = {
		message: props.announcementMessage ?? "",
		link: props.announcementLink ?? "",
		startsAt: formatDateForInput(props.announcementStartsAt),
		endsAt: formatDateForInput(props.announcementEndsAt),
		isActive: props.announcementIsActive,
	};

	const form = useAppForm({ defaultValues: initial });

	const [, formAction, isPending] = useActionState(
		withCallbacks(updateAnnouncement, createToastCallbacks({ loadingMessage: "Enregistrement…" })),
		undefined,
	);

	return (
		<form
			ref={formRef}
			action={formAction}
			onInvalidCapture={onInvalidCapture}
			onSubmit={() => queueMicrotask(focusFirstInvalid)}
			className="space-y-5"
			aria-busy={isPending}
		>
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
						placeholder="Livraison offerte dès 50 € jusqu'à dimanche"
						maxLength={200}
						showCounter
						rows={2}
						disabled={isPending}
						enterKeyHint="next"
						autoCapitalize="sentences"
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
					<AnnouncementPreview message={values.message} isActive={values.isActive} />
				)}
			</form.Subscribe>

			<div className="flex justify-end border-t pt-4">
				<Button
					type="submit"
					size="sm"
					disabled={isPending}
					aria-busy={isPending}
					onClick={() => triggerHaptic("light")}
					className="min-h-11"
				>
					{isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
					{isPending ? "Enregistrement…" : "Enregistrer"}
				</Button>
			</div>
		</form>
	);
}

function AnnouncementPreview({ message, isActive }: { message: string; isActive: boolean }) {
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
					"bg-primary text-primary-foreground",
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
