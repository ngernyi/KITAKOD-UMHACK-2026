import { createContext, useContext, useState, useEffect } from 'react';
import { healthCheck } from '../services/api';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [businessType, setBusinessType] = useState('mini-market');
  
  // Internal Data - Tiered
  const [internalData, setInternalData] = useState({
    // Basic
    sales: [],
    expenses: [],
    // Intermediate
    products: [],
    inventory: [],
    customers: [],
    // Advanced
    staff: [],
    suppliers: [],
    marketing: [],
    pricingHistory: []
  });

  // External Data - Tiered
  const [externalData, setExternalData] = useState({
    // Basic (auto-fetch)
    holidays: [],
    schoolHolidays: [],
    // Intermediate (auto-fetch)
    googleTrends: [],
    weather: [],
    industryBenchmarks: {},
    // Advanced (manual/config)
    competitor: [],
    economic: {},
    customApi: []
  });

  // Configuration
  const [config, setConfig] = useState({
    businessType: 'mini-market',
    externalApis: {
      googleTrends: true,
      weather: true,
      schoolHolidays: true,
      publicHolidays: true,
      economicIndicators: false,
      industryBenchmarks: false
    },
    forecastDays: 7,
    currency: 'RM'
  });

  // Output Categories
  const [analysisResults, setAnalysisResults] = useState({
    dataAnalysis: null,
    predictions: null,
    actions: null,
    aiAssumptions: null
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    healthCheck()
      .then(data => setBackendStatus(data.status))
      .catch(() => setBackendStatus('offline'));
  }, []);

  const value = {
    backendStatus,
    businessType,
    setBusinessType,
    internalData,
    setInternalData,
    externalData,
    setExternalData,
    config,
    setConfig,
    analysisResults,
    setAnalysisResults,
    isLoading,
    setIsLoading
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};