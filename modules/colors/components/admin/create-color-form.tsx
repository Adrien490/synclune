"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createColor } from "@/modules/colors/actions/create-color";
import { ColorPalette } from "@/modules/colors/components/color-palette";
import { HexColorInput } from "@/modules/colors/components/hex-color-input";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface CreateColorFormProps {
	onSuccess?: () => void;
	onCreated?: (id: string) => void;
	redirectOnSuccess?: boolean;
	className?: string;
}

export function CreateColorForm({
	onSuccess,
	onCreated,
	redirectOnSuccess = true,
	className,
}: CreateColorFormProps = {}) {
	const router = useRouter();
	const haptic = useHaptic();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const form = useAppForm({
		defaultValues: {
			name: "",
			hex: "#000000",
		},
	});

	const isDirty = form.state.isDirty;
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const [, action, isPending] = useActionState(
		withCallbacks(
			createColor,
			// eslint-disable-next-line react-hooks/refs -- callback is invoked after submit, not during render
			createToastCallbacks({
				loadingMessage: "Création de la couleur...",
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
							() => withViewTransition(() => router.push("/admin/catalogue/couleurs")),
							FORM_SUCCESS_REDIRECT_DELAY_MS,
						);
					}
				},
				onError: () => haptic("error"),
			}),
		),
		undefined,
	);

	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending);

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

			<div className="space-y-6">
				<form.AppField
					name="hex"
					validators={{
						onChange: ({ value }: { value: string }) => {
							if (!value || value.length < 1) {
								return "Le code couleur est requis";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<div className="space-y-4">
							<Label>
								Couleur
								<span className="text-destructive ml-1">*</span>
							</Label>
							<ColorPalette
								value={field.state.value}
								onChange={(hex) => field.handleChange(hex)}
								disabled={isPending}
							/>
							<HexColorInput
								value={field.state.value}
								onChange={(hex) => field.handleChange(hex)}
								disabled={isPending}
							/>
							<input type="hidden" name="hex" value={field.state.value} />
						</div>
					)}
				</form.AppField>

				<form.AppField
					name="name"
					validators={{
						onChange: ({ value }: { value: string }) => {
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
							placeholder="ex: Rouge, Bleu Marine"
							disabled={isPending}
							required
							autoCapitalize="words"
							enterKeyHint="done"
						/>
					)}
				</form.AppField>
			</div>

			<AdminFormFooter pending={isPending}>
				<div className="flex justify-end">
					<form.Subscribe selector={(state) => [state.canSubmit]}>
						{([canSubmit]) => (
							<Button disabled={!canSubmit || isPending} type="submit">
								{isPending ? "Enregistrement..." : "Créer"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</AdminFormFooter>
		</form>
	);
}
