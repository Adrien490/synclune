/**
 * @regression alert-dialog-closes-before-pending
 *
 * Le bouton de confirmation d'un `AlertDialog` ferme le dialog **au clic**, avant
 * que la mutation ne démarre. Chaîne exacte : `AlertDialogAction` rend un
 * `AlertDialogPrimitive.Close`, dont le `onClick` fait `store.setOpen(false)`
 * (`@base-ui/react/dialog/close/DialogClose.js`) → `wrappedOnOpenChange(false)`
 * → `handleClose()` → `onClose()` **synchrone** (`use-back-button-close.ts`) →
 * le `handleOpenChange` de l'appelant. La soumission du `<form>`, elle, est
 * l'activation behavior : elle est POSTÉRIEURE au dispatch du `click`.
 *
 * Conséquence, contre-intuitive et coûteuse : à l'instant où les ~20 sites de
 * confirmation évaluent leur garde `if (!open && !isPending)`, `isPending` vaut
 * encore `false`. La garde ne retient rien, et tout ce qui décorait l'attente —
 * `Spinner`, ternaire `« Suppression… »`, `aria-busy`, `disabled={isPending}`,
 * `FormServerErrorAlert` inline — se joue dans une surface déjà en sortie.
 *
 * C'est un choix ASSUMÉ (2026-08-06) : le retour d'attente appartient au toast
 * Sonner, pas au dialog. Ce test existe pour deux raisons :
 *   1. il documente le comportement, qu'aucun autre test ne voyait — les 18
 *      suites de confirmation mockent `ui/alert-dialog` et forcent
 *      `mockIsPending = true` à la main, donc prouvent seulement que le JSX rend
 *      le bon libellé, jamais que `isPending` soit observable ;
 *   2. il licencie la suppression de cette mécanique dans les call sites. Si un
 *      jour ce test tombe, c'est que Base UI a changé — et la mécanique redevient
 *      justifiable.
 *
 * ⚠️ Corollaire à ne pas perdre : une validation HTML (`required`) placée dans un
 * de ces formulaires ne peut jamais être RAPPORTÉE à l'utilisatrice — le dialog a
 * disparu quand le navigateur bloque la soumission. Toute validation passe par
 * `disabled` sur l'action.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useActionState, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../alert-dialog";

let backSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	backSpy = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
});

afterEach(() => {
	cleanup();
	backSpy.mockRestore();
});

/**
 * Reproduit la carcasse commune aux ~20 confirmations du dépôt : ouverture
 * contrôlée, `useActionState` pour l'attente, et la garde `!isPending`.
 */
function ConfirmHarness({
	onCloseRequested,
	onActionRun,
}: {
	/** Reçoit la valeur d'`isPending` AU MOMENT où la garde de l'appelant s'évalue. */
	onCloseRequested: (isPendingAtThatMoment: boolean) => void;
	onActionRun: () => void;
}) {
	const [state, formAction, isPending] = useActionState<boolean>(async () => {
		onActionRun();
		await new Promise((resolve) => setTimeout(resolve, 10));
		return true;
	}, false);

	const handleOpenChange = (open: boolean) => {
		if (!open) onCloseRequested(isPending);
	};

	return (
		<AlertDialog open={!state} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={formAction}>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer cette commande ?</AlertDialogTitle>
						<AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
						<AlertDialogAction type="submit">
							{isPending ? "Suppression…" : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/**
 * Même carcasse, mais avec la garde EXACTE des call sites — `if (!open &&
 * !isPending) close()` — pour montrer qu'elle ne retient pas la fermeture.
 */
function GuardedConfirmHarness({ onActionRun }: { onActionRun: () => void }) {
	const [open, setOpen] = useState(true);
	const [, formAction, isPending] = useActionState<null>(async () => {
		onActionRun();
		await new Promise((resolve) => setTimeout(resolve, 10));
		return null;
	}, null);

	const handleOpenChange = (next: boolean) => {
		if (!next && !isPending) setOpen(false);
	};

	return (
		<AlertDialog open={open} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={formAction}>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer cette commande ?</AlertDialogTitle>
						<AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
						<AlertDialogAction type="submit">
							{isPending ? "Suppression…" : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	);
}

describe("AlertDialog — le clic sur l'action ferme avant la mutation", () => {
	it("demande la fermeture alors qu'`isPending` vaut ENCORE false", async () => {
		const onCloseRequested = vi.fn();
		const onActionRun = vi.fn();

		render(<ConfirmHarness onCloseRequested={onCloseRequested} onActionRun={onActionRun} />);

		const action = await screen.findByRole("button", { name: "Supprimer" });
		action.click();

		// La garde des call sites s'évalue AVANT que la transition ne démarre.
		expect(onCloseRequested).toHaveBeenCalledTimes(1);
		expect(onCloseRequested).toHaveBeenCalledWith(false);
	});

	it("laisse tout de même partir la soumission du formulaire", async () => {
		const onActionRun = vi.fn();

		render(<ConfirmHarness onCloseRequested={() => {}} onActionRun={onActionRun} />);

		const action = await screen.findByRole("button", { name: "Supprimer" });
		action.click();

		// La fermeture ne débranche pas l'action : le popup reste monté le temps de
		// sa transition de sortie, donc l'activation behavior s'exécute bien.
		await waitFor(() => expect(onActionRun).toHaveBeenCalledTimes(1));
	});

	it("démonte la confirmation au clic, garde `!isPending` incluse", async () => {
		const onActionRun = vi.fn();

		render(<GuardedConfirmHarness onActionRun={onActionRun} />);

		const action = await screen.findByRole("button", { name: "Supprimer" });
		action.click();

		// La garde recopiée dans ~20 fichiers laisse passer, donc la surface part —
		// spinner, libellé d'attente et erreurs serveur inline avec elle.
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		await waitFor(() => expect(onActionRun).toHaveBeenCalledTimes(1));
		expect(screen.queryByRole("button", { name: "Suppression…" })).toBeNull();
	});
});
