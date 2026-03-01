import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Column, Hr, Img, Row, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface SuggestedProduct {
	title: string;
	imageUrl: string | null;
	price: number;
	productUrl: string;
}

interface CrossSellEmailProps {
	customerName: string;
	products: SuggestedProduct[];
	shopUrl: string;
	unsubscribeUrl: string;
}

export const CrossSellEmail = ({
	customerName,
	products,
	shopUrl,
	unsubscribeUrl,
}: CrossSellEmailProps) => {
	return (
		<EmailLayout
			preview="Des créations qui pourraient vous plaire"
			footer={
				<Text style={EMAIL_STYLES.text.tiny}>
					<a href={unsubscribeUrl} style={{ ...EMAIL_STYLES.link, textDecoration: "underline" }}>
						Se désinscrire des emails commerciaux
					</a>
				</Text>
			}
		>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Complétez votre collection</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName}, nous avons sélectionné ces créations qui s&apos;accordent avec vos
					derniers achats.
				</Text>
			</Section>

			{/* Produits suggérés */}
			<Section style={{ marginBottom: "24px" }}>
				{products.map((product, index) => (
					<div key={product.title}>
						{index > 0 && <Hr style={{ borderColor: EMAIL_COLORS.border, margin: "16px 0" }} />}
						<Row>
							{product.imageUrl && (
								<Column style={{ width: "100px", verticalAlign: "middle" }}>
									<a href={product.productUrl}>
										<Img
											src={product.imageUrl}
											alt={product.title}
											width={100}
											height={100}
											style={{ borderRadius: "8px" }}
										/>
									</a>
								</Column>
							)}
							<Column
								style={{
									verticalAlign: "middle",
									paddingLeft: product.imageUrl ? "16px" : "0",
								}}
							>
								<Text
									style={{
										margin: 0,
										fontSize: "16px",
										fontWeight: "600",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									<a
										href={product.productUrl}
										style={{ ...EMAIL_STYLES.link, textDecoration: "none" }}
									>
										{product.title}
									</a>
								</Text>
								<Text
									style={{
										...EMAIL_STYLES.text.body,
										marginTop: "4px",
										color: EMAIL_COLORS.primary,
										fontWeight: "600",
									}}
								>
									{formatEuro(product.price)}
								</Text>
							</Column>
						</Row>
					</div>
				))}
			</Section>

			{/* CTA */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Button href={shopUrl} style={EMAIL_STYLES.button.primary}>
					Découvrir toutes les créations
				</Button>
			</Section>
		</EmailLayout>
	);
};

CrossSellEmail.PreviewProps = {
	customerName: "Marie",
	products: [
		{
			title: "Boucles d'oreilles Étoile",
			imageUrl: "https://synclune.fr/images/products/boucles-etoile.jpg",
			price: 5900,
			productUrl: "https://synclune.fr/produits/boucles-oreilles-etoile",
		},
		{
			title: "Bracelet Luna",
			imageUrl: "https://synclune.fr/images/products/bracelet-luna.jpg",
			price: 7900,
			productUrl: "https://synclune.fr/produits/bracelet-luna",
		},
	],
	shopUrl: "https://synclune.fr/produits",
	unsubscribeUrl: "https://synclune.fr/notifications/desinscription",
} as CrossSellEmailProps;

export default CrossSellEmail;
