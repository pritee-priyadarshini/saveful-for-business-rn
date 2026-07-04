import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from './AppText';
import { palette } from '../theme/colors';

const { width } = Dimensions.get('window');
const normalize = (size: number) => Math.round(size * (width / 375));

export type PlaceSelection = {
  latitude: number;
  longitude: number;
  address: string;
  postcode?: string;
};

type Suggestion = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  postcode?: string;
};

type Props = {
  placeholder?: string;
  autoFocus?: boolean;
  onPlaceSelected: (place: PlaceSelection) => void;
};

async function fetchOsmSuggestions(query: string): Promise<Suggestion[]> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SavefulForBusiness/1.0 (contact@saveful.com)',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('OpenStreetMap search failed');
  }

  const json = await response.json();

  return (json ?? []).map(
    (item: {
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      address?: { postcode?: string };
    }) => ({
      id: `osm-${item.place_id}`,
      label: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      postcode: item.address?.postcode,
    }),
  );
}

export function PlacesSearchInput({
  placeholder = 'Search address or place...',
  autoFocus = false,
  onPlaceSelected,
}: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runSearch = (text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSearchError(null);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setSearchError(null);

      try {
        const results = await fetchOsmSuggestions(trimmed);
        if (requestId !== requestIdRef.current) return;

        setSuggestions(results);
        setSearchError(results.length === 0 ? 'No places found. Try a different search.' : null);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setSuggestions([]);
        setSearchError('Could not load place suggestions. Check your internet connection.');
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 300);
  };

  const handleSelect = (item: Suggestion) => {
    setQuery(item.label);
    setSuggestions([]);
    setSearchError(null);
    onPlaceSelected({
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.label,
      postcode: item.postcode,
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.inputRow, searchError && !suggestions.length ? styles.inputRowError : null]}>
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            runSearch(text);
          }}
          placeholder={placeholder}
          placeholderTextColor={palette.stone}
          autoFocus={autoFocus}
          returnKeyType="search"
          style={styles.input}
        />
        {loading ? <ActivityIndicator size="small" color={palette.primary} style={styles.spinner} /> : null}
      </View>

      {searchError && !suggestions.length ? (
        <AppText style={styles.errorText}>{searchError}</AppText>
      ) : null}

      {suggestions.length > 0 ? (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="always"
          style={styles.list}
          nestedScrollEnabled
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => handleSelect(item)}>
              <AppText style={styles.rowText} numberOfLines={2}>
                {item.label}
              </AppText>
            </Pressable>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 1000,
    elevation: 1000,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    minHeight: normalize(46),
    paddingHorizontal: normalize(12),
  },
  inputRowError: {
    borderColor: palette.danger,
  },
  input: {
    flex: 1,
    color: palette.text,
    fontSize: normalize(14),
    paddingVertical: normalize(10),
  },
  spinner: {
    marginLeft: normalize(8),
  },
  errorText: {
    marginTop: normalize(8),
    color: palette.danger,
    fontSize: normalize(12),
    lineHeight: normalize(17),
  },
  list: {
    marginTop: normalize(4),
    maxHeight: normalize(180),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    zIndex: 1001,
    elevation: 1001,
  },
  row: {
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(12),
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  rowText: {
    fontSize: normalize(13),
    color: palette.text,
    lineHeight: normalize(18),
  },
});
