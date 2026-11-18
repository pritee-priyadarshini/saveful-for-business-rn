import { CommonActions, type NavigationProp, type ParamListBase } from '@react-navigation/native';

type AnyNavigation = Pick<NavigationProp<ParamListBase>, 'dispatch' | 'getParent'> & {
  popToTop?: () => void;
  getState?: () => { index?: number } | undefined;
};

/** Walks up to the root navigator (the one that owns the MakeFoodCount screen). */
function getRootNavigation(navigation: AnyNavigation): AnyNavigation {
  let current: AnyNavigation = navigation;
  // getParent() returns undefined at the root.
  for (let depth = 0; depth < 8; depth += 1) {
    const parent = current.getParent?.();
    if (!parent) break;
    current = parent as AnyNavigation;
  }
  return current;
}

/**
 * Opens MakeFoodCount → MfcSummary from anywhere (e.g. CreateListing inside RestaurantStack → Tabs → Listings).
 * The root navigator still holds the MakeFoodCount screen underneath, so this pops back to it and
 * the nested stack goes to MfcSummary (its existing instance, with the open record still in the store).
 * `notice` is shown once as a Notice on the Summary ("Listed 7 kg for people").
 */
export function navigateToMfcSummary(navigation: AnyNavigation, options?: { notice?: string }) {
  const root = getRootNavigation(navigation);
  // Close the listing form first, so the Listings tab is back on its list instead of a submitted form.
  if ((navigation.getState?.()?.index ?? 0) > 0) navigation.popToTop?.();
  root.dispatch(
    CommonActions.navigate({
      name: 'MakeFoodCount',
      params: {
        screen: 'MfcSummary',
        params: options?.notice ? { notice: options.notice } : undefined,
      },
    }),
  );
}
