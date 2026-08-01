import { z } from "zod";

import { ADDRESS_CONSTANTS, ADDRESS_ERROR_MESSAGES } from "@/shared/constants/address.constants";
import { COUNTRY_ERROR_MESSAGE, SHIPPING_COUNTRIES } from "@/shared/constants/countries";

/**
 * Briques de validation d'une adresse postale — SSOT des CHAMPS, pas d'une forme
 * d'objet unique.
 *
 * ⚠️ Pourquoi des briques et non un `addressSchema` unique : les quatre surfaces qui
 * valident une adresse n'ont PAS la même forme, et les forcer dans un moule commun
 * serait une régression fonctionnelle, pas une simplification.
 *
 *  | Surface                              | Nom                  | Préfixe      |
 *  | ------------------------------------ | -------------------- | ------------ |
 *  | Checkout (`checkout.schema.ts`)      | `fullName` (Baymard) | aucun        |
 *  | Livraison admin (`order.schemas.ts`) | first/last séparés   | `shipping*`  |
 *  | Facturation admin                    | first/last séparés   | `billing*`   |
 *  | Facture (`invoice.schema.ts`)        | `recipientName`      | `line1/line2`|
 *
 * Ce qui DOIT être partagé, ce sont les contraintes : longueurs alignées sur les
 * colonnes Prisma et regex de code postal. Elles vivent dans `ADDRESS_CONSTANTS` ;
 * ce fichier les habille en schémas Zod pour éviter que chaque surface ne
 * re-compose `z.string().min(1).max(255)` à la main — c'est ainsi que
 * `invoice.schema.ts` s'est retrouvé avec `postalCode: min(1).max(20)` **sans
 * regex**, et `update-payment-amount.ts` avec `max(20)` sans regex non plus, quand
 * le checkout et l'admin appliquent `max(10)` + `POSTAL_CODE_REGEX`.
 *
 * ⚠️ `invoice.schema.ts` ne consomme volontairement PAS ces briques : il valide un
 * snapshot de données **déjà validées**, au seul point où elles deviennent immuables
 * (`persist-invoice-number.service.ts`). Y resserrer une borne ne corrigerait rien
 * en amont et ferait DIFFÉRER une facture (`invoiceRetryDeferred` → alerte admin)
 * sur des lignes historiques parfaitement légitimes.
 */

/** Prénom ou nom seul — `VarChar(50)`. */
export const nameFieldSchema = z
	.string()
	.trim()
	.min(ADDRESS_CONSTANTS.MIN_NAME_LENGTH, ADDRESS_ERROR_MESSAGES.FIRST_NAME_TOO_SHORT)
	.max(ADDRESS_CONSTANTS.MAX_NAME_LENGTH, ADDRESS_ERROR_MESSAGES.FIRST_NAME_TOO_LONG);

/** Ligne d'adresse — `VarChar(255)`. */
export const addressLineSchema = z
	.string()
	.trim()
	.min(1, "L'adresse est requise")
	.max(ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH, ADDRESS_ERROR_MESSAGES.ADDRESS_TOO_LONG);

/** Complément d'adresse — même colonne, mais facultatif. */
export const addressLineOptionalSchema = z
	.string()
	.trim()
	.max(ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH, ADDRESS_ERROR_MESSAGES.ADDRESS_TOO_LONG)
	.optional();

/** Ville — `VarChar(100)`. */
export const citySchema = z
	.string()
	.trim()
	.min(ADDRESS_CONSTANTS.MIN_CITY_LENGTH, ADDRESS_ERROR_MESSAGES.CITY_TOO_SHORT)
	.max(ADDRESS_CONSTANTS.MAX_CITY_LENGTH, ADDRESS_ERROR_MESSAGES.CITY_TOO_LONG);

/**
 * Code postal — `VarChar(10)` + `POSTAL_CODE_REGEX`.
 *
 * La regex est volontairement agnostique du pays (décision assumée, audit Zod
 * 2026-07-31) : la resserrer par pays durcirait la saisie hors-FR sans bénéfice
 * démontré. Ce qui compte ici est qu'elle soit appliquée PARTOUT de la même façon.
 */
export const postalCodeSchema = z
	.string()
	.trim()
	.max(ADDRESS_CONSTANTS.MAX_POSTAL_CODE_LENGTH, ADDRESS_ERROR_MESSAGES.INVALID_POSTAL_CODE)
	.regex(ADDRESS_CONSTANTS.POSTAL_CODE_REGEX, ADDRESS_ERROR_MESSAGES.INVALID_POSTAL_CODE);

/**
 * Pays de livraison — enum fermé, jamais `z.string().length(2)`.
 *
 * Le pays pilote le tarif d'expédition (`calculateShipping`) : une valeur hors liste
 * ne doit pas pouvoir atteindre la couche métier.
 */
export const shippingCountrySchema = z.enum(SHIPPING_COUNTRIES, {
	message: COUNTRY_ERROR_MESSAGE,
});
