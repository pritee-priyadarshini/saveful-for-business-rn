import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  ImageStyle,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { palette } from '../theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2;

type Props = {
  photos?: string[] | null;
  /** Thumbnail size/shape — defaults to a 28% width square. */
  thumbnailStyle?: StyleProp<ImageStyle>;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/** Horizontal thumbnails that open a full-screen, zoomable viewer on tap. */
export function ListingPhotoGallery({
  photos,
  thumbnailStyle,
  style,
  contentContainerStyle,
}: Props) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const items = (photos ?? []).filter(Boolean);

  if (!items.length) return null;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={style}
        contentContainerStyle={contentContainerStyle}
      >
        {items.map((uri, index) => (
          <Pressable
            key={`${uri}-${index}`}
            onPress={() => setViewerIndex(index)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`View photo ${index + 1} of ${items.length}`}
          >
            <Image source={{ uri }} style={[styles.thumbnail, thumbnailStyle]} />
          </Pressable>
        ))}
      </ScrollView>

      <PhotoViewerModal
        photos={items}
        initialIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </>
  );
}

function PhotoViewerModal({
  photos,
  initialIndex,
  onClose,
}: {
  photos: string[];
  initialIndex: number | null;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(initialIndex ?? 0);
  const [zoomed, setZoomed] = useState(false);
  const visible = initialIndex != null;

  useEffect(() => {
    if (initialIndex == null) return;
    setActiveIndex(initialIndex);
    setZoomed(false);
  }, [initialIndex]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.viewerRoot}>
        <View style={styles.viewerBackdrop}>
          <Pressable
            style={styles.viewerClose}
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Ionicons name="close" size={normalize(26)} color={palette.white} />
          </Pressable>

          {visible ? (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              // Panning a zoomed photo must not swipe to the next one.
              scrollEnabled={!zoomed}
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialIndex ?? 0}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              onMomentumScrollEnd={(event) =>
                setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width))
              }
              keyExtractor={(uri, index) => `${uri}-${index}`}
              renderItem={({ item }) => (
                <ZoomablePhoto
                  uri={item}
                  width={width}
                  height={height}
                  onZoomChange={setZoomed}
                  onClose={onClose}
                />
              )}
            />
          ) : null}

          {photos.length > 1 ? (
            <AppText variant="bodySmall" style={styles.viewerCounter}>
              {activeIndex + 1} / {photos.length}
            </AppText>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** Pinch / double-tap to zoom, drag to pan while zoomed, tap to close. */
function ZoomablePhoto({
  uri,
  width,
  height,
  onZoomChange,
  onClose,
}: {
  uri: string;
  width: number;
  height: number;
  onZoomChange: (zoomed: boolean) => void;
  onClose: () => void;
}) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      uri,
      (w, h) => {
        if (!cancelled) setNaturalSize({ width: w, height: h });
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  // Fit the photo inside the screen so it stays fully visible and centred.
  const fitScale = naturalSize
    ? Math.min(width / naturalSize.width, height / naturalSize.height)
    : 1;
  const displayWidth = naturalSize ? naturalSize.width * fitScale : width;
  const displayHeight = naturalSize ? naturalSize.height * fitScale : height;

  const maxOffsetX = (nextScale: number) => {
    'worklet';
    return Math.max(0, (displayWidth * nextScale - width) / 2);
  };

  const maxOffsetY = (nextScale: number) => {
    'worklet';
    return Math.max(0, (displayHeight * nextScale - height) / 2);
  };

  const clampOffsets = (nextScale: number) => {
    'worklet';
    translateX.value = clamp(translateX.value, -maxOffsetX(nextScale), maxOffsetX(nextScale));
    translateY.value = clamp(translateY.value, -maxOffsetY(nextScale), maxOffsetY(nextScale));
  };

  const resetZoom = () => {
    'worklet';
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    runOnJS(onZoomChange)(false);
  };

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = clamp(startScale.value * event.scale, 0.9, MAX_ZOOM);
      clampOffsets(scale.value);
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        resetZoom();
      } else {
        runOnJS(onZoomChange)(true);
      }
    });

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      translateX.value = clamp(
        startX.value + event.translationX,
        -maxOffsetX(scale.value),
        maxOffsetX(scale.value),
      );
      translateY.value = clamp(
        startY.value + event.translationY,
        -maxOffsetY(scale.value),
        maxOffsetY(scale.value),
      );
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        resetZoom();
        return;
      }
      scale.value = withTiming(DOUBLE_TAP_ZOOM);
      runOnJS(onZoomChange)(true);
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (scale.value > 1) {
        resetZoom();
        return;
      }
      runOnJS(onClose)();
    });

  const gesture = Gesture.Race(
    Gesture.Simultaneous(pinch, pan),
    Gesture.Exclusive(doubleTap, singleTap),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.page, { width, height }]}>
        <Animated.Image
          source={{ uri }}
          style={[{ width: displayWidth, height: displayHeight }, animatedStyle]}
          resizeMode="contain"
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: wp(28),
    height: wp(28),
    borderRadius: normalize(12),
    marginRight: wp(2),
  },
  viewerRoot: {
    flex: 1,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: hp(6),
    right: wp(5),
    zIndex: 2,
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  viewerCounter: {
    position: 'absolute',
    bottom: hp(5),
    alignSelf: 'center',
    color: palette.white,
  },
});
