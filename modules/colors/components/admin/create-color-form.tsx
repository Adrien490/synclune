"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { Loader2 } from "lucide-react";

import { createColor } from "@/modules/colors/actions/create-color";
import { ColorFormFields } from "@/modules/colors/components/admin/color-form-fields";
import { ColorLibrarySheet } from "@/modules/colors/components/admin/color-library-sheet";
import { useColorForm } from "@/modules/colors/hooks/use-color-form";
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

interface CreateColorFormProps {
	onSuccess?: () => void;
	onCreated?: (id: string) => void;
	redirectOnSuccess?: boolean;
	className?: string;
}

const LIST_PATH = "/admin/catalogue/couleurs";

const FIELD_LABELS: Record<string, string> = {
	name: "Nom",
	hex: "Couleur",
	description: "Description",
};

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function CreateColorForm({
	onSuccess,
	onCreated,
	redirectOnSuccess = true,
	className,
}: CreateColorFormProps = {}) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const form = useColorForm({ name: "", hex: "#000000", description: "" });

	const isDirty = form.state.isDirty;
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const [, action, isPending] = useActionState(
		withCallbacks(
			createColor,

			createToastCallbacks({
				loadingMessage: "Création de la couleur…",
				successAction: redirectOnSuccess
					? {
							label: "Voir les couleurs",
							onClick: () => navigateWithTransition(router, LIST_PATH),
						}
					: undefined,
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
				},
				onError: () => haptic("error"),
			}),
		),
		undefined,
	);

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
			aria-label="Formulaire de création de couleur"
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

				<ColorLibrarySheet
					disabled={isPending}
					onSelect={(entry) => {
						form.setFieldValue("name", entry.name);
						form.setFieldValue("hex", entry.hex);
						form.setFieldValue("description", entry.description ?? "");
						haptic("success");
					}}
				/>

				<ColorFormFields form={form} isPending={isPending} />
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
									<span>{isPending ? "Création…" : "Créer la couleur"}</span>
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
