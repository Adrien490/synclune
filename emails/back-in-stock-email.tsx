import { Img, Link, Section, Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
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
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
					<Link href={unsubscribeUrl} style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}>
						Se désinscrire des emails commerciaux
					</Link>
				</Text>
			}
		>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">De retour en stock !</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, bonne nouvelle !
				</Text>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "8px" }}
				>
					<strong>{productTitle}</strong>, un article de votre liste de favoris, est de nouveau
					disponible.
				</Text>
			</Section>

			{productImageUrl && (
				<Section style={{ marginBottom: "24px", textAlign: "center" }}>
					<Img
						src={productImageUrl}
						alt={productTitle}
						width={200}
						height={200}
						style={{
							borderRadius: "8px",
							margin: "0 auto",
							objectFit: "cover",
						}}
					/>
				</Section>
			)}

			<EmailCTA href={productUrl} marginBottom="24px">
				Voir le produit
			</EmailCTA>

			<Section style={{ marginBottom: "16px" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Les stocks sont limités, ne tardez pas !
				</Text>
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
