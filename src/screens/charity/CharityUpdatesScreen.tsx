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
      <Pressable style={styles.iconBtn}>
        <Ionicons name="call-outline" size={normalize(16)} />
      </Pressable>
      <Pressable style={styles.iconBtn}>
        <Ionicons name="chatbubble-outline" size={normalize(16)} />
      </Pressable>
      <Pressable style={styles.iconBtn}>
        <Ionicons name="location-outline" size={normalize(16)} />
      </Pressable>
    </View>
  );

  const renderCard = (item: any) => {
    const getStyles = () => {
      switch (item.type) {
        case 'new':
          return { color: palette.orange };
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
        <View style={[styles.card, { borderWidth: 1, borderColor: color }]}>
          <AppText variant='subheading' style={{ color, marginBottom: 6 }}>
            New Surplus Available
          </AppText>

          <AppText variant='bodySmall' style={{ marginBottom: spacing.sm }}>
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
        <View style={[styles.card, { borderWidth: 1, borderColor: color }]}>
          <AppText variant='subheading' style={{ color, marginBottom: 6 }}>
            Pick Up Confirmed
          </AppText>

          <AppText variant='bodySmall' style={{ marginBottom: spacing.sm }}>
            Collect from <AppText variant="label">{item.restaurant}</AppText>
          </AppText>

          {/* LOCATION (same as before) */}
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
                { justifyContent: 'center', alignItems: 'center' },
                cancelledIds.includes(item.id) && { opacity: 0.4 },
              ]}
              onPress={() => {
                if (cancelledIds.includes(item.id)) return;
                setSelectedPickupId(item.id);
                setItemsModalVisible(true);
              }}
            >
              <AppText
                style={{
                  color: cancelledIds.includes(item.id) ? '#999' : color,
                }}
              >
                View Details
              </AppText>
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
        <View style={[styles.card, { borderWidth: 1, borderColor: color }]}>
          <AppText variant='subheading' style={{ color, marginBottom: 6 }}>
            Pickup Feedback
          </AppText>

          <AppText variant='bodySmall' style={{ marginBottom: spacing.sm }}>
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
        <View style={[styles.card, { borderWidth: 1, borderColor: color }]}>
          <AppText variant='subheading' style={{ color, marginBottom: 6 }}>
            Pickup Completed 🎉
          </AppText>

          <AppText variant='label'>{item.restaurant}</AppText>
          <AppText variant='bodySmall' style={{ marginBottom: spacing.sm }}>
            📍 {item.address}
          </AppText>

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
            <AppText variant='subheading'>{item.title}</AppText>

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
    padding: wp(4),
    marginVertical: hp(1),
    backgroundColor: palette.white,
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

  iconBtn: {
    padding: normalize(6),
    borderRadius: normalize(8),
    backgroundColor: '#F1F1F1',
  },

  addressBox: {
    marginTop: hp(1),
    backgroundColor: '#F7F7F9',
    padding: wp(2.5),
    borderRadius: normalize(10),
  },

  cancelBtn: {
    marginTop: hp(1.2),
    backgroundColor: '#FFEAEA',
    paddingVertical: hp(0.9),
    borderRadius: normalize(10),
    alignItems: 'center',
  },

  cancelText: {
    color: palette.danger,
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
    backgroundColor: '#F7F7F9',
    padding: wp(2.5),
    borderRadius: normalize(10),
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
    backgroundColor: palette.primary,
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
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: palette.black,
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
    backgroundColor: '#E74C3C',
    padding: normalize(10),
    borderRadius: normalize(10),
    alignItems: 'center',
    marginLeft: wp(1.5),
  },

  noBtn: {
    flex: 1,
    backgroundColor: palette.white,
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