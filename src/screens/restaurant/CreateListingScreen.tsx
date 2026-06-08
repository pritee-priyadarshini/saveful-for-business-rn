import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';
import { foodListingService } from '../../services/foodListing.service';
import { estimateMealsSaved, resolveFoodIconSource, type FoodIconKey } from '../../utils/foodListing';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type Step = 1 | 2 | 3;
type PickerTarget = 'bestBefore' | 'from' | 'to' | null;

type FoodItem = {
  name: string;
  qty: number;
  iconKey: FoodIconKey;
};

const stepMeta = [
  { id: 1 as Step, title: 'Food\nDetails' },
  { id: 2 as Step, title: 'Collection\nLogistics' },
  { id: 3 as Step, title: 'Confirm\nListing' },
];

const seedItems: FoodItem[] = [
  { name: 'Prepared meals', qty: 0, iconKey: 'preparedMeals' },
  { name: 'Bread', qty: 0, iconKey: 'bread' },
  { name: 'Baked Goods', qty: 0, iconKey: 'bakedGoods' },
  { name: 'Fresh fruit & veg', qty: 0, iconKey: 'fruitVeg' },
  { name: 'Meat', qty: 0, iconKey: 'meat' },
  { name: 'Dairy', qty: 0, iconKey: 'dairy' },
];

const ALLERGEN_OPTIONS = [
  'Gluten',
  'Dairy',
  'Eggs',
  'Fish',
  'Shellfish',
  'Peanuts',
  'Tree nuts',
  'Soy',
  'Sesame',
  'Mustard',
  'Celery',
  'Lupin',
  'Molluscs',
  'Sulphites',
];

const storageOptions: ReadonlyArray<{ label: 'Fridge' | 'Freezer' | 'Ambient'; icon: any }> = [
  { label: 'Fridge', icon: require('../../../assets/placeholder/fridge_icon.png') },
  { label: 'Freezer', icon: require('../../../assets/placeholder/freezer_icon.png') },
  { label: 'Ambient', icon: require('../../../assets/placeholder/ambient_temp_icon.png') },
];

const reheatingOptions: ReadonlyArray<{ label: 'Yes' | 'No' | 'Not sure'; icon?: any }> = [
  { label: 'Yes', icon: require('../../../assets/placeholder/heating_icon.png') },
  { label: 'No', icon: require('../../../assets/placeholder/no_heating_icon.png') },
  { label: 'Not sure' },
];

const formatDate = (date: Date | null) => {
  if (!date) return 'Select best before date';
  return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateShort = (date: Date | null) => {
  if (!date) return 'Date';
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const formatTime = (date: Date | null) => {
  if (!date) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

export function CreateListingScreen({ navigation }: any) {
  const { currentProfile, authUser } = useAppContext();
  const siteId = authUser?.profile?.sites?.[0]?.id || authUser?.profile?.site?.id || null;

  const [step, setStep] = useState<Step>(1);
  const [items, setItems] = useState<FoodItem[]>(seedItems);
  const [customItem, setCustomItem] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [location, setLocation] = useState(currentProfile?.address || '');
  const [bestBeforeDate, setBestBeforeDate] = useState<Date | null>(null);
  const [pickupFromDate, setPickupFromDate] = useState<Date | null>(null);
  const [pickupToDate, setPickupToDate] = useState<Date | null>(null);

  const [storage, setStorage] = useState<'Fridge' | 'Freezer' | 'Ambient'>('Freezer');
  const [reheating, setReheating] = useState<'Yes' | 'No' | 'Not sure'>('No');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [confirmedSafe, setConfirmedSafe] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | 'datetime'>('date');
  const [pickerValue, setPickerValue] = useState(new Date());

  const activeItems = useMemo(() => items.filter((item) => item.qty > 0), [items]);
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const estimatedMeals = estimateMealsSaved(totalQuantity);
  const estimatedCO2 = Math.max(0, Math.round(totalQuantity * 4));
  const hasSelectedAllergens = selectedAllergens.length > 0;

  const updateQty = (index: number, delta: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        qty: Math.max(0, Math.round((next[index].qty + delta) * 10) / 10),
      };
      return next;
    });
  };

  const addCustomItem = () => {
    if (!customItem.trim()) return;
    setItems((prev) => [...prev, { name: customItem.trim(), qty: 0, iconKey: 'preparedMeals' }]);
    setCustomItem('');
  };

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) => (
      prev.includes(allergen)
        ? prev.filter((entry) => entry !== allergen)
        : [...prev, allergen]
    ));
  };

  const selectAllAllergens = () => setSelectedAllergens([...ALLERGEN_OPTIONS]);

  const clearAllergens = () => setSelectedAllergens([]);

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsMultipleSelection: true,
    });

    if (!res.canceled) {
      setImages((prev) => [...prev, ...res.assets.map((item) => item.uri)]);
    }
  };

  const pickFromCamera = async () => {
    const res = await ImagePicker.launchCameraAsync({ quality: 0.75 });
    if (!res.canceled) {
      setImages((prev) => [...prev, res.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const openDatePicker = (target: Exclude<PickerTarget, null>) => {
    const initial =
      target === 'bestBefore'
        ? bestBeforeDate || new Date()
        : target === 'from'
          ? pickupFromDate || new Date()
          : pickupToDate || new Date();

    setPickerTarget(target);
    setPickerValue(initial);

    if (Platform.OS === 'ios') {
      setPickerMode(target === 'bestBefore' ? 'date' : 'datetime');
      setPickerVisible(true);
      return;
    }

    setPickerMode('date');
    setPickerVisible(true);
  };

  const applySelectedDate = (target: Exclude<PickerTarget, null>, value: Date) => {
    if (target === 'bestBefore') setBestBeforeDate(value);
    if (target === 'from') setPickupFromDate(value);
    if (target === 'to') setPickupToDate(value);
  };

  const onNativePickerChange = (event: any, selectedDate?: Date) => {
    if (!pickerTarget) return;

    if (Platform.OS === 'ios') {
      if (selectedDate) setPickerValue(selectedDate);
      return;
    }

    setPickerVisible(false);

    if (event.type === 'dismissed' || !selectedDate) {
      setPickerTarget(null);
      return;
    }

    if (pickerTarget === 'bestBefore') {
      applySelectedDate('bestBefore', selectedDate);
      setPickerTarget(null);
      return;
    }

    if (pickerMode === 'date') {
      const datePart = new Date(selectedDate);
      const timePart = pickerTarget === 'from' ? pickupFromDate || new Date() : pickupToDate || new Date();

      datePart.setHours(timePart.getHours());
      datePart.setMinutes(timePart.getMinutes());

      setPickerValue(datePart);
      setPickerMode('time');
      setTimeout(() => setPickerVisible(true), 120);
      return;
    }

    const finalDate = new Date(pickerValue);
    finalDate.setHours(selectedDate.getHours());
    finalDate.setMinutes(selectedDate.getMinutes());

    applySelectedDate(pickerTarget, finalDate);
    setPickerMode('date');
    setPickerTarget(null);
  };

  const confirmIOSPicker = () => {
    if (!pickerTarget) return;

    applySelectedDate(pickerTarget, pickerValue);
    setPickerVisible(false);
    setPickerTarget(null);
    setPickerMode('date');
  };

  const closeIOSPicker = () => {
    setPickerVisible(false);
    setPickerTarget(null);
    setPickerMode('date');
  };

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) setStep(3);
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(1);
      return;
    }

    navigation.goBack();
  };

  const handleCreateListing = async () => {
    if (!confirmedSafe) {
      Alert.alert('Confirmation required', 'Please confirm this food is safe for donation.');
      return;
    }

    if (!siteId) {
      Alert.alert('Site not found', 'Please set up your site first.');
      return;
    }

    if (activeItems.length === 0) {
      Alert.alert('Food details missing', 'Add at least one food item quantity.');
      setStep(1);
      return;
    }

    if (!bestBeforeDate || !pickupFromDate || !pickupToDate) {
      Alert.alert('Missing dates', 'Please set best before and pickup window.');
      setStep(2);
      return;
    }

    if (pickupToDate <= pickupFromDate) {
      Alert.alert('Invalid window', 'Pickup end time must be after pickup start time.');
      setStep(2);
      return;
    }

    try {
      const payload = {
        siteId: Number(siteId),
        foodItems: activeItems.map((item) => ({
          category: item.name,
          totalQtyKg: item.qty,
          remainingQtyKg: item.qty,
        })),
        pickupAddress: location || 'Address not provided',
        bestBefore: bestBeforeDate.toISOString(),
        pickupFromTime: pickupFromDate.toISOString(),
        pickupByTime: pickupToDate.toISOString(),
        needsRefrigeration: storage === 'Fridge',
        needsReheating: reheating === 'Yes',
        containsAllergens: hasSelectedAllergens,
      };

      const response = await foodListingService.createListing(payload);
      navigation.navigate('ListingConfirmation', {
        listing: {
          ...response.data,
          foodItems: activeItems.map((item) => ({
            category: item.name,
            totalQtyKg: item.qty,
            remainingQtyKg: item.qty,
            iconKey: item.iconKey,
          })),
          allergens: selectedAllergens,
        },
      });
    } catch (error: any) {
      Alert.alert('Could not create listing', error?.response?.data?.message || 'Please try again.');
    }
  };

  return (
    <Screen backgroundColor="#F2F5E9" scrollable contentStyle={styles.screenContent}>
      <View style={styles.pageWrap}>
        <View style={styles.topPanel}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={normalize(20)} color={palette.kale} />
          </Pressable>

          <Image
            source={require('../../../assets/placeholder/people_icon.png')}
            style={styles.peopleIcon}
            resizeMode="contain"
          />

          <AppText variant="h5" color={palette.black} style={styles.topTitle}>
            Surplus for people
          </AppText>
          <AppText variant="body1" color={palette.midgray} style={styles.topSubtitle}>
            Helping good food go further
          </AppText>

          <View style={styles.stepperRow}>
            {stepMeta.map((entry, index) => {
              const isActive = step === entry.id;
              const isDone = step > entry.id;

              return (
                <React.Fragment key={entry.id}>
                  <Pressable
                    onPress={() => (entry.id <= step ? setStep(entry.id) : undefined)}
                    style={[styles.stepDot, (isActive || isDone) && styles.stepDotActive]}
                  >
                    <AppText
                      variant="bodyBold"
                      color={isActive || isDone ? palette.white : palette.stone}
                      style={styles.stepDotText}
                    >
                      {entry.id}
                    </AppText>
                  </Pressable>

                  {index < stepMeta.length - 1 ? (
                    <View style={[styles.stepLine, step > entry.id && styles.stepLineActive]} />
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>

          <View style={styles.stepTitlesRow}>
            {stepMeta.map((entry) => (
              <AppText key={entry.id} variant="bodyBold" color={palette.black} style={styles.stepLabel}>
                {entry.title}
              </AppText>
            ))}
          </View>
        </View>

        {step === 1 ? (
          <View style={styles.stepWrap}>
            <View style={styles.relistCard}>
              <AppText variant="bodyBold" color={palette.midgray}>
                Same as yesterday?
              </AppText>
              <Pressable style={styles.relistBtn}>
                <AppText variant="bodyBold" color={palette.white}>
                  YES, LIST AGAIN
                </AppText>
                <Ionicons name="arrow-forward" size={normalize(16)} color={palette.white} />
              </Pressable>
            </View>

            <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
              WHAT FOOD DO YOU HAVE?
            </AppText>
            <View style={styles.card}>
              <View style={styles.kgHeaderRow}>
                <View style={styles.foodNameColumn} />
                <AppText variant="body1" color={palette.stone} style={{marginRight: wp(8)}}>
                  KG
                </AppText>
              </View>

              {items.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.foodRow}>
                  <View style={styles.foodNameWrap}>
                    <Image source={resolveFoodIconSource(item.iconKey)} style={styles.foodIcon} />
                    <AppText variant="body1" color={palette.midgray} style={styles.foodLabel}>
                      {item.name}
                    </AppText>
                  </View>

                  <View style={styles.qtyWrap}>
                    <Pressable style={styles.qtyBtn} onPress={() => updateQty(index, -0.5)}>
                      <AppText variant="bodyBold" color={palette.stone}>
                        -
                      </AppText>
                    </Pressable>

                    <AppText variant="bodyBold" color={palette.midgray} style={styles.qtyValue}>
                      {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(1)}
                    </AppText>

                    <Pressable style={styles.qtyBtn} onPress={() => updateQty(index, 0.5)}>
                      <AppText variant="bodyBold" color={palette.stone}>
                        +
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              ))}

              <View style={styles.addRow}>
                <TextInput
                  value={customItem}
                  onChangeText={setCustomItem}
                  placeholder="Add other item..."
                  placeholderTextColor={palette.stone}
                  style={styles.addInput}
                />
                <Pressable style={styles.addBtn} onPress={addCustomItem}>
                  <AppText variant="bodyBold" color={palette.white}>
                    +
                  </AppText>
                </Pressable>
              </View>
            </View>

            <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
              QUANTITY (KG)
            </AppText>
            <View style={styles.card}>
              <View style={styles.quantityPill}>
                <AppText variant="h2" color={palette.black}>
                  {totalQuantity} KG
                </AppText>
              </View>
              <AppText variant="caption" color={palette.stone} style={styles.helperText}>
                ESTIMATE TOTAL WEIGHT OF SURPLUS FOOD
              </AppText>
            </View>

            <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
              ADD PHOTO (OPTIONAL)
            </AppText>
            <View style={styles.card}>
              {images.length === 0 ? (
                <Pressable style={styles.photoPlaceholder} onPress={pickFromGallery}>
                  <AppText variant="h7" color={palette.stone}>
                    +
                  </AppText>
                </Pressable>
              ) : (
                <View style={styles.photoGrid}>
                  {images.map((uri, index) => (
                    <View key={`${uri}-${index}`} style={styles.previewItem}>
                      <Image source={{ uri }} style={styles.previewImage} />
                      <Pressable style={styles.removePhotoBtn} onPress={() => removePhoto(index)}>
                        <Ionicons name="close" size={normalize(14)} color={palette.white} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.photoStatsWrap}>
                <AppText variant="bodySmall" color={palette.stone}>
                  {images.length} photo(s) selected
                </AppText>
              </View>

              <View style={styles.photoButtonRow}>
                <Pressable style={styles.secondaryBtn} onPress={pickFromGallery}>
                  <AppText variant="bodyBold" color={palette.stone}>
                    Gallery
                  </AppText>
                </Pressable>

                <Pressable style={styles.primaryBtn} onPress={pickFromCamera}>
                  <AppText variant="bodyBold" color={palette.white}>
                    Camera
                  </AppText>
                </Pressable>
              </View>

              <AppText variant="caption" color={palette.stone} style={styles.helperText}>
                PHOTOS HELP CHARITIES PLAN COLLECTIONS
              </AppText>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.stepWrap}>
            <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
              PICKUP LOCATION
            </AppText>
            <View style={styles.card}>
              <View style={styles.locationBox}>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Enter pickup address"
                  placeholderTextColor={palette.stone}
                  style={styles.locationInput}
                />
              </View>
            </View>

            <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
              FOOD BEST BEFORE
            </AppText>
            <Pressable style={styles.selectorRow} onPress={() => openDatePicker('bestBefore')}>
              <Ionicons name="calendar-outline" size={normalize(20)} color={palette.kale} />
              <AppText variant="bodyBold" color={palette.midgray}>
                {formatDate(bestBeforeDate)}
              </AppText>
            </Pressable>

            <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
              PICKUP WINDOW
            </AppText>
            <View style={styles.windowRow}>
              <Pressable style={styles.windowBox} onPress={() => openDatePicker('from')}>
                <AppText variant="caption" color={palette.stone}>
                  FROM
                </AppText>
                <AppText variant="bodyBold" color={palette.midgray} style={styles.windowValue}>
                  {formatDateShort(pickupFromDate)}{`\n`}{formatTime(pickupFromDate)}
                </AppText>
              </Pressable>

              <Pressable style={styles.windowBox} onPress={() => openDatePicker('to')}>
                <AppText variant="caption" color={palette.stone}>
                  TO
                </AppText>
                <AppText variant="bodyBold" color={palette.midgray} style={styles.windowValue}>
                  {formatDateShort(pickupToDate)}{`\n`}{formatTime(pickupToDate)}
                </AppText>
              </Pressable>
            </View>

            <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
              STORAGE REQUIREMENTS
            </AppText>
            <View style={styles.chipRow}>
              {storageOptions.map((option) => {
                const active = storage === option.label;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => setStorage(option.label)}
                    style={[styles.choiceChip, active && styles.choiceChipActive]}
                  >
                    <Image
                      source={option.icon}
                      style={{ width: normalize(18), height: normalize(18)}}
                    />
                    <AppText variant="bodyBold" color={active ? palette.kale : palette.stone}>
                      {option.label}
                    </AppText>
                    {active ? <Ionicons name="checkmark-circle" size={normalize(15)} color={palette.kale} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
              REHEATING REQUIRED?
            </AppText>
            <View style={styles.chipRow}>
              {reheatingOptions.map((option) => {
                const active = reheating === option.label;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => setReheating(option.label)}
                    style={[styles.choiceChip, active && styles.choiceChipActive]}
                  >
                    {option.icon ? (
                      <Image
                        source={option.icon}
                        style={{ width: normalize(18), height: normalize(18) }}
                      />
                    ) : (
                      <Ionicons name={option.icon} size={normalize(18)} color={active ? palette.kale : palette.stone} />
                    )}
                    <AppText variant="bodyBold" color={active ? palette.kale : palette.stone}>
                      {option.label}
                    </AppText>
                    {active ? <Ionicons name="checkmark-circle" size={normalize(15)} color={palette.kale} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
              ALLERGENS (OPTIONAL)
            </AppText>
            <View style={styles.allergenCard}>
              <View style={styles.allergenActionsRow}>
                <Pressable style={styles.allergenActionBtn} onPress={selectAllAllergens}>
                  <AppText variant="bodyBold" color={palette.kale}>
                    Select all
                  </AppText>
                </Pressable>

                <Pressable style={styles.allergenActionBtn} onPress={clearAllergens}>
                  <AppText variant="bodyBold" color={palette.stone}>
                    Clear
                  </AppText>
                </Pressable>
              </View>

              <View style={styles.allergenChipWrap}>
                {ALLERGEN_OPTIONS.map((allergen) => {
                  const active = selectedAllergens.includes(allergen);

                  return (
                    <Pressable
                      key={allergen}
                      onPress={() => toggleAllergen(allergen)}
                      style={[styles.allergenChip, active && styles.allergenChipActive]}
                    >
                      <AppText variant="bodySmall" color={active ? palette.kale : palette.stone}>
                        {allergen}
                      </AppText>
                      {active ? <Ionicons name="checkmark-circle" size={normalize(14)} color={palette.kale} /> : null}
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.allergenSummaryRow}>
                <Image
                  source={require('../../../assets/placeholder/allergen_icon.png')}
                  style={styles.allergenSummaryIcon}
                />
                <AppText variant="bodyBold" color={palette.midgray} style={styles.allergenSummaryText}>
                  {hasSelectedAllergens ? selectedAllergens.join(', ') : 'No allergens selected'}
                </AppText>
              </View>
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.stepWrap}>
            <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
              FOOD SUMMARY
            </AppText>
            <View style={styles.card}>
              <View style={styles.summaryHeadRow}>
                <AppText variant="bodyBold" color={palette.stone}>
                  ITEM NAME
                </AppText>
                <AppText variant="bodyBold" color={palette.stone}>
                  AVAILABLE
                </AppText>
              </View>

              {(activeItems.length > 0 ? activeItems : items.slice(0, 4)).map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.summaryRow}>
                  <View style={styles.summaryItemNameWrap}>
                    <Image source={resolveFoodIconSource(item.iconKey)} style={styles.summaryFoodIcon} />
                    <AppText variant="body1" color={palette.midgray} style={styles.summaryItemNameText}>
                      {item.name}
                    </AppText>
                  </View>
                  <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryQtyText}>
                    {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(1)} kg
                  </AppText>
                </View>
              ))}

              <AppText variant="bodyBold" color={palette.midgray} style={styles.totalQtyText}>
                Total Quantity: {Math.max(totalQuantity, 0)} kg
              </AppText>
            </View>

            <AppText variant="h8" color={palette.black} style={styles.sectionTitle}>
              COLLECTION SUMMARY
            </AppText>
            <View style={styles.card}>
              <View style={styles.summaryInfoRow}>
                <Ionicons name="location-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryInfoText}>
                  {location || 'Address not provided'}
                </AppText>
              </View>

              <View style={styles.summaryInfoRow}>
                <Ionicons name="calendar-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryInfoText}>
                  Best Before - {formatDate(bestBeforeDate)}
                </AppText>
              </View>

              <View style={styles.summaryInfoRow}>
                <Ionicons name="time-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryInfoText}>
                  Pick up - {formatDateShort(pickupFromDate)} {formatTime(pickupFromDate)} to {formatDateShort(pickupToDate)} {formatTime(pickupToDate)}
                </AppText>
              </View>

              <View style={styles.summaryInfoRow}>
                <Ionicons name="snow-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryInfoText}>
                  {storage}
                </AppText>
              </View>

              <View style={styles.summaryInfoRow}>
                <Ionicons name="flame-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryInfoText}>
                  Reheating - {reheating}
                </AppText>
              </View>

              <View style={styles.summaryInfoRow}>
                <Ionicons name="alert-circle-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodyBold" color={palette.midgray} style={styles.summaryInfoText}>
                  Allergens - {hasSelectedAllergens ? selectedAllergens.join(', ') : 'None selected'}
                </AppText>
              </View>
            </View>

            <Pressable style={styles.confirmWrap} onPress={() => setConfirmedSafe((prev) => !prev)}>
              <View style={[styles.checkbox, confirmedSafe && styles.checkboxActive]}>
                {confirmedSafe ? <Ionicons name="checkmark" size={normalize(15)} color={palette.white} /> : null}
              </View>
              <AppText variant="body1" color={palette.midgray} style={styles.confirmText}>
                I confirm this food is safe for human consumption and suitable for charity donation. See Terms & Conditions
              </AppText>
            </Pressable>

            <View style={styles.impactCard}>
              <AppText variant="h8" color={palette.success}>
                Your Impact
              </AppText>
              <View style={styles.impactRow}>
                <View style={styles.impactBlock}>
                  <Ionicons name="restaurant-outline" size={normalize(18)} color={palette.success} />
                  <AppText variant="h7" color={palette.success}>
                    {Math.max(estimatedMeals, 0)}
                  </AppText>
                  <AppText variant="bodySmall" color={palette.success}>
                    meals saved
                  </AppText>
                </View>

                <View style={styles.impactBlock}>
                  <Ionicons name="leaf-outline" size={normalize(18)} color={palette.success} />
                  <AppText variant="h7" color={palette.success}>
                    {Math.max(estimatedCO2, 0)}kg
                  </AppText>
                  <AppText variant="bodySmall" color={palette.success}>
                    CO2 avoided
                  </AppText>
                </View>
              </View>
              <AppText variant="bodySmall" color={palette.success}>
                42g = 1 meal
              </AppText>
            </View>
          </View>
        ) : null}

        <Pressable style={styles.bottomButton} onPress={step === 3 ? handleCreateListing : handleContinue}>
          <AppText variant="bodyBold" color={palette.white}>
            {step === 3 ? 'CREATE CHARITY LISTING' : 'CONTINUE'}
          </AppText>
          <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} />
        </Pressable>
      </View>

      {Platform.OS === 'ios' ? (
        <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={closeIOSPicker}>
          <View style={styles.iosPickerOverlay}>
            <View style={styles.iosPickerCard}>
              <View style={styles.iosPickerActions}>
                <Pressable onPress={closeIOSPicker}>
                  <AppText variant="bodyBold" color={palette.stone}>Cancel</AppText>
                </Pressable>
                <Pressable onPress={confirmIOSPicker}>
                  <AppText variant="bodyBold" color={palette.kale}>Done</AppText>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode={pickerMode === 'datetime' ? 'datetime' : 'date'}
                display="spinner"
                onChange={onNativePickerChange}
                minimumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {Platform.OS === 'android' && pickerVisible ? (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode === 'datetime' ? 'date' : pickerMode}
          display="default"
          onChange={onNativePickerChange}
          minimumDate={new Date()}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingBottom: hp(2.2),
    backgroundColor: '#F2F5E9',
  },
  pageWrap: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: normalize(560),
    paddingHorizontal: wp(4.2),
    paddingTop: hp(1.2),
  },
  topPanel: {
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    borderWidth: normalize(1.5),
    borderColor: '#B8C6B1',
    backgroundColor: '#F8FBF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.3),
  },
  peopleIcon: {
    width: wp(15),
    height: hp(7.5),
    marginBottom: hp(0.4),
  },
  topTitle: {
    textAlign: 'center',
    textTransform: 'none',
  },
  topSubtitle: {
    marginTop: hp(0.2),
    textAlign: 'center',
  },
  stepperRow: {
    marginTop: hp(1.1),
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: wp(7.2),
    height: wp(7.2),
    borderRadius: wp(3.6),
    borderWidth: normalize(2),
    borderColor: '#8D8D8D',
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: palette.kale,
    borderColor: palette.kale,
  },
  stepDotText: {
    fontSize: normalize(12),
    lineHeight: normalize(13),
  },
  stepLine: {
    width: wp(17.5),
    height: normalize(3),
    borderRadius: normalize(2),
    backgroundColor: '#8D8D8D',
  },
  stepLineActive: {
    backgroundColor: palette.kale,
  },
  stepTitlesRow: {
    marginTop: hp(0.5),
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  stepLabel: {
    textAlign: 'center',
    width: '32%',
    fontSize: normalize(12),
    lineHeight: normalize(13),
  },
  stepWrap: {
    marginTop: hp(1.2),
    gap: hp(0.9),
  },
  relistCard: {
    borderWidth: normalize(2),
    borderColor: palette.kale,
    backgroundColor: '#F0F5E8',
    borderRadius: normalize(12),
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    alignItems: 'center',
    gap: hp(0.8),
  },
  relistBtn: {
    width: '100%',
    minHeight: hp(4.4),
    borderRadius: normalize(8),
    backgroundColor: palette.kale,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
  },
  sectionTitle: {
    marginTop: hp(0.2),
  },
  card: {
    borderWidth: normalize(2),
    borderColor: '#D9D9D9',
    borderRadius: normalize(14),
    backgroundColor: '#F8F8F6',
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    gap: hp(0.8),
  },
  kgHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodNameColumn: {
    flex: 1,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foodNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  foodLabel: {
    marginLeft: wp(2),
    textTransform: 'none',
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.8),
  },
  foodIcon: {
    width: normalize(22),
    height: normalize(22),
  },
  qtyBtn: {
    width: wp(6.5),
    height: wp(6.5),
    borderRadius: normalize(8),
    backgroundColor: '#E6E2F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    minWidth: wp(5),
    textAlign: 'center',
  },
  addRow: {
    marginTop: hp(0.4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  addInput: {
    flex: 1,
    borderWidth: normalize(1.5),
    borderColor: '#9FA7A0',
    borderRadius: normalize(8),
    backgroundColor: palette.white,
    minHeight: hp(4.4),
    paddingHorizontal: wp(3),
    color: palette.midgray,
    fontSize: normalize(14),
    fontFamily: 'Saveful-Regular',
  },
  addBtn: {
    width: wp(8),
    height: wp(8),
    borderRadius: normalize(7),
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityPill: {
    borderRadius: normalize(12),
    minHeight: hp(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    textAlign: 'left',
  },
  photoPlaceholder: {
    width: wp(16),
    height: wp(16),
    borderRadius: normalize(10),
    borderWidth: normalize(1.5),
    borderStyle: 'dashed',
    borderColor: '#9FA7A0',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2.5),
  },
  previewItem: {
    width: wp(20),
    height: wp(20),
    borderRadius: normalize(10),
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    right: wp(1),
    top: wp(1),
    width: normalize(18),
    height: normalize(18),
    borderRadius: normalize(9),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  photoStatsWrap: {
    flex: 1,
  },
  photoButtonRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  secondaryBtn: {
    flex: 1,
    minHeight: hp(4.3),
    borderRadius: normalize(10),
    borderWidth: normalize(1),
    borderColor: '#C9C9C9',
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flex: 1,
    minHeight: hp(4.3),
    borderRadius: normalize(10),
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    marginTop: hp(0.5),
    textTransform: 'none',
  },
  locationBox: {
    borderRadius: normalize(12),
    borderWidth: normalize(1),
    borderColor: '#D9D9D9',
    backgroundColor: palette.creme,
    minHeight: hp(6),
    justifyContent: 'center',
  },
  locationInput: {
    paddingHorizontal: wp(3),
    color: palette.midgray,
    fontSize: normalize(14),
    fontFamily: 'Saveful-Regular',
  },
  selectorRow: {
    minHeight: hp(5.2),
    borderRadius: normalize(10),
    borderWidth: normalize(1),
    borderColor: '#DADCD0',
    backgroundColor: palette.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.2),
    paddingHorizontal: wp(3),
  },
  windowRow: {
    flexDirection: 'row',
    gap: wp(3),
  },
  windowBox: {
    flex: 1,
    minHeight: hp(6.8),
    borderRadius: normalize(10),
    borderWidth: normalize(1),
    borderColor: '#DADCD0',
    backgroundColor: '#ECEDEA',
    paddingHorizontal: wp(3),
    justifyContent: 'center',
  },
  windowValue: {
    marginTop: hp(0.3),
    textTransform: 'none',
  },
  chipRow: {
    flexDirection: 'row',
    gap: wp(2.2),
  },
  allergenCard: {
    borderWidth: normalize(1),
    borderColor: '#DADCD0',
    borderRadius: normalize(12),
    backgroundColor: palette.white,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: hp(0.8),
  },
  allergenActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  allergenActionBtn: {
    paddingVertical: hp(0.4),
    paddingHorizontal: wp(2.5),
    borderRadius: normalize(999),
    backgroundColor: '#F4F4EE',
  },
  allergenChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  allergenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.4),
    paddingHorizontal: wp(2.8),
    paddingVertical: hp(0.6),
    borderRadius: normalize(999),
    backgroundColor: '#F4F4EE',
    borderWidth: normalize(1),
    borderColor: '#C7CDBF',
  },
  allergenChipActive: {
    borderColor: '#8CBD97',
    backgroundColor: '#ECF5E9',
  },
  allergenSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  allergenSummaryIcon: {
    width: normalize(20),
    height: normalize(20),
  },
  allergenSummaryText: {
    flex: 1,
    textTransform: 'none',
  },
  choiceChip: {
    flex: 1,
    minHeight: hp(6.2),
    borderRadius: normalize(10),
    borderWidth: normalize(1),
    borderColor: '#C7CDBF',
    backgroundColor: '#F4F4EE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: hp(0.3),
  },
  choiceChipActive: {
    borderColor: '#8CBD97',
    backgroundColor: '#ECF5E9',
  },
  summaryHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: normalize(1),
    borderBottomColor: '#D6D9CE',
    paddingBottom: hp(0.4),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(0.2),
  },
  summaryItemNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.8),
    flex: 1,
    minWidth: 0,
  },
  summaryItemNameText: {
    flexShrink: 1,
    textTransform: 'none',
  },
  summaryFoodIcon: {
    width: normalize(16),
    height: normalize(16),
  },
  summaryQtyText: {
    marginLeft: wp(2),
    minWidth: wp(16),
    textAlign: 'right',
  },
  totalQtyText: {
    marginTop: hp(0.6),
  },
  summaryInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.2),
  },
  summaryInfoText: {
    flex: 1,
    textTransform: 'none',
  },
  confirmWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: normalize(1.5),
    borderColor: '#B2C4A9',
    borderRadius: normalize(12),
    backgroundColor: '#F3F5EE',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: wp(2.5),
  },
  checkbox: {
    marginTop: hp(0.1),
    width: wp(6.3),
    height: wp(6.3),
    borderRadius: normalize(6),
    borderWidth: normalize(2),
    borderColor: '#6B8C66',
    backgroundColor: '#F3F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: palette.kale,
  },
  confirmText: {
    flex: 1,
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  impactCard: {
    borderWidth: normalize(1.5),
    borderColor: '#C1D5BF',
    borderRadius: normalize(14),
    backgroundColor: '#E9F4E5',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    gap: hp(0.8),
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(4),
  },
  impactBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.4),
  },
  bottomButton: {
    marginTop: hp(1.6),
    minHeight: hp(5.2),
    borderRadius: normalize(10),
    backgroundColor: palette.kale,
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2.5),
  },
  iosPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  iosPickerCard: {
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(14),
    borderTopRightRadius: normalize(14),
    paddingBottom: hp(1),
  },
  iosPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.2),
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
});
