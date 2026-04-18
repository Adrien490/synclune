import { Column, Img, Link, Row, Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { FlexRow } from "./_components/flex-row";

interface CustomizationRequestEmailProps {
	firstName: string;
	email: string;
	phone?: string;
	productTypeLabel: string;
	details: string;
	inspirationProducts?: Array<{ title: string }>;
	inspirationMedias?: Array<{ url: string; altText?: string }>;
}

export const CustomizationRequestEmail = ({
	firstName,
	email,
	phone,
	productTypeLabel,
	details,
	inspirationProducts,
	inspirationMedias,
}: CustomizationRequestEmailProps) => {
	return (
		<EmailLayout
			preview={`Demande de personnalisation de ${firstName}`}
			headerText="Nouvelle demande"
		>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "12px" }}>
					Client
				</EmailHeading>
				<EmailCard>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={
							<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
								Prénom
							</Text>
						}
						right={
							<Text
								className={EMAIL_CLASSES.text.body}
								style={{
									margin: 0,
									fontSize: "14px",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{firstName}
							</Text>
						}
					/>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={
							<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
								Email
							</Text>
						}
						right={
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
						}
					/>
					{phone && (
						<FlexRow
							style={{ marginBottom: "8px" }}
							left={
								<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
									Téléphone
								</Text>
							}
							right={
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
							}
						/>
					)}
					<FlexRow
						left={
							<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
								Type
							</Text>
						}
						right={
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
						}
					/>
				</EmailCard>
			</Section>

			{inspirationProducts && inspirationProducts.length > 0 && (
				<Section style={{ marginBottom: "24px" }}>
					<EmailHeading level="h3" style={{ marginBottom: "12px" }}>
						Inspirations
					</EmailHeading>
					<EmailCard>
						{inspirationProducts.map((product) => (
							<Text
								key={product.title}
								className={EMAIL_CLASSES.text.secondary}
								style={EMAIL_STYLES.text.small}
							>
								• {product.title}
							</Text>
						))}
					</EmailCard>
				</Section>
			)}

			{inspirationMedias && inspirationMedias.length > 0 && (
				<Section style={{ marginBottom: "24px" }}>
					<EmailHeading level="h3" style={{ marginBottom: "12px" }}>
						Images d'inspiration
					</EmailHeading>
					<EmailCard>
						{Array.from({ length: Math.ceil(inspirationMedias.length / 2) }, (_, rowIndex) => (
							<Row key={rowIndex} role="presentation" style={{ marginBottom: "8px" }}>
								{inspirationMedias.slice(rowIndex * 2, rowIndex * 2 + 2).map((media) => (
									<Column
										key={media.url}
										style={{
											width: "50%",
											paddingRight: "4px",
											paddingLeft: "4px",
											verticalAlign: "top",
										}}
									>
										<Img
											src={media.url}
											alt={media.altText ?? "Image d'inspiration"}
											width={200}
											style={{
												borderRadius: "8px",
												width: "100%",
												maxWidth: "200px",
												height: "auto",
											}}
										/>
									</Column>
								))}
							</Row>
						))}
					</EmailCard>
				</Section>
			)}

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Description
				</EmailHeading>
				<EmailCard>
					{details.split("\n").map((line, i) => (
						<Text
							key={i}
							className={EMAIL_CLASSES.text.body}
							style={{
								margin: 0,
								fontSize: "14px",
								color: EMAIL_COLORS.text.primary,
								lineHeight: "1.6",
							}}
						>
							{line || "\u00A0"}
						</Text>
					))}
				</EmailCard>
			</Section>

			<EmailCTA href={`mailto:${email}?subject=RE: Demande de personnalisation - Synclune`}>
				Répondre au client
			</EmailCTA>
		</EmailLayout>
	);
};

CustomizationRequestEmail.PreviewProps = {
	firstName: "Marie",
	email: "marie.dupont@example.com",
	phone: "+33612345678",
	productTypeLabel: "Collier",
	details:
		"Bonjour,\n\nJe souhaiterais un collier personnalisé avec les initiales de ma fille gravées sur un pendentif rond en argent. Les initiales seraient 'ML' en écriture cursive. J'aimerais que le pendentif fasse environ 2cm de diamètre.\n\nPouvez-vous me faire un devis et m'indiquer les délais de réalisation ?\n\nMerci d'avance !",
	inspirationProducts: [{ title: "Collier Lune Céleste" }, { title: "Pendentif Étoile Filante" }],
	inspirationMedias: [
		{
			url: "https://placehold.co/400x400/e8d5c4/333333?text=Inspiration+1",
			altText: "Collier en or",
		},
		{
			url: "https://placehold.co/400x400/d5c4e8/333333?text=Inspiration+2",
			altText: "Pendentif argent",
		},
		{ url: "https://placehold.co/400x400/c4e8d5/333333?text=Inspiration+3" },
	],
} as CustomizationRequestEmailProps;

export default CustomizationRequestEmail;
