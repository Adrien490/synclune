/**
 * Factories pour les integration tests : créent rapidement des entités DB
 * cohérentes pour les flows critical path (cart, orders, discounts, refunds).
 *
 * Toutes les factories acceptent des overrides partiels et retournent
 * l'entité créée avec son id. Utilisent `getIntegrationPrismaClient()`
 * pour garantir qu'on cible la DB d'intégration.
 */
import { getIntegrationPrismaClient } from "./prisma-client";
import {
	ProductStatus,
	type Product,
	type ProductSku,
	type User,
} from "@/app/generated/prisma/client";

let counter = 0;
const uniq = () => `${Date.now()}-${++counter}`;

export async function createTestUser(overrides: Partial<User> = {}): Promise<User> {
	const prisma = getIntegrationPrismaClient();
	const id = `user_${uniq()}`;
	return prisma.user.create({
		data: {
			id,
			email: `${id}@test.local`,
			emailVerified: true,
			name: "Test User",
			role: "USER",
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		},
	});
}

export async function createTestProduct(overrides: Partial<Product> = {}): Promise<Product> {
	const prisma = getIntegrationPrismaClient();
	const slug = `product-${uniq()}`;
	return prisma.product.create({
		data: {
			slug,
			title: `Test Product ${slug}`,
			description: "Integration test product",
			status: ProductStatus.PUBLIC,
			...overrides,
		},
	});
}

export async function createTestSku(
	productId: string,
	overrides: Partial<ProductSku> = {},
): Promise<ProductSku> {
	const prisma = getIntegrationPrismaClient();
	return prisma.productSku.create({
		data: {
			sku: `SKU-${uniq()}`,
			productId,
			priceInclTax: 5_000, // 50€
			compareAtPrice: null,
			inventory: 10,
			isActive: true,
			...overrides,
		},
	});
}
