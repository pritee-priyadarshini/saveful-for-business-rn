import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, ImageBackground, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { PostCollectSurveyModal } from './components/postCollectSurveyModal';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

export function CharityUpdatesScreen() {

  const navigation = useNavigation<any>();

  const [cancelledIds, setCancelledIds] = React.useState<string[]>([]);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [initialAnswer, setInitialAnswer] = React.useState<'yes' | 'no' | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = React.useState(false);
  const [selectedPickupId, setSelectedPickupId] = React.useState<string | null>(null);
  const [itemsModalVisible, setItemsModalVisible] = React.useState(false);
  const [surveyCompletedIds, setSurveyCompletedIds] = React.useState<string[]>([]);


  const sections: { title: string; data: any[] }[] = [
    {
      title: 'Today',
      data: [
        {
          id: '1',
          type: 'new',
          restaurant: 'Saveful Bakery',
          time: '2m',
        },
        {
          id: '2',
          type: 'pickup',
          restaurant: 'Green Bowl',
          address: '12 MG Road, Chennai',
          date: '12 Apr',
          time: '4:30 PM',
          items: [
            { name: 'Rice', qty: 4 },
            { name: 'Fruits', qty: 8 },
            { name: 'Bread', qty: 2 },
          ],
        },
        {
          id: '3',
          type: 'survey',
          restaurant: 'Urban Bites',
          time: '1h',
        },
      ],
    },
    {
      title: 'Yesterday',
      data: [
        {
          id: '4',
          type: 'completed',
          restaurant: 'Saveful Bakery',
          address: '22 Anna Nagar, Chennai',
          date: '11 Apr',
          qty: 6,
          meals: 15,
        },
        {
          id: '5',
          type: 'pickup',
          restaurant: 'Harvest Cafe',
          address: '5 T Nagar, Chennai',
          date: '11 Apr',
          time: '6:00 PM',
          items: [
            { name: 'Vegetables', qty: 5 },
            { name: 'Rice', qty: 3 },
          ],
        },
      ],
    },
  ];

  const renderActions = () => (
    <View style={styles.actionRow}>
      <Pressable style={styles.iconPill}>
        <Ionicons name="call-outline" size={normalize(16)} color={palette.white} />
        <AppText variant="label" style={styles.iconText}>Call</AppText>
      </Pressable>
      <Pressable style={styles.iconPill}>
        <Ionicons name="chatbubble-outline" size={normalize(16)} color={palette.white} />
        <AppText variant="label" style={styles.iconText}>Message</AppText>
      </Pressable>
      <Pressable style={styles.iconPill}>
        <Ionicons name="location-outline" size={normalize(16)} color={palette.white} />
        <AppText variant="label" style={styles.iconText}>Location</AppText>
      </Pressable>
    </View>
  );

  const renderCard = (item: any) => {
    const getStyles = () => {
      switch (item.type) {
        case 'new':
          return { color: palette.eggplantVibrant };
        case 'pickup':
          return { color: palette.middlegreen };
        case 'survey':
          return { color: palette.kale };
        case 'completed':
          return { color: palette.primary };
        default:
          return { color: '#ccc' };
      }
    };

    const { color } = getStyles();

    if (item.type === 'new') {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AppText variant='subheading' style={{ color }}>
              New Surplus Available
            </AppText>
            <View style={[styles.typeBadge, { backgroundColor: color }]}>
              <AppText variant='caption' style={{ color: palette.white }}>NEW</AppText>
            </View>
          </View>

          <AppText variant='bodySmall'>
            <AppText variant="label">{item.restaurant}</AppText> has listed fresh surplus near you
          </AppText>

          <Pressable
            style={[styles.actionBtn, { backgroundColor: color }]}
            onPress={() => navigation.navigate('Available', {
              screen: 'CharityMap',
            })}
          >
            <AppText variant='label' style={{ color: palette.white }}>Check now</AppText>
          </Pressable>
        </View>
      );
    }

    if (item.type === 'pickup') {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AppText variant='subheading' style={{ color }}>
              Pick Up Confirmed
            </AppText>
            <View style={[styles.typeBadge, { backgroundColor: color }]}>
              <AppText variant='caption' style={{ color: palette.white }}>PICKUP</AppText>
            </View>
          </View>

          <AppText variant='bodySmall'>
            Collect from <AppText variant="label">{item.restaurant}</AppText>
          </AppText>

          {/* LOCATION */}
          <View style={styles.addressBox}>
            <AppText variant='label'>📍 {item.address}</AppText>
          </View>

          {/* INFO CARDS */}
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <AppText variant='label'>Date</AppText>
              <AppText variant='bodySmall'>{item.date}</AppText>
            </View>

            <View style={styles.infoCard}>
              <AppText variant='label'>Time</AppText>
              <AppText variant='bodySmall'>{item.time}</AppText>
            </View>

            <Pressable
              disabled={cancelledIds.includes(item.id)}
              style={[
                styles.infoCard,
                cancelledIds.includes(item.id) && { opacity: 0.4 },
              ]}
              onPress={() => {
                if (cancelledIds.includes(item.id)) return;
                setSelectedPickupId(item.id);
                setItemsModalVisible(true);
              }}
            >
              <AppText variant="label">Items</AppText>
              <View style={styles.viewBtn}>
                <AppText variant="label" style={styles.viewText}>View</AppText>
              </View>
            </Pressable>
          </View>

          {/* ACTIONS */}
          <View style={{ marginTop: spacing.sm }}>
            {renderActions()}
          </View>

          {/* CANCEL LOGIC */}
          {!cancelledIds.includes(item.id) && (
            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                setSelectedPickupId(item.id);
                setCancelModalVisible(true);
              }}
            >
              <AppText variant='label' style={styles.cancelText}>Cancel Pickup</AppText>
            </Pressable>
          )}

          {cancelledIds.includes(item.id) && (
            <AppText variant='bodyBold' style={styles.cancelledText}>
              Collection Cancelled
            </AppText>
          )}
        </View>
      );
    }

    if (item.type === 'survey') {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AppText variant='subheading' style={{ color }}>
              Pickup Feedback
            </AppText>
            <View style={[styles.typeBadge, { backgroundColor: color }]}>
              <AppText variant='caption' style={{ color: palette.white }}>SURVEY</AppText>
            </View>
          </View>

          <AppText variant='bodySmall'>
            Did you collect from <AppText variant="label">{item.restaurant}</AppText>?
          </AppText>

          <View style={styles.actions}>
            <Pressable
              disabled={surveyCompletedIds.includes(item.id)}
              style={[
                styles.yesBtn,
                { backgroundColor: palette.middlegreen },
                surveyCompletedIds.includes(item.id) && { opacity: 0.4 },
              ]}
              onPress={() => {
                setInitialAnswer('yes');
                setSelectedPickupId(item.id);
                setModalVisible(true);
              }}

            >
              <AppText variant='label' style={{ color: palette.white }}>Yes</AppText>
            </Pressable>

            <Pressable
              disabled={surveyCompletedIds.includes(item.id)}
              style={[
                styles.noBtn,
                surveyCompletedIds.includes(item.id) && { opacity: 0.4 },
              ]}
              onPress={() => {
                setInitialAnswer('no');
                setSelectedPickupId(item.id);
                setModalVisible(true);
              }}
            >
              <AppText variant='label'>No</AppText>
            </Pressable>
          </View>

          {surveyCompletedIds.includes(item.id) && (
            <AppText variant='bodyBold' style={styles.surveyStatus}>
              {cancelledIds.includes(item.id)
                ? 'Pickup cancelled and survey completed'
                : 'Pickup and survey completed'}
            </AppText>
          )}

        </View>
      );
    }

    if (item.type === 'completed') {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AppText variant='subheading' style={{ color }}>
              Pickup Completed 🎉
            </AppText>
            <View style={[styles.typeBadge, { backgroundColor: color }]}>
              <AppText variant='caption' style={{ color: palette.white }}>DONE</AppText>
            </View>
          </View>

          <View style={styles.addressBox}>
            <AppText variant='label'>{item.restaurant}</AppText>
            <AppText variant='bodySmall'>📍 {item.address}</AppText>
          </View>

          {/* STATS */}
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <AppText variant='label'>Qty Saved</AppText>
              <AppText variant='bodySmall'>{item.qty} kg</AppText>
            </View>

            <View style={styles.infoCard}>
              <AppText variant='label'>Meals</AppText>
              <AppText variant='bodySmall'>{item.meals}</AppText>
            </View>

            <View style={styles.infoCard}>
              <AppText variant='label'>Date</AppText>
              <AppText variant='bodySmall'>{item.date}</AppText>
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <Screen backgroundColor={palette.creme} scrollable={false}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        ListHeaderComponent={
          <ImageBackground
            source={require('../../../assets/placeholder/kale-header.png')}
            style={styles.headerBg}
          >
            <AppText variant='h5' style={styles.headerTitle}>
              UPDATES
            </AppText>
          </ImageBackground>
        }
        renderItem={({ item }) => (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <AppText variant='subheading' style={styles.sectionTitle}>{item.title}</AppText>
            </View>

            <View style={styles.sectionCard}>
              {item.data.map((d: any) => (
                <View key={d.id}>{renderCard(d)}</View>
              ))}
            </View>
          </View>
        )}
      />

      <Modal
        transparent
        visible={cancelModalVisible}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <AppText variant='bodyBold' style={styles.modalTitle}>
              Are you sure to cancel the order?
            </AppText>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.noBtn}
                onPress={() => {
                  setCancelModalVisible(false);
                  setSelectedPickupId(null);
                }}
              >
                <AppText variant='label'>No</AppText>
              </Pressable>

              <Pressable
                style={styles.yesBtn}
                onPress={() => {
                  if (selectedPickupId) {
                    setCancelledIds((prev) => [...prev, selectedPickupId]);
                  }
                  setCancelModalVisible(false);
                  setSelectedPickupId(null);
                }}
              >
                <AppText variant='label' style={{ color: palette.white }}>Yes</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>


      <Modal
        transparent
        visible={itemsModalVisible}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <AppText variant="bodyBold" style={styles.modalTitle}>
              Items to Collect
            </AppText>

            {(() => {
              const selected = sections
                .flatMap(s => s.data)
                .find(i => i.id === selectedPickupId);

              const total =
                selected?.items?.reduce((acc: number, i: any) => acc + i.qty, 0) || 0;

              return (
                <>
                  {selected?.items?.map((item: any) => (
                    <View key={item.name} style={styles.rowBetween}>
                      <AppText variant='bodySmall'>{item.name}</AppText>
                      <AppText variant='bodySmall'>{item.qty} kg</AppText>
                    </View>
                  ))}

                  <View style={styles.divider} />

                  <View style={styles.rowBetween}>
                    <AppText variant='label' >Total</AppText>
                    <AppText variant='label' >{total} kg</AppText>
                  </View>
                </>
              );
            })()}

            <Pressable
              style={styles.closeBtn}
              onPress={() => {
                setItemsModalVisible(false);
                setSelectedPickupId(null);
              }}
            >
              <AppText variant='label' style={{ color: palette.white }}>Close</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <PostCollectSurveyModal
        visible={modalVisible}
        initialAnswer={initialAnswer}
        onClose={() => {
          if (selectedPickupId) {
            setSurveyCompletedIds(prev => [...prev, selectedPickupId]);

            if (initialAnswer === 'no') {
              setCancelledIds(prev => [...prev, selectedPickupId]);
            }
          }

          setModalVisible(false);
          setInitialAnswer(null);
          setSelectedPickupId(null);
        }}

      />
    </Screen>
  );
}

const styles = StyleSheet.create({

  headerBg: {
    height: hp(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: -wp(6),
    marginBottom: hp(1.5),
  },

  headerTitle: {
    color: palette.white,
  },

  section: {
    marginTop: hp(1.5),
    marginHorizontal: wp(4),
  },

  sectionCard: {
    gap: hp(1),
  },

  card: {
    borderRadius: normalize(16),
    padding: hp(1.6),
    marginVertical: hp(1),
    backgroundColor: palette.radish,
    gap: hp(1.4),
  },

  pickupBox: {
    marginTop: hp(1),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  actionRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },

  addressBox: {
    backgroundColor: palette.white,
    padding: wp(2.5),
    borderRadius: normalize(10),
  },

  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    backgroundColor: palette.danger,
    paddingVertical: hp(1),
    borderRadius: normalize(10),
  },

  cancelText: {
    color: palette.white,
  },

  actionBtn: {
    paddingVertical: hp(1.2),
    borderRadius: normalize(10),
    alignItems: 'center',
  },

  infoRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginTop: hp(1),
  },

  infoCard: {
    flex: 1,
    backgroundColor: palette.creme,
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderRadius: normalize(12),
    gap: hp(0.8),
    alignItems: 'center',
  },

  viewBtn: {
    backgroundColor: palette.middlegreen,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    borderRadius: 999,
  },

  viewText: {
    color: palette.white,
  },

  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
    backgroundColor: palette.middlegreen,
    paddingHorizontal: wp(2.8),
    paddingVertical: hp(0.9),
    borderRadius: 999,
  },

  iconText: {
    color: palette.white,
  },

  cancelledText: {
    marginTop: hp(1),
    color: palette.chilli ,
  },

  divider: {
    height: normalize(1),
    backgroundColor: '#eee',
    marginVertical: hp(1),
  },

  closeBtn: {
    marginTop: hp(1.5),
    backgroundColor: palette.middlegreen,
    paddingVertical: hp(1.2),
    borderRadius: normalize(10),
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  surveyStatus: {
    marginTop: hp(1),
    textAlign: 'center',
    color: palette.success,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  typeBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: 999,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: hp(0.8),
    borderBottomWidth: 1,
    borderBottomColor: palette.strokecream,
    marginBottom: hp(0.4),
  },
  sectionTitle: {
    color: palette.midgray,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 27, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: wp(82),
    backgroundColor: palette.white,
    padding: wp(5),
    borderRadius: normalize(16),
    gap: hp(1.8),
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  yesBtn: {
    flex: 1,
    backgroundColor: palette.danger,
    padding: normalize(10),
    borderRadius: normalize(10),
    alignItems: 'center',
    marginLeft: wp(1.5),
  },
  noBtn: {
    flex: 1,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.strokecream,
    padding: normalize(10),
    borderRadius: normalize(10),
    alignItems: 'center',
    marginRight: wp(1.5),
  },
  actions: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginTop: hp(1),
  },
  yesText: {
    color: palette.white,
  },
  noText: {
    color: '#555',
  },
  impactBox: {
    marginTop: hp(1),
    flexDirection: 'row',
    gap: wp(2.5),
  },
});