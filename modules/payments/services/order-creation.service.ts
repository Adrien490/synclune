import { prisma } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import { BusinessError } from "@/shared/lib/actions";
import { calculateShipping } from "@/modules/orders/services/shipping.service";
import { generateOrderNumber } from "@/modules/orders/services/order-generation.service";
import type { ShippingCountry } from "@/shared/constants/countries";
import { STRIPE_MIN_AMOUNT_EUR_CENTS } from "@/shared/constants/currency";
import { getValidImageUrl } from "@/shared/lib/media-validation";
import { pickPrimaryImage } from "@/modules/products/services/product-display.service";
import { normalizeEmail } from "@/shared/utils/normalize-email";
import type { getSkuDetails } from "@/modules/cart/services/sku-validation.service";
import * as Sentry from "@sentry/nextjs";

// CHECKOUT-TOTAL-005 : un cartItem sans skuDetailsResult correspondant signifie que
// le subtotal (calculé par computeCartSubtotal sur les mêmes données) peut inclure
// un article qui ne serait pas snapshoté — fail-closed, jamais de skip silencieux
// sur un chemin de facturation.
const CART_ITEM_MISMATCH_ERROR =
	"Certains articles de ton panier sont introuvables. Actualise la page.";

/** Longueur des colonnes `OrderItem.skuColor` / `skuMaterial` (`VarChar(100)`). */
const SKU_LABEL_SNAPSHOT_MAX_LENGTH = 100;

/**
 * Tronque un libellé AGRÉGÉ avant de le figer dans un snapshot `OrderItem`.
 *
 * ⚠️ `skuColor` et `skuMaterial` ne recopient pas un champ, ils **joignent** jusqu'à
 * 3 noms (`ARRAY_LIMITS.SKU_COLORS` / `SKU_MATERIALS`) de 100 caractères chacun —
 * soit jusqu'à 306 caractères pour une colonne `VarChar(100)`. Aucun schéma Zod ne
 * couvre ce point : la valeur est construite ici, côté serveur, à partir de données
 * déjà validées individuellement. Latent tant que les noms de couleur restent
 * courts, mais rien ne l'empêche — et l'échec serait un `22001` **dans la
 * transaction de création de commande**, donc un paiement en échec.
 *
 * Tronquer plutôt que rejeter : un libellé d'affichage abrégé est sans conséquence
 * comptable (il ne porte ni prix ni quantité), alors que refuser la commande à
 * l'encaissement le serait.
 */
function truncateSkuLabel(value: string | null): string | null {
	if (value === null) return null;
	return value.length > SKU_LABEL_SNAPSHOT_MAX_LENGTH
		? value.slice(0, SKU_LABEL_SNAPSHOT_MAX_LENGTH)
		: value;
}

type SkuDetailsResult = Awaited<ReturnType<typeof getSkuDetails>>;

export interface CreateOrderParams {
	cartItems: Array<{ skuId: string; quantity: number }>;
	skuDetailsResults: SkuDetailsResult[];
	subtotal: number;
	shippingAddress: {
		addressLine1: string;
		addressLine2?: string | null;
		postalCode: string;
		city: string;
		country: string;
		phoneNumber?: string | null;
	};
	firstName: string;
	lastName: string;
	finalEmail: string | null;
	/**
	 * PaymentIntent Stripe de la commande — OBLIGATOIRE (invariant #8, NF 525).
	 *
	 * Une commande doit naître avec sa provenance Stripe : c'est la précondition
	 * sur laquelle reposent TOUS les gardes en aval (`mark-as-paid` refuse
	 * `!stripePaymentIntentId`, le webhook résout la commande par ce champ, et le
	 * CHECK `Order_paid_requires_stripe_proof` refuse l'état PAID sans lui).
	 *
	 * Le champ a été optionnel jusqu'au 2026-07-31 : l'unique appelant le passait
	 * toujours, mais rien ne l'imposait. Même motif que EINV-SEQ-008 sur
	 * `persistInvoiceNumber` — la garde vit dans le service, pas chez l'appelant.
	 */
	paymentIntentId: string;
}

interface CreateOrderResult {
	order: { id: string; orderNumber: string; total: number };
}

/**
 * Creates an order atomically inside a Prisma transaction.
 *
 * Verifies stock with FOR UPDATE row locking and creates the order + order items
 * in a single transaction.
 *
 * **Optimistic stock reservation**: Stock is verified (FOR UPDATE) but NOT decremented here.
 * The actual inventory decrement happens in the Stripe webhook handler
 * (`webhooks/services/checkout.service.ts` → `processOrderAtomically`) after payment
 * confirmation. This means two concurrent orders for the last item can both pass
 * verification, but only the first will succeed at webhook processing — the second
 * fails the webhook's own FOR UPDATE re-validation with an `OversellError`.
 *
 * ⚠️ Le perdant a DÉJÀ encaissé son paiement Stripe. Il n'est PAS récupéré par
 * `cleanup-pending-orders` (ce cron exclut les commandes avec `stripePaymentIntentId`).
 * C'est `handlePaymentSuccess` → `handleOversell` (ORD-STRIPE-009) qui le rembourse
 * automatiquement + marque la commande FAILED. Ce trade-off
 * évite la logique de rollback complexe et est acceptable au volume actuel.
 *
 * **Pas d'entrée OrderHistory à la création (délibéré)** : une commande PENDING n'est
 * pas encore une pièce comptable (ni facture, ni encaissement), et
 * `cleanupFailedCheckout` peut la hard-delete si l'update du PI échoue — une entrée
 * d'audit posée ici deviendrait orpheline (`OrderHistory.order` est `onDelete:
 * SetNull`). La première entrée d'audit trail est posée à la transition PAID par le
 * webhook (`createOrderAuditTx`, BIZ-BUG-003), dans la même transaction que le
 * décrément de stock.
 *
 * Called from confirmCheckout before Stripe PI update.
 * On Stripe failure, the caller is responsible for rolling back via cleanupFailedCheckout.
 */
export async function createOrderInTransaction(
	params: CreateOrderParams,
): Promise<CreateOrderResult> {
	const {
		cartItems,
		skuDetailsResults,
		subtotal,
		shippingAddress,
		firstName,
		lastName,
		finalEmail,
		paymentIntentId,
	} = params;

	// CHECKOUT-TOTAL-005 : invariant interne — le `subtotal` paramètre (pré-calculé
	// hors transaction par computeCartSubtotal) doit égaler la somme des lignes qui
	// seront réellement snapshotées ci-dessous (mêmes skuDetailsResults). Toute
	// divergence (filtrage, arrondi) produirait un Order dont
	// total ≠ Σ items + livraison, indétectable en aval. Vérification pure,
	// AVANT la transaction — aucun lock tenu si elle échoue.
	let computedSubtotal = 0;
	for (const cartItem of cartItems) {
		const skuResult = skuDetailsResults.find((r) => r.success && r.data?.sku.id === cartItem.skuId);
		if (!skuResult?.success || !skuResult.data) {
			throw new BusinessError(CART_ITEM_MISMATCH_ERROR);
		}
		computedSubtotal += skuResult.data.sku.priceInclTax * cartItem.quantity;
	}
	if (computedSubtotal !== subtotal) {
		// Bug interne (pas une erreur client) → Sentry, puis rejet fail-closed.
		Sentry.withScope((scope) => {
			scope.setLevel("error");
			scope.setTag("checkout", "subtotal-mismatch");
			scope.setFingerprint(["order-creation", "subtotal-mismatch"]);
			scope.setContext("checkout", { subtotal, computedSubtotal });
			Sentry.captureMessage(
				"createOrderInTransaction: subtotal param diverges from line items sum",
				"error",
			);
		});
		throw new BusinessError("Le montant de ton panier a changé. Actualise la page.");
	}

	// Generate order number and compute shipping cost
	//
	// Ces deux étapes sont PURES et ne dépendent que de l'adresse : les tenir hors
	// de la transaction évite de prendre N verrous de ligne pour, éventuellement,
	// refuser aussitôt une zone non livrée. Le verrou ne doit couvrir que ce qui a
	// besoin d'un état DB cohérent.
	const orderNumber = generateOrderNumber();
	const shippingCost = calculateShipping(
		shippingAddress.country as ShippingCountry,
		shippingAddress.postalCode,
	);

	if (shippingCost === null) {
		throw new BusinessError("Livraison non disponible pour cette zone (Corse, DOM-TOM)");
	}

	// Micro-entreprise : TVA non applicable (art. 293 B du CGI). Aucune TVA
	// n'est stockée — ni ici, ni par ligne : le total est HT = TTC et le CHECK
	// `Order_total_formula` l'exclut. Sortir de la franchise (seuil 2026 :
	// 85 000 € pour les ventes de biens) est un chantier à part entière, décrit
	// à part — il exige des
	// colonnes de TVA PAR LIGNE sur OrderItem, pas un agrégat sur Order.
	// MIN-AMOUNT-DIVERGE-01 : `total` est le montant AUTORITAIRE posé sur le PI
	// avant capture (confirm-checkout). Pas de plancher STRIPE_MIN_AMOUNT_EUR_CENTS
	// ici (contrairement à update-payment-amount qui clampe pour l'affichage) —
	// l'invariant qui le rend inutile : `shippingCost >= STRIPE_MIN_AMOUNT_EUR_CENTS`
	// (frais FR par défaut = 499 c, jamais null en métropole) ⇒ total >= shipping >= min.
	const total = Math.max(0, subtotal + shippingCost);

	// Le rejet ci-dessous matérialise cet invariant au lieu de le documenter.
	// Il n'est atteignable qu'après l'introduction d'un port gratuit ou d'un tarif
	// < 50 c ; sans lui, ce jour-là, Stripe refusait l'`update` de `confirmCheckout`
	// (montant sous le minimum EUR) et le client voyait « Une erreur est survenue »
	// après un `cleanupFailedCheckout` — un cul-de-sac muet plutôt qu'un motif.
	// Surtout : PAS de clamp silencieux à 50 c, qui sur-facturerait le client sans
	// que rien ne le signale (le PI porterait 50 c, `order.total` autre chose).
	if (total < STRIPE_MIN_AMOUNT_EUR_CENTS) {
		Sentry.withScope((scope) => {
			scope.setLevel("error");
			scope.setTag("checkout", "total-below-stripe-minimum");
			scope.setFingerprint(["order-creation", "total-below-stripe-minimum"]);
			// Aucune PII : uniquement des montants.
			scope.setContext("checkout", {
				total,
				subtotal,
				shippingCost,
				minimum: STRIPE_MIN_AMOUNT_EUR_CENTS,
			});
			Sentry.captureMessage(
				"createOrderInTransaction: order total below the Stripe EUR minimum — configuration issue",
				"error",
			);
		});
		throw new BusinessError(
			"Le montant de ta commande est trop faible pour être encaissé. Écris-nous, on règle ça.",
		);
	}

	return prisma.$transaction(
		async (tx) => {
			// Verify stock with row locking to prevent race conditions (double-sell, oversell).
			//
			// UNE seule requête pour tous les SKU, `ANY(array)` — même forme que la
			// re-validation du webhook (`checkout-order-processing.service.ts`). Trois
			// raisons, dans cet ordre :
			//
			//  1. **Ordre de verrouillage.** La boucle précédente verrouillait ligne par
			//     ligne dans l'ordre lexicographique des `skuId` ; le webhook, lui, prend
			//     tout son ensemble en une requête. Les deux ordres n'ont aucune raison de
			//     coïncider, donc l'anti-deadlock ne valait qu'entre deux checkouts — pas
			//     entre un checkout et un webhook, qui touchent pourtant les mêmes lignes.
			//     Une requête unique supprime la fenêtre d'entrelacement.
			//  2. **`FOR UPDATE OF ps`.** Sans clause `OF`, Postgres verrouille les lignes
			//     de TOUTES les tables du `FROM` — donc aussi `Product`, en contention
			//     gratuite avec les mutations admin du catalogue.
			//  3. **Coût.** N aller-retours réseau sous verrou (jusqu'à `MAX_CART_ITEMS`
			//     = 50) deviennent un seul, dans une transaction bornée à 30 s.
			//
			// Le tri reste : il ne dicte pas le plan d'exécution, mais il rend la trace
			// déterministe et coûte un `sort` sur au plus 50 éléments.
			const skuIds = [...cartItems].map((item) => item.skuId).sort((a, b) => a.localeCompare(b));

			// `deletedAt` (SKU et produit) fait partie de la relecture : la
			// re-validation du webhook les vérifie, celle-ci les OMETTAIT. Un SKU
			// soft-deleted entre l'ajout au panier et le checkout produisait donc une
			// commande PENDING qui mourait plus tard en `OversellError` → encaissement
			// puis remboursement automatique, là où un refus propre ici évite le
			// débit. Asymétrie corrigée.
			const lockedRows = await tx.$queryRaw<
				Array<{
					id: string;
					isActive: boolean;
					inventory: number;
					productTitle: string;
					productStatus: string;
					skuDeletedAt: Date | null;
					productDeletedAt: Date | null;
					priceInclTax: number;
				}>
			>`
				SELECT
					ps.id,
					ps."isActive",
					ps.inventory,
					p.title as "productTitle",
					p.status as "productStatus",
					ps."deletedAt" as "skuDeletedAt",
					p."deletedAt" as "productDeletedAt",
					ps."priceInclTax"
				FROM "ProductSku" ps
				INNER JOIN "Product" p ON ps."productId" = p.id
				WHERE ps.id = ANY(${skuIds}::text[])
				FOR UPDATE OF ps
			`;
			const lockedById = new Map(lockedRows.map((row) => [row.id, row]));

			for (const cartItem of cartItems) {
				const skuResult = skuDetailsResults.find(
					(r) => r.success && r.data?.sku.id === cartItem.skuId,
				);
				// Défense en profondeur : déjà garanti par la vérification pré-transaction
				// (CHECKOUT-TOTAL-005) — fail-closed si le code amont évolue.
				if (!skuResult?.success || !skuResult.data) {
					throw new BusinessError(CART_ITEM_MISMATCH_ERROR);
				}

				const sku = skuResult.data.sku;
				const currentSku = lockedById.get(cartItem.skuId);

				if (!currentSku) {
					throw new BusinessError(`Produit introuvable : ${sku.product.title}`);
				}
				if (currentSku.skuDeletedAt || currentSku.productDeletedAt) {
					throw new BusinessError(`Le produit ${currentSku.productTitle} n'est plus disponible`);
				}
				if (!currentSku.isActive || currentSku.productStatus !== "PUBLIC") {
					throw new BusinessError(`Le produit ${currentSku.productTitle} n'est plus disponible`);
				}
				if (currentSku.inventory < cartItem.quantity) {
					throw new BusinessError(`Stock insuffisant pour ${currentSku.productTitle}`);
				}
				// Le PRIX aussi est vérifié sous le verrou. Il ne l'était pas : le stock et le
				// statut étaient autoritaires-au-verrou, le prix restait autoritaire-à-la-
				// lecture-de-cache (`fetchSkuForValidation`, profil `checkout`). Le garde-fou
				// `priceAtAdd !== sku.priceInclTax` des 3 actions de paiement compare deux
				// valeurs issues de la MÊME lecture cachée : il ne peut pas détecter un cache
				// périmé, et `CHECKOUT-TOTAL-005` vérifie seulement la cohérence interne
				// (`computedSubtotal === subtotal`), les deux côtés dérivant de cette lecture.
				// Un changement de prix concurrent facturait donc l'ancien montant. Fail-closed,
				// comme pour le stock : on refuse plutôt que de sous-facturer.
				if (currentSku.priceInclTax !== sku.priceInclTax) {
					throw new BusinessError("Le prix d'un article a changé. Actualise ton panier.");
				}
			}

			// Create order with denormalized shipping address snapshot (legal compliance — immutable)
			const newOrder = await tx.order.create({
				data: {
					orderNumber,
					subtotal,
					shippingCost,
					total,
					customerEmail: normalizeEmail(finalEmail ?? ""),
					customerName: `${firstName} ${lastName}`.trim(),
					shippingFirstName: firstName,
					shippingLastName: lastName,
					shippingAddress1: shippingAddress.addressLine1,
					shippingAddress2: shippingAddress.addressLine2 ?? null,
					shippingPostalCode: shippingAddress.postalCode,
					shippingCity: shippingAddress.city,
					shippingCountry: shippingAddress.country as ShippingCountry,
					shippingPhone: shippingAddress.phoneNumber ?? "",
					status: "PENDING",
					paymentStatus: "PENDING",
					stripePaymentIntentId: paymentIntentId,
				},
			});

			// Create order items with denormalized product/SKU data
			for (const cartItem of cartItems) {
				const skuResult = skuDetailsResults.find(
					(r) => r.success && r.data?.sku.id === cartItem.skuId,
				);
				// Défense en profondeur : déjà garanti par la vérification pré-transaction
				// (CHECKOUT-TOTAL-005) — un skip silencieux ici facturerait un article
				// absent de la commande.
				if (!skuResult?.success || !skuResult.data) {
					throw new BusinessError(CART_ITEM_MISMATCH_ERROR);
				}

				const sku = skuResult.data.sku;
				const product = sku.product;
				// EINV-SNAPSHOT-MEDIA-001 : SSOT `pickPrimaryImage` (primaire IMAGE →
				// première IMAGE → null). Le motif précédent
				// `find((img) => img.isPrimary) ?? images[0]` est celui que CLAUDE.md
				// bannit : aveugle au `mediaType`, il figeait un `.mp4` dans
				// `productImageUrl` — snapshot immuable de rétention 10 ans,
				// rendu dans l'historique client ET dans le PDF de facture.
				// `getValidImageUrl` ne rattrape rien : il ne valide que HTTPS + domaine.
				// `null` ⇒ on n'écrit pas d'URL, plutôt qu'une vidéo.
				const primaryImage = pickPrimaryImage(sku.images);
				const imageUrl = getValidImageUrl(primaryImage?.url ?? null) ?? null;

				// Micro-entreprise franchise TVA (art. 293 B CGI) : aucune TVA par ligne
				// n'est stockée. Le total ligne (HT = TTC) se dérive de price × quantity ;
				// la facture le recalcule dans buildInvoiceData() (taxRate=0).
				await tx.orderItem.create({
					data: {
						orderId: newOrder.id,
						skuId: sku.id,
						productTitle: product.title,
						productImageUrl: imageUrl,
						skuColor: truncateSkuLabel(sku.colors.map((c) => c.name).join(" · ") || null),
						skuMaterial: truncateSkuLabel(sku.material ?? null),
						skuSize: sku.size ?? null,
						price: sku.priceInclTax,
						quantity: cartItem.quantity,
					},
				});
			}

			return { order: newOrder };
		},
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);
}
