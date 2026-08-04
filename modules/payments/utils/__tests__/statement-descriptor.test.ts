import { describe, expect, it } from "vitest";
import { buildStatementDescriptorSuffix } from "../statement-descriptor";

describe("buildStatementDescriptorSuffix", () => {
	it("garde le numéro de commande tel quel", () => {
		expect(buildStatementDescriptorSuffix("SYN-042")).toBe("SYN-042");
	});

	it("retire les caractères interdits par Stripe (< > ' \" *)", () => {
		expect(buildStatementDescriptorSuffix("SYN<>*'\"-042")).toBe("SYN-042");
	});

	it("ne dépasse jamais 22 caractères", () => {
		const long = buildStatementDescriptorSuffix("SYN-" + "9".repeat(60));
		expect(long.length).toBeLessThanOrEqual(22);
	});

	// ⚠️ La règle la moins intuitive : Stripe rejette un libellé entièrement
	// numérique. Réduire `SYN-042` à `042` pour « économiser des caractères »
	// produirait donc une requête refusée — au moment du paiement.
	it("ne rend jamais un libellé uniquement numérique", () => {
		expect(buildStatementDescriptorSuffix("12345")).toBe("COMMANDE");
		expect(buildStatementDescriptorSuffix("042")).toBe("COMMANDE");
	});

	it("retombe sur un libellé valide quand le nettoyage vide la chaîne", () => {
		expect(buildStatementDescriptorSuffix("***")).toBe("COMMANDE");
		expect(buildStatementDescriptorSuffix("   ")).toBe("COMMANDE");
	});
});
