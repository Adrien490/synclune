import { type Prisma } from "@/app/generated/prisma/client";
import { sanitizeText } from "@/shared/lib/sanitize";
import { MAX_ADDRESSES_PER_USER } from "../constants/address.constants";

export interface SaveAddressInput {
	firstName: string;
	lastName: string;
	address1: string;
	address2?: string | null;
	postalCode: string;
	city: string;
	country: string;
	phone: string;
}

export type SaveAddressResult =
	{ saved: true; isDefault: boolean } | { saved: false; reason: "limit" };

/**
 * Crée une adresse pour un utilisateur en respectant la limite MAX_ADDRESSES_PER_USER.
 *
 * - Première adresse → isDefault: true (cohérent avec partial unique index Postgres)
 * - Sanitize les champs texte pour éviter les injections XSS
 * - Compte + create dans la même transaction pour fermer la race condition sur la limite
 *
 * Doit être appelé à l'intérieur d'une transaction Prisma (`prisma.$transaction`).
 *
 * Partagé entre :
 * - `actions/create-address.ts` (CRUD adresse)
 * - `payments/actions/confirm-checkout.ts` (sauvegarde optionnelle au checkout)
 */
export async function saveAddressInTransaction(
	tx: Prisma.TransactionClient,
	userId: string,
	data: SaveAddressInput,
): Promise<SaveAddressResult> {
	const count = await tx.address.count({ where: { userId } });
	if (count >= MAX_ADDRESSES_PER_USER) {
		return { saved: false, reason: "limit" };
	}

	const isFirst = count === 0;
	await tx.address.create({
		data: {
			userId,
			firstName: sanitizeText(data.firstName),
			lastName: sanitizeText(data.lastName),
			address1: sanitizeText(data.address1),
			address2: data.address2 ? sanitizeText(data.address2) : null,
			postalCode: data.postalCode,
			city: sanitizeText(data.city),
			country: data.country,
			phone: data.phone,
			isDefault: isFirst,
		},
	});

	return { saved: true, isDefault: isFirst };
}
