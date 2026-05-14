"use client";

import { Loader2 } from "lucide-react";
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

import { isCreateProductTypeSuccessData } from "../../utils/is-create-product-type-success-data";

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
	// Assignment during render est OK pour refs (React 19 docs). Pas de useEffect.
	const allowNavigationLatestRef = useRef<(() => void) | null>(null);
	const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Cleanup setTimeout au unmount (évite memory leak + router.push sur composant détruit).
	useEffect(
		() => () => {
			if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
		},
		[],
	);

	const [, action, isPending] = useActionState(
		withCallbacks(
			createProductType,
			// eslint-disable-next-line react-hooks/refs -- callback is invoked after submit, not during render
			createToastCallbacks({
				loadingMessage: "Création du type…",
				onSuccess: (result) => {
					if (isCreateProductTypeSuccessData(result.data)) {
						onCreated?.(result.data.id);
					}
					haptic("success");
					allowNavigationLatestRef.current?.();
					form.reset();
					onSuccess?.();
					if (redirectOnSuccess) {
						redirectTimeoutRef.current = setTimeout(
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
	// Assignment durant render OK pour refs (React 19 docs : pattern recommandé
	// vs useEffect pour sync. La fonction est invoquée après submit hors render).
	// eslint-disable-next-line react-hooks/refs
	allowNavigationLatestRef.current = allowNavigation;

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
								<span>{isPending ? "Enregistrement…" : "Créer"}</span>
							</Button>
						)}
					</form.Subscribe>
				</div>
			</AdminFormFooter>
		</form>
	);
}
