import React from 'react';
import {
	Dimensions,
	Image,
	ImageBackground,
	Pressable,
	StyleSheet,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { palette } from '../../theme/colors';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
	const scale = width / 375;
	return Math.round(size * scale);
};

const surplusCards = [
	{
		id: 'human',
		title: 'SURPLUS FOOD\nFOR PEOPLE',
		titleColor: palette.kale,
		summary: 'Suitable for charity donation &\ncommunity redistribution',
		description:
			'Edible food that is safe for human consumption and within a suitable use-by date',
		borderColor: palette.kale,
		backgroundColor: '#EEF0E6',
		buttonColor: palette.kale,
		icon: require('../../../assets/placeholder/veggie_basket.png'),
	},
	{
		id: 'livestock',
		title: 'SURPLUS FOOD FOR\nFARM LIVESTOCK',
		titleColor: palette.orange,
		summary: 'Not suitable for human consumption',
		description:
			'Food past its use-by date, food scraps or surplus suitable for livestock feed or agricultural re-use',
		borderColor: palette.orange,
		backgroundColor: '#F6EFE5',
		buttonColor: palette.eggplant,
		icon: require('../../../assets/placeholder/farmhouse.png'),
	},
] as const;

export function SurplusScreen({ navigation }: any) {
	const handleListSurplus = (type: (typeof surplusCards)[number]['id']) => {
		if (type === 'livestock') {
			navigation.navigate('CreateFarmListing');
			return;
		}

		navigation.navigate('CreateListing');
	};

	return (
		<Screen scrollable backgroundColor={palette.creme} contentStyle={styles.screenContent} transparentTop>
			<ImageBackground
				source={require('../../../assets/placeholder/kale-headera.png')}
				resizeMode="cover"
				style={styles.header}
			>
				<Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
					<Ionicons name="arrow-back" size={normalize(22)} color={palette.white} />
				</Pressable>

				<AppText variant="h4" color={palette.white} style={styles.headerTitle}>
					TODAY'S SURPLUS
				</AppText>
			</ImageBackground>

			<View style={styles.contentWrap}>
				<AppText variant="label" color={palette.primary} style={styles.subtitle}>
					Firstly tell us what type of surplus food you have, so we can notify the right recipients
				</AppText>

				{surplusCards.map((card) => (
					<View
						key={card.id}
						style={[styles.card, { borderColor: card.borderColor, backgroundColor: card.backgroundColor }]}
					>
						<View style={styles.cardTopRow}>
							<Image source={card.icon} style={styles.cardIcon} resizeMode="contain" />

							<AppText variant="h6" color={card.titleColor} style={styles.cardTitle}>
								{card.title}
							</AppText>
						</View>

						<AppText variant="label" color={palette.black} style={styles.cardSummary}>
							{card.summary}
						</AppText>

						<AppText variant="body1" color={palette.midgray} style={styles.cardDescription}>
							{card.description}
						</AppText>

						<Pressable
							onPress={() => handleListSurplus(card.id)}
							style={[styles.actionButton, { backgroundColor: card.buttonColor }]}
						>
							<AppText variant="bodyBold" color={palette.white} style={styles.buttonText}>
								LIST SURPLUS
							</AppText>

							<Ionicons
								name="arrow-forward"
								size={normalize(18)}
								color={palette.white}
								style={styles.actionArrow}
							/>
						</Pressable>
					</View>
				))}

				<View style={styles.missionCard}>
					<Image
            source={require('../../../assets/placeholder/leaf_icon.png')}
            style={styles.leafIcon}
            resizeMode="contain"
          />

					<View style={styles.missionTextWrap}>
						<AppText variant="label" color={palette.black}>
							Our mission
						</AppText>
						<AppText variant="body1" color={palette.stone} style={{ marginTop: hp(0.3) }}>
							Maximising the value of surplus food
						</AppText>
					</View>
				</View>
			</View>
		</Screen>
	);
}

const styles = StyleSheet.create({
	screenContent: {
		flexGrow: 1,
		paddingBottom: hp(2.4),
	},
	header: {
		height: hp(16),
		justifyContent: 'flex-end',
		paddingBottom: hp(1.9),
		paddingHorizontal: wp(4),
	},
	backButton: {
		position: 'absolute',
		left: wp(4),
		top: hp(4.2),
		width: wp(10),
		height: wp(10),
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: {
		textAlign: 'center',
	},
	contentWrap: {
		width: '100%',
		maxWidth: normalize(560),
		alignSelf: 'center',
		paddingHorizontal: wp(4.7),
		paddingTop: hp(1.9),
		gap: hp(1.8),
	},
	subtitle: {
		textAlign: 'center',
		paddingHorizontal: wp(2),
    lineHeight: normalize(22),
	},
	card: {
		borderWidth: normalize(2),
		borderRadius: normalize(18),
		paddingVertical: hp(1.6),
		paddingHorizontal: wp(3),
	},
	cardTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: wp(2.6),
	},
	cardIcon: {
		width: wp(23),
		height: hp(10),
	},
  leafIcon: {
    width: wp(8),
    height: hp(5),
  },
	cardTitle: {
		flex: 1,
    paddingHorizontal: wp(2),
	},
	cardSummary: {
		marginTop: hp(0.6),
		lineHeight: normalize(22),
	},
	cardDescription: {
		marginTop: hp(0.35),
		lineHeight: normalize(21),
	},
	actionButton: {
		marginTop: hp(1.3),
		minHeight: hp(5),
		borderRadius: normalize(10),
		paddingHorizontal: wp(4),
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonText: {
		letterSpacing: 0.2,
	},
	actionArrow: {
		position: 'absolute',
		right: wp(4.2),
	},
	missionCard: {
		marginTop: hp(1),
		borderRadius: normalize(14),
		borderWidth: normalize(1),
		borderColor: '#D9DED2',
		backgroundColor: palette.creme,
		paddingHorizontal: wp(4),
		paddingVertical: hp(1.2),
		flexDirection: 'row',
		alignItems: 'center',
	},
	missionTextWrap: {
		marginLeft: wp(2.8),
	},
});
  