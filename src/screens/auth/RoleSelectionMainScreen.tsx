import React from 'react';
import {
	Dimensions,
	Image,
	ImageBackground,
	Pressable,
	StyleSheet,
	View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { AuthStackParamList } from '../../navigation/types';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
	const scale = width / 375;
	return Math.round(size * scale);
};

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelectionMain'>;

const roleCards = [
	{
		id: 'restaurant_single' as const,
		illustration: require('../../../assets/placeholder/site_icon.png'),
		title: 'I HAVE SURPLUS FOOD',
		subTitle: 'For Businesses, venues & farms',
		description:
			'List surplus food for collection by charities to redistribute to communities in need. Or food no longer fit for human consumption, for collection by farmers for farm livestock feed.',
		borderColor: palette.kale,
		titleColor: palette.kale,
		accentColor: palette.kale,
		buttonColor: palette.kale,
		iconBgColor: palette.kale,
		role: 'restaurant_single' as const,
		roundIcon: require('../../../assets/placeholder/restaurant_icon.png'),
	},
	{
		id: 'charity_single' as const,
		illustration: require('../../../assets/placeholder/truck.png'),
		title: 'I COLLECT & REDISTRIBUTE FOOD',
		subTitle: 'For Charities and farmers',
		description:
			'Collect surplus food to redistribute to communities in need. Or collect surplus food no longer fit for human consumption to be used for farm livestock feed.',
		borderColor: palette.eggplant,
		titleColor: palette.eggplant,
		accentColor: palette.validation,
		buttonColor: palette.eggplant,
		iconBgColor: palette.eggplant,
		role: 'charity_single' as const,
		roundIcon: require('../../../assets/placeholder/charity_icon.png'),
	},
];

export function RoleSelectionMainScreen({ navigation }: Props) {
	const { setRole, setRoleFlow } = useAppContext();

	const onContinue = (role: (typeof roleCards)[number]['role']) => {
		setRoleFlow(role === 'charity_single' ? 'consumer' : 'producer');
		setRole(role);
		navigation.navigate('RoleSelection');
	};

	return (
		<Screen backgroundColor={palette.creme} scrollable contentStyle={styles.screenContent}>
			<ImageBackground
				source={require('../../../assets/placeholder/kale-headera.png')}
				resizeMode="cover"
				style={styles.header}
			>
				<AppText variant="h5" color={palette.white} style={styles.headerText}>
					HOW WILL YOU USE SAVEFUL FOR BUSINESS?
				</AppText>
			</ImageBackground>

			<View style={styles.content}>
				<AppText variant="bodyBold" color={palette.primary} style={styles.subtitle}>
					This helps us personalise your experience and connect you with the right community
				</AppText>

				{roleCards.map((card) => (
					<View key={card.id} style={[styles.card, { borderColor: card.borderColor }]}>
						<View style={styles.cardTopRow}>
							<View style={[styles.roundIconWrap, { backgroundColor: card.iconBgColor }]}>
								<Image
									source={card.roundIcon}
									style={styles.roundIcon}
									resizeMode="contain"
								/>
							</View>

							<Image
								source={card.illustration}
								style={styles.illustration}
								resizeMode="contain"
							/>
						</View>

						<AppText variant="h8" color={card.titleColor} style={styles.cardTitle}>
							{card.title}
						</AppText>

						<AppText variant="bodyBold1" color={palette.primary} style={styles.cardSubTitle}>
							{card.subTitle}
						</AppText>

						<AppText variant="body1" color={palette.primary} style={styles.cardDescription}>
							{card.description}
						</AppText>

						<Pressable
							onPress={() => onContinue(card.role)}
							style={[styles.continueButton, { backgroundColor: card.buttonColor }]}
						>
							<AppText variant="bodyBold" color={palette.white}>
								CONTINUE
							</AppText>
							<AppText variant="bodyBold" color={palette.white} style={styles.arrowText}>
								<Ionicons name="arrow-forward" size={normalize(20)} color={palette.white} />
							</AppText>
						</Pressable>
					</View>
				))}
			</View>
		</Screen>
	);
}

const styles = StyleSheet.create({
	screenContent: {
		flexGrow: 1,
		backgroundColor: palette.creme,
		paddingBottom: hp(2.5),
	},

	header: {
		height: hp(16),
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: wp(6),
	},
	headerText: {
		maxWidth: wp(88),
		textAlign: 'center',
	},
	content: {
		paddingHorizontal: wp(4.5),
		paddingTop: hp(1.5),
		gap: hp(1.7),
	},

	subtitle: {
		textAlign: 'center',
		paddingHorizontal: wp(4),
	},
	card: {
		borderWidth: normalize(2),
		borderRadius: normalize(16),
		backgroundColor: '#F3F3EC',
		paddingVertical: hp(1.5),
		paddingHorizontal: wp(3.4),
	},
	cardTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	roundIconWrap: {
		width: wp(16),
		height: wp(16),
		borderRadius: wp(8),
		alignItems: 'center',
		justifyContent: 'center',
	},
	roundIcon: {
		width: wp(16),
		height: wp(16),
	},
	cardNumber: {
		marginLeft: wp(15),
		fontSize: normalize(34),
		lineHeight: normalize(36),
	},
	illustration: {
		width: wp(34),
		height: hp(10),
		marginLeft: 'auto',
	},
	cardTitle: {
		marginTop: hp(0.9),
	},
	cardSubTitle: {
		marginTop: hp(1),
		lineHeight: normalize(20),
	},
	cardDescription: {
		marginTop: hp(0.5),
	},
	continueButton: {
		marginTop: hp(1.3),
		borderRadius: normalize(10),
		minHeight: hp(5),
		paddingHorizontal: wp(4),
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	continueText: {
		fontSize: normalize(13),
		lineHeight: normalize(16),
	},
	arrowText: {
		position: 'absolute',
		right: wp(4),
		fontSize: normalize(15),
		lineHeight: normalize(18),
		top: hp(1.5),
	},
});
