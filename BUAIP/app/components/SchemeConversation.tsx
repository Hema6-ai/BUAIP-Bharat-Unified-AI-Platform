'use client';

import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface SchemeCard {
  schemeName: string;
  ministry: string;
  benefit: string;
  whyYouQualify: string;
  requiredDocuments: string[];
  howToApplyOnline: string;
  helpline: string;
}

interface ProfileProgress {
  step: number;
  totalSteps: number;
  completedFields: string[];
  currentQuestion: string;
}

export function SchemeConversation() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm here to help you discover government schemes you're eligible for. Type 'start' or 'find schemes' to begin!",
      timestamp: new Date(),
    },
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [profileProgress, setProfileProgress] = useState<ProfileProgress | null>(null);
  const [recommendedSchemes, setRecommendedSchemes] = useState<SchemeCard[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation on component mount
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        const sessionIdGenerated = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(sessionIdGenerated);

        // Start conversation with local API
        const response = await fetch('/api/scheme-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdGenerated,
            message: 'Let me start by asking some questions to find schemes you qualify for.',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const initialMessage: Message = {
            role: 'assistant',
            content: data.text || data.message || "Hello! I'm BUAIP's Scheme Eligibility AI. Let me ask you some questions to find schemes you qualify for.",
            timestamp: new Date(),
          };
          setMessages([initialMessage]);
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
        const errorMessage: Message = {
          role: 'assistant',
          content: '⚠️ Unable to connect to the Scheme Eligibility engine. Please try refreshing the page.',
          timestamp: new Date(),
        };
        setMessages([errorMessage]);
      }
    };

    initializeConversation();
  }, []);

  const handleSendMessage = async (userInput: string) => {
    if (!userInput.trim()) return;

    // Add user message
    const newUserMessage: Message = {
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Call the local API route with AWS Bedrock
      const response = await fetch('/api/scheme-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          message: userInput,
        }),
      });

      const data = await response.json();

      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
      }

      // Handle the response from the API
      let assistantContent = '';

      if (data.type === 'schemes') {
        // Profile complete - show Claude's detailed analysis
        assistantContent = data.message || `Found ${data.schemes?.length || 0} matching schemes for you.`;
        
        // Extract schemes for display
        if (data.schemes && Array.isArray(data.schemes)) {
          setRecommendedSchemes(
            data.schemes.map((scheme: any) => ({
              schemeName: scheme.name,
              ministry: scheme.ministry,
              benefit: scheme.benefits || scheme.benefit,
              whyYouQualify: 'Eligible based on your profile',
              requiredDocuments: scheme.documents || [],
              howToApplyOnline: scheme.apply_link || '#',
              helpline: scheme.helpline || 'See official portal',
            }))
          );
        }
      } else {
        // Still collecting profile - show Claude's question or message
        assistantContent = data.text || data.message || 'Please provide your answer to continue.';
      }

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update progress if available
      if (data.profileProgress) {
        setProfileProgress({
          step: data.profileProgress.completed || 0,
          totalSteps: data.profileProgress.total || 8,
          completedFields: [],
          currentQuestion: assistantContent,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold">BUAIP Scheme Finder</h1>
        <p className="text-indigo-100 text-sm">Find government schemes you qualify for</p>
        {profileProgress && (
          <div className="mt-2 text-xs">
            Profile Progress: {profileProgress.step}/{profileProgress.totalSteps}
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <ChatMessage 
            key={index} 
            role={message.role}
            content={message.content}
          />
        ))}
        
        {isLoading && <TypingIndicator />}

        {/* Recommended Schemes Display */}
        {recommendedSchemes.length > 0 && (
          <div className="space-y-4 mt-6">
            <h2 className="text-xl font-bold text-white">
              ✅ Recommended Schemes for You
            </h2>
            {recommendedSchemes.map((scheme, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-green-900 to-emerald-900 rounded-lg p-4 border border-green-700"
              >
                <h3 className="text-lg font-bold text-white mb-2">
                  {index + 1}. {scheme.schemeName}
                </h3>
                <div className="space-y-2 text-green-100 text-sm">
                  <p>
                    <span className="font-semibold">Ministry:</span> {scheme.ministry}
                  </p>
                  <p>
                    <span className="font-semibold">Benefit:</span> {scheme.benefit}
                  </p>
                  <p>
                    <span className="font-semibold">Why you qualify:</span>{' '}
                    {scheme.whyYouQualify}
                  </p>
                  <div>
                    <span className="font-semibold">Required Documents:</span>
                    <ul className="list-disc pl-5 mt-1">
                      {scheme.requiredDocuments?.map((doc, i) => (
                        <li key={i}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                  <p>
                    <span className="font-semibold">Apply Online:</span>{' '}
                    <a
                      href={scheme.howToApplyOnline}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-300 hover:text-green-100 underline"
                    >
                      {scheme.howToApplyOnline}
                    </a>
                  </p>
                  <p>
                    <span className="font-semibold">Helpline:</span>{' '}
                    <a href={`tel:${scheme.helpline}`} className="text-green-300 hover:text-green-100">
                      {scheme.helpline}
                    </a>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
