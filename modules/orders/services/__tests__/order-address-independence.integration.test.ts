/**
 * Integration test — indépendance Order.shipping* vs Address (DB réelle).
 *
 * @regression order-address-independence
 *
 * Invariant #5 (CLAUDE.md § Facturation électronique) : les snapshots adresses
 * sur Order sont figés au checkout ; le modèle `Address` du client évolue
 * indépendamment. Les gardes existantes sont STATIQUES (scan de source dans
 * `order-address-snapshot-immutability.regression.test.ts`) — ce test prouve
 * l'isolation en RUNTIME contre un vrai Postgres : on crée une commande dont
 * les colonnes snapshot copient une Address, puis on mute et on supprime cette
 * Address, et on vérifie que la ligne Order est byte-identique.
 *
 * Ce que ça verrouille concrètement : l'absence de FK Order→Address (un
 * `onDelete: Cascade`/`SetNull` ou un trigger de sync ajouté par une future
 * migration ferait rougir ce test).
 *
 * Pré-requis : `INTEGRATION_DATABASE_URL` (cf `test/integration/setup.ts`).
 * Skippé silencieusement si la variable est absente.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser } from "@/test/integration/factories";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

let counter = 0;
const uniq = () => `${Date.now()}-${++counter}`;

const SNAPSHOT_FIELDS = {
	shippingFirstName: "Marie",
	shippingLastName: "Dupont",
	shippingAddress1: "12 Rue de la Paix",
	shippingAddress2: "Bâtiment B",
	shippingPostalCode: "75001",
	shippingCity: "Paris",
	shippingCountry: "FR",
	shippingPhone: "+33612345678",
} as const;

describeIntegration("Order.shipping* indépendant du modèle Address (Invariant #5, runtime)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	beforeAll(() => {
		prisma = getIntegrationPrismaClient();
	});

	async function createOrderWithAddressSnapshot() {
		const user = await createTestUser();
		// L'Address "carnet" dont les valeurs ont servi au formulaire checkout.
		const address = await prisma.address.create({
			data: {
				userId: user.id,
				firstName: SNAPSHOT_FIELDS.shippingFirstName,
				lastName: SNAPSHOT_FIELDS.shippingLastName,
				address1: SNAPSHOT_FIELDS.shippingAddress1,
				address2: SNAPSHOT_FIELDS.shippingAddress2,
				postalCode: SNAPSHOT_FIELDS.shippingPostalCode,
				city: SNAPSHOT_FIELDS.shippingCity,
				country: SNAPSHOT_FIELDS.shippingCountry,
				phone: SNAPSHOT_FIELDS.shippingPhone,
				isDefault: true,
			},
		});
		// La commande avec les colonnes snapshot copiées (comme au checkout).
		const order = await prisma.order.create({
			data: {
				orderNumber: `SYN-TEST-${uniq()}`,
				userId: user.id,
				customerEmail: user.email,
				customerName: `${SNAPSHOT_FIELDS.shippingFirstName} ${SNAPSHOT_FIELDS.shippingLastName}`,
				subtotal: 5980,
				total: 6430,
				shippingCost: 450,
				...SNAPSHOT_FIELDS,
			},
		});
		return { user, address, order };
	}

	async function readOrderSnapshot(orderId: string) {
		return prisma.order.findUniqueOrThrow({
			where: { id: orderId },
			select: {
				shippingFirstName: true,
				shippingLastName: true,
				shippingAddress1: true,
				shippingAddress2: true,
				shippingPostalCode: true,
				shippingCity: true,
				shippingCountry: true,
				shippingPhone: true,
			},
		});
	}

	it("updating the customer Address leaves the Order snapshot untouched", async () => {
		const { address, order } = await createOrderWithAddressSnapshot();

		await prisma.address.update({
			where: { id: address.id },
			data: {
				firstName: "Nouvelle",
				lastName: "Identité",
				address1: "99 Avenue du Changement",
				address2: null,
				postalCode: "69001",
				city: "Lyon",
				country: "FR",
				phone: "+33700000000",
			},
		});

		expect(await readOrderSnapshot(order.id)).toEqual(SNAPSHOT_FIELDS);
	});

	it("deleting the customer Address leaves the Order snapshot untouched", async () => {
		const { address, order } = await createOrderWithAddressSnapshot();

		await prisma.address.delete({ where: { id: address.id } });

		expect(await readOrderSnapshot(order.id)).toEqual(SNAPSHOT_FIELDS);
	});
});
