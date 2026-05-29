"use client";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useCreateAddress } from "@/modules/addresses/hooks/use-create-address";
import { useAddressForm } from "@/modules/addresses/hooks/use-address-form";
import type { UserAddress } from "@/modules/addresses/types/user-addresses.types";
import { useUpdateAddress } from "@/modules/addresses/hooks/use-update-address";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { ActionStatus } from "@/shared/types/server-action";
import { CircleCheck, CircleX } from "lucide-react";
import { useStore } from "@tanstack/react-form";
import { useEffect, useRef } from "react";

import {
	ADDRESS_DIALOG_ID,
	DISCARD_ADDRESS_CHANGES_DIALOG_ID,
} from "../constants/dialog.constants";
import { AddressFormFields } from "./address-form-fields";
import { DiscardAddressChangesAlertDialog } from "./discard-address-changes-alert-dialog";

interface AddressDialogData extends Record<string, unknown> {
	address?: UserAddress;
}

function AddressFormDialogInner() {
	const { isOpen, close, data } = useDialog<AddressDialogData>(ADDRESS_DIALOG_ID);
	const discardDialog = useAlertDialog(DISCARD_ADDRESS_CHANGES_DIALOG_ID);
	const address = data?.address;
	const isDirtyRef = useRef(false);

	const handleOpenChange = (open: boolean) => {
		if (open) return;
		if (isDirtyRef.current) {
			discardDialog.open({ onConfirm: close });
			return;
		}
		close();
	};

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
				{/* Key pattern: remount form when address changes */}
				<AddressFormContent
					key={address?.id ?? "new"}
					address={address}
					onClose={close}
					isDirtyRef={isDirtyRef}
				/>
			</ResponsiveDialogContent>
			{/* Stacked confirm: dismiss form with unsaved changes — must be inside
			    ResponsiveDialog tree on mobile so Vaul stacks via NestedRoot
			    (otherwise opening would close the parent form drawer). */}
			<DiscardAddressChangesAlertDialog />
		</ResponsiveDialog>
	);
}

export function AddressFormDialog() {
	return <AddressFormDialogInner />;
}

interface AddressFormContentProps {
	address?: UserAddress;
	onClose: () => void;
	isDirtyRef: React.RefObject<boolean>;
}

function AddressFormContent({ address, onClose, isDirtyRef }: AddressFormContentProps) {
	const mode = address ? "edit" : "create";

	// TanStack Form setup avec validation Zod (hook partagé dialog + page mobile)
	const { form } = useAddressForm(address);

	// Address hooks with success callback to close dialog
	const createHook = useCreateAddress({
		onSuccess: onClose,
	});

	const updateHook = useUpdateAddress(address?.id ?? "", {
		onSuccess: onClose,
	});

	const { action, isPending, state } = mode === "create" ? createHook : updateHook;

	// Sync dirty state to parent ref for close confirmation
	const isDirty = useStore(form.store, (s) => s.isDirty);
	useEffect(() => {
		isDirtyRef.current = isDirty;
	}, [isDirty, isDirtyRef]);

	// WCAG 3.3.1 — focus the first invalid field after a server-side error.
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const previousState = useRef(state);
	useEffect(() => {
		if (
			state &&
			state !== previousState.current &&
			state.status !== ActionStatus.SUCCESS &&
			state.status !== ActionStatus.INITIAL
		) {
			focusFirstInvalid();
		}
		previousState.current = state;
	}, [state, focusFirstInvalid]);

	return (
		<>
			<ResponsiveDialogHeader className="shrink-0">
				<ResponsiveDialogTitle>
					{mode === "create" ? "Ajouter une adresse" : "Modifier l'adresse"}
				</ResponsiveDialogTitle>
				<ResponsiveDialogDescription>
					{mode === "create"
						? "Ajoutez une nouvelle adresse de livraison"
						: "Modifiez les informations de cette adresse"}
				</ResponsiveDialogDescription>
			</ResponsiveDialogHeader>

			<form
				ref={formRef}
				action={action}
				className="flex min-h-0 flex-1 flex-col"
				onSubmit={() => form.handleSubmit()}
				onInvalidCapture={onInvalidCapture}
			>
				{/* Contenu scrollable */}
				<div className="flex-1 space-y-6 overflow-y-auto pr-2">
					{/* Success message — shadcn Alert ships role="alert" + aria-live="polite" (WCAG 4.1.3) */}
					{state?.status === ActionStatus.SUCCESS && state.message && (
						<Alert className="bg-primary/10 border-primary/20">
							<CircleCheck className="text-primary" aria-hidden="true" />
							<AlertDescription className="text-primary font-medium">
								{state.message}
							</AlertDescription>
						</Alert>
					)}

					{/* Error message */}
					{state?.status !== ActionStatus.SUCCESS &&
						state?.status !== ActionStatus.INITIAL &&
						state?.message && (
							<Alert variant="destructive">
								<CircleX aria-hidden="true" />
								<AlertDescription className="font-medium">{state.message}</AlertDescription>
							</Alert>
						)}

					<AddressFormFields form={form} isPending={isPending} />
				</div>
				{/* Fin du contenu scrollable */}

				{/* Footer fixe */}
				<div className="mt-4 flex shrink-0 justify-end pt-4 pb-[max(0px,env(safe-area-inset-bottom))]">
					<form.Subscribe selector={(state) => [state.canSubmit]}>
						{([canSubmit]) => (
							<Button disabled={!canSubmit || isPending} type="submit">
								{isPending ? "Enregistrement…" : mode === "create" ? "Ajouter" : "Enregistrer"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</form>
		</>
	);
}
