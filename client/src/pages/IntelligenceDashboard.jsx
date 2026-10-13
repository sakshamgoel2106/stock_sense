import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, CheckCircle, TrendingUp, ArrowRightLeft, 
  Brain, ShieldAlert, DollarSign, Clock, RefreshCw, ChevronDown, 
  ChevronUp, HelpCircle, Send, Play, Sparkles, Filter, PackageCheck,
  Building2, Layers, AlertCircle, ArrowUpRight, Search, Zap,
  SlidersHorizontal, Info
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import api from '../lib/api';
import toast from 'react-hot-toast';
import FeatureGuide from '../components/FeatureGuide';

const IntelligenceDashboard = () => {
  const [activeTab, setActiveTab] = useState('replenishment');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [showGlossary, setShowGlossary] = useState(false);

  const [overview, setOverview] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('URGENCY');
  const [expandedRecId, setExpandedRecId] = useState(null);

  // Simulator State
  const [simProduct, setSimProduct] = useState('');
  const [simWarehouse, setSimWarehouse] = useState('');
  const [simHorizon, setSimHorizon] = useState(14);
  const [simCustomQty, setSimCustomQty] = useState('');
  const [simData, setSimData] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Forecast Deep-Dive State
  const [forecastProduct, setForecastProduct] = useState('');
  const [forecastWarehouse, setForecastWarehouse] = useState('');
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Copilot State
  const [copilotMessages, setCopilotMessages] = useState([
    {
      sender: 'ai',
      text: "👋 Hello! I am your StockSense AI Inventory Copilot. I analyze real-time multi-warehouse positions, demand forecasting, stock aging, and transfer feasibility. How can I assist you today?"
    }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Load data with optional fast force-refresh
  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = forceRefresh ? { refresh: 'true' } : {};
      const [overviewRes, recsRes, transfersRes, whRes] = await Promise.all([
        api.get('/intelligence/overview', { params }),
        api.get('/intelligence/recommendations', { params }),
        api.get('/intelligence/transfers', { params }),
        api.get('/warehouses')
      ]);

      setOverview(overviewRes.data);
      setRecommendations(recsRes.data);
      setTransfers(transfersRes.data);
      setWarehouses(whRes.data);

      if (overviewRes.data?.meta) {
        setCacheInfo({
          fromCache: overviewRes.data.meta.fromCache,
          cachedAt: overviewRes.data.meta.cachedAt,
          fetchedAt: Date.now()
        });
      } else {
        setCacheInfo({
          fromCache: false,
          cachedAt: Date.now(),
          fetchedAt: Date.now()
        });
      }

      if (recsRes.data.length > 0 && !simProduct) {
        setSimProduct(recsRes.data[0].product._id);
        setSimWarehouse(recsRes.data[0].warehouse._id);
        setForecastProduct(recsRes.data[0].product._id);
        setForecastWarehouse(recsRes.data[0].warehouse._id);
      }

      if (forceRefresh) {
        toast.success('⚡ AI Intelligence telemetry reloaded fresh!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load inventory intelligence data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Run Simulation
  const handleRunSimulation = async () => {
    if (!simProduct || !simWarehouse) return;
    try {
      setSimLoading(true);
      const res = await api.post('/intelligence/simulate', {
        productId: simProduct,
        warehouseId: simWarehouse,
        horizonDays: simHorizon,
        customQuantity: simCustomQty ? parseInt(simCustomQty) : null
      });
      setSimData(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Simulation failed');
    } finally {
      setSimLoading(false);
    }
  };

  // Run Forecast Deep-Dive
  const handleLoadForecast = async (productId, warehouseId) => {
    if (!productId) return;
    try {
      setForecastLoading(true);
      const res = await api.get(`/intelligence/forecast/${productId}`, {
        params: { warehouseId: warehouseId || undefined }
      });
      setForecastData(res.data.forecast);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load forecast deep-dive');
    } finally {
      setForecastLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'simulation' && !simData && simProduct && simWarehouse) {
      handleRunSimulation();
    }
    if (activeTab === 'forecast' && !forecastData && forecastProduct) {
      handleLoadForecast(forecastProduct, forecastWarehouse);
    }
  }, [activeTab]);

  // Handle Propose Transfer
  const handleProposeTransfer = async (option) => {
    try {
      await api.post('/intelligence/transfers/propose', {
        productId: option.product._id,
        sourceWarehouseId: option.sourceWarehouse._id,
        destinationWarehouseId: option.destinationWarehouse._id,
        quantity: option.recommendedTransferQty,
        reason: option.recommendationReason
      });
      toast.success('Transfer proposal submitted for Admin / Manager Approval!');
      fetchData(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit transfer proposal');
    }
  };

  // Handle Copilot Message
  const handleSendCopilot = async (presetText) => {
    const text = presetText || copilotInput;
    if (!text.trim()) return;

    const newMsgs = [...copilotMessages, { sender: 'user', text }];
    setCopilotMessages(newMsgs);
    if (!presetText) setCopilotInput('');
    setCopilotLoading(true);

    try {
      const res = await api.post('/intelligence/copilot/chat', { message: text });
      setCopilotMessages([
        ...newMsgs,
        {
          sender: 'ai',
          text: res.data.reply,
          provider: res.data.provider,
          tools: res.data.toolsUsed
        }
      ]);
    } catch (err) {
      setCopilotMessages([
        ...newMsgs,
        {
          sender: 'ai',
          text: '⚠️ Unable to process query. Please check network connection and try again.'
        }
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Filter and sort recommendations
  const filteredRecs = useMemo(() => {
    let result = recommendations.filter(rec => {
      if (selectedWarehouse && rec.warehouse._id !== selectedWarehouse) return false;
      if (selectedCategory !== 'ALL' && rec.riskCategory !== selectedCategory) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = (rec.product.name || '').toLowerCase();
        const pSku = (rec.product.sku || '').toLowerCase();
        const pCat = (rec.product.category || '').toLowerCase();
        const wName = (rec.warehouse.name || '').toLowerCase();
        return pName.includes(q) || pSku.includes(q) || pCat.includes(q) || wName.includes(q);
      }
      return true;
    });

    if (sortBy === 'LOW_RUNWAY') {
      result.sort((a, b) => (a.metrics.daysUntilStockout ?? 999) - (b.metrics.daysUntilStockout ?? 999));
    } else if (sortBy === 'HIGH_VALUE') {
      result.sort((a, b) => (b.metrics.estimatedFinancialImpact || 0) - (a.metrics.estimatedFinancialImpact || 0));
    } else if (sortBy === 'HIGH_STOCK') {
      result.sort((a, b) => (b.metrics.availableToPromise || 0) - (a.metrics.availableToPromise || 0));
    }

    return result;
  }, [recommendations, selectedWarehouse, selectedCategory, searchQuery, sortBy]);

  const getRiskBadge = (category) => {
    switch (category) {
      case 'CRITICAL':
        return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-2xs"><AlertTriangle size={12} /> Critical Shortage</span>;
      case 'HIGH_RISK':
        return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-2xs"><AlertCircle size={12} /> High Risk</span>;
      case 'REORDER_SOON':
        return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-2xs"><Clock size={12} /> Reorder Soon</span>;
      case 'EXCESS':
        return <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-2xs"><Layers size={12} /> Excess Stock</span>;
      case 'INSUFFICIENT_DATA':
        return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-2xs"><HelpCircle size={12} /> Low Data</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-2xs"><CheckCircle size={12} /> Healthy</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20">
                <Brain size={26} />
              </div>
              StockSense AI Intelligence
            </h1>
            <span className="bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} /> Decision Engine
            </span>
            {cacheInfo && (
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                cacheInfo.fromCache 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`} title={cacheInfo.fromCache ? "Loaded instantly from in-memory pre-computed cache" : "Freshly computed from database"}>
                <Zap size={11} className={cacheInfo.fromCache ? "text-emerald-600" : "text-indigo-600"} />
                {cacheInfo.fromCache ? 'Instant Cache (<100ms)' : 'Fresh Real-time Run'}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
            Predict shortages, prevent stockouts with explainable mathematical formulas, optimize inter-warehouse transfers, and test demand spikes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <FeatureGuide
            title="AI Inventory Intelligence Suite"
            subtitle="Explainable replenishment, transfer optimizer & what-if simulator"
            category="AI Supply Chain"
            whatItIs="StockSense's advanced machine learning intelligence layer. Features 5 integrated modules: Explainable Replenishment, Inter-Warehouse Transfer Optimizer, Monte Carlo What-If Simulation, Forecast Backtesting, and Natural Language Tool-Grounded Copilot."
            whyItMatters="Replaces static minimum/maximum spreadsheets with predictive demand awareness. Explains WHY each replenishment is recommended and how much working capital is saved by transferring from another Indian hub."
            howToUse={[
              "Review the top KPI cards: Critical Risks, Avoidable Purchases, and Capital Saved.",
              "Tab 1 (Replenishment): View mathematical formulas behind each reorder.",
              "Tab 2 (Transfer Optimizer): Authorize domestic stock movements.",
              "Tab 3 (Simulator): Test different demand spikes before placing supplier orders."
            ]}
            proTip="Our Transfer Optimizer safeguards the source warehouse's own safety stock before allowing any units to be relocated."
          />

          <button
            onClick={() => setShowGlossary(!showGlossary)}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            title="Learn how replenishment metrics and terms work"
          >
            <Info size={14} className="text-indigo-600" />
            {showGlossary ? 'Hide Guide' : 'Beginner Guide'}
          </button>

          <button 
            onClick={() => fetchData(true)} 
            disabled={loading || refreshing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50"
            title="Force a fresh re-computation of stock analytics across all warehouses"
          >
            <RefreshCw size={15} className={loading || refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Recomputing...' : 'Fast Reload'}
          </button>
        </div>
      </div>

      {/* Expandable Beginner's Guide & Plain English Glossary */}
      {showGlossary && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-5 rounded-3xl shadow-xl border border-indigo-700/50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/10">
                <Sparkles size={16} className="text-indigo-300" />
              </div>
              <h3 className="font-extrabold text-sm tracking-tight text-white">How AI Replenishment Works (Plain-English Explanations)</h3>
            </div>
            <button 
              onClick={() => setShowGlossary(false)}
              className="text-indigo-200 hover:text-white text-xs font-bold"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="font-black text-amber-300 block mb-1">🚗 Stock Runway (Days)</span>
              <p className="text-indigo-100 leading-relaxed text-[11px]">
                Like your fuel gauge. It tells you exactly how many days of stock remain at current customer consumption rates before your warehouse shelves are empty.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="font-black text-emerald-300 block mb-1">⏱️ Supplier Lead Time</span>
              <p className="text-indigo-100 leading-relaxed text-[11px]">
                How long external vendors take to deliver fresh inventory. If your Runway is 2 days but supplier takes 5 days, you face an unavoidable 3-day stockout unless you transfer!
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="font-black text-sky-300 block mb-1">📍 Reorder Point</span>
              <p className="text-indigo-100 leading-relaxed text-[11px]">
                The optimal trigger level: Lead Time Demand + Safety Buffer. When available stock drops below this number, you must place an order immediately.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="font-black text-purple-300 block mb-1">🔄 Inter-Hub Transfer</span>
              <p className="text-indigo-100 leading-relaxed text-[11px]">
                Instead of spending cash with external suppliers, the system finds sibling warehouses with surplus stock and proposes quick inter-facility transfers to save capital.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-red-600 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Critical Risks</span>
              <ShieldAlert size={18} />
            </div>
            <p className="text-2xl font-black text-red-600">{overview.kpis.criticalCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Stockout before vendor PO</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">High Risk SKUs</span>
              <AlertTriangle size={18} />
            </div>
            <p className="text-2xl font-black text-amber-600">{overview.kpis.highRiskCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">At or near reorder point</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Value At Risk</span>
              <DollarSign size={18} />
            </div>
            <p className="text-2xl font-black text-slate-900">₹{overview.kpis.totalValueAtRisk.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-slate-400 mt-1">Estimated shortage loss</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Transfer Options</span>
              <ArrowRightLeft size={18} />
            </div>
            <p className="text-2xl font-black text-emerald-600">{overview.kpis.transferOpportunitiesCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Inter-warehouse solutions</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-green-600 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Capital Saved</span>
              <TrendingUp size={18} />
            </div>
            <p className="text-2xl font-black text-green-600">₹{overview.kpis.avoidablePurchasesValue.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-slate-400 mt-1">Avoidable supplier POs</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-purple-600 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Excess Stock</span>
              <Layers size={18} />
            </div>
            <p className="text-2xl font-black text-purple-600">₹{overview.kpis.excessValue.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-slate-400 mt-1">Tied up working capital</p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('replenishment')}
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'replenishment'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles size={16} /> Explainable Replenishment ({recommendations.length})
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'transfers'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft size={16} /> Multi-Warehouse Transfer Optimizer ({transfers.length})
        </button>

        <button
          onClick={() => setActiveTab('simulation')}
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'simulation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Play size={16} /> What-If Scenario Simulator
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'forecast'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp size={16} /> Forecast Validation & Backtesting
        </button>

        <button
          onClick={() => setActiveTab('copilot')}
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'copilot'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Brain size={16} /> AI Copilot Assistant
        </button>
      </div>

      {/* TAB 1: REPLENISHMENT ENGINE */}
      {activeTab === 'replenishment' && (
        <div className="space-y-4">
          {/* Detailed Search & Quick-Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by product name, SKU, category, or warehouse..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Warehouse & Sort */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                  <Building2 size={14} className="text-slate-500" />
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="">All Warehouses</option>
                    {warehouses.map(w => (
                      <option key={w._id} value={w._id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                  <SlidersHorizontal size={14} className="text-slate-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="URGENCY">Sort: Highest Urgency</option>
                    <option value="LOW_RUNWAY">Sort: Lowest Runway Days</option>
                    <option value="HIGH_VALUE">Sort: Highest Value at Risk</option>
                    <option value="HIGH_STOCK">Sort: Highest Stock on Hand</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
              {[
                { id: 'ALL', label: 'All Items', count: recommendations.length },
                { id: 'CRITICAL', label: '🚨 Critical Shortage', count: overview?.kpis?.criticalCount || 0 },
                { id: 'HIGH_RISK', label: '⚠️ High Risk', count: overview?.kpis?.highRiskCount || 0 },
                { id: 'REORDER_SOON', label: '⏳ Reorder Soon', count: overview?.kpis?.reorderSoonCount || 0 },
                { id: 'EXCESS', label: '📦 Excess Surplus', count: overview?.kpis?.excessCount || 0 },
                { id: 'HEALTHY', label: '✅ Healthy', count: recommendations.filter(r => r.riskCategory === 'HEALTHY').length }
              ].map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setSelectedCategory(chip.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === chip.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedCategory === chip.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 font-mono'
                  }`}>
                    {chip.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* List of Recommendations */}
          {filteredRecs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
              <PackageCheck size={36} className="mx-auto text-slate-300" />
              <p className="font-bold text-slate-700">No inventory recommendations match your current search / filters.</p>
              <p className="text-xs text-slate-400">Try clearing the search query or selecting "All Items".</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecs.map((rec) => {
                const recId = `${rec.product._id}_${rec.warehouse._id}`;
                const isExpanded = expandedRecId === recId;
                const daysRunway = rec.metrics.daysUntilStockout;
                const leadDays = rec.product.leadTimeDays || 4;
                const isCriticalDepletion = daysRunway !== null && daysRunway <= leadDays;

                return (
                  <div 
                    key={recId}
                    className={`bg-white rounded-2xl border transition-all shadow-xs hover:shadow-md ${
                      rec.riskCategory === 'CRITICAL' ? 'border-red-200 hover:border-red-300' :
                      rec.riskCategory === 'HIGH_RISK' ? 'border-amber-200 hover:border-amber-300' :
                      rec.riskCategory === 'EXCESS' ? 'border-purple-200 hover:border-purple-300' :
                      'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div 
                      onClick={() => setExpandedRecId(isExpanded ? null : recId)}
                      className="p-4 sm:p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl mt-1 shrink-0 ${
                          rec.riskCategory === 'CRITICAL' ? 'bg-red-50 text-red-600' :
                          rec.riskCategory === 'HIGH_RISK' ? 'bg-amber-50 text-amber-600' :
                          rec.riskCategory === 'EXCESS' ? 'bg-purple-50 text-purple-600' :
                          'bg-indigo-50 text-indigo-600'
                        }`}>
                          <PackageCheck size={22} />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-slate-900 text-sm sm:text-base">{rec.product.name}</h3>
                            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                              {rec.product.sku}
                            </span>
                            {getRiskBadge(rec.riskCategory)}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-extrabold text-slate-800">
                              <Building2 size={13} className="text-indigo-600" /> {rec.warehouse.name}
                            </span>
                            <span>Supplier Lead Time: <b>{leadDays}d</b></span>
                            <span>Safety Buffer: <b>{rec.product.safetyStockDays}d</b></span>
                            <span>Unit Cost: <b>₹{rec.product.unitCost}</b></span>
                            <span>Daily Sales: <b>{rec.metrics.forecastDailyDemand} units/day</b></span>
                          </div>

                          {/* Visual Runway Progress Bar */}
                          <div className="mt-2.5 max-w-md">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-bold text-slate-600">
                                Stock Runway: <strong className={isCriticalDepletion ? 'text-red-600' : 'text-slate-800'}>
                                  {daysRunway !== null ? `${daysRunway} Days` : '0 Days'}
                                </strong>
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                Vendor Arrives in: {leadDays} Days
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  rec.riskCategory === 'CRITICAL' ? 'bg-red-500' :
                                  rec.riskCategory === 'HIGH_RISK' ? 'bg-amber-500' :
                                  rec.riskCategory === 'EXCESS' ? 'bg-purple-500' :
                                  'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(10, ((daysRunway || 0) / (leadDays * 2)) * 100))}%` }}
                              />
                            </div>
                            {isCriticalDepletion && (
                              <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                                <AlertTriangle size={11} /> Stockout will occur {+(leadDays - (daysRunway || 0)).toFixed(1)} days before new supplier shipments arrive!
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right metrics */}
                      <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 pt-3 md:pt-0">
                        <div className="text-left md:text-right">
                          <p className="text-[11px] text-slate-400 font-bold uppercase">Available / Target</p>
                          <p className="text-sm sm:text-base font-extrabold text-slate-900">
                            {rec.metrics.availableToPromise} <span className="text-xs font-normal text-slate-400">/ {rec.metrics.targetInventory}</span>
                          </p>
                          <p className="text-[11px] text-slate-400">Reserved: {rec.metrics.reserved} | On-Hand: {rec.metrics.onHand}</p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-[11px] text-slate-400 font-bold uppercase">Recommended Order</p>
                          <p className="text-sm sm:text-base font-black text-indigo-600">
                            {rec.metrics.suggestedReplenishment > 0 ? `+${rec.metrics.suggestedReplenishment} units` : '0 units'}
                          </p>
                          {rec.metrics.estimatedFinancialImpact > 0 && (
                            <p className="text-[11px] font-extrabold text-red-600">Risk: ₹{rec.metrics.estimatedFinancialImpact.toLocaleString('en-IN')}</p>
                          )}
                        </div>

                        <div className="text-slate-400 pl-2">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Explainability Panel */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-2xl border border-slate-200">
                            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 mb-2 flex items-center gap-1.5">
                              <Sparkles size={14} /> AI Decision Causal Explanation
                            </h4>
                            <div className="space-y-2.5 text-xs">
                              <div>
                                <span className="font-extrabold text-slate-800">1. Detection:</span>
                                <p className="text-slate-600 mt-0.5 leading-relaxed">{rec.explainability.detection}</p>
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-800">2. Mathematical Formulas:</span>
                                <p className="text-slate-700 mt-0.5 font-mono text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100 leading-relaxed">
                                  {rec.explainability.calculations}
                                </p>
                              </div>
                              <div>
                                <span className="font-extrabold text-red-600">3. Consequence of Inaction:</span>
                                <p className="text-red-700 mt-0.5 leading-relaxed">{rec.explainability.riskOfInaction}</p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-emerald-600" /> Recommended Action & Next Steps
                              </h4>
                              <p className="text-xs font-medium text-slate-800 leading-relaxed bg-indigo-50/80 p-3 rounded-xl border border-indigo-100">
                                {rec.explainability.recommendedAction}
                              </p>

                              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                  Forecast Model: <b className="text-slate-900">{rec.forecastDetails.method}</b>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                  Confidence: <b className="text-emerald-700">{rec.forecastDetails.confidence}</b>
                                </div>
                              </div>
                            </div>

                            {/* Direct Action Hub */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100">
                              <button
                                onClick={() => {
                                  setActiveTab('transfers');
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1 transition-colors"
                              >
                                <ArrowRightLeft size={13} /> Transfers
                              </button>
                              
                              <button
                                onClick={() => {
                                  setSimProduct(rec.product._id);
                                  setSimWarehouse(rec.warehouse._id);
                                  setActiveTab('simulation');
                                }}
                                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                              >
                                <Play size={13} /> Simulate
                              </button>

                              <button
                                onClick={() => {
                                  setForecastProduct(rec.product._id);
                                  setForecastWarehouse(rec.warehouse._id);
                                  setActiveTab('forecast');
                                  handleLoadForecast(rec.product._id, rec.warehouse._id);
                                }}
                                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                              >
                                <TrendingUp size={13} /> Forecast
                              </button>

                              <button
                                onClick={() => {
                                  setCopilotInput(`Analyze stock position and risks for ${rec.product.name} at ${rec.warehouse.name}`);
                                  setActiveTab('copilot');
                                }}
                                className="bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                              >
                                <Brain size={13} /> Ask AI
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MULTI-WAREHOUSE TRANSFER OPTIMIZER */}
      {activeTab === 'transfers' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-200 p-4 rounded-2xl flex items-start gap-3">
            <Sparkles className="text-indigo-600 shrink-0 mt-0.5" size={20} />
            <div className="text-xs sm:text-sm text-indigo-950">
              <strong className="font-black">Multi-Warehouse Transfer Optimization:</strong> Instead of spending money on external suppliers, our AI identifies sibling regional warehouses with usable surplus. Transfers automatically protect the source warehouse's own safety buffer and require Company Admin or Manager approval before any stock moves.
            </div>
          </div>

          {transfers.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500 space-y-2">
              <ArrowRightLeft size={36} className="mx-auto text-slate-300" />
              <p className="font-bold text-slate-700">No inter-warehouse transfer opportunities currently detected.</p>
              <p className="text-xs text-slate-400">All regional distribution centers are operating within healthy variance.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {transfers.map((opp, idx) => (
                <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] uppercase font-black text-slate-400 tracking-wider">Destination Shortage Location</span>
                      <h3 className="text-base font-black text-slate-900 mt-0.5 flex items-center gap-2">
                        <span>{opp.product.name}</span>
                        <span className="font-mono text-xs font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded">
                          {opp.product.sku}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          at <strong>{opp.destinationWarehouse.name}</strong>
                        </span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-red-100 text-red-700 font-extrabold px-3 py-1 rounded-full">
                        {opp.shortageRisk} SHORTAGE
                      </span>
                      <span className="text-xs bg-slate-200 text-slate-800 font-mono font-bold px-3 py-1 rounded-full">
                        Deficit: {opp.requiredQty} units
                      </span>
                    </div>
                  </div>

                  {/* Transfer Options Cards */}
                  <div className="p-5 space-y-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Feasible Sibling Warehouses Evaluated ({opp.options.length})
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {opp.options.map((opt, oIdx) => (
                        <div key={oIdx} className="border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/20 p-4 sm:p-5 rounded-2xl flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                                <Building2 size={16} className="text-indigo-600" />
                                {opt.sourceWarehouse.name}
                              </span>
                              <span className="text-xs bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full">
                                Match Score: {opt.rankingScore}/100
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                              {opt.recommendationReason}
                            </p>

                            {/* Comparison Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[11px] font-bold">Transfer Qty</span>
                                <b className="text-slate-900">{opt.recommendedTransferQty} units</b>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px] font-bold">Arrival Speed</span>
                                <b className="text-emerald-700">{opt.transitDays}d vs {opt.supplierLeadDays}d PO</b>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px] font-bold">Transfer Cost</span>
                                <b className="text-slate-900">₹{opt.totalTransferCost}</b>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px] font-bold">Capital Preserved</span>
                                <b className="text-emerald-700">₹{opt.capitalPreserved.toLocaleString('en-IN')}</b>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => handleProposeTransfer(opt)}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
                            >
                              <ArrowUpRight size={14} /> Submit Transfer Proposal for Approval
                            </button>
                            <p className="text-[11px] text-slate-400 text-center mt-1.5">
                              Creates DRAFT operation in PENDING approval status. Zero physical stock mutation until manager validates.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WHAT-IF SCENARIO SIMULATOR */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shadow-xs">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">Product</label>
              <select
                value={simProduct}
                onChange={(e) => setSimProduct(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                {recommendations.map(r => (
                  <option key={r.product._id} value={r.product._id}>{r.product.name} ({r.product.sku})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">Warehouse</label>
              <select
                value={simWarehouse}
                onChange={(e) => setSimWarehouse(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1">Horizon ({simHorizon} Days)</label>
              <input
                type="range"
                min="7"
                max="30"
                step="7"
                value={simHorizon}
                onChange={(e) => setSimHorizon(parseInt(e.target.value))}
                className="w-full mt-2 accent-indigo-600"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleRunSimulation}
                disabled={simLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <Play size={16} /> Run What-If Simulation
              </button>
            </div>
          </div>

          {/* Simulation Output */}
          {simLoading ? (
            <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center text-slate-500">
              <RefreshCw size={32} className="animate-spin mx-auto text-indigo-600 mb-2" />
              Running multi-scenario trajectory simulation...
            </div>
          ) : simData && (
            <div className="space-y-6">
              {/* Chart */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Projected Inventory Balances Over {simData.parameters.horizonDays} Days</h3>
                    <p className="text-xs text-slate-500">
                      Comparing Do Nothing vs Supplier Purchase ({simData.parameters.supplierLeadDays}d lead time) vs Inter-Warehouse Transfer ({simData.parameters.transferTransitDays}d transit)
                    </p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-mono font-bold">
                    Daily Demand: {simData.parameters.dailyDemand}/day
                  </span>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={simData.dailyTimeline}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="day" label={{ value: 'Days from Today', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                      <YAxis label={{ value: 'Available Stock', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="doNothing" name="Do Nothing" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="purchase" name="Supplier Purchase" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="transfer" name="Warehouse Transfer" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Scenario Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs">
                  <span className="text-xs font-black text-red-600 uppercase">Scenario A</span>
                  <h4 className="text-base font-black text-slate-900 mt-1">{simData.scenarios.doNothing.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{simData.scenarios.doNothing.description}</p>

                  <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">First Stockout Day:</span>
                      <b className="text-red-600">Day {simData.scenarios.doNothing.firstStockoutDay || 'None'}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Stockout Days:</span>
                      <b className="text-red-600">{simData.scenarios.doNothing.stockoutDays} Days</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Final Day Balance:</span>
                      <b>{simData.scenarios.doNothing.finalBalance} units</b>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs">
                  <span className="text-xs font-black text-blue-600 uppercase">Scenario B</span>
                  <h4 className="text-base font-black text-slate-900 mt-1">{simData.scenarios.purchase.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{simData.scenarios.purchase.description}</p>

                  <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Arrival Day:</span>
                      <b>Day {simData.scenarios.purchase.arrivalDay}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Unfulfilled Stockout Days:</span>
                      <b className="text-amber-600">{simData.scenarios.purchase.stockoutDays} Days</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Purchase PO Cost:</span>
                      <b className="text-blue-600">₹{simData.scenarios.purchase.estimatedCost.toLocaleString()}</b>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs">
                  <span className="text-xs font-black text-emerald-600 uppercase">Scenario C (Optimal)</span>
                  <h4 className="text-base font-black text-slate-900 mt-1">{simData.scenarios.transfer.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{simData.scenarios.transfer.description}</p>

                  <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Arrival Day:</span>
                      <b className="text-emerald-700">Day {simData.scenarios.transfer.arrivalDay} (Fastest)</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Stockout Days:</span>
                      <b className="text-emerald-700">{simData.scenarios.transfer.stockoutDays} Days (0 stockout)</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capital Preserved:</span>
                      <b className="text-emerald-700">₹{simData.scenarios.transfer.workingCapitalPreserved.toLocaleString('en-IN')}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FORECAST VALIDATION & BACKTESTING */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-center shadow-xs">
            <span className="text-xs font-black text-slate-700 uppercase">Inspect SKU:</span>
            <select
              value={forecastProduct}
              onChange={(e) => {
                setForecastProduct(e.target.value);
                handleLoadForecast(e.target.value, forecastWarehouse);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              {recommendations.map(r => (
                <option key={r.product._id} value={r.product._id}>{r.product.name} ({r.product.sku})</option>
              ))}
            </select>
          </div>

          {forecastLoading ? (
            <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center text-slate-500">
              <RefreshCw size={32} className="animate-spin mx-auto text-indigo-600 mb-2" />
              Computing backtest and model validation...
            </div>
          ) : forecastData && (
            <div className="space-y-6">
              {/* Model Validation KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-400 font-bold uppercase">Selected Model</span>
                  <p className="text-lg font-black text-indigo-600 mt-1">{forecastData.method}</p>
                  <p className="text-xs text-slate-400">Trend: {forecastData.trend}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-400 font-bold uppercase">Holdout MAE</span>
                  <p className="text-lg font-black text-slate-900 mt-1">{forecastData.evaluation.mae} units</p>
                  <p className="text-xs text-slate-400">vs Naive Baseline {forecastData.evaluation.naiveMAE}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-400 font-bold uppercase">WAPE Error Rate</span>
                  <p className="text-lg font-black text-slate-900 mt-1">{(forecastData.evaluation.wape * 100).toFixed(1)}%</p>
                  <p className="text-xs text-emerald-600 font-bold">Grade: {forecastData.confidence}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-400 font-bold uppercase">Evaluation Points</span>
                  <p className="text-lg font-black text-slate-900 mt-1">{forecastData.evaluation.totalDataPoints} Days</p>
                  <p className="text-xs text-slate-400">Holdout: {forecastData.evaluation.validationDays}d</p>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                <h3 className="font-black text-slate-900 text-base mb-1">Historical Daily Demand (Last 30 Days)</h3>
                <p className="text-xs text-slate-500 mb-4">Chronological delivery records extracted from immutable stock ledger</p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecastData.historicalSeries}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="demand" name="Daily Demand (Units)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AI COPILOT ASSISTANT */}
      {activeTab === 'copilot' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[600px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
                <Brain size={24} className="text-indigo-300" />
              </div>
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  StockSense Inventory AI Copilot
                  <span className="bg-indigo-500/30 text-indigo-200 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                    Tool Grounded
                  </span>
                </h3>
                <p className="text-xs text-indigo-200">
                  Query stockouts, transfer options, aging batches, and causal recommendations in natural language.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Preset Prompts */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 text-xs">
            <span className="text-slate-400 font-bold self-center text-[11px]">Try asking:</span>
            {[
              "Which products could run out within the next seven days?",
              "Why is Sensor Module X-100 marked as critical?",
              "Which warehouse has transferable surplus for Sensor Module X-100?",
              "Compare transferring stock with purchasing it.",
              "Show products with more than 90 days of stock aging.",
              "What should the manager prioritize today?"
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendCopilot(q)}
                className="bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-slate-700 px-3 py-1 rounded-full transition-colors text-[11px] font-medium"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {copilotMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-700">
                    <Sparkles size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                      : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-bl-none shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {msg.provider && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Engine: {msg.provider}</span>
                      {msg.tools && <span>Tools: {msg.tools.join(', ')}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {copilotLoading && (
              <div className="flex gap-3 justify-start items-center text-xs text-slate-400">
                <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                  <RefreshCw size={14} className="animate-spin text-indigo-600" />
                </div>
                <span>Analyzing inventory positions and calling backend tools...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              placeholder="Ask anything about inventory, shortages, transfers, or aging..."
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendCopilot();
              }}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <button
              onClick={() => handleSendCopilot()}
              disabled={copilotLoading || !copilotInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelligenceDashboard;
