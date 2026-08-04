/**
 * @regression order-history-access-log-hidden
 *
 * `OrderHistory` porte DEUX natures d'événements qui n'ont pas la même vocation :
 *
 *  1. des changements d'état de la commande (payée, expédiée, avoir émis…) — ce
 *     que la fiche admin doit montrer ;
 *  2. un JOURNAL D'ACCÈS aux documents fiscaux (`INVOICE_DOWNLOADED`,
 *     `BULK_EXPORT`) — un contrôle RGPD Art. 30/32, écrit à chaque
 *     téléchargement de facture/avoir et à chaque export du livre de recettes.
 *
 * La seconde catégorie noyait la première : sur une commande dont la cliente
 * rouvre son email de confirmation, la timeline se remplissait de
 * « Facture téléchargée » et le compteur du titre les comptait aussi, poussant
 * les vrais événements sous le pli des 5 entrées visibles.
 *
 * Arbitrage (audit V2, Lot 4, 2026-08-05) : masquer à l'AFFICHAGE, surtout pas
 * supprimer. Le premier réflexe — retirer les deux valeurs d'`OrderAction` — a
 * été écarté après lecture du code : `BULK_EXPORT` est **fail-closed** (l'export
 * CSV renvoie 503 si l'audit n'a pas pu être écrit, et la route est POST plutôt
 * que GET précisément pour que l'écriture ne soit pas déclenchable
 * cross-origin), et `INVOICE_DOWNLOADED` escalade en Sentry — c'est la seule
 * trace de qui a téléchargé la facture d'une cliente, document qui porte ses nom
 * et adresse.
 *
 * Ce test verrouille les deux moitiés de l'arbitrage : les accès ne s'affichent
 * pas, ET les événements métier de la même commande s'affichent toujours.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { OrderHistoryTimeline } from "../order-history-timeline";

afterEach(cleanup);

const BASE = {
	previousStatus: null,
	newStatus: null,
	previousPaymentStatus: null,
	newPaymentStatus: null,
	note: null,
	metadata: null,
	authorName: "Admin",
	source: "ADMIN" as const,
	createdAt: new Date("2026-08-05T10:00:00Z"),
};

type Entry = Parameters<typeof OrderHistoryTimeline>[0]["history"][number];

function entry(id: string, action: string): Entry {
	return { ...BASE, id, action } as Entry;
}

describe("@regression order-history-access-log-hidden", () => {
	it("n'affiche pas les accès aux documents (INVOICE_DOWNLOADED, BULK_EXPORT)", () => {
		render(
			<OrderHistoryTimeline
				history={[entry("h1", "INVOICE_DOWNLOADED"), entry("h2", "BULK_EXPORT")]}
			/>,
		);

		expect(screen.queryByText("Facture téléchargée")).not.toBeInTheDocument();
		expect(screen.queryByText("Export CSV admin")).not.toBeInTheDocument();
	});

	it("rend l'état vide quand la commande n'a QUE des accès documents", () => {
		render(<OrderHistoryTimeline history={[entry("h1", "INVOICE_DOWNLOADED")]} />);

		// Le garde qui compte : `history.length === 0` doit porter sur la liste
		// FILTRÉE. S'il portait sur la liste brute, on afficherait une timeline
		// vide avec un badge « 1 » et zéro ligne.
		expect(screen.getByText("Aucun historique disponible")).toBeInTheDocument();
	});

	it("continue d'afficher les événements métier, et ne les compte pas avec les accès", () => {
		render(
			<OrderHistoryTimeline
				history={[
					entry("h1", "PAID"),
					entry("h2", "INVOICE_DOWNLOADED"),
					entry("h3", "SHIPPED"),
					entry("h4", "INVOICE_DOWNLOADED"),
				]}
			/>,
		);

		expect(screen.getByText("Paiement reçu")).toBeInTheDocument();
		expect(screen.getByText("Expédiée")).toBeInTheDocument();
		// Le badge du titre annonce 2 (les événements métier), pas 4.
		expect(screen.getByText("2")).toBeInTheDocument();
	});
});
