"use client";

import { useStore } from "@tanstack/react-form";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Kbd } from "@/shared/components/ui/kbd";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useFormContext } from "@/shared/lib/form-context";

interface SubmitButtonProps extends Omit<React.ComponentProps<typeof Button>, "type" | "children"> {
	/** Pending externe (useActionState / upload en vol) — désactive + spinner + aria-busy */
	isPending?: boolean;
	/** Libellé au repos (« Créer la variante », « Enregistrer »…) */
	idleLabel: string;
	/** Libellé pendant la soumission (« Création… », « Mise à jour… »…) */
	pendingLabel: string;
	/** Affiche le hint clavier ⌘S (desktop) au repos */
	showKbdHint?: boolean;
}

/**
 * Bouton de soumission pré-lié TanStack Form (enregistré dans `formComponents`,
 * usage `<form.AppForm><form.SubmitButton …/></form.AppForm>`).
 *
 * Centralise le contrat anti-dérive des formulaires :
 * - protection double-submit : `disabled={!canSubmit || isPending}` ;
 * - `aria-busy` + spinner + libellé pending ;
 * - haptique medium au clic ;
 * - hint clavier ⌘S optionnel (masqué pendant la soumission).
 */
export function SubmitButton({
	isPending = false,
	idleLabel,
	pendingLabel,
	showKbdHint = false,
	disabled,
	onClick,
	size = "input",
	...props
}: SubmitButtonProps) {
	const form = useFormContext();
	const canSubmit = useStore(form.store, (state) => state.canSubmit);
	const haptic = useHaptic();

	return (
		<Button
			type="submit"
			size={size}
			disabled={(disabled ?? false) || !canSubmit || isPending}
			aria-busy={isPending}
			onClick={(event) => {
				haptic("medium");
				onClick?.(event);
			}}
			{...props}
		>
			{isPending && <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
			<span>{isPending ? pendingLabel : idleLabel}</span>
			{showKbdHint && !isPending && (
				<Kbd aria-hidden="true" className="ml-1 hidden bg-white/15 text-white/80 lg:inline-flex">
					⌘S
				</Kbd>
			)}
		</Button>
	);
}
