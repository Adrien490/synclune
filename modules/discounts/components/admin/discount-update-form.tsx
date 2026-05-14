"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import { type DiscountType } from "@/app/generated/prisma/browser";
import { updateDiscount } from "@/modules/discounts/actions/update-discount";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { ErrorSummary } from "@/shared/components/forms/error-summary";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { Kbd } from "@/shared/components/ui/kbd";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { withViewTransition } from "@/shared/utils/with-view-transition";

import { useDiscountForm } from "../../hooks/use-discount-form";
import { DiscountFormFields } from "./discount-form-fields";

interface DiscountUpdateFormProps {
	discount: {
		id: string;
		code: string;
		type: DiscountType;
		value: number;
		minOrderAmount: number | null;
		maxUsageCount: number | null;
		maxUsagePerUser: number | null;
		isActive: boolean;
		startsAt: Date | null;
		endsAt: Date | null;
	};
	className?: string;
}

const LIST_PATH = "/admin/marketing/discounts";

const FIELD_LABELS: Record<string, string> = {
	code: "Code promo",
	type: "Type de remise",
	value: "Valeur",
	minOrderAmount: "Montant minimum de commande",
	maxUsageCount: "Utilisations totales max",
	maxUsagePerUser: "Utilisations par client max",
	startsAt: "Date de début",
	endsAt: "Date de fin",
};

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function DiscountUpdateForm({ discount, className }: DiscountUpdateFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const { form } = useDiscountForm({
		code: discount.code,
		type: discount.type,
		value: discount.value,
		minOrderAmount: discount.minOrderAmount,
		maxUsageCount: discount.maxUsageCount,
		maxUsagePerUser: discount.maxUsagePerUser,
		startsAt: discount.startsAt,
		endsAt: discount.endsAt,
	});

	const allowNavigationRef = useRef<(() => void) | null>(null);

	const [, action, isPending] = useActionState(
		withCallbacks(
			updateDiscount,

			createToastCallbacks({
				loadingMessage: "Mise à jour du code…",
				successAction: {
					label: "Voir les codes",
					onClick: () => navigateWithTransition(router, LIST_PATH),
				},
				onSuccess: () => {
					haptic("success");
					allowNavigationRef.current?.();
				},
				onError: () => haptic("error"),
			}),
		),
		undefined,
	);

	const { allowNavigation } = useUnsavedChanges(form.state.isDirty, !isPending && !isMobile);

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	useEffect(() => {
		if (isMobile) return;
		const handler = (event: KeyboardEvent) => {
			const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
			if (!isSaveShortcut) return;
			event.preventDefault();
			if (isPending || !form.state.canSubmit) return;
			haptic("medium");
			formRef.current?.requestSubmit();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, form, formRef, haptic]);

	useEffect(() => {
		if (isMobile) return;
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
				form.state.isDirty &&
				!window.confirm("Les modifications non enregistrées seront perdues. Continuer ?")
			) {
				return;
			}
			event.preventDefault();
			haptic("light");
			allowNavigation();
			navigateWithTransition(router, LIST_PATH);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, form, haptic, router, allowNavigation]);

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire de modification de code promo"
			className={cn("space-y-6", className)}
			onInvalidCapture={onInvalidCapture}
			onSubmit={(event) => {
				if (!form.state.canSubmit) {
					event.preventDefault();
					focusFirstInvalid();
				}
			}}
		>
			<input type="hidden" name="id" value={discount.id} />

			<form.Subscribe
				selector={(state) => ({
					submissionAttempts: state.submissionAttempts,
					fieldMeta: state.fieldMeta,
				})}
			>
				{({ submissionAttempts, fieldMeta }) => {
					if (!submissionAttempts) return null;
					const fieldErrors = Object.entries(
						fieldMeta as Record<string, { errors?: Array<string | undefined> }>,
					)
						.map(([name, meta]) => {
							const first = meta.errors?.find((e): e is string => Boolean(e));
							return first ? { name, label: FIELD_LABELS[name] ?? name, message: first } : null;
						})
						.filter(
							(item): item is { name: string; label: string; message: string } => item !== null,
						);
					if (fieldErrors.length < 2) return null;
					return <ErrorSummary fieldErrors={fieldErrors} />;
				}}
			</form.Subscribe>

			<fieldset disabled={isPending} className="space-y-6">
				<RequiredFieldsNote />
				<DiscountFormFields form={form} isPending={isPending} />
			</fieldset>

			<form.AppForm>
				<AdminFormFooter pending={isPending}>
					<form.Subscribe selector={(state) => [state.canSubmit] as const}>
						{([canSubmit]) => (
							<div className="flex justify-end">
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
									<span>{isPending ? "Mise à jour…" : "Enregistrer"}</span>
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
						)}
					</form.Subscribe>
				</AdminFormFooter>
			</form.AppForm>
		</form>
	);
}
