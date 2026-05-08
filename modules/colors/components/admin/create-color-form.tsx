"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createColor } from "@/modules/colors/actions/create-color";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { FieldLabel } from "@/shared/components/forms/field-label";
import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
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
				loadingMessage: "Création de la couleur…",
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
							if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
								return "Format invalide. Utilisez #RRGGBB (ex: #FF5733)";
							}
							return undefined;
						},
					}}
				>
					{(field) => {
						const safe = /^#[0-9A-Fa-f]{6}$/.test(field.state.value)
							? field.state.value
							: "#000000";
						const errorId = `${field.name}-error`;
						const hasError = field.state.meta.errors.length > 0;
						return (
							<Field data-invalid={hasError}>
								<FieldLabel htmlFor={field.name} required>
									Couleur
								</FieldLabel>
								<div className="flex items-stretch gap-2">
									<input
										type="color"
										aria-label="Choisir une couleur"
										value={safe}
										onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
										disabled={isPending}
										className="h-10 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
									/>
									<Input
										id={field.name}
										name={field.name}
										type="text"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
										onBlur={field.handleBlur}
										placeholder="#000000"
										disabled={isPending}
										required
										maxLength={7}
										className="flex-1 font-mono"
										inputMode="text"
										autoCapitalize="characters"
										autoComplete="off"
										autoCorrect="off"
										spellCheck={false}
										enterKeyHint="next"
										aria-invalid={hasError}
										aria-describedby={hasError ? errorId : undefined}
									/>
								</div>
								<FieldError id={errorId} errors={field.state.meta.errors} />
							</Field>
						);
					}}
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
								{isPending ? "Enregistrement…" : "Créer"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</AdminFormFooter>
		</form>
	);
}
