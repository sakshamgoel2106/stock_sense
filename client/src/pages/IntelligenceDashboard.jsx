import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle, TrendingUp, ArrowRightLeft, 
  Brain, ShieldAlert, DollarSign, Clock, RefreshCw, ChevronDown, 
  ChevronUp, HelpCircle, Send, Play, Sparkles, Filter, PackageCheck,
  Building2, Layers, AlertCircle, ArrowUpRight
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
  const [overview, setOverview] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  
  // Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
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

  // Load initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [overviewRes, recsRes, transfersRes, whRes] = await Promise.all([
        api.get('/intelligence/overview'),
        api.get('/intelligence/recommendations'),
        api.get('/intelligence/transfers'),
        api.get('/warehouses')
      ]);

      setOverview(overviewRes.data);
      setRecommendations(recsRes.data);
      setTransfers(transfersRes.data);
      setWarehouses(whRes.data);

      if (recsRes.data.length > 0) {
        setSimProduct(recsRes.data[0].product._id);
        setSimWarehouse(recsRes.data[0].warehouse._id);
        setForecastProduct(recsRes.data[0].product._id);
        setForecastWarehouse(recsRes.data[0].warehouse._id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load inventory intelligence data');
    } finally {
      setLoading(false);
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
      fetchData();
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

  // Filter recommendations
  const filteredRecs = recommendations.filter(rec => {
    if (selectedWarehouse && rec.warehouse._id !== selectedWarehouse) return false;
    if (selectedCategory !== 'ALL' && rec.riskCategory !== selectedCategory) return false;
    return true;
  });

  const getRiskBadge = (category) => {
    switch (category) {
      case 'CRITICAL':
        return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={12} /> Critical Shortage</span>;
      case 'HIGH_RISK':
        return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1"><AlertCircle size={12} /> High Risk</span>;
      case 'REORDER_SOON':
        return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1"><Clock size={12} /> Reorder Soon</span>;
      case 'EXCESS':
        return <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1"><Layers size={12} /> Excess Stock</span>;
      case 'INSUFFICIENT_DATA':
        return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1"><HelpCircle size={12} /> Low Data</span>;
      default:
        return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1"><CheckCircle size={12} /> Healthy</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Brain className="text-indigo-600" size={32} />
              StockSense Intelligence Platform
            </h1>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              AI Decision Support
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Predict shortages, optimize multi-warehouse transfers, and act with explainable confidence.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            onClick={fetchData} 
            disabled={loading}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh Intelligence
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
            <div className="flex items-center justify-between text-red-600 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Critical Risks</span>
              <ShieldAlert size={18} />
            </div>
            <p className="text-2xl font-black text-red-600">{overview.kpis.criticalCount}</p>
            <p className="text-xs text-gray-400 mt-1">Stockout within lead time</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">High Risk SKUs</span>
              <AlertTriangle size={18} />
            </div>
            <p className="text-2xl font-black text-amber-600">{overview.kpis.highRiskCount}</p>
            <p className="text-xs text-gray-400 mt-1">Approaching reorder point</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Value At Risk</span>
              <DollarSign size={18} />
            </div>
            <p className="text-2xl font-black text-gray-900">₹{overview.kpis.totalValueAtRisk.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">Estimated shortage loss</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
            <div className="flex items-center justify-between text-green-600 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Transfer Options</span>
              <ArrowRightLeft size={18} />
            </div>
            <p className="text-2xl font-black text-green-600">{overview.kpis.transferOpportunitiesCount}</p>
            <p className="text-xs text-gray-400 mt-1">Inter-warehouse solutions</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Capital Saved</span>
              <TrendingUp size={18} />
            </div>
            <p className="text-2xl font-black text-emerald-600">₹{overview.kpis.avoidablePurchasesValue.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">Avoidable supplier POs</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
            <div className="flex items-center justify-between text-purple-600 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Excess Capital</span>
              <Layers size={18} />
            </div>
            <p className="text-2xl font-black text-purple-600">₹{overview.kpis.excessValue.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">Slow-moving inventory</p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('replenishment')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'replenishment'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles size={16} /> Explainable Replenishment ({recommendations.length})
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'transfers'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowRightLeft size={16} /> Multi-Warehouse Transfer Optimizer
        </button>

        <button
          onClick={() => setActiveTab('simulation')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'simulation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Play size={16} /> What-If Scenario Simulator
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'forecast'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp size={16} /> Forecast Validation & Backtesting
        </button>

        <button
          onClick={() => setActiveTab('copilot')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'copilot'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Brain size={16} /> AI Copilot Assistant
        </button>
      </div>

      {/* TAB 1: REPLENISHMENT ENGINE */}
      {activeTab === 'replenishment' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter size={16} />
                <span className="font-semibold">Filters:</span>
              </div>

              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Warehouses</option>
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Risk Categories</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH_RISK">High Risk Only</option>
                <option value="REORDER_SOON">Reorder Soon Only</option>
                <option value="EXCESS">Excess Only</option>
                <option value="HEALTHY">Healthy Only</option>
              </select>
            </div>

            <div className="text-xs text-gray-500">
              Showing <span className="font-bold text-gray-800">{filteredRecs.length}</span> prioritized recommendations
            </div>
          </div>

          {/* List of Recommendations */}
          {filteredRecs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
              No inventory recommendations match the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecs.map((rec) => {
                const recId = `${rec.product._id}_${rec.warehouse._id}`;
                const isExpanded = expandedRecId === recId;

                return (
                  <div 
                    key={recId}
                    className={`bg-white rounded-xl border transition-all ${
                      rec.riskCategory === 'CRITICAL' ? 'border-red-200 hover:border-red-300' :
                      rec.riskCategory === 'HIGH_RISK' ? 'border-amber-200 hover:border-amber-300' :
                      'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div 
                      onClick={() => setExpandedRecId(isExpanded ? null : recId)}
                      className="p-4 sm:p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl mt-1 ${
                          rec.riskCategory === 'CRITICAL' ? 'bg-red-50 text-red-600' :
                          rec.riskCategory === 'HIGH_RISK' ? 'bg-amber-50 text-amber-600' :
                          rec.riskCategory === 'EXCESS' ? 'bg-purple-50 text-purple-600' :
                          'bg-indigo-50 text-indigo-600'
                        }`}>
                          <PackageCheck size={24} />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-base">{rec.product.name}</h3>
                            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {rec.product.sku}
                            </span>
                            {getRiskBadge(rec.riskCategory)}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1 font-medium text-gray-700">
                              <Building2 size={13} /> {rec.warehouse.name}
                            </span>
                            <span>Supplier Lead Time: <b>{rec.product.leadTimeDays}d</b></span>
                            <span>Safety Buffer: <b>{rec.product.safetyStockDays}d</b></span>
                            <span>Unit Cost: <b>₹{rec.product.unitCost}</b></span>
                          </div>
                        </div>
                      </div>

                      {/* Right metrics */}
                      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                        <div className="text-left md:text-right">
                          <p className="text-xs text-gray-400 font-medium">Stock Runway</p>
                          <p className={`text-base font-extrabold ${
                            rec.metrics.daysUntilStockout <= 4 ? 'text-red-600' :
                            rec.metrics.daysUntilStockout <= 7 ? 'text-amber-600' :
                            'text-gray-800'
                          }`}>
                            {rec.metrics.daysUntilStockout !== null ? `${rec.metrics.daysUntilStockout} Days` : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-400">Demand: {rec.metrics.forecastDailyDemand}/day</p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-xs text-gray-400 font-medium">Available / Target</p>
                          <p className="text-base font-bold text-gray-900">
                            {rec.metrics.availableToPromise} <span className="text-xs font-normal text-gray-400">/ {rec.metrics.targetInventory}</span>
                          </p>
                          <p className="text-xs text-gray-400">Reserved: {rec.metrics.reserved}</p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-xs text-gray-400 font-medium">Recommended Order</p>
                          <p className="text-base font-extrabold text-indigo-600">
                            {rec.metrics.suggestedReplenishment > 0 ? `+${rec.metrics.suggestedReplenishment} units` : '0 units'}
                          </p>
                          {rec.metrics.estimatedFinancialImpact > 0 && (
                            <p className="text-xs font-bold text-red-500">Risk: ₹{rec.metrics.estimatedFinancialImpact.toLocaleString('en-IN')}</p>
                          )}
                        </div>

                        <div className="text-gray-400 pl-2">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Explainability Panel */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50/70 rounded-b-xl space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-xl border border-gray-200">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2 flex items-center gap-1.5">
                              <Sparkles size={14} /> AI Decision Causal Explanation
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="font-semibold text-gray-700">Detection:</span>
                                <p className="text-gray-600 mt-0.5">{rec.explainability.detection}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Formulas & Calculations:</span>
                                <p className="text-gray-600 mt-0.5 font-mono text-[11px] bg-gray-50 p-1.5 rounded border border-gray-100">
                                  {rec.explainability.calculations}
                                </p>
                              </div>
                              <div>
                                <span className="font-semibold text-red-600">Consequence of Inaction:</span>
                                <p className="text-red-700 mt-0.5">{rec.explainability.riskOfInaction}</p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
                                <TrendingUp size={14} /> Recommended Action & Next Steps
                              </h4>
                              <p className="text-xs font-medium text-gray-800 leading-relaxed bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
                                {rec.explainability.recommendedAction}
                              </p>

                              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                                <div className="bg-gray-50 p-2 rounded">
                                  Forecast Model: <b className="text-gray-800">{rec.forecastDetails.method}</b>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                  Confidence: <b className="text-gray-800">{rec.forecastDetails.confidence}</b>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-4 pt-3 border-t">
                              <button
                                onClick={() => {
                                  setActiveTab('transfers');
                                }}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <ArrowRightLeft size={14} /> Check Transfer Options
                              </button>
                              <button
                                onClick={() => {
                                  setSimProduct(rec.product._id);
                                  setSimWarehouse(rec.warehouse._id);
                                  setActiveTab('simulation');
                                }}
                                className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Play size={14} /> Simulate
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
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-start gap-3">
            <Sparkles className="text-indigo-600 shrink-0 mt-0.5" size={20} />
            <div className="text-xs sm:text-sm text-indigo-900">
              <b>Multi-Warehouse Transfer Optimization:</b> Instead of placing new purchase orders, the engine scans regional distribution centers with usable surplus. Transfers protect the source warehouse's own safety stock and require Company Admin or Manager approval before execution.
            </div>
          </div>

          {transfers.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-gray-500">
              No inter-warehouse transfer opportunities currently detected. All facilities are operating within normal variance.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {transfers.map((opp, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs uppercase font-bold text-gray-500">Destination Shortage</span>
                      <h3 className="text-base font-extrabold text-gray-900">
                        {opp.product.name} ({opp.product.sku}) at {opp.destinationWarehouse.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-full">
                        {opp.shortageRisk} SHORTAGE
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                        Deficit: {opp.requiredQty} units
                      </span>
                    </div>
                  </div>

                  {/* Transfer Options Cards */}
                  <div className="p-5 space-y-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Feasible Source Warehouses Evaluated ({opp.options.length})
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {opp.options.map((opt, oIdx) => (
                        <div key={oIdx} className="border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/20 p-4 rounded-xl flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                                <Building2 size={16} className="text-indigo-600" />
                                {opt.sourceWarehouse.name}
                              </span>
                              <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                                Match Score: {opt.rankingScore}/100
                              </span>
                            </div>

                            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                              {opt.recommendationReason}
                            </p>

                            {/* Comparison Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs">
                              <div>
                                <span className="text-gray-400 block text-[11px]">Transfer Qty</span>
                                <b className="text-gray-900">{opt.recommendedTransferQty} units</b>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[11px]">Arrival Time</span>
                                <b className="text-green-600">{opt.transitDays} day(s) vs {opt.supplierLeadDays}d PO</b>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[11px]">Transfer Cost</span>
                                <b className="text-gray-900">₹{opt.totalTransferCost}</b>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[11px]">Capital Saved</span>
                                <b className="text-emerald-600">₹{opt.capitalPreserved.toLocaleString('en-IN')}</b>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => handleProposeTransfer(opt)}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                            >
                              <ArrowUpRight size={14} /> Submit Transfer Proposal for Approval
                            </button>
                            <p className="text-[11px] text-gray-400 text-center mt-1">
                              Creates DRAFT operation in PENDING approval status. Zero stock mutation until approved.
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
          <div className="bg-white p-5 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product</label>
              <select
                value={simProduct}
                onChange={(e) => setSimProduct(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {recommendations.map(r => (
                  <option key={r.product._id} value={r.product._id}>{r.product.name} ({r.product.sku})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Warehouse</label>
              <select
                value={simWarehouse}
                onChange={(e) => setSimWarehouse(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Horizon ({simHorizon} Days)</label>
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Play size={16} /> Run What-If Simulation
              </button>
            </div>
          </div>

          {/* Simulation Output */}
          {simLoading ? (
            <div className="bg-white p-16 rounded-xl border border-gray-200 text-center text-gray-500">
              <RefreshCw size={32} className="animate-spin mx-auto text-indigo-600 mb-2" />
              Running multi-scenario trajectory simulation...
            </div>
          ) : simData && (
            <div className="space-y-6">
              {/* Chart */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Projected Inventory Balances Over {simData.parameters.horizonDays} Days</h3>
                    <p className="text-xs text-gray-500">
                      Comparing Do Nothing vs Supplier Purchase ({simData.parameters.supplierLeadDays}d lead time) vs Inter-Warehouse Transfer ({simData.parameters.transferTransitDays}d transit)
                    </p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-mono">
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
                <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm">
                  <span className="text-xs font-bold text-red-600 uppercase">Scenario A</span>
                  <h4 className="text-base font-extrabold text-gray-900 mt-1">{simData.scenarios.doNothing.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{simData.scenarios.doNothing.description}</p>

                  <div className="mt-4 space-y-2 text-xs border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">First Stockout Day:</span>
                      <b className="text-red-600">Day {simData.scenarios.doNothing.firstStockoutDay || 'None'}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Stockout Days:</span>
                      <b className="text-red-600">{simData.scenarios.doNothing.stockoutDays} Days</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Final Day Balance:</span>
                      <b>{simData.scenarios.doNothing.finalBalance} units</b>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm">
                  <span className="text-xs font-bold text-blue-600 uppercase">Scenario B</span>
                  <h4 className="text-base font-extrabold text-gray-900 mt-1">{simData.scenarios.purchase.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{simData.scenarios.purchase.description}</p>

                  <div className="mt-4 space-y-2 text-xs border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Arrival Day:</span>
                      <b>Day {simData.scenarios.purchase.arrivalDay}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Unfulfilled Stockout Days:</span>
                      <b>{simData.scenarios.purchase.stockoutDays} Days</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Purchase PO Cost:</span>
                      <b className="text-blue-600">${simData.scenarios.purchase.estimatedCost.toLocaleString()}</b>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm">
                  <span className="text-xs font-bold text-emerald-600 uppercase">Scenario C (Optimal)</span>
                  <h4 className="text-base font-extrabold text-gray-900 mt-1">{simData.scenarios.transfer.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{simData.scenarios.transfer.description}</p>

                  <div className="mt-4 space-y-2 text-xs border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Arrival Day:</span>
                      <b className="text-emerald-600">Day {simData.scenarios.transfer.arrivalDay} (Fastest)</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Stockout Days:</span>
                      <b className="text-emerald-600">{simData.scenarios.transfer.stockoutDays} Days (0 stockout)</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Capital Preserved:</span>
                      <b className="text-emerald-600">₹{simData.scenarios.transfer.workingCapitalPreserved.toLocaleString('en-IN')}</b>
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
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-4 items-center">
            <span className="text-xs font-bold text-gray-700 uppercase">Inspect SKU:</span>
            <select
              value={forecastProduct}
              onChange={(e) => {
                setForecastProduct(e.target.value);
                handleLoadForecast(e.target.value, forecastWarehouse);
              }}
              className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              {recommendations.map(r => (
                <option key={r.product._id} value={r.product._id}>{r.product.name} ({r.product.sku})</option>
              ))}
            </select>
          </div>

          {forecastLoading ? (
            <div className="bg-white p-16 rounded-xl border border-gray-200 text-center text-gray-500">
              <RefreshCw size={32} className="animate-spin mx-auto text-indigo-600 mb-2" />
              Computing backtest and model validation...
            </div>
          ) : forecastData && (
            <div className="space-y-6">
              {/* Model Validation KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Selected Model</span>
                  <p className="text-lg font-extrabold text-indigo-600 mt-1">{forecastData.method}</p>
                  <p className="text-xs text-gray-400">Trend: {forecastData.trend}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Holdout MAE</span>
                  <p className="text-lg font-extrabold text-gray-900 mt-1">{forecastData.evaluation.mae} units</p>
                  <p className="text-xs text-gray-400">vs Naive Baseline {forecastData.evaluation.naiveMAE}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-400 font-semibold uppercase">WAPE Error Rate</span>
                  <p className="text-lg font-extrabold text-gray-900 mt-1">{(forecastData.evaluation.wape * 100).toFixed(1)}%</p>
                  <p className="text-xs text-green-600">Grade: {forecastData.confidence}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Evaluation Points</span>
                  <p className="text-lg font-extrabold text-gray-900 mt-1">{forecastData.evaluation.totalDataPoints} Days</p>
                  <p className="text-xs text-gray-400">Holdout Window: {forecastData.evaluation.validationDays}d</p>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 text-base mb-1">Historical Daily Demand (Last 30 Days)</h3>
                <p className="text-xs text-gray-500 mb-4">Chronological delivery records extracted from immutable stock ledger</p>

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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-700/50 rounded-lg">
                <Brain size={24} />
              </div>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  StockSense Inventory AI Copilot
                  <span className="bg-indigo-500/30 text-indigo-200 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                    Tool Grounded
                  </span>
                </h3>
                <p className="text-xs text-indigo-200">
                  Query stockouts, transfer options, aging batches, and causal recommendations.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Preset Prompts */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-2 text-xs">
            <span className="text-gray-400 font-semibold self-center">Try asking:</span>
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
                className="bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full transition-colors text-[11px]"
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
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {msg.provider && (
                    <div className="mt-2 pt-2 border-t border-gray-200/60 text-[10px] text-gray-400 flex items-center justify-between">
                      <span>Engine: {msg.provider}</span>
                      {msg.tools && <span>Tools: {msg.tools.join(', ')}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {copilotLoading && (
              <div className="flex gap-3 justify-start items-center text-xs text-gray-400">
                <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                  <RefreshCw size={14} className="animate-spin text-indigo-600" />
                </div>
                <span>Analyzing inventory positions and calling backend tools...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
            <input
              type="text"
              placeholder="Ask anything about inventory, shortages, transfers, or aging..."
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendCopilot();
              }}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
