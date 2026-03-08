'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Send, ArrowLeft, MapPin, AlertTriangle, Users, Utensils, Home, Languages, HeartPulse, Landmark } from 'lucide-react';
import { askEngine, type EngineResponse } from '@/src/lib/engineApi';

interface AtithiModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const MODULES: Record<string, AtithiModule[]> = {
  'SECTION A — ARRIVAL & BASICS': [
    {
      id: 'arrival',
      title: 'Arrival Assistant',
      description: 'Airport arrival, customs, visa on arrival, SIM cards, currency exchange',
      icon: <Landmark className="w-6 h-6" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      id: 'explainer',
      title: 'India Explainer',
      description: 'UPI payments, train bookings, Indian system basics',
      icon: <Globe className="w-6 h-6" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
    },
    {
      id: 'language',
      title: 'Language Survival Kit',
      description: 'Essential phrases, pronunciation help, translation assistance',
      icon: <Languages className="w-6 h-6" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    }
  ],
  'SECTION B — SAFETY & HELP': [
    {
      id: 'scam',
      title: 'Scam Warning System',
      description: 'Recognize common scams, taxi frauds, fake tour guides, overcharging',
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100 border-red-200'
    },
    {
      id: 'emergency',
      title: 'Emergency Assistant',
      description: 'Hospitals, police stations, embassy contacts, emergency helplines',
      icon: <HeartPulse className="w-6 h-6" />,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 hover:bg-rose-100 border-rose-200'
    },
    {
      id: 'culture',
      title: 'Cultural Guide',
      description: "Temple etiquette, dress codes, cultural dos and don'ts",
      icon: <Users className="w-6 h-6" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200'
    }
  ],
  'SECTION C — TRAVEL & EXPERIENCE': [
    {
      id: 'food',
      title: 'Food Safety Guide',
      description: 'Street food safety, vegetarian options, water safety, dietary guidance',
      icon: <Utensils className="w-6 h-6" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    },
    {
      id: 'expat',
      title: 'Long-Stay Assistant',
      description: 'FRRO registration, visa extensions, bank accounts, rentals for long-term visitors',
      icon: <Home className="w-6 h-6" />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 hover:bg-teal-100 border-teal-200'
    },
    {
      id: 'tourism',
      title: 'Tourist Spots Explorer',
      description: 'Destination recommendations, itineraries, travel tips, best times to visit',
      icon: <MapPin className="w-6 h-6" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100 border-green-200'
    }
  ]
};

export default function AtithiPage() {
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<Array<{role: string; content: any}>>([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModule(moduleId);
    setConversation([]);
    setUserInput('');
  };

  const handleQuickAction = (question: string) => {
    setUserInput(question);
    // Auto-submit after a short delay
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleSendMessage = async () => {
    const messageToSend = userInput.trim();
    if (!messageToSend || !selectedModule) return;

    setUserInput('');
    setConversation(prev => [...prev, { role: 'user', content: messageToSend }]);
    setLoading(true);

    try {
      // Construct query with module context
      const moduleNames: Record<string, string> = {
        places: 'tourist places',
        culture: 'culture and heritage',
        food: 'food and cuisine',
        stay: 'hotels and accommodation',
        itinerary: 'travel itinerary',
        shop: 'shopping'
      };
      const moduleContext = moduleNames[selectedModule] || selectedModule;
      const query = `I need information about ${moduleContext} in India. ${messageToSend}`;
      
      const response: EngineResponse = await askEngine('atithi', query);

      // Create response in expected format
      const data = {
        explanation: response.answer,
        voiceReadyText: response.answer
      };
      setConversation(prev => [...prev, { role: 'assistant', content: data }]);
    } catch (error) {
      console.error(error);
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: { 
          explanation: error instanceof Error ? error.message : 'Sorry, I could not process your request. Please try again.',
          voiceReadyText: 'Sorry, I could not process your request. Please try again.'
        } 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentModule = () => {
    for (const section of Object.values(MODULES)) {
      const module = section.find(m => m.id === selectedModule);
      if (module) return module;
    }
    return null;
  };

  if (selectedModule) {
    const module = getCurrentModule();
    if (!module) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedModule(null)}
                className="flex items-center gap-2 text-teal-700 hover:text-teal-800 font-semibold"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Modules
              </button>
              
              <div className="flex items-center gap-4">
                {/* Language Selector */}
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-2 border-2 border-teal-300 rounded-lg font-semibold text-sm focus:outline-none focus:border-teal-500"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी</option>
                  <option value="te">తెలుగు</option>
                  <option value="ta">தமிழ்</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-4">
              <div className={`p-3 rounded-lg ${module.bgColor.split(' ')[0]}`}>
                {React.cloneElement(module.icon as React.ReactElement, { className: `w-6 h-6 ${module.color}` })}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{module.title}</h2>
                <p className="text-sm text-gray-600">{module.description}</p>
              </div>
            </div>
          </div>

          {/* Conversation Area */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4 h-[500px] overflow-y-auto">
            {conversation.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`p-4 rounded-full ${module.bgColor.split(' ')[0]} mb-4`}>
                  {React.cloneElement(module.icon as React.ReactElement, { className: `w-12 h-12 ${module.color}` })}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ask me anything about {module.title}</h3>
                <p className="text-gray-600 max-w-md mb-6">
                  I'm here to help you with {module.description.toLowerCase()}
                </p>
                
                {/* Quick Action Buttons */}
                <div className="w-full max-w-xl space-y-2">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Try these quick questions:</p>
                  {module.id === 'arrival' && (
                    <>
                      <button onClick={() => handleQuickAction("I just landed in Mumbai. What should I do first?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        🛬 I just landed in Mumbai. What should I do first?
                      </button>
                      <button onClick={() => handleQuickAction("How do I get a SIM card at Delhi airport?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        📱 How do I get a SIM card at Delhi airport?
                      </button>
                    </>
                  )}
                  {module.id === 'explainer' && (
                    <>
                      <button onClick={() => handleQuickAction("How do I pay in India? What is UPI?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        💳 How do I pay in India? What is UPI?
                      </button>
                      <button onClick={() => handleQuickAction("How do I book train tickets in India?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        🚂 How do I book train tickets in India?
                      </button>
                    </>
                  )}
                  {module.id === 'language' && (
                    <>
                      <button onClick={() => handleQuickAction("Teach me basic Hindi phrases for travel")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        🗣️ Teach me basic Hindi phrases for travel
                      </button>
                      <button onClick={() => handleQuickAction("How do I say 'How much does this cost?' in Hindi?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        💬 How do I say "How much does this cost?" in Hindi?
                      </button>
                    </>
                  )}
                  {module.id === 'scam' && (
                    <>
                      <button onClick={() => handleQuickAction("What are common scams in Delhi?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        ⚠️ What are common scams in Delhi?
                      </button>
                      <button onClick={() => handleQuickAction("How do I know if a taxi is charging fair price in Mumbai?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        🚕 How do I know if a taxi is charging fair price in Mumbai?
                      </button>
                    </>
                  )}
                  {module.id === 'emergency' && (
                    <>
                      <button onClick={() => handleQuickAction("What are emergency numbers in India?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        🚨 What are emergency numbers in India?
                      </button>
                      <button onClick={() => handleQuickAction("I need to find a hospital in Bangalore")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        🏥 I need to find a hospital in Bangalore
                      </button>
                    </>
                  )}
                  {module.id === 'culture' && (
                    <>
                      <button onClick={() => handleQuickAction("What should I wear when visiting temples in India?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        🕌 What should I wear when visiting temples in India?
                      </button>
                      <button onClick={() => handleQuickAction("What are cultural dos and don'ts in India?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        🙏 What are cultural dos and don'ts in India?
                      </button>
                    </>
                  )}
                  {module.id === 'food' && (
                    <>
                      <button onClick={() => handleQuickAction("Is street food safe in India? What should I try?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        🍛 Is street food safe in India? What should I try?
                      </button>
                      <button onClick={() => handleQuickAction("Can I drink tap water in India?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        💧 Can I drink tap water in India?
                      </button>
                    </>
                  )}
                  {module.id === 'expat' && (
                    <>
                      <button onClick={() => handleQuickAction("How do I register with FRRO for long stay?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        📋 How do I register with FRRO for long stay?
                      </button>
                      <button onClick={() => handleQuickAction("How can I open a bank account in India?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        🏦 How can I open a bank account in India?
                      </button>
                    </>
                  )}
                  {module.id === 'tourism' && (
                    <>
                      <button onClick={() => handleQuickAction("Plan a 5-day itinerary for Rajasthan")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        🗺️ Plan a 5-day itinerary for Rajasthan
                      </button>
                      <button onClick={() => handleQuickAction("What are must-visit places in Jaipur?")} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm border border-gray-200 transition-colors">
                        📍 What are must-visit places in Jaipur?
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {conversation.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user' 
                        ? 'bg-teal-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="space-y-3">
                          <p className="whitespace-pre-wrap font-medium">{msg.content.explanation}</p>
                          
                          {msg.content.steps && msg.content.steps.length > 0 && (
                            <div className="mt-3">
                              <p className="font-semibold mb-2">Steps:</p>
                              <ol className="list-decimal list-inside space-y-1">
                                {msg.content.steps.map((step: string, i: number) => (
                                  <li key={i} className="text-sm">{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                          
                          {msg.content.safetyTips && msg.content.safetyTips.length > 0 && (
                            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3">
                              <p className="font-semibold text-yellow-900 mb-2">⚠️ Safety Tips:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {msg.content.safetyTips.map((tip: string, i: number) => (
                                  <li key={i} className="text-sm text-yellow-900">{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {msg.content.destinations && msg.content.destinations.length > 0 && (
                            <div className="mt-3">
                              <p className="font-semibold mb-2">📍 Recommended Destinations:</p>
                              {msg.content.destinations.map((dest: any, i: number) => (
                                <div key={i} className="mb-3 p-3 bg-blue-50 rounded">
                                  <p className="font-bold text-blue-900">{dest.name}</p>
                                  <p className="text-sm text-gray-700 mt-1">{dest.description}</p>
                                  {dest.bestTime && (
                                    <p className="text-xs text-blue-700 mt-1">🗓️ Best time: {dest.bestTime}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {msg.content.placesToVisit && msg.content.placesToVisit.length > 0 && (
                            <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
                              <p className="font-semibold text-green-900 mb-2">🏛️ Places to Visit:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {msg.content.placesToVisit.map((place: string, i: number) => (
                                  <li key={i} className="text-sm text-green-900">{place}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {msg.content.itinerary && msg.content.itinerary.length > 0 && (
                            <div className="mt-3">
                              <p className="font-semibold mb-3">🗓️ Your Itinerary:</p>
                              {msg.content.itinerary.map((day: any, i: number) => (
                                <div key={i} className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
                                  <p className="font-bold text-purple-900 mb-1">{day.day} — {day.location}</p>
                                  <ul className="list-disc list-inside space-y-1 ml-2">
                                    {day.activities.map((activity: string, j: number) => (
                                      <li key={j} className="text-sm text-gray-700">{activity}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}

                          {msg.content.nearbyServices && (
                            <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                              <p className="font-semibold text-red-900 mb-2">📍 Nearby Services ({msg.content.nearbyServices.city}):</p>
                              <div className="space-y-3">
                                {msg.content.nearbyServices.results && msg.content.nearbyServices.results.length > 0 && (
                                  <div>
                                    <p className="text-sm font-semibold text-red-800 mb-1">{msg.content.nearbyServices.serviceType}:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-2">
                                      {msg.content.nearbyServices.results.slice(0, 5).map((service: any, j: number) => (
                                        <li key={j} className="text-sm text-gray-700">
                                          {service.name || service.type}
                                          {service.address && <span className="block text-xs text-gray-600 ml-4">{service.address}</span>}
                                          {service.phone && <span className="block text-xs text-gray-600 ml-4">Phone: {service.phone}</span>}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {msg.content.nearbyServices.emergencyNumber && (
                                  <p className="text-sm font-bold text-red-700">
                                    🚨 Emergency: {msg.content.nearbyServices.emergencyNumber}
                                  </p>
                                )}
                                {msg.content.nearbyServices.instructions && (
                                  <p className="text-sm text-gray-700 italic">{msg.content.nearbyServices.instructions}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask your question..."
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || !userInput.trim()}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="w-10 h-10 text-teal-600" />
            <h1 className="text-4xl font-bold text-gray-900">ATITHI AI</h1>
          </div>
          <p className="text-gray-700 text-xl font-medium mb-2">India Access Assistant</p>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Your AI guide to India. Get help with travel, culture, safety, payments, and tourist destinations.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-8 max-w-3xl mx-auto">
          <p className="text-teal-900 text-center">
            🌏 This assistant helps foreign visitors navigate India safely. Available in multiple languages.
          </p>
        </div>

        {/* Demo Examples Section */}
        <div className="mb-10 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Try These Popular Questions</h2>
          <p className="text-gray-600 text-center mb-6">See what ATITHI AI can help you with</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">Arrival & First Steps</p>
              <p className="font-semibold text-gray-800">"I landed in Mumbai. What should I do first?"</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-purple-500">
              <p className="text-sm text-gray-600 mb-1">Travel Planning</p>
              <p className="font-semibold text-gray-800">"Plan a 5-day itinerary for Rajasthan"</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-indigo-500">
              <p className="text-sm text-gray-600 mb-1">Understanding Systems</p>
              <p className="font-semibold text-gray-800">"How do I pay in India? What is UPI?"</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">Safety Alerts</p>
              <p className="font-semibold text-gray-800">"What are common scams in Delhi?"</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-amber-500">
              <p className="text-sm text-gray-600 mb-1">Cultural Guidance</p>
              <p className="font-semibold text-gray-800">"What should I wear when visiting temples?"</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-orange-500">
              <p className="text-sm text-gray-600 mb-1">Food & Safety</p>
              <p className="font-semibold text-gray-800">"Is street food safe in India?"</p>
            </div>
          </div>
        </div>

        {/* Module Sections */}
        {Object.entries(MODULES).map(([sectionName, modules]) => (
          <div key={sectionName} className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{sectionName}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {modules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => handleModuleSelect(module.id)}
                  className={`p-6 rounded-xl border-2 ${module.bgColor} transition-all text-left shadow-md hover:shadow-xl transform hover:-translate-y-1`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-white`}>
                      {React.cloneElement(module.icon as React.ReactElement, { className: `w-6 h-6 ${module.color}` })}
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold mb-2 ${module.color}`}>{module.title}</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{module.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="text-center mt-12 pb-8">
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-white border-2 border-teal-600 text-teal-700 rounded-lg font-semibold hover:bg-teal-50 transition-colors"
          >
            Back to Home
          </button>
          <p className="text-gray-600 text-sm mt-4">
            Powered by Amazon Bedrock AI | Supporting travelers worldwide
          </p>
        </div>
      </div>
    </div>
  );
}
