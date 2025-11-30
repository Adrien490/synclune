import { getProducts } from "@/modules/products/data/get-products";
import {
	getPrimaryImageForList,
	getPrimaryPriceForList,
} from "@/modules/products/utils/product-list-helpers";
import { PRODUCT_CAROUSEL_CONFIG } from "../constants/carousel.constants";
import { ProductCarouselUI } from "./product-carousel-ui";

/**
 * Carousel de bijoux pour le Hero - Server Component
 *
 * Récupère les 5 derniers bijoux et les affiche dans un carousel avec auto-play
 * Pattern: Server Component qui fetch les données et les passe au client UI
 */
export async function ProductCarousel() {
	// Récupération des produits côté serveur
	const { products } = await getProducts({
		perPage: PRODUCT_CAROUSEL_CONFIG.PRODUCTS_COUNT,
		sortBy: "created-descending",
		filters: {
			status: "PUBLIC",
		},
	});

	// Transformation des produits pour l'UI
	const carouselProducts = products.map((product) => {
		const { price } = getPrimaryPriceForList(product);
		const primaryImage = getPrimaryImageForList(product);

		return {
			id: product.id,
			slug: product.slug,
			title: product.title,
			price,
			image: {
				url: primaryImage.url,
				alt: primaryImage.alt || product.title,
			},
		};
	});

	return <ProductCarouselUI products={carouselProducts} />;
}
