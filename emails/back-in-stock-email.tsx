import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

interface BackInStockEmailProps {
	productTitle: string;
	productUrl: string;
	skuColor: string | null;
	skuMaterial: string | null;
	skuSize: string | null;
	skuImageUrl: string | null;
	price: number;
	availableQuantity: number;
	unsubscribeUrl: string;
}

export const BackInStockEmail = ({
	productTitle,
	productUrl,
	skuColor,
	skuMaterial,
	skuSize,
	skuImageUrl,
	price,
	availableQuantity,
	unsubscribeUrl,
}: BackInStockEmailProps) => {
	const formattedPrice = new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(price / 100);

	const variantParts: string[] = [];
	if (skuColor) variantParts.push(skuColor);
	if (skuMaterial) variantParts.push(skuMaterial);
	if (skuSize) variantParts.push(`Taille ${skuSize}`);
	const variantDescription =
		variantParts.length > 0 ? variantParts.join(" · ") : null;

	return (
		<Html>
			<Head />
			<Preview>{productTitle} est de retour en stock</Preview>
			<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "24px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							Synclune
						</Text>
					</Section>

					{/* Titre */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={EMAIL_STYLES.heading.h2}>Retour en stock</Text>
					</Section>

					{/* Produit */}
					<Section
						style={{
							...EMAIL_STYLES.section.card,
							marginBottom: "24px",
							textAlign: "center",
						}}
					>
						{skuImageUrl && (
							<Img
								src={skuImageUrl}
								alt={productTitle}
								width="180"
								height="180"
								style={{
									display: "block",
									margin: "0 auto 16px",
									borderRadius: "8px",
									objectFit: "cover",
								}}
							/>
						)}

						<Text
							style={{
								margin: 0,
								fontSize: "18px",
								fontWeight: "600",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							{productTitle}
						</Text>

						{variantDescription && (
							<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
								{variantDescription}
							</Text>
						)}

						<Text
							style={{
								margin: "12px 0 0",
								fontSize: "18px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							{formattedPrice}
						</Text>

						<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
							{availableQuantity === 1
								? "Dernier exemplaire"
								: `${availableQuantity} disponibles`}
						</Text>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button href={productUrl} style={EMAIL_STYLES.button.primary}>
							Voir le produit
						</Button>
					</Section>

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						<Text style={EMAIL_STYLES.text.tiny}>
							<Link href={unsubscribeUrl} style={EMAIL_STYLES.link}>
								Se désabonner
							</Link>
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "12px" }}>
							© {new Date().getFullYear()} Synclune
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

BackInStockEmail.PreviewProps = {
	productTitle: "Bague Florale en Argent",
	productUrl: "https://synclune.fr/creations/bague-florale-argent",
	skuColor: "Rose",
	skuMaterial: "Argent 925",
	skuSize: "52",
	skuImageUrl: "https://utfs.io/f/example-image.jpg",
	price: 4500,
	availableQuantity: 3,
	unsubscribeUrl:
		"https://synclune.fr/notifications/unsubscribe?token=example123",
} as BackInStockEmailProps;

export default BackInStockEmail;
