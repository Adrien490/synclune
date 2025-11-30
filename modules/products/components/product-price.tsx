import { formatEuro } from "@/shared/utils/format-euro";
import { PRODUCT_TEXTS } from "@/modules/products/constants/product";

interface ProductPriceProps {
	price: number;
	compareAtPrice?: number | null;
	currency?: string;
	className?: string;
	size?: "sm" | "md" | "lg";
	showSavings?: boolean;
	showVatInfo?: boolean;
	/**
	 * Désactive le markup Schema.org pour éviter la duplication
	 * Utilisé dans ProductCard qui gère déjà itemProp="offers"
	 */
	disableSchemaOrg?: boolean;
}

/**
 * Composant réutilisable pour afficher les prix de produits
 * Gère les prix barrés, les économies et différentes tailles
 */
export function ProductPrice({
	price,
	compareAtPrice,
	currency = "EUR",
	className = "",
	size = "md",
	showSavings = true,
	showVatInfo = false,
	disableSchemaOrg = false,
}: ProductPriceProps) {
	const hasDiscount = compareAtPrice && compareAtPrice > price;
	const savings = hasDiscount ? compareAtPrice - price : 0;

	const sizeClasses = {
		sm: "text-sm",
		md: "text-base lg:text-lg",
		lg: "text-lg lg:text-xl",
	};

	const compareAtSizeClasses = {
		sm: "text-xs",
		md: "text-sm",
		lg: "text-base",
	};

	// Afficher même si le prix est 0 - le vrai prix sera récupéré

	return (
		<div
			className={`flex items-center gap-2 ${className}`}
			{...(disableSchemaOrg
				? {}
				: {
						itemProp: "offers",
						itemScope: true,
						itemType: "https://schema.org/Offer",
				  })}
		>
			{/* Prix principal */}
			<span
				className={`font-mono font-semibold text-foreground ${sizeClasses[size]}`}
				{...(disableSchemaOrg
					? {}
					: {
							itemProp: "price",
							content: (price / 100).toString(),
					  })}
			>
				{formatEuro(price)}
			</span>

			{!disableSchemaOrg && (
				<>
					<meta itemProp="priceCurrency" content={currency} />
					<meta itemProp="availability" content="https://schema.org/InStock" />
				</>
			)}

			{/* Prix barré si en promotion */}
			{hasDiscount && (
				<span
					className={`font-mono text-muted-foreground line-through ${compareAtSizeClasses[size]}`}
					aria-label={`${PRODUCT_TEXTS.PRICING.ORIGINAL_PRICE}: ${formatEuro(
						compareAtPrice!
					)}`}
				>
					{formatEuro(compareAtPrice!)}
				</span>
			)}

			{/* Badge d'économie */}
			{hasDiscount && showSavings && savings > 0 && (
				<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground border border-accent/30">
					{PRODUCT_TEXTS.PRICING.SAVINGS(formatEuro(savings))}
				</span>
			)}

			{/* Info TVA */}
			{showVatInfo && (
				<span className="text-xs text-muted-foreground">
					{PRODUCT_TEXTS.PRICING.VAT_INCLUDED}
				</span>
			)}
		</div>
	);
}

/**
 * Version compacte pour les cartes produits
 * NOTE: disableSchemaOrg={true} par défaut car ProductCard gère déjà le Schema.org
 */
export function ProductPriceCompact({
	price,
	compareAtPrice,
	className = "",
	disableSchemaOrg = true,
}: Pick<
	ProductPriceProps,
	"price" | "compareAtPrice" | "className" | "disableSchemaOrg"
>) {
	return (
		<ProductPrice
			price={price}
			compareAtPrice={compareAtPrice}
			className={className}
			size="sm"
			showSavings={false}
			showVatInfo={false}
			disableSchemaOrg={disableSchemaOrg}
		/>
	);
}

/**
 * Version détaillée pour les pages produit
 */
export function ProductPriceDetailed({
	price,
	compareAtPrice,
	className = "",
}: Pick<ProductPriceProps, "price" | "compareAtPrice" | "className">) {
	return (
		<ProductPrice
			price={price}
			compareAtPrice={compareAtPrice}
			className={className}
			size="lg"
			showSavings={true}
			showVatInfo={true}
		/>
	);
}
