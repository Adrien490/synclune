/**
 * @regression tabs-broken-tailwind-concat-2026-05-28
 *
 * Garde contre une corruption className déjà observée sur `TabsTrigger`
 * (audit UI/UX 2026-05-28 — finding A1) : trois variants `data-[state=active]:*`
 * et `focus-visible:outline-1` avaient été concaténés sans espace, produisant
 * `bg-background=active]:text-foreground` etc. Tailwind n'émettait alors AUCUNE
 * de ces classes → l'onglet actif perdait son fond et son texte distinctif.
 *
 * Tests below assert qu'aucun token Tailwind invalide contenant le marqueur
 * `=active]:` ne réapparaît, et que les variants `data-[state=active]:*` sont
 * présents comme tokens à part entière.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";

afterEach(cleanup);

describe("Tabs — broken concat regression", () => {
	it("TabsTrigger className has no orphan `=active]:` token (broken concat signature)", () => {
		const { getByRole } = render(
			<Tabs defaultValue="a">
				<TabsList>
					<TabsTrigger value="a">A</TabsTrigger>
					<TabsTrigger value="b">B</TabsTrigger>
				</TabsList>
				<TabsContent value="a">content a</TabsContent>
			</Tabs>,
		);

		// Légitime : `data-[state=active]:bg-background` — `=active]:` est dans `[state=active]`.
		// Corruption : `bg-background=active]:text-foreground` — `=active]:` sans `[state=active]`.
		const brokenTokens = getByRole("tab", { name: "A" })
			.className.split(/\s+/)
			.filter((t) => t.includes("=active]:") && !t.includes("[state=active]"));
		expect(brokenTokens).toEqual([]);
	});

	it("TabsTrigger applies standalone `data-[state=active]:bg-background` token", () => {
		const { getByRole } = render(
			<Tabs defaultValue="a">
				<TabsList>
					<TabsTrigger value="a">A</TabsTrigger>
				</TabsList>
			</Tabs>,
		);

		const tokens = getByRole("tab", { name: "A" }).className.split(/\s+/);
		expect(tokens).toContain("data-[state=active]:bg-background");
		expect(tokens).toContain("data-[state=active]:text-foreground");
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
