"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createProductType } from "@/modules/product-types/actions/create-product-type";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface CreateProductTypeFormProps {
	onSuccess?: () => void;
	onCreated?: (id: string) => void;
	redirectOnSuccess?: boolean;
	className?: string;
}

export function CreateProductTypeForm({
	onSuccess,
	onCreated,
	redirectOnSuccess = true,
	className,
}: CreateProductTypeFormProps = {}) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const form = useAppForm({
		defaultValues: {
			label: "",
			description: "",
		},
	});

	const isDirty = form.state.isDirty;
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const [, action, isPending] = useActionState(
		withCallbacks(
			createProductType,
			// eslint-disable-next-line react-hooks/refs -- callback is invoked after submit, not during render
			createToastCallbacks({
				loadingMessage: "Création du type…",
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"data" in result &&
						result.data &&
						typeof result.data === "object" &&
						"id" in result.data &&
						typeof result.data.id === "string"
					) {
						onCreated?.(result.data.id);
					}
					haptic("success");
					allowNavigationRef.current?.();
					form.reset();
					onSuccess?.();
					if (redirectOnSuccess) {
						setTimeout(
							() => withViewTransition(() => router.push("/admin/catalogue/types-de-produits")),
							FORM_SUCCESS_REDIRECT_DELAY_MS,
						);
					}
				},
				onError: () => haptic("error"),
			}),
		),
		undefined,
	);

	// Mobile : pas de garde unsaved-changes (les confirms beforeunload/popstate
	// natifs sont peu utiles sur mobile et entrent en conflit avec les gestes
	// swipe-back iOS / Android — UX moins bonne que la perte de saisie).
	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending && !isMobile);

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	return (
		<form
			ref={formRef}
			action={action}
			className={cn("space-y-6", className)}
			onInvalidCapture={onInvalidCapture}
			onSubmit={(event) => {
				if (!form.state.canSubmit) {
					event.preventDefault();
					focusFirstInvalid();
					return;
				}
				void form.handleSubmit();
			}}
		>
			<RequiredFieldsNote />

			<div className="space-y-4">
				<form.AppField
					name="label"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value || value.length < 1) {
								return "Le label est requis";
							}
							if (value.length > 50) {
								return "Le label ne peut pas dépasser 50 caractères";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Label"
							type="text"
							placeholder="ex: Colliers, Bagues, Bracelets"
							disabled={isPending}
							required
							autoCapitalize="words"
							enterKeyHint="next"
						/>
					)}
				</form.AppField>

				<form.AppField
					name="description"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (value && value.length > 500) {
								return "La description ne peut pas dépasser 500 caractères";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.TextareaField
							label="Description"
							placeholder="Décrivez le type de produit…"
							disabled={isPending}
							rows={4}
						/>
					)}
				</form.AppField>
			</div>

			<AdminFormFooter pending={isPending}>
				<div className="flex justify-end">
					<form.Subscribe selector={(state) => [state.canSubmit]}>
						{([canSubmit]) => (
							<Button disabled={!canSubmit || isPending} type="submit">
								{isPending ? "Enregistrement…" : "Créer"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</AdminFormFooter>
		</form>
	);
}
