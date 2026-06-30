export function mapRole(role: string) {
  const map: Record<string, string> = {
    restaurant_single: 'BUSINESS_SINGLE',
    restaurant_multi: 'BUSINESS_MULTI',
    charity_single: 'CHARITY_SINGLE',
    charity_multi: 'CHARITY_MULTI',
    farm_business: 'FARMER_PRODUCER',
  };

  return map[role];
}