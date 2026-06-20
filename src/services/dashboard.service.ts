import api from './api';

export type BusinessImpact = {
  kgSaved: number;
  charitiesSupported: number;
  collectionsCompleted: number;
  co2SavedKg: number;
  moneySaved: number;
  currency: string;
};

export const dashboardService = {
  getBusinessImpact() {
    return api.get<BusinessImpact>('/dashboard/business-impact');
  },
};