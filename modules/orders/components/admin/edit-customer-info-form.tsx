"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useUpdateOrderCustomerInfo } from "@/modules/orders/hooks/use-update-order-customer-info";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { CopyButton } from "@/shared/components/copy-button";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Kbd } from "@/shared/components/ui/kbd";
import { Label } from "@/shared/components/ui/label";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface EditCustomerInfoFormProps {
	orderId: string;
	orderNumber: string;
	customerEmail: string;
	customerName: string;
	customerPhone?: string | null;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	successPath?: string;
	className?: string;
}

const EMAIL_PATTERN = "[^@\\s]+@[^@\\s]+\\.[^@\\s]+";

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function EditCustomerInfoForm({
	orderId,
	orderNumber,
	customerEmail,
	customerName,
	customerPhone,
	onSuccess,
	redirectOnSuccess = false,
	successPath,
	className,
}: EditCustomerInfoFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const [isDirty, setIsDirty] = useState(false);
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const { action, isPending } = useUpdateOrderCustomerInfo(() => {
		haptic("success");
		allowNavigationRef.current?.();
		setIsDirty(false);
		onSuccess?.();
		if (redirectOnSuccess && successPath) {
			navigateWithTransition(router, successPath);
		}
	});

	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending && !isMobile);

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	useEffect(() => {
		if (isMobile) return;
		const handler = (event: KeyboardEvent) => {
			const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
			if (!isSaveShortcut) return;
			event.preventDefault();
			if (isPending) return;
			haptic("medium");
			formRef.current?.requestSubmit();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, formRef, haptic]);

	useEffect(() => {
		if (isMobile || !successPath) return;
		const handler = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || isPending) return;
			const target = event.target as HTMLElement | null;
			if (
				target?.closest(
					"[data-slot='dialog-content'],[data-slot='sheet-content'],[data-slot='popover-content'],[role='dialog']",
				)
			) {
				return;
			}
			if (
				isDirty &&
				!window.confirm("Les modifications non enregistrées seront perdues. Continuer ?")
			) {
				return;
			}
			event.preventDefault();
			haptic("light");
			allowNavigation();
			navigateWithTransition(router, successPath);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, isDirty, haptic, router, allowNavigation, successPath]);

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire d'informations client"
			className={cn("space-y-6", className)}
			onChange={() => {
				if (!isDirty) setIsDirty(true);
			}}
			onInvalidCapture={onInvalidCapture}
			onSubmit={(event) => {
				if (!event.currentTarget.checkValidity()) {
					event.preventDefault();
					focusFirstInvalid();
				}
			}}
		>
			<input type="hidden" name="id" value={orderId} />

			<p className="text-muted-foreground text-sm">
				Commande <span className="text-foreground font-semibold">{orderNumber}</span> — on corrige
				le nom, l&apos;email ou le téléphone du client. Bloqué après émission de la facture
				(immutabilité comptable).
			</p>

			<RequiredFieldsNote />

			<fieldset disabled={isPending} className="space-y-6">
				<div className="space-y-2">
					<Label htmlFor="customerName">
						Nom complet <span className="text-destructive">*</span>
					</Label>
					<Input
						id="customerName"
						name="customerName"
						type="text"
						defaultValue={customerName}
						autoComplete="name"
						autoCapitalize="words"
						enterKeyHint="next"
						required
						maxLength={100}
					/>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between gap-2">
						<Label htmlFor="customerEmail">
							Email <span className="text-destructive">*</span>
						</Label>
						<CopyButton text={customerEmail} label="email" size="sm" className="h-7 w-7" />
					</div>
					<Input
						id="customerEmail"
						name="customerEmail"
						type="email"
						inputMode="email"
						defaultValue={customerEmail}
						autoComplete="email"
						autoCapitalize="off"
						autoCorrect="off"
						spellCheck={false}
						enterKeyHint="next"
						pattern={EMAIL_PATTERN}
						required
						maxLength={255}
					/>
					<p className="text-muted-foreground text-xs">
						Toutes les notifications transactionnelles seront envoyées à cette adresse.
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="customerPhone">
						Téléphone <span className="text-muted-foreground font-normal">(optionnel)</span>
					</Label>
					<Input
						id="customerPhone"
						name="customerPhone"
						type="tel"
						inputMode="tel"
						defaultValue={customerPhone ?? ""}
						autoComplete="tel"
						autoCorrect="off"
						spellCheck={false}
						enterKeyHint="done"
						maxLength={20}
						placeholder="06 12 34 56 78"
					/>
				</div>
			</fieldset>

			<AdminFormFooter pending={isPending}>
				<div className="flex justify-end">
					<Button
						type="submit"
						size="input"
						disabled={isPending}
						onClick={() => haptic("medium")}
						className="w-full sm:w-auto sm:min-w-56"
					>
						{isPending && (
							<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
						)}
						<span>{isPending ? "Mise à jour…" : "Enregistrer les infos"}</span>
						{!isPending && (
							<Kbd
								aria-hidden="true"
								className="ml-1 hidden bg-white/15 text-white/80 lg:inline-flex"
							>
								⌘S
							</Kbd>
						)}
					</Button>
				</div>
			</AdminFormFooter>
		</form>
	);
}
