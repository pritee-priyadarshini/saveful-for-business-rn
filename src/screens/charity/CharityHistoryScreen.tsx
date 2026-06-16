import React, { useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  Pressable,
  ImageBackground,
  Dimensions,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';

import { spacing } from '../../theme/spacing';
import { palette } from '../../theme/colors';

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

// DEMO DATA
const historyData = [
  {
    id: '1',
    business: 'Saveful Bakery',
    date: '2026-04-01T16:30:00',
    status: 'Completed',
    items: [
      { name: 'Rice', qty: 3 },
      { name: 'Bread', qty: 3 },
    ],
  },
  {
    id: '2',
    business: 'Harvest Cafe',
    date: '2026-03-31T18:00:00',
    status: 'Completed',
    items: [
      { name: 'Fruits', qty: 6 },
      { name: 'Vegetables', qty: 4 },
    ],
  },
  {
    id: '3',
    business: 'Market Kitchen',
    date: '2026-03-29T17:00:00',
    status: 'Cancelled',
    items: [
      { name: 'Pasta', qty: 2 },
      { name: 'Salad', qty: 2 },
    ],
  },
  {
    id: '4',
    business: 'My Cloud Kitchen',
    date: '2026-02-29T20:00:00',
    status: 'Completed',
    items: [
      { name: 'Fresh Fruits', qty: 6 },
      { name: 'Meat', qty: 5 },
    ],
  },
  {
    id: '5',
    business: 'Billy Billy Kitchen',
    date: '2026-01-20T13:00:00',
    status: 'Cancelled',
    items: [
      { name: 'Cooked Food', qty: 9 },
      { name: 'Cooked Meat', qty: 4 },
    ],
  },
];

export function CharityHistoryScreen() {
  const navigation = useNavigation<any>();

  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [selectedYear, setSelectedYear] = React.useState('All');
  const [selectedMonth, setSelectedMonth] = React.useState('All');
  const [showYearDropdown, setShowYearDropdown] = React.useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = React.useState(false);
  const [selectedCollection, setSelectedCollection] = React.useState<any>(null);
  const [showModal, setShowModal] = React.useState(false);
  const years = ['All', '2026', '2025'];

  const months = [
    'All',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const getTotalQty = (items: any[]) => items.reduce((acc, item) => acc + item.qty, 0);
  const getMealsCreated = (qty: number) => Math.round((qty * 1000) / 420);
  const filteredData = historyData.filter(
    (item) => {
      const date = new Date(item.date);
      const year = String(date.getFullYear());

      const month = date.toLocaleString('default', { month: 'long' });
      const statusMatch = statusFilter === 'ALL' ? true : statusFilter === 'COMPLETED'
        ? item.status === 'Completed'
        : item.status === 'Cancelled';

      const yearMatch = selectedYear === 'All' ? true : year === selectedYear;
      const monthMatch = selectedMonth === 'All' ? true : month === selectedMonth;

      return (statusMatch && yearMatch && monthMatch);
    }
  );

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} >
      {/* DETAILS MODAL */}
      <Modal visible={showModal} transparent animationType="fade" >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCard}>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowModal(false)} >
                <Ionicons name="close" size={20} color={palette.text} />
              </TouchableOpacity>
              <View style={styles.modalHeader}>

                <View style={styles.modalIconWrap}>
                  <Image source={require('../../../assets/placeholder/cutlery_icon.png')} style={styles.modalIcon} />
                </View>

                <AppText variant="subheading" style={styles.modalBusiness} >
                  {selectedCollection?.business}
                </AppText>
              </View>

              <View style={styles.modalSummaryCard}>
                <AppText variant="bodyLarge"> Total Food Collected </AppText>
                <AppText variant="h6" style={styles.modalTotal} > {selectedCollection ? getTotalQty(selectedCollection.items) : 0} kg </AppText>
              </View>

              <AppText variant="label" style={styles.foodSectionTitle} > Food Items </AppText>
              {selectedCollection?.items?.map(
                (item: any, index: number) => (
                  <View key={index} style={styles.foodItemCard} >
                    <View style={styles.foodItemLeft}>
                      <Image source={require('../../../assets/placeholder/cutlery_icon.png')} style={styles.foodItemIcon} />
                      <AppText variant='bodyLarge'> {item.name} </AppText>
                    </View>
                    <AppText variant="bodyBold" style={styles.foodQty} > {item.qty} kg </AppText>
                  </View>
                )
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* HEADER */}
      <View style={styles.heroContainer}>
        <Image source={require('../../../assets/placeholder/feed-bg.png')} style={styles.heroBg} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} >
          <Ionicons name="arrow-back" size={24} color={palette.white} />
        </TouchableOpacity>
        <AppText variant="h5" style={styles.heroTitle} > COLLECTION HISTORY </AppText>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <>
            <AppText variant="label" style={styles.sectionTitle} > Total Collections </AppText>
            <View style={styles.summaryRow} >
              <View style={styles.summaryCard} >
                <Image
                  source={require('../../../assets/placeholder/storage_box_green.png')}
                  style={styles.summaryIcon}
                />

                <AppText variant="bodyBold" style={styles.sectionText}> 1250 kg </AppText>
                <AppText variant="bodySmall" style={styles.sectionText} > Food Recovered </AppText>
              </View>

              <View style={styles.summaryCard} >
                <Image
                  source={require('../../../assets/placeholder/cutlery_icon.png')}
                  style={styles.summaryIcon}
                />
                <AppText variant="bodyBold" style={styles.sectionText}> 2940 </AppText>
                <AppText variant="bodySmall" style={styles.sectionText}> Meals Created </AppText>
              </View>

              <View style={styles.summaryCard} >
                <Image
                  source={require('../../../assets/placeholder/truck_icon.png')}
                  style={styles.summaryIcon}
                />
                <AppText variant="bodyBold" style={styles.sectionText}> 123 </AppText>
                <AppText variant="bodySmall" style={styles.sectionText}> Collections Completed </AppText>
              </View>
            </View>

            <View style={styles.searchContainer} >
              <AppText variant="label" style={styles.searchTitle} > Search Collections </AppText>
              <View style={styles.filterRow} >
                {[
                  'ALL',
                  'COMPLETED',
                  'CANCELLED',
                ].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.filterChip,
                      statusFilter === item && styles.activeChip,
                    ]}
                    onPress={() => setStatusFilter(item as any)}
                  >
                    <AppText variant='h6' style={statusFilter === item ? styles.activeChipText : styles.chipText} >
                      {item}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.dropdownRow} >
                <TouchableOpacity
                  style={styles.filterDropdown}
                  onPress={() => setShowYearDropdown(!showYearDropdown)}
                >
                  <AppText variant='bodyBold'> {selectedYear} </AppText>
                  <Ionicons name="chevron-down" size={18} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterDropdown}
                  onPress={() => setShowMonthDropdown(!showMonthDropdown)}
                >
                  <AppText variant='bodyBold'> {selectedMonth} </AppText>
                  <Ionicons name="chevron-down" size={18} />
                </TouchableOpacity>
              </View>

              {showYearDropdown && (
                <View style={styles.dropdownList} >
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year} style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedYear(year);
                        setShowYearDropdown(false);
                      }}
                    >
                      <AppText variant='bodySmall'> {year} </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {showMonthDropdown && (
                <View style={styles.dropdownList} >
                  {months.map((month) => (
                    <TouchableOpacity key={month} style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedMonth(month);
                        setShowMonthDropdown(false);
                      }}
                    >
                      <AppText variant='bodySmall'> {month} </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <AppText variant="label" style={styles.sectionTitle} > Recent Collections </AppText>
          </>
        }
        renderItem={({ item }) => {
          const totalQty = getTotalQty(item.items);
          const meals = getMealsCreated(totalQty);
          const completed = item.status === 'Completed';
          return (
            <View style={styles.collectionCard}>
              <View style={styles.collectionHeader} >
                <View
                  style={[
                    styles.statusPill,
                    completed ? styles.completedPill : styles.cancelledPill,
                  ]}
                >
                  <AppText variant='bodyBold' style={completed ? styles.completedText : styles.cancelledText} >
                    {item.status}
                  </AppText>
                </View>

                <AppText variant="bodyBold" style={{ marginLeft: 10, flex: 1, }}>
                  {item.business}
                </AppText>
              </View>

              <View
                style={[
                  styles.metricsGrid,
                  !completed && styles.cancelledMetricsGrid,
                ]}
              >
                <View
                  style={[
                    styles.metricBox,
                    !completed && styles.cancelledMetricBox,
                  ]}
                >
                  <Image
                    source={require('../../../assets/placeholder/calender_icon.png')}
                    style={styles.metricIcon}
                  />
                  <View>
                    <AppText variant="bodyBold" style={styles.sectionText}> Collected </AppText>
                    <AppText variant="bodySmall" style={styles.sectionText1}>
                      {new Date(item.date).toLocaleDateString()}
                    </AppText>
                  </View>
                </View>

                <View style={styles.metricBox}>
                  <Image
                    source={require('../../../assets/placeholder/storage_box_green.png')}
                    style={styles.metricIcon}
                  />

                  <View>
                    <AppText variant="bodyBold" style={styles.sectionText}> Food Saved </AppText>
                    <AppText variant="bodySmall" style={styles.sectionText1}> {totalQty} kg </AppText>
                  </View>
                </View>

                {completed && (
                  <View style={styles.metricBox} >
                    <Image
                      source={require('../../../assets/placeholder/cutlery_icon.png')}
                      style={styles.metricIcon}
                    />

                    <View>
                      <AppText variant="bodyBold" style={styles.sectionText}>Meals Made </AppText>
                      <AppText variant="bodySmall" style={styles.sectionText1}> {meals} </AppText>
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.viewDetailsBtn}
                onPress={() => {
                  setSelectedCollection(item);
                  setShowModal(true);
                }}
              >
                <Ionicons name="eye-outline" size={18} color={palette.middlegreen} />
                <AppText variant='bodyBold' style={styles.viewDetailsText}> View Details </AppText>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: hp(4),
  },

  heroContainer: {
    height: hp(16),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: palette.primary,
  },

  heroBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  backBtn: {
    position: 'absolute',
    left: wp(4),
    top: hp(2.2),
    zIndex: 20,
  },

  heroTitle: {
    color: palette.white,
  },

  sectionTitle: {
    marginHorizontal: wp(4),
    marginTop: hp(1.2),
    marginBottom: hp(0.8),
  },

  sectionText: {
    marginHorizontal: wp(0.5),
    marginTop: hp(1),
    textAlign: 'center',
    color: palette.success,
  },

  sectionText1: {
    marginHorizontal: wp(2),
    marginTop: hp(1),
    textAlign: 'center',
    color: palette.black,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: wp(4),
    marginBottom: hp(1.6),
  },

  summaryCard: {
    width: '31.5%',
    backgroundColor: palette.white,
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: '#B9D8B9',
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(1.5),
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryIcon: {
    width: normalize(20),
    height: normalize(20),
    resizeMode: 'contain',
    marginBottom: hp(0.4),
  },

  searchContainer: {
    marginHorizontal: wp(4),
    marginBottom: hp(1.6),
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: '#DDEBDD',
    padding: wp(3),
  },

  searchTitle: {
    marginBottom: hp(1),
  },

  filterRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(1.2),
  },

  filterChip: {
    flex: 1,
    height: hp(4.2),
    borderRadius: normalize(8),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F1F1',
  },

  activeChip: {
    backgroundColor: palette.primary,
  },

  chipText: {
    color: '#666',
    fontSize: normalize(11),
  },

  activeChipText: {
    color: palette.white,
    fontSize: normalize(11),
  },

  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2),
  },

  filterDropdown: {
    flex: 1,
    height: hp(5),
    borderRadius: normalize(8),
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: palette.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(3),
  },

  dropdownList: {
    marginTop: hp(0.8),
    borderRadius: normalize(8),
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: palette.white,
    overflow: 'hidden',
  },

  dropdownItem: {
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(3),

    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },

  collectionCard: {
    backgroundColor: palette.white,
    marginHorizontal: wp(4),
    marginBottom: hp(1.4),
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: '#B9D8B9',
    padding: wp(3),
  },

  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },


  statusPill: {
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    borderRadius: normalize(8),
  },

  completedPill: {
    backgroundColor: '#E6F6EC',
  },

  cancelledPill: {
    backgroundColor: '#FDECEA',
  },

  completedText: {
    color: palette.success,
  },

  cancelledText: {
    color: palette.danger,
  },

  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: hp(1.2),
  },

  metricBox: {
    width: '32.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FBF9',
    borderWidth: 1,
    borderColor: '#DDEBDD',
    borderRadius: normalize(10),
    paddingVertical: hp(1),

  },

  metricContent: {
    flex: 1,
    marginLeft: wp(0.2),
  },

  cancelledMetricBox: {
    width: '32.5%',
  },

  metricIcon: {
    width: normalize(24),
    height: normalize(24),
    resizeMode: 'contain',
    marginBottom: hp(0.5),
  },

  cancelledMetricsGrid: {
    justifyContent: 'flex-start',
    gap: wp(2),
  },

  viewDetailsBtn: {
    height: hp(3.8),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: '#B9D8B9',
    backgroundColor: '#F6FFF6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: wp(2),
  },

  viewDetailsText: {
    color: palette.middlegreen,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },

  modalCard: {
    width: '100%',
    backgroundColor: palette.white,
    borderRadius: normalize(18),
    padding: wp(5),
    position: 'relative',
  },

  closeModalBtn: {
    position: 'absolute',
    right: normalize(1),
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  modalTitle: {
    textAlign: 'center',
    marginBottom: hp(2),
  },

  modalFoodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',

    marginBottom: hp(1),
  },

  modalDivider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: hp(1.2),
  },

  modalHeader: {
    alignItems: 'center',
    marginBottom: hp(2),
  },

  modalIconWrap: {
    width: normalize(70),
    height: normalize(70),
    borderRadius: normalize(35),
    backgroundColor: '#F5F8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1),
  },

  modalIcon: {
    width: normalize(34),
    height: normalize(34),
    resizeMode: 'contain',
  },

  modalBusiness: {
    textAlign: 'center',
  },

  modalDate: {
    color: '#777',
    marginTop: hp(0.4),
  },

  modalSummaryCard: {
    backgroundColor: '#F8FBF8',
    borderWidth: 1,
    borderColor: '#DDEBDD',
    borderRadius: normalize(12),
    alignItems: 'center',
    paddingVertical: hp(1.5),
    marginBottom: hp(2),
  },

  modalTotal: {
    color: palette.middlegreen,
    marginTop: hp(0.3),
  },

  foodSectionTitle: {
    marginBottom: hp(1),
  },

  foodItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    backgroundColor: '#FAFAFA',

    borderRadius: normalize(10),

    padding: wp(3),

    marginBottom: hp(1),
  },

  foodItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  foodItemIcon: {
    width: normalize(18),
    height: normalize(18),

    resizeMode: 'contain',

    marginRight: wp(2),
  },

  foodQty: {
    color: palette.middlegreen,
  },
});