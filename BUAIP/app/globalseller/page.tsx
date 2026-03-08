'use client';

import React, { useState } from 'react';
import { AIBadge } from '@/app/components/AIBadge';
import GlobalSellerIntelligenceSidebar from '@/app/components/GlobalSellerIntelligenceSidebar';
import { Globe, Zap, AlertCircle, TrendingUp, Users, Rocket, MessageCircle, Loader } from 'lucide-react';
import { askEngine, type EngineResponse } from '@/src/lib/engineApi';

export default function GlobalSellerDashboard() {
  const [mode, setMode] = useState<'global' | 'india'>('global');
  const [activeModule, setActiveModule] = useState<string>('market');
  const [showAssistant, setShowAssistant] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Global modules (Layer 1)
  const globalModules = [
    { id: 'market', title: '🌐 Market Expansion', icon: Globe, color: 'from-blue-500 to-blue-600' },
    { id: 'supply', title: '🔄 Supply Chain Risk', icon: AlertCircle, color: 'from-yellow-500 to-yellow-600' },
    { id: 'listing', title: '🤖 Listing Studio', icon: Zap, color: 'from-purple-500 to-purple-600' },
    { id: 'compliance', title: '⚖️ Compliance', icon: AlertCircle, color: 'from-red-500 to-red-600' },
    { id: 'pricing', title: '💰 Pricing Brain', icon: TrendingUp, color: 'from-green-500 to-green-600' },
    { id: 'supplier', title: '🤝 Supplier Intel', icon: Users, color: 'from-indigo-500 to-indigo-600' },
    { id: 'launch', title: '📣 Launch Intel', icon: Rocket, color: 'from-pink-500 to-pink-600' },
  ];

  // India modules (Layer 2)
  const indiaModules = [
    { id: 'i1', title: '🛒 Multi-Platform', color: 'from-orange-500 to-orange-600' },
    { id: 'i2', title: '🏭 Sourcing Hubs', color: 'from-purple-500 to-purple-600' },
    { id: 'i3', title: '📋 GST & Compliance', color: 'from-green-500 to-green-600' },
    { id: 'i4', title: '💰 Regional Pricing', color: 'from-amber-500 to-amber-600' },
    { id: 'i5', title: '🤝 B2B Wholesale', color: 'from-cyan-500 to-cyan-600' },
    { id: 'i6', title: '🚚 Logistics', color: 'from-pink-500 to-pink-600' },
    { id: 'i7', title: '🗣️ Bharat Voice', color: 'from-blue-400 to-blue-500' },
    { id: 'i8', title: '🤥 Fake Review Detector', color: 'from-red-500 to-red-600' },
    { id: 'i9', title: '📦 Festival Demand', color: 'from-yellow-500 to-yellow-600' },
    { id: 'i10', title: '⚖️ Policy Shield', color: 'from-gray-500 to-gray-600' },
  ];

  const modules = mode === 'global' ? globalModules : indiaModules;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white">GlobalSeller AI</h1>
              <p className="text-blue-200 mt-1">
                {mode === 'global' ? 'Cross-Border E-Commerce Intelligence' : 'India Commerce Intelligence'}
              </p>
            </div>
            <button
              onClick={() => setShowAssistant(!showAssistant)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              AI Assistant
            </button>
          </div>

          {/* Global/India Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMode('global');
                setActiveModule('market');
                setAnalysisResults(null);
              }}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                mode === 'global'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20'
              }`}
            >
              🌍 GLOBAL
            </button>
            <button
              onClick={() => {
                setMode('india');
                setActiveModule('i1');
                setAnalysisResults(null);
              }}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                mode === 'india'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20'
              }`}
            >
              🇮🇳 INDIA
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Module Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 sticky top-8">
              <GlobalSellerIntelligenceSidebar
                mode={mode}
                setMode={setMode}
                setActiveModule={setActiveModule}
                setAnalysisResults={setAnalysisResults}
              />
              <h3 className="text-white font-bold mb-4">
                {mode === 'global' ? '7 Global Modules' : '10 India Modules'}
              </h3>
              <div className="space-y-2">
                {modules.map((mod: any) => (
                  <button
                    key={mod.id}
                    onClick={() => {
                      setActiveModule(mod.id);
                      setAnalysisResults(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      activeModule === mod.id
                        ? 'bg-gradient-to-r ' + mod.color + ' text-white shadow-lg'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="text-sm font-semibold">{mod.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Module Content */}
          <div className="lg:col-span-3">
            {/* GLOBAL MODULES */}
            {mode === 'global' && activeModule === 'market' && <MarketExpansionModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'global' && activeModule === 'supply' && <SupplyChainModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'global' && activeModule === 'listing' && <ListingStudioModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'global' && activeModule === 'compliance' && <ComplianceModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'global' && activeModule === 'pricing' && <PricingBrainModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'global' && activeModule === 'supplier' && <SupplierIntelligenceModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'global' && activeModule === 'launch' && <LaunchIntelModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}

            {/* INDIA MODULES */}
            {mode === 'india' && activeModule === 'i1' && <IndiaMultiPlatformModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'india' && activeModule === 'i2' && <IndiaSourcingHubsModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'india' && activeModule === 'i3' && <IndiaGSTComplianceModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'india' && activeModule === 'i4' && <IndiaRegionalPricingModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'india' && activeModule === 'i5' && <IndiaB2BWholesaleModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'india' && activeModule === 'i6' && <IndiaLogisticsModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'india' && activeModule === 'i7' && <IndiaBharatVoiceModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'india' && activeModule === 'i8' && <IndiaFakeReviewDetectorModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'india' && activeModule === 'i9' && <IndiaFestivalDemandModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
            {mode === 'india' && activeModule === 'i10' && <IndiaPolicyShieldModule onResults={setAnalysisResults} isLoading={isLoading} setIsLoading={setIsLoading} results={analysisResults} />}
          </div>
        </div>
      </div>

      {/* AI Assistant Modal */}
      {showAssistant && <AIAssistantModal onClose={() => setShowAssistant(false)} />}
    </div>
  );
}

// ============= MARKET EXPANSION MODULE =============
function MarketExpansionModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ productName: '', category: '', cost: '', originCountry: 'India' });

  const handleAnalyze = async () => {
    if (!formData.productName || !formData.category || !formData.cost) {
      alert('Please fill in all required fields');
      return;
    }
    setIsLoading(true);
    try {
      // Construct natural language query for AWS backend
      const query = `Analyze market expansion opportunities for: Product: ${formData.productName}, Category: ${formData.category}, Cost: $${formData.cost}, Origin: ${formData.originCountry}. Provide ranked opportunity scores across major Amazon marketplaces, cultural insights, and a 90-day launch plan.`;
      
      const response: EngineResponse = await askEngine('globalseller', query);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze market');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-8 h-8 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Market Expansion Analysis</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">
            Enter your product details to get ranked opportunity scores across all major Amazon marketplaces, cultural insights, and a complete 90-day launch plan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Product Name *</label>
              <input
                type="text"
                placeholder="e.g., Jaipur Brass Lamp"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Category *</label>
              <input
                type="text"
                placeholder="e.g., Home Decor, Electronics"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Product Cost (USD) *</label>
              <input
                type="number"
                placeholder="e.g., 25"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Origin Country</label>
              <select
                value={formData.originCountry}
                onChange={(e) => setFormData({ ...formData, originCountry: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="India" className="bg-slate-900">India</option>
                <option value="China" className="bg-slate-900">China</option>
                <option value="Vietnam" className="bg-slate-900">Vietnam</option>
                <option value="Bangladesh" className="bg-slate-900">Bangladesh</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Analyzing Markets...
              </>
            ) : (
              'Analyze All Marketplaces'
            )}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// ============= SUPPLY CHAIN RISK MODULE =============
function SupplyChainModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ manufacturerLocation: '', currentInventory: '', dailySales: '' });

  const handleAnalyze = async () => {
    if (!formData.manufacturerLocation || !formData.currentInventory || !formData.dailySales) {
      alert('Please fill in all required fields');
      return;
    }
    setIsLoading(true);
    try {
      // Construct natural language query for AWS backend
      const query = `Analyze supply chain risk: Manufacturer Location: ${formData.manufacturerLocation}, Current Inventory: ${formData.currentInventory} units, Daily Sales: ${formData.dailySales} units. Provide risk assessment, inventory recommendations, and alternative sourcing options.`;
      
      const response: EngineResponse = await askEngine('globalseller', query);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze supply chain');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <AlertCircle className="w-8 h-8 text-yellow-400" />
        <h2 className="text-2xl font-bold text-white">Supply Chain Risk Assessment</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">
            Assess geographic risks, calculate inventory runway, and get alternative supplier recommendations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Manufacturer Location *</label>
              <input
                type="text"
                placeholder="e.g., Tianjin, China"
                value={formData.manufacturerLocation}
                onChange={(e) => setFormData({ ...formData, manufacturerLocation: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Current Inventory (Units) *</label>
              <input
                type="number"
                placeholder="e.g., 500"
                value={formData.currentInventory}
                onChange={(e) => setFormData({ ...formData, currentInventory: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-200 mb-2">Daily Sales (Units) *</label>
              <input
                type="number"
                placeholder="e.g., 15"
                value={formData.dailySales}
                onChange={(e) => setFormData({ ...formData, dailySales: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Assessing Risk...
              </>
            ) : (
              'Assess Supply Chain Risk'
            )}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// ============= LISTING STUDIO MODULE =============
function ListingStudioModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ originalListing: '', targetMarketplace: '' });

  const handleAnalyze = async () => {
    if (!formData.originalListing || !formData.targetMarketplace) {
      alert('Please fill in all required fields');
      return;
    }
    setIsLoading(true);
    try {
      // Construct natural language query for AWS backend
      const query = `Optimize product listing for international marketplace: Original Listing: ${formData.originalListing}. Target Marketplace: ${formData.targetMarketplace}. Provide culturally adapted listing with localized keywords, titles, and descriptions.`;
      
      const response: EngineResponse = await askEngine('globalseller', query);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to optimize listing');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-8 h-8 text-purple-400" />
        <h2 className="text-2xl font-bold text-white">Listing Studio</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">
            Not just translation — cultural transformation. Rewrite your listing for local buyer psychology and search behavior.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Current Listing (English) *</label>
              <textarea
                placeholder="Paste your full product listing (title, bullets, description)..."
                value={formData.originalListing}
                onChange={(e) => setFormData({ ...formData, originalListing: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 h-32"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Target Marketplace *</label>
              <select
                value={formData.targetMarketplace}
                onChange={(e) => setFormData({ ...formData, targetMarketplace: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="" className="bg-slate-900">Select marketplace...</option>
                <option value="US" className="bg-slate-900">Amazon US</option>
                <option value="UK" className="bg-slate-900">Amazon UK</option>
                <option value="DE" className="bg-slate-900">Amazon Germany</option>
                <option value="FR" className="bg-slate-900">Amazon France</option>
                <option value="IT" className="bg-slate-900">Amazon Italy</option>
                <option value="JP" className="bg-slate-900">Amazon Japan</option>
                <option value="CA" className="bg-slate-900">Amazon Canada</option>
                <option value="AU" className="bg-slate-900">Amazon Australia</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Optimizing Listing...
              </>
            ) : (
              'Transform Listing'
            )}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// ============= COMPLIANCE MODULE =============
function ComplianceModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState<{ productType: string; materials: string; targetMarkets: string[] }>({ productType: '', materials: '', targetMarkets: [] });

  const handleAnalyze = async () => {
    if (!formData.productType || !formData.materials || formData.targetMarkets.length === 0) {
      alert('Please fill in all required fields');
      return;
    }
    setIsLoading(true);
    try {
      // Construct natural language query for AWS backend
      const query = `Analyze compliance requirements: Product Type: ${formData.productType}, Materials: ${formData.materials}, Target Markets: ${formData.targetMarkets.join(', ')}. Provide certifications needed, cost estimates, timelines, and documentation checklists.`;
      
      const response: EngineResponse = await askEngine('globalseller', query);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze compliance');
    } finally {
      setIsLoading(false);
    }
  };

  const markets = ['US', 'UK', 'DE', 'FR', 'IT', 'JP', 'CA', 'AU'];

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <h2 className="text-2xl font-bold text-white">Compliance Navigator</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">
            Get exact certifications, cost estimates, timelines, and documentation checklists for your target markets.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Product Type *</label>
              <input
                type="text"
                placeholder="e.g., Electronics, Textiles, Children's Toys"
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Materials/Content *</label>
              <input
                type="text"
                placeholder="e.g., Brass, Plastic, Cotton, Lead-free..."
                value={formData.materials}
                onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Target Marketplaces *</label>
              <div className="grid grid-cols-4 gap-2">
                {markets.map((market) => (
                  <label key={market} className="flex items-center gap-2 text-gray-200 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={formData.targetMarkets.includes(market)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, targetMarkets: [...formData.targetMarkets, market] });
                        } else {
                          setFormData({ ...formData, targetMarkets: formData.targetMarkets.filter((m: string) => m !== market) });
                        }
                      }}
                      className="w-4 h-4 rounded"
                    />
                    {market}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Analyzing Compliance...
              </>
            ) : (
              'Get Compliance Roadmap'
            )}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// ============= PRICING BRAIN MODULE =============
function PricingBrainModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ product: '', cost: '', targetMarket: '' });

  const handleAnalyze = async () => {
    if (!formData.product || !formData.cost || !formData.targetMarket) {
      alert('Please fill in all required fields');
      return;
    }
    setIsLoading(true);
    try {
      // Construct natural language query for AWS backend
      const query = `Analyze pricing strategy: Product: ${formData.product}, Cost: $${formData.cost}, Target Market: ${formData.targetMarket}. Provide competitor analysis, recommended pricing, seasonal calendar, and competitive tactics.`;
      
      const response: EngineResponse = await askEngine('globalseller', query);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze pricing');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-8 h-8 text-green-400" />
        <h2 className="text-2xl font-bold text-white">Pricing Brain</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">
            Get competitor analysis, recommended pricing, seasonal calendar, and competitive tactics warnings.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Product Name *</label>
              <input
                type="text"
                placeholder="e.g., Brass Lamp 12 inches"
                value={formData.product}
                onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Product Cost (USD) *</label>
              <input
                type="number"
                placeholder="e.g., 25"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-200 mb-2">Target Marketplace *</label>
              <select
                value={formData.targetMarket}
                onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="" className="bg-slate-900">Select marketplace...</option>
                <option value="US" className="bg-slate-900">Amazon US</option>
                <option value="UK" className="bg-slate-900">Amazon UK</option>
                <option value="DE" className="bg-slate-900">Amazon Germany</option>
                <option value="FR" className="bg-slate-900">Amazon France</option>
                <option value="JP" className="bg-slate-900">Amazon Japan</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Analyzing Pricing...
              </>
            ) : (
              'Get Price Recommendation'
            )}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// ============= SUPPLIER INTELLIGENCE MODULE =============
function SupplierIntelligenceModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ manufacturerName: '', country: '', productCategory: '' });

  const handleAnalyze = async () => {
    if (!formData.manufacturerName || !formData.country || !formData.productCategory) {
      alert('Please fill in all required fields');
      return;
    }
    setIsLoading(true);
    try {
      // Construct natural language query for AWS backend
      const query = `Evaluate supplier: Manufacturer Name: ${formData.manufacturerName}, Country: ${formData.country}, Product Category: ${formData.productCategory}. Provide trust score (0-100), risk flags, verification checklist, and contract protection tips.`;
      
      const response: EngineResponse = await askEngine('globalseller', query);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to score supplier');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-8 h-8 text-indigo-400" />
        <h2 className="text-2xl font-bold text-white">Supplier Intelligence</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">
            Get a trust score (0-100) for any manufacturer with risk flags, verification checklist, and contract protection tips.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Manufacturer Name *</label>
              <input
                type="text"
                placeholder="e.g., XYZ Manufacturing Ltd"
                value={formData.manufacturerName}
                onChange={(e) => setFormData({ ...formData, manufacturerName: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Country *</label>
              <input
                type="text"
                placeholder="e.g., China, India, Vietnam"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-200 mb-2">Product Category *</label>
              <input
                type="text"
                placeholder="e.g., Electronics, Textiles, Home Goods"
                value={formData.productCategory}
                onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Scoring Supplier...
              </>
            ) : (
              'Get Supplier Report'
            )}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// ============= LAUNCH INTEL MODULE =============
function LaunchIntelModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ productCategory: '', targetMarket: '', budget: '' });

  const handleAnalyze = async () => {
    if (!formData.productCategory || !formData.targetMarket || !formData.budget) {
      alert('Please fill in all required fields');
      return;
    }
    setIsLoading(true);
    try {
      // Construct natural language query for AWS backend
      const query = `Create product launch plan: Product Category: ${formData.productCategory}, Target Market: ${formData.targetMarket}, Budget: $${formData.budget}. Provide week-by-week launch playbook with keyword phases, ad budget allocation, and expected rank progression.`;
      
      const response: EngineResponse = await askEngine('globalseller', query);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate launch plan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <Rocket className="w-8 h-8 text-pink-400" />
        <h2 className="text-2xl font-bold text-white">Launch Intel</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">
            Get a data-backed week-by-week launch playbook with keyword phases, ad budget allocation, and expected rank progression.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Product Category *</label>
              <input
                type="text"
                placeholder="e.g., Electronics, Home Decor"
                value={formData.productCategory}
                onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Target Marketplace *</label>
              <select
                value={formData.targetMarket}
                onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="" className="bg-slate-900">Select marketplace...</option>
                <option value="US" className="bg-slate-900">Amazon US</option>
                <option value="UK" className="bg-slate-900">Amazon UK</option>
                <option value="DE" className="bg-slate-900">Amazon Germany</option>
                <option value="FR" className="bg-slate-900">Amazon France</option>
                <option value="JP" className="bg-slate-900">Amazon Japan</option>
              </select>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-200 mb-2">Initial Marketing Budget (USD) *</label>
              <input
                type="number"
                placeholder="e.g., 1000"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Generating Playbook...
              </>
            ) : (
              'Generate Launch Plan'
            )}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// ============= RESULTS DISPLAY COMPONENT =============
function ResultsDisplay({ results }: any) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-lg p-4">
        <p className="text-sm text-blue-200 italic">AI Generated Analysis</p>
      </div>

      {typeof results === 'string' ? (
        <div className="bg-white/10 rounded-lg p-6 border border-white/10">
          <div className="text-gray-100 whitespace-pre-wrap leading-relaxed">{results}</div>
        </div>
      ) : (
        <div className="bg-white/10 rounded-lg p-6 border border-white/10">
          <pre className="text-gray-100 text-sm overflow-auto">{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}

      <p className="text-gray-400 text-sm italic text-center">
        Which of the 7 modules do you want to go deeper on?
      </p>
    </div>
  );
}

// ============= INDIA MODULES (LAYER 2) =============

// I1: Multi-Platform Expansion
function IndiaMultiPlatformModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ productName: '', category: '' });

  const handleAnalyze = async () => {
    if (!formData.productName || !formData.category) {
      alert('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const prompt = `You are an Indian e-commerce platform strategist. Analyze this product for Amazon.in, Flipkart, Meesho, JioMart, Snapdeal.

Product: ${formData.productName}
Category: ${formData.category}

Provide scores (0-100) for each platform with:
- Why this score
- Commission rates
- Customer demographics
- Product-platform fit reasoning

FORMAT:
AMAZON.IN: Score [X/100]
Reasoning: [specific factors]
Commission: [%]
Demographics: [details]

FLIPKART: Score [X/100]
...

MEESHO: Score [X/100]
...

JIOMART: Score [X/100]
...

SNAPDEAL: Score [X/100]
...

PRIMARY RECOMMENDATION: [Which platform - explain why]`;

      const response: EngineResponse = await askEngine('globalseller', prompt);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
      alert('Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">🛒 Multi-Platform Expansion</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">
            Compare Amazon.in, Flipkart, Meesho, JioMart, Snapdeal for your product
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Product name" value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <input type="text" placeholder="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>

          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
            {isLoading ? <><Loader className="w-5 h-5 animate-spin" /> Analyzing...</> : 'Analyze Platforms'}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// I2: Sourcing Hubs
function IndiaSourcingHubsModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ productCategory: '' });

  const handleAnalyze = async () => {
    if (!formData.productCategory) {
      alert('Please fill in the category');
      return;
    }
    setIsLoading(true);
    try {
      const prompt = `You are an expert in Indian manufacturing geography. Recommend the best Indian manufacturing hubs for this product.

Product Category: ${formData.productCategory}

For each of the top 3 recommended hubs, provide:
- Hub name + city
- Specialization
- Average cost estimate
- Quality tier
- MOQ (Minimum Order Quantity) ranges
- Distance/logistics notes
- How to contact/approach

Known hubs: Moradabad (brass/metal), Tiruppur (knitwear), Surat (textiles), Jaipur (handicrafts), Ludhiana (woollens), Agra (footwear), Firozabad (glass), Panipat (blankets), Rajkot (engineering).

FORMAT:
HUB 1: [Name], [City]
Specialization: [details]
Cost Range: ₹[X] - ₹[Y] per unit
Quality: [tier description]
MOQ: [range]
Logistics: [notes]
Contact Strategy: [approach]

HUB 2: ...

HUB 3: ...`;

      const response: EngineResponse = await askEngine('globalseller', prompt);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">🏭 Indian Sourcing Hubs</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">Find the best Indian manufacturing hubs for your product</p>
          <input type="text" placeholder="Product category (e.g., Brass items, Garments)" value={formData.productCategory} onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
            {isLoading ? <><Loader className="w-5 h-5 animate-spin" /> Finding Hubs...</> : 'Find Sourcing Hubs'}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// I3: GST Compliance
function IndiaGSTComplianceModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ productType: '', businessState: '' });

  const handleAnalyze = async () => {
    if (!formData.productType || !formData.businessState) {
      alert('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const prompt = `You are a GST and Indian business compliance expert. Provide compliance guidance.

Product Type: ${formData.productType}
Business State: ${formData.businessState}

Provide (in INR where applicable):
- GST slab (0%, 5%, 12%, 18%, 28%)
- HSN code
- State-specific licenses needed
- FSSAI (if food)
- BIS (if electronics/safety items)
- ISI marks if applicable
- Registration checklist
- Estimated compliance cost
- Timeline (weeks)

FORMAT:
GST SLAB: [X%]
Reasoning: [why this slab]

HSN CODE: [code] - [description]

LICENSES NEEDED:
1. [License name] - Cost: ₹[X], Timeline: [Y] weeks
2. ...

CERTIFICATIONS:
- FSSAI: [Needed/Not needed] - Cost: ₹[X]
- BIS: [Needed/Not needed] - Cost: ₹[X]

STATE-SPECIFIC (${formData.businessState}):
[Details]

REGISTRATION:
1. [Step]
2. [Step]
3. [Step]

TOTAL ESTIMATED COST: ₹[X]
TOTAL TIMELINE: [X] weeks`;

      const response: EngineResponse = await askEngine('globalseller', prompt);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">📋 GST & India Compliance</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">Get GST, licenses, and compliance requirements for your product in India</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Product type" value={formData.productType} onChange={(e) => setFormData({ ...formData, productType: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
            <input type="text" placeholder="Your state" value={formData.businessState} onChange={(e) => setFormData({ ...formData, businessState: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>

          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
            {isLoading ? <><Loader className="w-5 h-5 animate-spin" /> Analyzing...</> : 'Get Compliance Guide'}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// I4: Regional Pricing
function IndiaRegionalPricingModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ product: '', basePrice: '' });

  const handleAnalyze = async () => {
    if (!formData.product || !formData.basePrice) {
      alert('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const prompt = `You are an expert in Indian regional consumer markets and purchasing power.

Product: ${formData.product}
Base Price: ₹${formData.basePrice}

Analyze purchasing power differences and provide optimal prices for Indian regions:

TIER 1 METROS (Mumbai, Delhi, Bangalore, Pune):
Recommended Price: ₹[X]
Purchasing Power: [HIGH]
Rationale: [specific insights]

TIER 2 CITIES (Lucknow, Jaipur, Indore, Coimbatore, Chandigarh):
Recommended Price: ₹[X]
Purchasing Power: [MEDIUM-HIGH]
Rationale: [specific insights]

TIER 3 CITIES & TOWNS:
Recommended Price: ₹[X]
Purchasing Power: [MEDIUM]
Rationale: [specific insights]

TIER 4 RURAL:
Recommended Price: ₹[X]
Purchasing Power: [LOW-MEDIUM]
Rationale: [specific insights]

SEASONAL/FESTIVAL PRICING:
- Diwali (Oct-Nov): +[X%]
- Holi (Mar): +[Y%]
- Year-end (Nov-Dec): +[Z%]
- New Year (Jan): +[A%]
- Summer (Apr-May): [notes]

REGIONAL FESTIVALS:
[Details for key festivals that affect your product category]

COMPETITOR PRICING BY REGION:
[How competitors price in different regions]`;

      const response: EngineResponse = await askEngine('globalseller', prompt);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">💰 State-wise Regional Pricing</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">Get pricing recommendations for different Indian regions</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Product name" value={formData.product} onChange={(e) => setFormData({ ...formData, product: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <input type="number" placeholder="Base price (₹)" value={formData.basePrice} onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
            {isLoading ? <><Loader className="w-5 h-5 animate-spin" /> Analyzing...</> : 'Get Regional Pricing'}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// I5: B2B Wholesale
function IndiaB2BWholesaleModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ product: '', quantity: '' });

  const handleAnalyze = async () => {
    if (!formData.product || !formData.quantity) {
      alert('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const prompt = `You are an Indian B2B wholesale expert. Analyze B2B opportunity.

Product: ${formData.product}
Bulk Quantity: ${formData.quantity} units

Provide:
1. WHOLESALE BUYER PROFILE:
   - Who typically buys this in bulk
   - Average order size
   - Payment preferences

2. PLATFORMS TO LIST ON:
   - IndiaMART
   - TradeIndia
   - Udaan
   - Moglix
   - IndiaBizForSale
   [Ranking for this product - which platforms are best]

3. PRICING STRATEGY:
   - Standard wholesale formula (typically 40-60% of MRP)
   - Price for ${formData.quantity} units
   - Price breaks for larger volumes (10K, 50K, 100K units)
   
4. PITCH TEMPLATE:
   [Draft a short pitch for bulk buyers]

5. MOQ RECOMMENDATION:
   - Recommended MOQ for your product
   - Payment terms (30% advance, 70% on delivery)
   - Production timeline

6. LOGISTICS FOR BULK:
   - Shipping partners for bulk orders
   - Cost optimization

7. CONTRACT ESSENTIALS:
   - Key terms to include
   - Quality guarantees

FORMAT:
BUYER PROFILE: [details]

BEST PLATFORMS: 1. [Name] 2. [Name] 3. [Name]

WHOLESALE PRICING:
${formData.quantity} units: ₹[X] per unit = ₹[Total]
10,000 units: ₹[X] per unit
50,000 units: ₹[X] per unit

PITCH:
"[Template pitch]"

MOQ: [X] units
MOQ Cost: ₹[Y]
Timeline: [Weeks]

RECOMMENDED MOQ FOR YOUR PRODUCT: [X] units`;

      const response: EngineResponse = await askEngine('globalseller', prompt);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">🤝 B2B Wholesale Connect</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">Get B2B wholesale strategy and buyer profiles</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Product" value={formData.product} onChange={(e) => setFormData({ ...formData, product: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            <input type="number" placeholder="Quantity for analysis (units)" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>

          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
            {isLoading ? <><Loader className="w-5 h-5 animate-spin" /> Analyzing...</> : 'Get Wholesale Strategy'}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// I6: Logistics
function IndiaLogisticsModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ weight: '', originCity: '', targetRegions: '' });

  const handleAnalyze = async () => {
    if (!formData.weight || !formData.originCity || !formData.targetRegions) {
      alert('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const prompt = `You are an Indian logistics expert. Optimize shipping routes.

Product Weight: ${formData.weight} kg
Origin City: ${formData.originCity}
Target Regions: ${formData.targetRegions}

Known logistics partners: Delhivery, Shiprocket, Ekart (Flipkart), Shadowfax, DTDC, Blue Dart, India Post.

PROVIDE:

PARTNER COMPARISON:
Partner | Per KG Rate | Delivery Time | COD Available | Returns | Best For
Delhivery | [₹X] | [Days] | [Yes/No] | [Details] | [Route]
Shiprocket | [₹X] | [Days] | [Yes/No] | [Details] | [Route]
Ekart | [₹X] | [Days] | [Yes/No] | [Details] | [Route]
DTDC | [₹X] | [Days] | [Yes/No] | [Details] | [Route]
Blue Dart | [₹X] | [Days] | [Yes/No] | [Details] | [Route]
India Post | [₹X] | [Days] | [Yes/No] | [Details] | [Route]

COST ESTIMATE:
From ${formData.originCity} to:
- North India: ₹[X]
- South India: ₹[X]
- East India: ₹[X]
- West India: ₹[X]
- Northeast: ₹[X]

RECOMMENDATION:
Best overall: [Partner] for [reasons]
Budget option: [Partner]
Premium/Speed: [Partner]
COD specialist: [Partner]

RETURN HANDLING:
[Details on reverse logistics]

PICKUP STRATEGY:
[How to arrange pickups]`;

      const response: EngineResponse = await askEngine('globalseller', prompt);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">🚚 India Logistics Optimizer</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">Find the best logistics partner for your shipping routes</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="number" placeholder="Product weight (kg)" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500" />
            <input type="text" placeholder="Origin city" value={formData.originCity} onChange={(e) => setFormData({ ...formData, originCity: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500" />
            <input type="text" placeholder="Target regions (comma separated)" value={formData.targetRegions} onChange={(e) => setFormData({ ...formData, targetRegions: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500" />
          </div>

          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
            {isLoading ? <><Loader className="w-5 h-5 animate-spin" /> Optimizing...</> : 'Optimize Logistics'}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// I7: Bharat Voice Assistant
function IndiaBharatVoiceModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ question: '', language: 'hi' });

  const handleAnalyze = async () => {
    if (!formData.question) {
      alert('Please type your question');
      return;
    }
    setIsLoading(true);
    try {
      const languageMap: any = {
        'hi': 'Hindi',
        'te': 'Telugu',
        'ta': 'Tamil',
        'bn': 'Bengali',
        'mr': 'Marathi',
        'kn': 'Kannada',
        'ml': 'Malayalam',
        'gu': 'Gujarati',
        'en': 'English'
      };

      const prompt = `You are a multilingual Indian shopping assistant. The user is asking in ${languageMap[formData.language]}.

User question: "${formData.question}"

RESPOND IN THE SAME LANGUAGE (${languageMap[formData.language]}).

Give practical shopping advice in simple language. Mention Indian price ranges in INR. Reference familiar Indian contexts (local shops, power cuts, family decisions, etc.). Be conversational and helpful like a trusted friend giving advice.

Include:
- What to look for before buying
- Red flags to avoid
- Expected price range in INR
- Which platform/store to buy from
- Tips for Indian buyers

Keep it simple, practical, and in ${languageMap[formData.language]}.`;

      const response: EngineResponse = await askEngine('globalseller', prompt);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">🗣️ Bharat Voice Assistant</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">Ask shopping advice in your language. We'll respond in the same language with practical Indian tips.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Select Language</label>
              <select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="hi" className="bg-slate-900">हिंदी (Hindi)</option>
                <option value="te" className="bg-slate-900">తెలుగు (Telugu)</option>
                <option value="ta" className="bg-slate-900">தமிழ் (Tamil)</option>
                <option value="bn" className="bg-slate-900">বাংলা (Bengali)</option>
                <option value="mr" className="bg-slate-900">मराठी (Marathi)</option>
                <option value="kn" className="bg-slate-900">ಕನ್ನಡ (Kannada)</option>
                <option value="ml" className="bg-slate-900">മലയാളം (Malayalam)</option>
                <option value="gu" className="bg-slate-900">ગુજરાતી (Gujarati)</option>
                <option value="en" className="bg-slate-900">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Your Question *</label>
              <textarea placeholder="Ask anything about shopping, products, prices..." value={formData.question} onChange={(e) => setFormData({ ...formData, question: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 h-24" />
            </div>
          </div>

          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
            {isLoading ? <><Loader className="w-5 h-5 animate-spin" /> Thinking...</> : 'Get Advice'}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// I8: Fake Review Detector
function IndiaFakeReviewDetectorModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ productInfo: '' });

  const handleAnalyze = async () => {
    if (!formData.productInfo) {
      alert('Please enter product name or URL');
      return;
    }
    setIsLoading(true);
    try {
      const prompt = `You are an e-commerce fraud detection expert specializing in Indian marketplaces (Amazon.in, Flipkart, Meesho).

Product Info: ${formData.productInfo}

Analyze for FAKE REVIEWS and PRICE MANIPULATION:

FAKE REVIEW RED FLAGS TO LOOK FOR:
1. Review patterns
   - Sudden surge in reviews (all on same date)
   - Generic review text ("Best product", "Good quality")
   - 5-star clustering
   - Similar language/phrases
   
2. Incentivized reviews
   - Keywords: "received as gift", "at discounted price"
   - Seller-bought patterns
   
3. Unverified vs verified
   - Low % of "Verified Purchase" reviews
   
4. Reviewer patterns
   - New accounts only
   - Same reviewers posting on multiple sellers

PRICE MANIPULATION RED FLAGS:
1. Pre-sale inflation
   - Original price: ₹5000
   - "Discount" price: ₹2000
   - But market rate is ₹2500
   
2. Fake strikethrough prices
   - Unrealistic "original" price claims
   
3. Super-temporary discounts
   - 70% off for 2 hours only
   
AUTHENTICITY SIGNALS (REAL REVIEWS):
- Detailed descriptions of product quality/flaws
- Specific use cases mentioned
- Mix of 4-5 star with occasional 3-4 stars
- Constructive criticism
- Time-stamped verified purchases
- Natural language variation

FORMAT:
FAKE REVIEW RISK: [HIGH/MEDIUM/LOW]

RED FLAGS FOUND:
1. [Flag] - Severity: [HIGH/MEDIUM/LOW]
2. [Flag]
3. [Flag]

PRICE FAIRNESS: [FAIR/LIKELY INFLATED/HIGH RISK]
Market average price: ₹[X]
Listed price: ₹[Y]
Assessment: [Fair/Overpriced by X%]

AUTHENTICITY SCORE: [X/10]

RECOMMENDATIONS:
1. [Check this before buying]
2. [Verify this with seller]
3. [Compare with similar products on other platforms]

FINAL VERDICT: [TRUST/CAUTION/AVOID]`;

      const response: EngineResponse = await askEngine('globalseller', prompt);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">🤥 Fake Review Detector</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">Check for fake reviews, price manipulation, and authenticity before buying</p>

          <textarea placeholder="Enter product name, category, or paste key details..." value={formData.productInfo} onChange={(e) => setFormData({ ...formData, productInfo: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 h-24" />

          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
            {isLoading ? <><Loader className="w-5 h-5 animate-spin" /> Analyzing...</> : 'Detect Fraud'}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// I9: Festival Demand Forecaster
function IndiaFestivalDemandModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ productCategory: '', sellerState: '' });

  const handleAnalyze = async () => {
    if (!formData.productCategory || !formData.sellerState) {
      alert('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const prompt = `You are an expert in Indian festival commerce cycles and seasonal demand.

Product Category: ${formData.productCategory}
Seller Location: ${formData.sellerState}

ANALYZE FESTIVAL DEMAND CALENDAR:

Key Festivals: Diwali (Oct-Nov), Navratri (Oct), Dussehra (Oct), Eid (varies), Onam (Aug-Sep), Pongal (Jan), Durga Puja (Oct, Bengal), Christmas (Dec), Holi (Mar), Raksha Bandhan (Aug).

FOR EACH RELEVANT FESTIVAL:
1. Festival name + dates
2. Relevance for ${formData.productCategory}
3. Expected demand multiplier (e.g., 3-5x normal sales)
4. Stock quantity recommendation
5. When to start stocking (weeks before festival)
6. Regional importance (which regions matter most)
7. Messaging strategy for this festival

REGIONAL CONSIDERATIONS FOR ${formData.sellerState}:
- Local festivals that matter most
- Cultural shopping patterns
- Regional celebration specifics

FORMAT:
FESTIVAL DEMAND CALENDAR (Next 12 Months):

DIWALI (Oct-Nov):
Relevance for your category: [Details]
Expected demand multiplier: [X-5x]
Recommended stock: [X] units
Start stocking: [Y] weeks before
Regional importance: [Details for your state]
Messaging: "Festival messaging you should use"

HOLI (Mar):
...

[Continue for all relevant festivals]

REGIONAL FESTIVALS FOR ${formData.sellerState}:
[Include state-specific festivals]

QUARTERLY DEMAND PATTERN:
Q1 (Jan-Mar): [Demand level] - [Drivers]
Q2 (Apr-Jun): [Demand level] - [Drivers]
Q3 (Jul-Sep): [Demand level] - [Drivers]
Q4 (Oct-Dec): [Demand level] - [Drivers]

ANNUAL REVENUE DISTRIBUTION:
[Pie breakdown: 25% from Diwali, 15% from Holi, etc.]

STOCK PLANNING SUMMARY:
[Specific stock quantities to hold before each major festival]`;

      const response: EngineResponse = await askEngine('globalseller', prompt);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">📦 Festival Demand Forecaster</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">Get a 12-month festival demand calendar for your product and state</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Product category" value={formData.productCategory} onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
            <input type="text" placeholder="Your state" value={formData.sellerState} onChange={(e) => setFormData({ ...formData, sellerState: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
          </div>

          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
            {isLoading ? <><Loader className="w-5 h-5 animate-spin" /> Forecasting...</> : 'Get Demand Calendar'}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// I10: Policy Shield
function IndiaPolicyShieldModule({ onResults, isLoading, setIsLoading, results }: any) {
  const [formData, setFormData] = useState({ concern: '' });

  const handleAnalyze = async () => {
    if (!formData.concern) {
      alert('Please describe your concern');
      return;
    }
    setIsLoading(true);
    try {
      const prompt = `You are an Amazon.in and Flipkart seller policy expert.

Seller Concern: "${formData.concern}"

PROVIDE:

1. POLICY RISK ASSESSMENT:
   - Risk level: [LOW/MEDIUM/HIGH/CRITICAL]
   - Violation severity: [What violation likely occurred]
   
2. POLICY REFERENCE:
   - Exact policy clause that applies
   - Platform-specific details (Amazon vs Flipkart if relevant)
   
3. IMMEDIATE ACTIONS:
   - Step 1: [Action]
   - Step 2: [Action]
   - Step 3: [Action]
   
4. IF SUSPENDED:
   - Warning signs you ignored
   - Complete Plan of Action (POA) template:
     * Part 1: Root Cause Analysis
     * Part 2: Corrective Actions
     * Part 3: Preventive Measures
   
5. APPEAL LETTER DRAFT:
   [Professional appeal template ready to submit]

6. LONG-TERM PREVENTION:
   - Specific systems to prevent recurrence
   - Metrics to monitor
   - Documentation to keep

FORMAT:
RISK LEVEL: [CRITICAL]

VIOLATION:
[Policy name and exact clause]

IMMEDIATE ACTIONS:
1. [Action] - Do this TODAY
2. [Action] - Do this within 24 hours
3. [Action] - Do this within 48 hours

POA TEMPLATE (if suspended):

---
Dear [Platform] Support Team,

PART 1: ROOT CAUSE ANALYSIS
We understand the violation occurred due to:
[Detailed explanation of what went wrong]

PART 2: CORRECTIVE ACTIONS
We have taken the following steps to fix the issue:
1. [Action taken]
2. [Action taken]
3. [Action taken]

PART 3: PREVENTIVE MEASURES
To ensure this never happens again:
1. [System/process to prevent]
2. [Monitoring mechanism]
3. [Escalation protocol]

Respectfully,
[Your name]
---

PREVENTION CHECKLIST:
[ ] [Item to track]
[ ] [Item to monitor]
[ ] [Item to audit]`;

      const response: EngineResponse = await askEngine('globalseller', prompt);
      onResults({ analysis: response.answer });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">⚖️ Policy Shield</h2>
        <AIBadge />
      </div>

      {!results ? (
        <div className="space-y-6">
          <p className="text-gray-300">Get policy guidance, risk assessment, and appeal letter templates if suspended</p>

          <textarea placeholder="Describe your policy concern or paste the suspension notice..." value={formData.concern} onChange={(e) => setFormData({ ...formData, concern: e.target.value })} className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 h-24" />

          <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
            {isLoading ? <><Loader className="w-5 h-5 animate-spin" /> Analyzing...</> : 'Get Policy Guidance'}
          </button>
        </div>
      ) : (
        <ResultsDisplay results={results} />
      )}
    </div>
  );
}

// ============= AI ASSISTANT MODAL =============
function AIAssistantModal({ onClose }: any) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages([...messages, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response: EngineResponse = await askEngine('globalseller', userMessage);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">GlobalSeller AI Assistant</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <p className="text-gray-400">
                Ask me anything about global selling or India commerce.<br />
                I combine insights from all 17 modules:<br />
                <span className="text-sm text-gray-500">7 Global + 10 India intelligence engines</span>
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-gray-100 border border-white/20'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 text-gray-100 border border-white/20 px-4 py-2 rounded-lg">
                <Loader className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-6 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask your question..."
            className="flex-1 bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-semibold transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
