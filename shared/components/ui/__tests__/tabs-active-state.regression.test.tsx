/**
 * @regression tabs-broken-tailwind-concat-2026-05-28
 *
 * Garde contre une corruption className déjà observée sur `TabsTrigger`
 * (audit UI/UX 2026-05-28 — finding A1) : trois variants d'état actif et
 * `focus-visible:outline-1` avaient été concaténés sans espace. Tailwind
 * n'émettait alors AUCUNE de ces classes → l'onglet actif perdait son fond et
 * son texte distinctif.
 *
 * ⚠️ Migration Base UI (Radix → `@base-ui/react`) : le variant s'écrit désormais
 * `data-active:` (attribut booléen présent/absent) et non plus
 * `data-[state=active]:`. Le DÉFAUT gardé est le même — seule la signature de
 * corruption change : un token qui porterait deux fois le préfixe `data-active:`
 * est le symptôme d'une concaténation sans espace.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";

afterEach(cleanup);

describe("Tabs — broken concat regression", () => {
	it("TabsTrigger className has no token carrying `data-active:` twice (broken concat signature)", () => {
		const { getByRole } = render(
			<Tabs defaultValue="a">
				<TabsList>
					<TabsTrigger value="a">A</TabsTrigger>
					<TabsTrigger value="b">B</TabsTrigger>
				</TabsList>
				<TabsContent value="a">content a</TabsContent>
			</Tabs>,
		);

		// Légitime : `data-active:bg-background` — un seul préfixe.
		// Corruption : `data-active:bg-backgrounddata-active:text-foreground`.
		const brokenTokens = getByRole("tab", { name: "A" })
			.className.split(/\s+/)
			.filter((t) => (t.match(/data-active:/g) ?? []).length > 1);
		expect(brokenTokens).toEqual([]);
	});

	it("TabsTrigger applies standalone `data-active:bg-background` token", () => {
		const { getByRole } = render(
			<Tabs defaultValue="a">
				<TabsList>
					<TabsTrigger value="a">A</TabsTrigger>
				</TabsList>
			</Tabs>,
		);

		const tokens = getByRole("tab", { name: "A" }).className.split(/\s+/);
		expect(tokens).toContain("data-active:bg-background");
		expect(tokens).toContain("data-active:text-foreground");
	});

	it("TabsTrigger applies focus-ring SSOT (cohérence DS)", () => {
		const { getByRole } = render(
			<Tabs defaultValue="a">
				<TabsList>
					<TabsTrigger value="a">A</TabsTrigger>
				</TabsList>
			</Tabs>,
		);

		expect(getByRole("tab", { name: "A" }).className.split(/\s+/)).toContain("focus-ring");
	});

	it("TabsContent applies focus-ring SSOT", () => {
		const { getByRole } = render(
			<Tabs defaultValue="a">
				<TabsList>
					<TabsTrigger value="a">A</TabsTrigger>
				</TabsList>
				<TabsContent value="a">content</TabsContent>
			</Tabs>,
		);

		expect(getByRole("tabpanel").className.split(/\s+/)).toContain("focus-ring");
	});
});
