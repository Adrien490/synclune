import { Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

interface CustomizationConfirmationEmailProps {
	firstName: string;
	productTypeLabel: string;
	details: string;
	inspirationProducts?: Array<{ title: string }>;
}

export const CustomizationConfirmationEmail = ({
	firstName,
	productTypeLabel,
	details,
	inspirationProducts,
}: CustomizationConfirmationEmailProps) => {
	const hasInspirations = inspirationProducts && inspirationProducts.length > 0;

	return (
		<EmailLayout preview="Demande de personnalisation reçue">
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Demande reçue</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {firstName}, ta demande de {productTypeLabel} personnalisé
					est bien enregistrée. Je reviens vers toi dès que possible.
				</Text>
			</Section>

			{/* Type de produit */}
			<Section
				style={{
					...EMAIL_STYLES.section.card,
					marginBottom: "24px",
					textAlign: "center",
				}}
			>
				<Text style={EMAIL_STYLES.text.small}>Type de création</Text>
				<Text
					style={{
						margin: "4px 0 0 0",
						fontSize: "18px",
						fontWeight: "bold",
						color: EMAIL_COLORS.primary,
					}}
				>
					{productTypeLabel}
				</Text>
			</Section>

			{/* Inspirations */}
			{hasInspirations && (
				<Section style={{ marginBottom: "24px" }}>
					<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
						Inspirations
					</Text>
					<div style={EMAIL_STYLES.section.card}>
						{inspirationProducts.map((product, index) => (
							<Text key={index} style={EMAIL_STYLES.text.small}>
								• {product.title}
							</Text>
						))}
					</div>
				</Section>
			)}

			{/* Description */}
			<Section style={{ marginBottom: "32px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>
					Description
				</Text>
				<div style={EMAIL_STYLES.section.card}>
					<Text
						style={{
							margin: 0,
							fontSize: "14px",
							color: EMAIL_COLORS.text.primary,
							whiteSpace: "pre-wrap",
							lineHeight: "1.6",
						}}
					>
						{details}
					</Text>
				</div>
			</Section>
		</EmailLayout>
	);
};

CustomizationConfirmationEmail.PreviewProps = {
	firstName: "Marie",
	productTypeLabel: "Collier",
	details:
		"Je souhaiterais un collier personnalisé avec les initiales 'ML' gravées sur un pendentif rond en argent.",
	inspirationProducts: [{ title: "Collier Lune Céleste" }],
} as CustomizationConfirmationEmailProps;

export default CustomizationConfirmationEmail;
