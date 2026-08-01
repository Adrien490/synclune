import type { Prisma } from "@/app/generated/prisma/client";
import { BusinessError } from "@/shared/lib/actions";
import {
	WISHLIST_ERROR_MESSAGES,
	PRODUCT_NOT_PUBLIC_SENTINEL,
	WISHLIST_FULL_SENTINEL,
} from "@/modules/wishlist/constants/error-messages";
import { WISHLIST_MAX_ITEMS } from "@/modules/wishlist/constants/wishlist.constants";

/**
 * Arguments shape acceptés par `addProductToWishlist`. Exactly one of
 * `userId` / `sessionId` doit être non-null — la résolution se fait par
 * priorité user (préfère le scope authentifié).
 */
export interface AddProductToWishlistArgs {
	userId: string | null;
	sessionId: string | null;
	productId: string;
}

/**
 * Résultat retourné par le service. `wishlistItemId` est le ROW créé,
 * `wishlistId` est le parent (utile pour les actions qui chaînent un
 * `update updatedAt` après).
 */
export interface AddProductToWishlistResult {
	wishlistItemId: string;
	wishlistId: string;
}

/**
 * Service transactionnel partagé entre `add-to-wishlist` et le path "add"
 * de `toggle-wishlist-item`. Exécute :
 *
 * 1. Validation produit (`status === "PUBLIC"`) — DANS le scope `tx` pour
 *    fermer la fenêtre TOCTOU (l'admin peut archiver entre le check et l'insert).
 * 2. Upsert wishlist parent (par `userId` ou `sessionId`).
 * 3. Check `WISHLIST_MAX_ITEMS` (500).
 * 4. Create de l'item — laisse remonter `P2002` au caller (race double-submit
 *    sur le `@@unique(wishlistId, productId)` ; chaque caller décide du
 *    message UX : "Deja dans vos favoris" pour `add`, success pour `toggle`).
 *
 * Layering note (exception documentée `01-conventions.md § Services
 * transactionnels partagés`) : ce service contient des reads + mutations
 * partagés par 2 actions ; sa cohérence dépend du `$transaction` du caller.
 *
 * @throws BusinessError code `PRODUCT_NOT_PUBLIC` si le produit absent
 *         ou non public.
 * @throws BusinessError code `WISHLIST_FULL` si la wishlist atteint la cap.
 * @throws Prisma.PrismaClientKnownRequestError P2002 si l'item existe déjà
 *         (race condition) — à catcher dans le caller.
 */
export async function addProductToWishlist(
	tx: Prisma.TransactionClient,
	args: AddProductToWishlistArgs,
): Promise<AddProductToWishlistResult> {
	const { userId, sessionId, productId } = args;

	// 1. Validation produit (DANS la transaction pour anti-TOCTOU)
	const product = await tx.product.findUnique({
		where: { id: productId },
		select: { id: true, status: true },
	});
	if (!product || product.status !== "PUBLIC") {
		throw new BusinessError(
			WISHLIST_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC,
			PRODUCT_NOT_PUBLIC_SENTINEL,
		);
	}

	// 2. Upsert wishlist parent — `updatedAt` rafraîchi explicitement : la purge
	// (`cleanup-wishlists.service.ts`) s'en sert comme date de dernière
	// interaction, et un `update: {}` vide ne garantit pas le bump du @updatedAt.
	const wishlist = await tx.wishlist.upsert({
		where: userId ? { userId } : { sessionId: sessionId! },
		create: {
			userId: userId ?? null,
			sessionId: sessionId ?? null,
		},
		update: { updatedAt: new Date() },
		select: { id: true },
	});

	// 3. Check cap WISHLIST_MAX_ITEMS — `productId: { not: null }` : un hard
	// delete produit (onDelete: SetNull) laisse des items orphelins invisibles
	// en lecture ; les compter ferait refuser des ajouts sur une grille vide.
	const itemCount = await tx.wishlistItem.count({
		where: { wishlistId: wishlist.id, productId: { not: null } },
	});
	if (itemCount >= WISHLIST_MAX_ITEMS) {
		throw new BusinessError(WISHLIST_ERROR_MESSAGES.WISHLIST_FULL, WISHLIST_FULL_SENTINEL);
	}

	// 4. Create item — laisse remonter P2002 au caller (race double-submit)
	const wishlistItem = await tx.wishlistItem.create({
		data: {
			wishlistId: wishlist.id,
			productId,
		},
		select: { id: true },
	});

	return {
		wishlistItemId: wishlistItem.id,
		wishlistId: wishlist.id,
	};
}
