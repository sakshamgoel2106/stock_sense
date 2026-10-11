import React, { createContext, useContext, useState, useEffect } from 'react';
import { MNC_COUNTRIES, GLOBAL_COUNTRY, getCountryByCode } from '../lib/countries';
import { useAuth } from './AuthContext';

const CountryContext = createContext();

export const CountryProvider = ({ children }) => {
  const { company } = useAuth();
  
  const [selectedCountry, setSelectedCountryState] = useState(() => {
    try {
      return localStorage.getItem('stock_sense_active_country') || 'ALL';
    } catch {
      return 'ALL';
    }
  });

  const changeCountry = (countryCode) => {
    const code = countryCode ? countryCode.toUpperCase() : 'ALL';
    setSelectedCountryState(code);
    try {
      localStorage.setItem('stock_sense_active_country', code);
    } catch (e) {
      console.error('Failed to save selected country to localStorage', e);
    }
  };

  const countryMeta = selectedCountry === 'ALL' ? GLOBAL_COUNTRY : getCountryByCode(selectedCountry);

  // If company configured operating countries, highlight those
  const configuredCodes = company?.operatingCountries?.map(c => c.countryCode?.toUpperCase()) || [];
  
  const availableCountries = [
    GLOBAL_COUNTRY,
    ...MNC_COUNTRIES.map(c => ({
      ...c,
      isConfigured: configuredCodes.length === 0 || configuredCodes.includes(c.code)
    }))
  ];

  const isCountryMatch = (itemCountryCode) => {
    if (!selectedCountry || selectedCountry === 'ALL') return true;
    if (!itemCountryCode) return selectedCountry === 'IN'; // fallback for legacy items without countryCode
    return itemCountryCode.toUpperCase() === selectedCountry.toUpperCase();
  };

  return (
    <CountryContext.Provider value={{
      selectedCountry,
      setSelectedCountry: changeCountry,
      changeCountry,
      countryMeta,
      availableCountries,
      isCountryMatch,
      isMNC: company?.isMNC ?? true
    }}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};
