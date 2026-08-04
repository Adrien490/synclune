"use client";

/**
 * Formulaire d'edition des infos client (email, nom, telephone).
 *
 * Pattern dual : utilise a la fois en dialog modal
 * (`edit-customer-info-dialog.tsx`) ET en page inline
 * (`app/admin/ventes/commandes/[id]/client/page.tsx`). Le `redirectOnSuccess`
 * prop permet a la page inline de revenir au detail commande apres submit ;
 * le dialog passe `onSuccess` pour fermer la modale a la place.
 *
 * Les regles "ne pas editer si facture deja generee" sont enforcees a la
 * fois par la page inline (`InvoiceStatus` gate) ET par la Server Action
 * `updateOrderCustomerInfo`. Si tu modifies les conditions d'edition, fais
 * les deux. Cf. ORD-MAP-002 (audit cartographie 2026-05-28).
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useUpdateOrderCustomerInfo } from "@/modules/orders/hooks/use-update-order-customer-info";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { CopyButton } from "@/shared/components/copy-button";
import { FieldLabel, useAppForm } from "@/shared/components/forms";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useGatedFormSubmit } from "@/shared/hooks/use-gated-form-submit";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { withViewTransition } from "@/shared/utils/view-transition";

interface EditCustomerInfoFormProps {
	orderId: string;
	orderNumber: string;
	customerEmail: string;
	customerName: string;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	successPath?: string;
	className?: string;
}

const EMAIL_PATTERN = "[^@\\s]+@[^@\\s]+\\.[^@\\s]+";
const EMAIL_REGEX = new RegExp(`^${EMAIL_PATTERN}$`);
// Miroir de `emailSchema` (`VarChar(255)`) — cf. contrat Zod ↔ Prisma.
const MAX_EMAIL_LENGTH = 255;
const MAX_CUSTOMER_NAME_LENGTH = 100;

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function EditCustomerInfoForm({
	orderId,
	orderNumber,
	customerEmail,
	customerName,
	onSuccess,
	redirectOnSuccess = false,
	successPath,
	className,
}: EditCustomerInfoFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const form = useAppForm({
		defaultValues: {
			customerName,
			customerEmail,
		},
	});

	const { state, action, isPending } = useUpdateOrderCustomerInfo(() => {
		haptic("success");
		allowNavigationRef.current?.();
		// Nouvelle baseline : les valeurs enregistrées ne sont plus « non sauvées ».
		form.reset(form.state.values);
		onSuccess?.();
		if (redirectOnSuccess && successPath) {
			navigateWithTransition(router, successPath);
		}
	});

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus du schéma serveur serait muet.
	const serverErrors = useServerFieldErrors({ state });

	const { allowNavigation } = useUnsavedChanges(form.state.isDirty, !isPending);

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	useAdminFormKeyboard({
		formRef,
		isPending,
		isMobile,
		listPath: successPath,
		allowNavigation,
		getIsDirty: () => form.state.isDirty,
		getCanSubmit: () => form.state.canSubmit,
	});

	const handleGatedSubmit = useGatedFormSubmit({
		form,
		action,
		isPending,
		focusFirstInvalid,
		context: "EditCustomerInfoForm",
	});

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire d'informations client"
			className={cn("space-y-6", className)}
			onInvalidCapture={onInvalidCapture}
			onSubmit={handleGatedSubmit}
		>
			<input type="hidden" name="id" value={orderId} />

			<p className="text-muted-foreground text-sm">
				Commande <span className="text-foreground font-semibold">{orderNumber}</span> — on corrige
				le nom, l&apos;email ou le téléphone du client. Bloqué après émission de la facture
				(immutabilité comptable).
			</p>

			<FormServerErrorAlert errors={serverErrors} />

			<RequiredFieldsNote />

			<fieldset disabled={isPending} className="space-y-6">
				<form.AppField
					name="customerName"
					validators={{
						onChange: ({ value }) => {
							const trimmed = value.trim();
							if (trimmed.length === 0) {
								return "Le nom complet est requis";
							}
							if (trimmed.length > MAX_CUSTOMER_NAME_LENGTH) {
								return `Le nom complet ne peut pas dépasser ${MAX_CUSTOMER_NAME_LENGTH} caractères`;
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Nom complet"
							type="text"
							autoComplete="name"
							autoCapitalize="words"
							enterKeyHint="next"
							required
							maxLength={MAX_CUSTOMER_NAME_LENGTH}
						/>
					)}
				</form.AppField>

				<div className="space-y-2">
					<div className="flex items-center justify-between gap-2">
						<FieldLabel htmlFor="customerEmail" required>
							Email
						</FieldLabel>
						<CopyButton text={customerEmail} label="email" size="sm" className="h-7 w-7" />
					</div>
					<form.AppField
						name="customerEmail"
						validators={{
							onChange: ({ value }) => {
								const trimmed = value.trim();
								if (trimmed.length === 0) {
									return "L'email est requis";
								}
								if (trimmed.length > MAX_EMAIL_LENGTH) {
									return `L'email ne peut pas dépasser ${MAX_EMAIL_LENGTH} caractères`;
								}
								if (!EMAIL_REGEX.test(trimmed)) {
									return "Le format de l'email n'est pas valide";
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<field.InputField
								type="email"
								inputMode="email"
								autoComplete="email"
								autoCapitalize="none"
								autoCorrect="off"
								spellCheck={false}
								enterKeyHint="next"
								pattern={EMAIL_PATTERN}
								required
								maxLength={MAX_EMAIL_LENGTH}
								description="Toutes les notifications transactionnelles seront envoyées à cette adresse."
							/>
						)}
					</form.AppField>
				</div>
			</fieldset>

			<form.AppForm>
				<AdminFormFooter pending={isPending}>
					<div className="flex justify-end">
						<form.SubmitButton
							isPending={isPending}
							idleLabel="Enregistrer les infos"
							pendingLabel="Mise à jour…"
							showKbdHint
							className="w-full sm:w-auto sm:min-w-56"
						/>
					</div>
				</AdminFormFooter>
			</form.AppForm>
		</form>
	);
}
