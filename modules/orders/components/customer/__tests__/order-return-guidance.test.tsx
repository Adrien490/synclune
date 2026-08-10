/**
 * AUDIT-BIZ-001 — le détail commande client ne rendait RIEN quand
 * `isReturnEligible` était faux, c'est-à-dire pendant toute la fenêtre
 * PAID → DELIVERED (dont l'ouverture dépend de l'action admin manuelle
 * `mark-as-delivered`). `getReturnIneligibilityReason()` existait déjà et
 * discriminait le motif, mais n'était consommé que côté serveur.
 *
 * Ces tests verrouillent que chaque état produit une explication ACTIONNABLE,
 * y compris l'état ÉLIGIBLE : depuis le retrait de l'espace client (2026-07-31)
 * il n'y a plus de bouton self-service — la demande de retour se fait par email,
 * et cette alerte est la seule affordance du client pendant la fenêtre de
 * rétractation. Rendre `null` ici recréerait le cul-de-sac de l'audit 2026-08-01.
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { OrderReturnGuidance } from "../order-return-guidance";

interface GuidanceOrder {
	status: string;
	paymentStatus: string;
	deliveredAt: Date | null;
	refunds: Array<{ status: string }>;
}

const PAID_NOT_DELIVERED: GuidanceOrder = {
	status: "PROCESSING",
	paymentStatus: "PAID",
	deliveredAt: null,
	refunds: [],
};

function renderGuidance(overrides: Partial<GuidanceOrder> = {}) {
	// Cast unique en frontière de test : les enums Prisma sont des unions de
	// littéraux, les fixtures ci-dessous les décrivent en `string` pour rester
	// lisibles. Le contrat réel est typé côté composant.
	const order = { ...PAID_NOT_DELIVERED, ...overrides } as never;
	return render(<OrderReturnGuidance order={order} />);
}

describe("OrderReturnGuidance", () => {
	it("commande payée non livrée → explique le point de départ du délai ET offre une sortie immédiate", () => {
		renderGuidance();

		// Le fait que le délai démarre à la réception (et non à la commande).
		expect(screen.getByText(/14 jours démarre à la réception/i)).toBeInTheDocument();
		// Une action possible MAINTENANT (c'est ce qui manquait totalement).
		expect(screen.getByRole("link", { name: /formulaire de rétractation/i })).toHaveAttribute(
			"href",
			"/retractation",
		);
		expect(screen.getByRole("link", { name: /@/ })).toHaveAttribute(
			"href",
			expect.stringContaining("mailto:"),
		);
	});

	it("délai dépassé → renvoie vers la garantie légale, pas vers un silence", () => {
		renderGuidance({
			status: "DELIVERED",
			deliveredAt: new Date("2020-01-01"),
		});

		expect(screen.getByText(/Délai de rétractation écoulé/i)).toBeInTheDocument();
		expect(screen.getByText(/garantie légale de conformité/i)).toBeInTheDocument();
	});

	it("demande déjà en cours → le dit, au lieu de laisser croire à une inaction", () => {
		renderGuidance({
			status: "DELIVERED",
			deliveredAt: new Date(),
			refunds: [{ status: "PENDING" }] as never,
		});

		expect(screen.getByText(/Demande de retour en cours/i)).toBeInTheDocument();
	});

	it("commande éligible → propose la demande de retour par email, avec le délai restant", () => {
		const { container } = renderGuidance({
			status: "DELIVERED",
			deliveredAt: new Date(), // livrée à l'instant → 14 jours restants
		});
		const scope = within(container as HTMLElement);

		expect(scope.getByText(/Retour possible/i)).toBeInTheDocument();
		expect(scope.getByText(/encore 14 jours/i)).toBeInTheDocument();
		// Les deux sorties : la demande par email, et le formulaire type L221-5.
		expect(scope.getByRole("link", { name: /@/ })).toHaveAttribute(
			"href",
			expect.stringContaining("mailto:"),
		);
		expect(scope.getByRole("link", { name: /formulaire de rétractation/i })).toHaveAttribute(
			"href",
			"/retractation",
		);
	});

	it("commande annulée → ne rend rien (parler de retour n'a pas de sens)", () => {
		const { container } = renderGuidance({ status: "CANCELLED" });
		expect(container).toBeEmptyDOMElement();
	});

	it("commande non payée → ne rend rien (le sujet est le paiement, traité ailleurs)", () => {
		const { container } = renderGuidance({ paymentStatus: "PENDING", status: "PENDING" });
		expect(container).toBeEmptyDOMElement();
	});
});
