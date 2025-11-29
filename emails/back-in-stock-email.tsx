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

/**
 * Email de notification de retour en stock
 *
 * Envoyé aux clients qui ont demandé à être notifiés
 * quand un produit en rupture de stock revient disponible.
 */
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
	// Formater le prix en euros
	const formattedPrice = new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(price / 100);

	// Construire la description des variantes
	const variantParts: string[] = [];
	if (skuColor) variantParts.push(skuColor);
	if (skuMaterial) variantParts.push(skuMaterial);
	if (skuSize) variantParts.push(`Taille ${skuSize}`);
	const variantDescription =
		variantParts.length > 0 ? variantParts.join(" - ") : null;

	return (
		<Html>
			<Head />
			<Preview>
				Bonne nouvelle ! "{productTitle}" est de retour en stock
			</Preview>
			<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "28px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							Synclune
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
							Creations artisanales
						</Text>
					</Section>

					{/* Titre */}
					<Section style={{ marginBottom: "24px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "20px",
								fontWeight: "600",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							Bonne nouvelle !
						</Text>
						<Text
							style={{
								...EMAIL_STYLES.text.body,
								marginTop: "8px",
							}}
						>
							Un produit que tu attendais est de retour en stock
						</Text>
					</Section>

					{/* Produit */}
					<Section
						style={{
							...EMAIL_STYLES.section.highlighted,
							marginBottom: "24px",
						}}
					>
						{skuImageUrl && (
							<Img
								src={skuImageUrl}
								alt={productTitle}
								width="200"
								height="200"
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
								textAlign: "center",
							}}
						>
							{productTitle}
						</Text>

						{variantDescription && (
							<Text
								style={{
									...EMAIL_STYLES.text.small,
									marginTop: "8px",
									textAlign: "center",
								}}
							>
								{variantDescription}
							</Text>
						)}

						<Text
							style={{
								margin: "16px 0 0",
								fontSize: "20px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
								textAlign: "center",
							}}
						>
							{formattedPrice}
						</Text>

						<Text
							style={{
								...EMAIL_STYLES.text.small,
								marginTop: "8px",
								textAlign: "center",
							}}
						>
							{availableQuantity === 1
								? "Dernier exemplaire disponible !"
								: `${availableQuantity} exemplaires disponibles`}
						</Text>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button href={productUrl} style={EMAIL_STYLES.button.primary}>
							Voir le produit
						</Button>
					</Section>

					{/* Info stock limité */}
					<Section style={{ marginBottom: "24px" }}>
						<Text
							style={{
								...EMAIL_STYLES.text.small,
								textAlign: "center",
								lineHeight: "1.6",
							}}
						>
							Les stocks de nos creations artisanales sont limites.
							N'attends pas trop longtemps pour te faire plaisir !
						</Text>
					</Section>

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						<Text style={EMAIL_STYLES.text.small}>Synclune</Text>
						<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "8px" }}>
							Tu recois cet email car tu as demande a etre prevenu(e) du retour
							en stock de ce produit.
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "8px" }}>
							<Link href={unsubscribeUrl} style={EMAIL_STYLES.link}>
								Ne plus recevoir ces notifications
							</Link>
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.tiny, marginTop: "16px" }}>
							© {new Date().getFullYear()} Synclune - Tous droits reserves
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
	skuImageUrl:
		"https://utfs.io/f/example-image.jpg",
	price: 4500,
	availableQuantity: 3,
	unsubscribeUrl:
		"https://synclune.fr/notifications/unsubscribe?token=example123",
} as BackInStockEmailProps;

export default BackInStockEmail;
