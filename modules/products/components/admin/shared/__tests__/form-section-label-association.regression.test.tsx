/**
 * @regression form-section-label-association
 *
 * Contrat : chaque libellé visible des sections de formulaire produit est
 * RÉELLEMENT associé à son contrôle.
 *
 * `FieldLabel` rend un `<label>` natif ; sans `htmlFor` il ne s'associe à rien.
 * Or `InputGroupField` ne rend son propre libellé que si on lui passe `label` —
 * et ces call sites ne le passent pas, ils posent le leur à l'extérieur. Quatre
 * champs sont donc restés SANS NOM ACCESSIBLE (WCAG 4.1.2) : « Prix de vente
 * final », « Ancien prix (affiché barré) », « Quantité en stock » et « Taille ».
 * Le lecteur d'écran les annonçait par leur seul indice — « Le prix que paiera
 * le client » — et cliquer le libellé ne focalisait pas le champ.
 *
 * Le défaut vivait dans les PRIMITIVES, pas dans un formulaire : les mêmes
 * fichiers sont montés par créer/éditer produit et créer/éditer variante, donc
 * quatre formulaires étaient touchés.
 *
 * ⚠️ Ce test RÉALISE le rendu, avec un vrai `useAppForm`. Un scan de source
 * (`toContain("htmlFor=")`) prouverait que l'attribut est écrit, jamais qu'il
 * pointe vers un id existant — c'est précisément l'écart qui a laissé passer le
 * défaut, l'id étant posé par un AUTRE composant
 * (cf. [[field-name-id-contract]], son pendant côté field component).
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// `VariantAttributeFields` monte les champs couleurs/matériaux, qui ouvrent des
// dialogs et rafraîchissent la route — hors sujet ici, mais indispensables au
// montage. Tout le reste (libellés, ids, champs) est le VRAI code.
vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: vi.fn(), close: vi.fn(), isOpen: false }),
}));

import { useAppForm } from "@/shared/components/forms";

import { PricingFields } from "../pricing-card";
import { StockField } from "../stock-card";
import { VariantAttributeFields } from "../variant-attribute-fields";

afterEach(cleanup);

function Harness() {
	const form = useAppForm({
		defaultValues: {
			initialSku: {
				priceInclTaxEuros: null as number | null,
				compareAtPriceEuros: undefined as number | undefined,
				inventory: 1,
				colorIds: [] as string[],
				materialIds: [] as string[],
				size: "",
			},
		},
	});

	return (
		<form>
			<PricingFields
				form={form}
				priceFieldName="initialSku.priceInclTaxEuros"
				compareAtPriceFieldName="initialSku.compareAtPriceEuros"
				hintIdPrefix="create-product-price"
			/>
			<StockField
				form={form}
				inventoryFieldName="initialSku.inventory"
				hintIdPrefix="create-product-stock"
			/>
			<VariantAttributeFields
				form={form}
				colors={[]}
				materials={[]}
				colorIdsFieldName="initialSku.colorIds"
				materialsFieldName="initialSku.materialIds"
				sizeFieldName="initialSku.size"
			/>
		</form>
	);
}

describe("libellés des sections de formulaire produit", () => {
	it.each([
		["Prix de vente final", "initialSku.priceInclTaxEuros"],
		["Ancien prix (affiché barré)", "initialSku.compareAtPriceEuros"],
		["Quantité en stock", "initialSku.inventory"],
		["Taille", "initialSku.size"],
	])("« %s » nomme bien son contrôle", (label, fieldName) => {
		render(<Harness />);

		// `getByLabelText` échoue si le `<label>` ne pointe vers aucun contrôle —
		// c'est l'assertion qui décrit le défaut.
		const control = screen.getByLabelText(new RegExp(label.replace(/[()]/g, "\\$&"), "i"));
		expect(control).toHaveAttribute("id", fieldName);
	});
});
