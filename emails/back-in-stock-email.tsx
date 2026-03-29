import { Button, Img, Link, Section, Text } from "@react-email/components";
import { EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface BackInStockEmailProps {
	customerName: string;
	productTitle: string;
	productImageUrl?: string | null;
	productUrl: string;
	unsubscribeUrl: string;
}

export const BackInStockEmail = ({
	customerName,
	productTitle,
	productImageUrl,
	productUrl,
	unsubscribeUrl,
}: BackInStockEmailProps) => {
	return (
		<EmailLayout
			preview={`${productTitle} est de retour en stock !`}
			footer={
				<Text style={EMAIL_STYLES.text.tiny}>
					<Link href={unsubscribeUrl} style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}>
						Se désinscrire des emails commerciaux
					</Link>
				</Text>
			}
		>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>De retour en stock !</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName}, bonne nouvelle !
				</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}>
					<strong>{productTitle}</strong>, un article de votre liste de favoris, est de nouveau
					disponible.
				</Text>
			</Section>

			{/* Product image */}
			{productImageUrl && (
				<Section style={{ marginBottom: "24px", textAlign: "center" }}>
					<Img
						src={productImageUrl}
						alt={productTitle}
						width="200"
						height="200"
						style={{
							borderRadius: "8px",
							margin: "0 auto",
							objectFit: "cover",
						}}
					/>
				</Section>
			)}

			{/* CTA */}
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Button href={productUrl} style={EMAIL_STYLES.button.primary}>
					Voir le produit
				</Button>
			</Section>

			{/* Urgence */}
			<Section style={{ marginBottom: "16px" }}>
				<Text style={EMAIL_STYLES.text.small}>Les stocks sont limités, ne tardez pas !</Text>
			</Section>
		</EmailLayout>
	);
};

BackInStockEmail.PreviewProps = {
	customerName: "Marie",
	productTitle: "Bague Éternité",
	productImageUrl: "https://utfs.io/f/example-bague-eternite.jpg",
	productUrl: "https://synclune.fr/produits/bague-eternite",
	unsubscribeUrl: "https://synclune.fr/notifications/desinscription",
} as BackInStockEmailProps;

export default BackInStockEmail;
