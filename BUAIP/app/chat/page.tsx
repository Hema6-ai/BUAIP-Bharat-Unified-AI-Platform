"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import ChatWindow from '@/app/components/ChatWindow';
import ChatMessage from '@/app/components/ChatMessage';
import ChatInput from '@/app/components/ChatInput';
import WelcomeScreen from '@/app/components/WelcomeScreen';
import TypingIndicator from '@/app/components/TypingIndicator';
import LoadingScreen from '@/app/components/LoadingScreen';
import { useLanguage } from '@/app/lib/languageContext';
import { useTranslation } from '@/app/lib/useTranslation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  userQuery?: string;
}

export default function ChatPage() {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [learningActive, setLearningActive] = useState(false);
  const messageIdRef = useRef(0);
  const sessionIdRef = useRef(
    `buaip-session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  const generateId = () => `msg-${++messageIdRef.current}`;

  const goHome = () => {
    setMessages([]);
    setIsLoading(false);
    setLearningActive(false);
    messageIdRef.current = 0;
  };

  // ── Learning Mode Handler ──
  const handleLearningMessage = useCallback(
    async (userMessage: string) => {
      const isStart = userMessage.startsWith('🧠');
      const topic = isStart ? userMessage.replace(/^🧠\s*/, '').trim() : '';

      const userMessageId = generateId();
      setMessages((prev) => [
        ...prev,
        { id: userMessageId, role: 'user', content: userMessage },
      ]);
      setIsLoading(true);

      const assistantId = generateId();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', isTyping: true },
      ]);

      try {
        const body: any = {
          sessionId: sessionIdRef.current,
        };

        if (isStart) {
          body.capability = 'learning-start';
          body.topic = topic || userMessage;
        } else {
          body.capability = 'learning-continue';
          body.userAnswer = userMessage;
        }

        const res = await fetch('/api/ai-capabilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || t('chat_learning_mode_request_failed'));
        }

        const data = await res.json();
        setLearningActive(!data.isComplete);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: data.response, isTyping: false, userQuery: userMessage }
              : m
          )
        );
      } catch (error: any) {
        console.error('Learning mode error:', error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `${t('chat_learning_mode_error_prefix')}. ${t('common_try_again')}.`, isTyping: false }
              : m
          )
        );
        setLearningActive(false);
      } finally {
        setIsLoading(false);
      }
    },
    [learningActive, t],
  );

  // ── File Upload Handler ──
  const handleFileUpload = useCallback(
    async (file: File, capability: string, question?: string) => {
      const emoji = capability === 'photo-answer' ? '📸' : '📄';
      const userMessageId = generateId();
      const displayMsg = question
        ? `${emoji} ${file.name} — "${question}"`
        : `${emoji} ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

      setMessages((prev) => [
        ...prev,
        { id: userMessageId, role: 'user', content: displayMsg },
      ]);
      setIsLoading(true);

      const assistantId = generateId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content:
            capability === 'photo-answer'
              ? t('chat_analyzing_image')
              : t('chat_analyzing_document'),
          isTyping: true,
        },
      ]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('capability', capability);
        formData.append('sessionId', sessionIdRef.current);
        if (question) formData.append('question', question);

        const res = await fetch('/api/ai-capabilities', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || t('chat_file_analysis_failed'));
        }

        const data = await res.json();

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: data.response, isTyping: false, userQuery: displayMsg }
              : m
          )
        );
      } catch (error: any) {
        console.error('File upload error:', error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `${t('chat_file_analysis_error_prefix')}. ${t('common_try_again')}.`, isTyping: false }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  const handleSendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      // ── Learning Mode Detection ──
      const isLearningStart = userMessage.startsWith('🧠');
      const isLearningContinuation = learningActive && !userMessage.startsWith('🧠');

      if (isLearningStart || isLearningContinuation) {
        await handleLearningMessage(userMessage);
        return;
      }

      const userMessageId = generateId();
      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: 'user',
          content: userMessage,
        },
      ]);

      setIsLoading(true);

      const assistantId = generateId();

      try {
        // Show empty assistant bubble for streaming text
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: 'assistant',
            content: '',
            isTyping: true,
          },
        ]);

        const requestBody = JSON.stringify({
          userMessage,
          sessionId: sessionIdRef.current,
          selectedLanguage: language,
          conversationHistory: messages
            .filter((m) => !m.isTyping)
            .map((m) => ({ role: m.role, content: m.content })),
        });

        // Try streaming endpoint first
        let handled = false;
        try {
          const streamRes = await fetch('/api/unified-ai-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          });

          if (streamRes.ok && streamRes.headers.get('content-type')?.includes('text/event-stream')) {
            handled = true;
            const reader = streamRes.body!.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';
            let finalText = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                  const payload = JSON.parse(line.slice(6));

                  if (payload.error) {
                    throw new Error(payload.error);
                  }

                  if (payload.done) {
                    finalText = payload.fullText || accumulated;
                  } else if (payload.delta) {
                    accumulated += payload.delta;
                    // Update message content in real-time
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: accumulated, isTyping: false }
                          : m
                      )
                    );
                  }
                } catch { /* skip malformed SSE lines */ }
              }
            }

            // Finalize with translated text if available
            const displayText = finalText || accumulated;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: displayText, isTyping: false, userQuery: userMessage }
                  : m
              )
            );
          }
        } catch {
          // Stream endpoint failed — fall through to regular endpoint
          handled = false;
        }

        // Fallback to regular (non-streaming) endpoint
        if (!handled) {
          const response = await fetch('/api/unified-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          });

          if (!response.ok) {
            throw new Error(t('chat_error_api_failed'));
          }

          const data = await response.json();

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: data.response, isTyping: false, userQuery: userMessage }
                : m
            )
          );
        }
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: t('chat_error_fallback'), isTyping: false, userQuery: userMessage }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [language, messages, t, learningActive, handleLearningMessage]
  );

  const handleRethink = useCallback((message: Message) => {
    if (message.userQuery) {
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      handleSendMessage(message.userQuery);
    }
  }, [handleSendMessage]);

  const handlePromptSelect = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar onLogoClick={goHome} />

      <div className="flex flex-col flex-1 overflow-hidden">
        {messages.length === 0 ? (
          <ChatWindow messages={messages}>
            <WelcomeScreen onPromptSelect={handlePromptSelect} />
          </ChatWindow>
        ) : (
          <ChatWindow messages={messages}>
            {messages.map((message) =>
              message.isTyping ? (
                <TypingIndicator key={message.id} />
              ) : (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  onRethink={message.role === 'assistant' ? () => handleRethink(message) : undefined}
                />
              )
            )}
          </ChatWindow>
        )}

        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-4">
            <ChatInput onSend={handleSendMessage} onFileUpload={handleFileUpload} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
