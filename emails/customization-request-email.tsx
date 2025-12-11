import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

interface CustomizationRequestEmailProps {
	firstName: string;
	lastName: string;
	email: string;
	phone?: string;
	productTypeLabel: string;
	details: string;
	inspirationProducts?: Array<{ title: string }>;
	preferredColors?: Array<{ name: string; hex: string }>;
	preferredMaterials?: Array<{ name: string }>;
}

export const CustomizationRequestEmail = ({
	firstName,
	lastName,
	email,
	phone,
	productTypeLabel,
	details,
	inspirationProducts,
	preferredColors,
	preferredMaterials,
}: CustomizationRequestEmailProps) => {
	const fullName = `${firstName} ${lastName}`;

	return (
		<Html>
			<Head />
			<Preview>Demande de personnalisation de {fullName}</Preview>
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
							Nouvelle demande
						</Text>
					</Section>

					{/* Client */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
							Client
						</Text>
						<div style={EMAIL_STYLES.section.card}>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Nom</Text>
								<Text
									style={{
										margin: 0,
										fontSize: "14px",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{fullName}
								</Text>
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Email</Text>
								<Link
									href={`mailto:${email}`}
									style={{
										margin: 0,
										fontSize: "14px",
										color: EMAIL_COLORS.primary,
										textDecoration: "none",
									}}
								>
									{email}
								</Link>
							</div>
							{phone && (
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<Text style={EMAIL_STYLES.text.small}>Téléphone</Text>
									<Link
										href={`tel:${phone}`}
										style={{
											margin: 0,
											fontSize: "14px",
											color: EMAIL_COLORS.primary,
											textDecoration: "none",
										}}
									>
										{phone}
									</Link>
								</div>
							)}
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<Text style={EMAIL_STYLES.text.small}>Type</Text>
								<Text
									style={{
										margin: 0,
										fontSize: "14px",
										fontWeight: "600",
										color: EMAIL_COLORS.primary,
									}}
								>
									{productTypeLabel}
								</Text>
							</div>
						</div>
					</Section>

					{/* Inspirations */}
					{inspirationProducts && inspirationProducts.length > 0 && (
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

					{/* Couleurs */}
					{preferredColors && preferredColors.length > 0 && (
						<Section style={{ marginBottom: "24px" }}>
							<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
								Couleurs
							</Text>
							<div style={EMAIL_STYLES.section.card}>
								<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
									{preferredColors.map((color, index) => (
										<span
											key={index}
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: "6px",
												padding: "4px 10px",
												backgroundColor: EMAIL_COLORS.background.white,
												borderRadius: "4px",
												fontSize: "13px",
											}}
										>
											<span
												style={{
													width: "14px",
													height: "14px",
													borderRadius: "3px",
													backgroundColor: color.hex,
													border: `1px solid ${EMAIL_COLORS.border}`,
												}}
											/>
											{color.name}
										</span>
									))}
								</div>
							</div>
						</Section>
					)}

					{/* Matériaux */}
					{preferredMaterials && preferredMaterials.length > 0 && (
						<Section style={{ marginBottom: "24px" }}>
							<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "12px" }}>
								Matériaux
							</Text>
							<div style={EMAIL_STYLES.section.card}>
								{preferredMaterials.map((material, index) => (
									<Text key={index} style={EMAIL_STYLES.text.small}>
										• {material.name}
									</Text>
								))}
							</div>
						</Section>
					)}

					{/* Détails */}
					<Section style={{ marginBottom: "24px" }}>
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

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button
							href={`mailto:${email}?subject=RE: Demande de personnalisation - Synclune`}
							style={EMAIL_STYLES.button.primary}
						>
							Répondre au client
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
							© {new Date().getFullYear()} Synclune
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

CustomizationRequestEmail.PreviewProps = {
	firstName: "Marie",
	lastName: "Dupont",
	email: "marie.dupont@example.com",
	phone: "+33612345678",
	productTypeLabel: "Collier",
	details:
		"Bonjour,\n\nJe souhaiterais un collier personnalisé avec les initiales de ma fille gravées sur un pendentif rond en argent. Les initiales seraient 'ML' en écriture cursive. J'aimerais que le pendentif fasse environ 2cm de diamètre.\n\nPouvez-vous me faire un devis et m'indiquer les délais de réalisation ?\n\nMerci d'avance !",
	inspirationProducts: [
		{ title: "Collier Lune Céleste" },
		{ title: "Pendentif Étoile Filante" },
	],
	preferredColors: [
		{ name: "Argent", hex: "#C0C0C0" },
		{ name: "Or rose", hex: "#B76E79" },
	],
	preferredMaterials: [{ name: "Argent 925" }, { name: "Cristal" }],
} as CustomizationRequestEmailProps;

export default CustomizationRequestEmail;
