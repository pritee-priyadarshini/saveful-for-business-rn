import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { OSM_MAP_HTML } from '../utils/osmMapHtml';

export type OsmMapCoordinate = {
  latitude: number;
  longitude: number;
};

type Props = {
  style?: StyleProp<ViewStyle>;
  marker?: OsmMapCoordinate | null;
  markers?: OsmMapCoordinate[];
  polyline?: OsmMapCoordinate[];
  selectable?: boolean;
  active?: boolean;
  initialCenter?: OsmMapCoordinate;
  initialZoom?: number;
  onLocationSelect?: (latitude: number, longitude: number) => void;
};

const DEFAULT_CENTER = { latitude: 20.2961, longitude: 85.8245 };

export function OsmMapView({
  style,
  marker = null,
  markers = [],
  polyline = [],
  selectable = false,
  active = true,
  initialCenter = DEFAULT_CENTER,
  initialZoom = 13,
  onLocationSelect,
}: Props) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  const postMessage = useCallback((payload: Record<string, unknown>) => {
    const script = `window.handleRnMessage(${JSON.stringify(payload)}); true;`;
    webRef.current?.injectJavaScript(script);
  }, []);

  const syncMapState = useCallback(() => {
    if (!readyRef.current) return;

    if (markers.length > 0) {
      postMessage({
        type: 'setMarkers',
        markers: markers.map((item) => ({
          lat: item.latitude,
          lng: item.longitude,
        })),
      });
      if (polyline.length > 0) {
        postMessage({
          type: 'setPolyline',
          points: polyline.map((item) => ({
            lat: item.latitude,
            lng: item.longitude,
          })),
        });
      }
      return;
    }

    if (marker) {
      postMessage({
        type: 'setMarker',
        lat: marker.latitude,
        lng: marker.longitude,
        fly: true,
      });
    }

    if (polyline.length > 0) {
      postMessage({
        type: 'setPolyline',
        points: polyline.map((item) => ({
          lat: item.latitude,
          lng: item.longitude,
        })),
      });
    }
  }, [marker, markers, polyline, postMessage]);

  useEffect(() => {
    syncMapState();
  }, [syncMapState]);

  useEffect(() => {
    if (!active || !readyRef.current) return;

    const timer = setTimeout(() => {
      postMessage({ type: 'invalidate' });
      syncMapState();
    }, 350);

    return () => clearTimeout(timer);
  }, [active, postMessage, syncMapState]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'ready') {
        readyRef.current = true;
        postMessage({
          type: 'init',
          selectable,
          lat: marker?.latitude ?? initialCenter.latitude,
          lng: marker?.longitude ?? initialCenter.longitude,
          zoom: initialZoom,
        });
        syncMapState();
        return;
      }

      if (data.type === 'locationSelected') {
        onLocationSelect?.(data.latitude, data.longitude);
      }
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <View
      style={[styles.container, style]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
    >
      <WebView
        ref={webRef}
        source={{ html: OSM_MAP_HTML }}
        onMessage={handleMessage}
        onLoadEnd={() => {
          postMessage({ type: 'invalidate' });
        }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        scrollEnabled={false}
        nestedScrollEnabled
        bounces={false}
        overScrollMode="never"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
