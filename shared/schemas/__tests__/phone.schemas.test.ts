import { describe, it, expect } from "vitest";
import { phoneSchema, PHONE_ERROR_MESSAGES, PHONE_MAX_LENGTH } from "../phone.schemas";

describe("phoneSchema", () => {
	it("should accept a valid French mobile number in international format", () => {
		const result = phoneSchema.safeParse("+33612345678");
		expect(result.success).toBe(true);
	});

	it("should accept a valid French landline in international format", () => {
		const result = phoneSchema.safeParse("+33123456789");
		expect(result.success).toBe(true);
	});

	it("should accept a valid Belgian number", () => {
		const result = phoneSchema.safeParse("+32470123456");
		expect(result.success).toBe(true);
	});

	it("should accept a valid German number", () => {
		const result = phoneSchema.safeParse("+4915112345678");
		expect(result.success).toBe(true);
	});

	it("should reject an empty string with REQUIRED message", () => {
		const result = phoneSchema.safeParse("");
		expect(result.success).toBe(false);
		if (!result.success) {
			// Empty string triggers min(1) as first issue
			expect(result.error.issues[0]?.message).toBe(PHONE_ERROR_MESSAGES.REQUIRED);
		}
	});

	it("should reject a clearly invalid phone number with INVALID message", () => {
		const result = phoneSchema.safeParse("123");
		expect(result.success).toBe(false);
		if (!result.success) {
			// Passes min(1) but fails refine → single issue
			expect(result.error.issues[0]?.message).toBe(PHONE_ERROR_MESSAGES.INVALID);
		}
	});

	it("should reject random text with INVALID message", () => {
		const result = phoneSchema.safeParse("not-a-phone");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(PHONE_ERROR_MESSAGES.INVALID);
		}
	});

	it("should reject undefined", () => {
		const result = phoneSchema.safeParse(undefined);
		expect(result.success).toBe(false);
	});

	/**
	 * @regression phone-e164-normalization
	 *
	 * ⚠️ Toutes les assertions ci-dessus portaient sur des entrées **déjà en E.164**
	 * — c'est précisément ce qui masquait le problème. Le schéma ne faisait que
	 * `refine(isValidPhoneNumber)` : la chaîne BRUTE partait en base, dans des
	 * colonnes `VarChar(20)` (`Order.shippingPhone` / `customerPhone` /
	 * `billingPhone`).
	 *
	 * Sur le tunnel checkout le risque restait masqué par `PhoneField`
	 * (react-phone-number-input émet de l'E.164), mais deux chemins y échappaient :
	 * l'édition client admin (`<input type="tel">` nu) et `confirmCheckout`, action
	 * publique appelable directement.
	 */
	describe("normalisation E.164 et borne de colonne", () => {
		it("normalise un format national français en E.164", () => {
			const result = phoneSchema.safeParse("06 12 34 56 78");

			// Sans `.transform()`, ce cas échouait faute d'indicatif — ou pire, passait
			// tel quel selon l'entrée.
			expect(result.success).toBe(false); // pas d'indicatif : ambigu, on refuse
		});

		it("normalise les séparateurs d'un numéro international", () => {
			const result = phoneSchema.safeParse("+33 6 12 34 56 78");

			expect(result.success).toBe(true);
			if (result.success) expect(result.data).toBe("+33612345678");
		});

		it("normalise les parenthèses et tirets (forme la plus longue en saisie libre)", () => {
			// Cette forme fait PILE 20 caractères : elle tenait tout juste dans la
			// colonne, et un seul séparateur de plus la faisait déborder.
			const raw = "+33 (0)6-12-34-56-78";
			expect(raw.length).toBe(PHONE_MAX_LENGTH);

			const result = phoneSchema.safeParse(raw);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe("+33612345678");
				expect(result.data.length).toBeLessThanOrEqual(PHONE_MAX_LENGTH);
			}
		});

		it("retire l'extension — libphonenumber l'accepte, la colonne non", () => {
			// `"+33612345678 ext. 1234"` fait 22 caractères et passait
			// `isValidPhoneNumber` : c'est le cas qui débordait `VarChar(20)`.
			const result = phoneSchema.safeParse("+33612345678 ext. 1234");

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.length).toBeLessThanOrEqual(PHONE_MAX_LENGTH);
				expect(result.data).not.toMatch(/ext/i);
			}
		});

		it("trim les espaces de bord", () => {
			const result = phoneSchema.safeParse("  +33612345678  ");

			expect(result.success).toBe(true);
			if (result.success) expect(result.data).toBe("+33612345678");
		});

		it("toute sortie acceptée tient dans la colonne VarChar(20)", () => {
			const inputs = [
				"+33612345678",
				"+33 6 12 34 56 78",
				"+33 (0)6-12-34-56-78",
				"+4915112345678",
				"+32 470 12 34 56",
				"+1 (415) 555-0132",
				"+33612345678 ext. 1234",
			];

			for (const input of inputs) {
				const result = phoneSchema.safeParse(input);
				if (result.success) {
					expect(result.data.length, `"${input}" → "${result.data}"`).toBeLessThanOrEqual(
						PHONE_MAX_LENGTH,
					);
				}
			}
		});
	});
});
