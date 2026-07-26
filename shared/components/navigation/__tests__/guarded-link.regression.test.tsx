/**
 * @regression unsaved-changes-guard-reachable
 *
 * Verrouille le câblage du guard de navigation. Avant ce test, l'infrastructure
 * était complète mais MORTE : `useUnsavedChanges` enregistrait bien un guard via
 * `registerGuard`, mais `requestNavigation` — seule fonction qui lit le registre
 * et ouvre l'`UnsavedChangesDialog` — n'avait AUCUN appelant en production. Le
 * provider et le dialogue étaient montés dans `app/layout.tsx` et inatteignables :
 * 28 formulaires admin croyaient être protégés, et un tap sur le chevron retour
 * perdait la saisie silencieusement.
 *
 * Ce test échoue si `GuardedLink` cesse d'appeler `requestNavigation`.
 */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GuardedLink } from "@/shared/components/navigation/guarded-link";
import { UnsavedChangesDialog } from "@/shared/components/navigation/unsaved-changes-dialog";
import { NavigationGuardProvider } from "@/shared/contexts/navigation-guard-context";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";

/** Navigation qu'un vrai `next/link` aurait déclenchée. */
const mockNavigate = vi.fn();

// Reproduit le contrat de `next/link` : le `onClick` du consommateur s'exécute
// d'abord, puis Link navigue SAUF si le défaut a été empêché. On empêche ensuite
// systématiquement le défaut pour éviter la navigation jsdom (non implémentée).
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		onClick,
		...props
	}: Omit<React.ComponentProps<"a">, "href"> & { href: string | { pathname?: string } }) => {
		const target = typeof href === "string" ? href : (href.pathname ?? "");
		return (
			<a
				href={target}
				onClick={(event) => {
					onClick?.(event);
					if (!event.defaultPrevented) mockNavigate(target);
					event.preventDefault();
				}}
				{...props}
			>
				{children}
			</a>
		);
	},
}));

/** Formulaire minimal qui enregistre un guard quand `isDirty`. */
function DirtyForm({ isDirty }: { isDirty: boolean }) {
	useUnsavedChanges(isDirty, true, { interceptHistoryNavigation: false });
	return null;
}

function Harness({ isDirty }: { isDirty: boolean }) {
	return (
		<NavigationGuardProvider>
			<DirtyForm isDirty={isDirty} />
			<GuardedLink href="/admin/catalogue/produits">Retour à la liste</GuardedLink>
			<UnsavedChangesDialog />
		</NavigationGuardProvider>
	);
}

describe("GuardedLink — atteignabilité du guard de navigation", () => {
	// Le setup global ne fait pas de cleanup RTL (convention du repo :
	// cf. unsaved-changes-dialog.test.tsx).
	afterEach(cleanup);

	beforeEach(() => {
		mockNavigate.mockClear();
	});

	it("ouvre le dialogue et ne navigue PAS quand un guard est actif", async () => {
		const user = userEvent.setup();
		render(<Harness isDirty />);

		expect(screen.queryByText("Modifications non enregistrées")).not.toBeInTheDocument();

		await user.click(screen.getByRole("link", { name: "Retour à la liste" }));

		// C'est l'assertion qui meurt si `requestNavigation` n'est plus appelé.
		expect(screen.getByText("Modifications non enregistrées")).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("laisse le Link naviguer normalement quand aucun guard n'est actif", async () => {
		const user = userEvent.setup();
		render(<Harness isDirty={false} />);

		await user.click(screen.getByRole("link", { name: "Retour à la liste" }));

		expect(screen.queryByText("Modifications non enregistrées")).not.toBeInTheDocument();
		// Aucun guard → pas de preventDefault, le <Link> natif navigue.
		expect(mockNavigate).toHaveBeenCalledWith("/admin/catalogue/produits");
	});

	it("« Quitter sans sauvegarder » exécute la navigation en attente", async () => {
		const user = userEvent.setup();
		render(<Harness isDirty />);

		await user.click(screen.getByRole("link", { name: "Retour à la liste" }));
		await user.click(screen.getByRole("button", { name: "Quitter sans sauvegarder" }));

		expect(mockNavigate).toHaveBeenCalledWith("/admin/catalogue/produits");
	});

	it("« Rester sur la page » annule la navigation et préserve la saisie", async () => {
		const user = userEvent.setup();
		render(<Harness isDirty />);

		await user.click(screen.getByRole("link", { name: "Retour à la liste" }));
		await user.click(screen.getByRole("button", { name: "Rester sur la page" }));

		expect(mockNavigate).not.toHaveBeenCalled();
		expect(screen.queryByText("Modifications non enregistrées")).not.toBeInTheDocument();
	});

	it("ignore le guard sur un clic avec modificateur (nouvel onglet)", async () => {
		const user = userEvent.setup();
		render(<Harness isDirty />);

		await user.keyboard("[MetaLeft>]");
		await user.click(screen.getByRole("link", { name: "Retour à la liste" }));
		await user.keyboard("[/MetaLeft]");

		// La page courante n'est pas quittée : rien à garder.
		expect(screen.queryByText("Modifications non enregistrées")).not.toBeInTheDocument();
		expect(mockNavigate).toHaveBeenCalled();
	});
});
