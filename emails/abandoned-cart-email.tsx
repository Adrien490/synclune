import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Hr, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface CartItemData {
	productTitle: string;
	skuColor: string | null;
	skuMaterial: string | null;
	quantity: number;
	price: number;
}

interface AbandonedCartEmailProps {
	customerName: string;
	items: CartItemData[];
	total: number;
	cartUrl: string;
}

export const AbandonedCartEmail = ({
	customerName,
	items,
	total,
	cartUrl,
}: AbandonedCartEmailProps) => {
	return (
		<EmailLayout preview="Vous avez oublié quelque chose...">
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Votre panier vous attend</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName}, vous avez laissé des articles dans votre panier. Ils sont encore
					disponibles !
				</Text>
			</Section>

			{/* Items */}
			<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "24px" }}>
				{items.map((item, index) => (
					<div key={index}>
						{index > 0 && <Hr style={{ borderColor: EMAIL_COLORS.border, margin: "12px 0" }} />}
						<Text style={{ ...EMAIL_STYLES.text.body, fontWeight: "600", marginBottom: "4px" }}>
							{item.productTitle}
						</Text>
						{(item.skuColor || item.skuMaterial) && (
							<Text style={{ ...EMAIL_STYLES.text.small, marginBottom: "4px" }}>
								{[item.skuColor, item.skuMaterial].filter(Boolean).join(" — ")}
							</Text>
						)}
						<Text style={EMAIL_STYLES.text.body}>
							{item.quantity > 1 ? `${item.quantity} x ` : ""}
							{formatEuro(item.price)}
						</Text>
					</div>
				))}
				<Hr style={{ borderColor: EMAIL_COLORS.border, margin: "16px 0" }} />
				<Text style={{ ...EMAIL_STYLES.text.body, fontWeight: "bold", textAlign: "right" }}>
					Total : {formatEuro(total)}
				</Text>
			</Section>

			{/* CTA */}
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Button href={cartUrl} style={EMAIL_STYLES.button.primary}>
					Reprendre mon panier
				</Button>
			</Section>

			{/* Reassurance */}
			<Section style={{ marginBottom: "16px" }}>
				<Text style={EMAIL_STYLES.text.small}>
					Paiement 100% sécurisé. Livraison en France métropolitaine. Retours et échanges sous 14
					jours.
				</Text>
			</Section>
		</EmailLayout>
	);
};

AbandonedCartEmail.PreviewProps = {
	customerName: "Marie",
	items: [
		{
			productTitle: "Bague Éternité",
			skuColor: "Or rose",
			skuMaterial: "Argent 925",
			quantity: 1,
			price: 8900,
		},
		{
			productTitle: "Collier Lumière",
			skuColor: null,
			skuMaterial: "Or 18k",
			quantity: 1,
			price: 12900,
		},
	],
	total: 21800,
	cartUrl: "https://synclune.fr/panier",
} as AbandonedCartEmailProps;

export default AbandonedCartEmail;
