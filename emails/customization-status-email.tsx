import { Button, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";

type CustomizationStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface CustomizationStatusEmailProps {
	firstName: string;
	productTypeLabel: string;
	status: CustomizationStatus;
	adminNotes?: string | null;
	details: string;
	shopUrl?: string;
}

const STATUS_CONFIG: Record<CustomizationStatus, { title: string; preview: string; body: string }> = {
	IN_PROGRESS: {
		title: "Personnalisation en cours",
		preview: "Votre personnalisation est en cours de réalisation",
		body: "Bonne nouvelle ! Votre demande de personnalisation est en cours de réalisation par notre artisan. Nous vous tiendrons informé(e) de l'avancement.",
	},
	COMPLETED: {
		title: "Personnalisation terminée !",
		preview: "Votre personnalisation est terminée",
		body: "Votre personnalisation est terminée ! Notre artisan a finalisé votre création avec le plus grand soin.",
	},
	CANCELLED: {
		title: "Demande de personnalisation annulée",
		preview: "Votre demande de personnalisation a été annulée",
		body: "Nous sommes désolés de vous informer que votre demande de personnalisation a été annulée. Si vous avez des questions, n'hésitez pas à nous contacter.",
	},
};

export const CustomizationStatusEmail = ({
	firstName,
	productTypeLabel,
	status,
	adminNotes,
	details,
	shopUrl = "https://synclune.fr/creations",
}: CustomizationStatusEmailProps) => {
	const config = STATUS_CONFIG[status];

	return (
		<EmailLayout preview={config.preview}>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>{config.title}</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {firstName}, {config.body.charAt(0).toLowerCase()}{config.body.slice(1)}
				</Text>
			</Section>

			{/* Details card */}
			<Section style={{ marginBottom: "24px" }}>
				<Section style={EMAIL_STYLES.section.card}>
					<Text style={{ ...EMAIL_STYLES.text.small, marginBottom: "4px" }}>
						Type de création
					</Text>
					<Text
						style={{
							margin: "0 0 12px 0",
							fontSize: "14px",
							fontWeight: "600",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						{productTypeLabel}
					</Text>
					<Text style={{ ...EMAIL_STYLES.text.small, marginBottom: "4px" }}>
						Détails
					</Text>
					<Text
						style={{
							margin: 0,
							fontSize: "14px",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						{details}
					</Text>
				</Section>
			</Section>

			{/* Admin notes */}
			{adminNotes && (
				<Section style={{ marginBottom: "24px" }}>
					<Section style={{ ...EMAIL_STYLES.section.card, borderLeft: `3px solid ${EMAIL_COLORS.primary}` }}>
						<Text style={{ ...EMAIL_STYLES.text.small, marginBottom: "4px" }}>
							Note de notre artisan
						</Text>
						<Text
							style={{
								margin: 0,
								fontSize: "14px",
								color: EMAIL_COLORS.text.primary,
								fontStyle: "italic",
							}}
						>
							{adminNotes}
						</Text>
					</Section>
				</Section>
			)}

			{/* CTA for completed status */}
			{status === "COMPLETED" && (
				<Section style={{ marginBottom: "32px", textAlign: "center" }}>
					<Button href={shopUrl} style={EMAIL_STYLES.button.primary}>
						Voir les créations
					</Button>
				</Section>
			)}

			{/* Contact for cancelled status */}
			{status === "CANCELLED" && (
				<Section style={{ marginBottom: "32px" }}>
					<Text style={EMAIL_STYLES.text.body}>
						Notre équipe reste à votre disposition pour toute nouvelle
						demande de personnalisation.
					</Text>
				</Section>
			)}
		</EmailLayout>
	);
};

CustomizationStatusEmail.PreviewProps = {
	firstName: "Marie",
	productTypeLabel: "Collier",
	status: "IN_PROGRESS",
	adminNotes: "Nous avons sélectionné une magnifique pierre de lune pour votre création.",
	details: "Collier en or rose avec pierre de lune, gravure 'Pour toujours' au dos du pendentif.",
} as CustomizationStatusEmailProps;

export default CustomizationStatusEmail;
