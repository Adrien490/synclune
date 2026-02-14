import { getProductBySlug } from "@/modules/products/data/get-product";
import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Bijou artisanal Synclune";
export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

/**
 * Generates a dynamic Open Graph image for each product.
 * Displays the product photo alongside title, price, and branding.
 */
export default async function Image({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const product = await getProductBySlug({ slug });

	// Fallback if product not found
	if (!product) {
		return new ImageResponse(
			(
				<div
					style={{
						fontSize: 64,
						background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
						width: "100%",
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "white",
						fontFamily: "sans-serif",
					}}
				>
					Synclune
				</div>
			),
			{ ...size }
		);
	}

	const primarySku = product.skus[0];
	const price = primarySku?.priceInclTax
		? `${(primarySku.priceInclTax / 100).toFixed(2)}€`
		: null;

	// Get the main product image URL
	const mainImage =
		primarySku?.images?.find((img) => img.isPrimary)?.url ||
		primarySku?.images?.[0]?.url;

	return new ImageResponse(
		(
			<div
				style={{
					background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
					width: "100%",
					height: "100%",
					display: "flex",
					fontFamily: "sans-serif",
					color: "white",
				}}
			>
				{/* Product image - left side */}
				{mainImage ? (
					<div
						style={{
							width: "50%",
							height: "100%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							padding: "40px",
						}}
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={mainImage}
							alt={product.title}
							width={460}
							height={460}
							style={{
								objectFit: "contain",
								borderRadius: "16px",
							}}
						/>
					</div>
				) : null}

				{/* Text content - right side (or centered if no image) */}
				<div
					style={{
						width: mainImage ? "50%" : "100%",
						height: "100%",
						display: "flex",
						flexDirection: "column",
						alignItems: mainImage ? "flex-start" : "center",
						justifyContent: "center",
						padding: mainImage ? "60px 60px 60px 20px" : "80px",
						textAlign: mainImage ? "left" : "center",
					}}
				>
					{/* Product type badge */}
					{product.type && (
						<div
							style={{
								fontSize: 24,
								fontWeight: 500,
								textTransform: "uppercase",
								letterSpacing: "0.1em",
								marginBottom: "16px",
								opacity: 0.9,
								display: "flex",
							}}
						>
							{product.type.label}
						</div>
					)}

					{/* Product title */}
					<div
						style={{
							fontSize: mainImage ? 48 : 72,
							fontWeight: 700,
							marginBottom: "24px",
							lineHeight: 1.2,
							maxWidth: "500px",
							display: "flex",
						}}
					>
						{product.title}
					</div>

					{/* Price */}
					{price && (
						<div
							style={{
								fontSize: 40,
								fontWeight: 600,
								marginBottom: "32px",
								display: "flex",
							}}
						>
							{price}
						</div>
					)}

					{/* Brand */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "6px",
						}}
					>
						<div
							style={{
								fontSize: 28,
								fontWeight: 700,
								letterSpacing: "0.05em",
								display: "flex",
							}}
						>
							Synclune
						</div>
						<div
							style={{
								fontSize: 18,
								fontWeight: 400,
								opacity: 0.9,
								display: "flex",
							}}
						>
							Créations artisanales faites main
						</div>
					</div>
				</div>
			</div>
		),
		{ ...size }
	);
}
