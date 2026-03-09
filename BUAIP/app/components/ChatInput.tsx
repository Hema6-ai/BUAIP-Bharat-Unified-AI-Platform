"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/app/lib/useTranslation';
import { useSpeechToText } from '@/app/lib/hooks/useSpeechToText';

interface ChatInputProps {
  onSend: (message: string) => void;
  onFileUpload?: (file: File, capability: string, question?: string) => void;
  isLoading?: boolean;
}

export default function ChatInput({ onSend, onFileUpload, isLoading = false }: ChatInputProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; capability: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const {
    transcript,
    interimText,
    isListening,
    isSupported: isSTTSupported,
    startListening,
    stopListening,
    resetTranscript,
    error: sttError,
  } = useSpeechToText();
  
  // Track whether input was manually edited after voice stopped
  const userEditedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Live-update message from transcript while recording
  useEffect(() => {
    if (transcript && !userEditedRef.current) {
      setMessage(transcript);
      setIsTyping(true);
    }
  }, [transcript]);

  // When recording stops, commit whatever transcript we have
  const prevListeningRef = useRef(false);

  useEffect(() => {
    if (prevListeningRef.current && !isListening) {
      // Stopped listening — commit final transcript
      if (transcript) {
        setMessage(transcript);
        setIsTyping(true);
        inputRef.current?.focus();
      }
    }
    prevListeningRef.current = isListening;
  }, [isListening, transcript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingFile) {
      // File is staged — send it with optional question
      if (onFileUpload) {
        onFileUpload(pendingFile.file, pendingFile.capability, message.trim() || undefined);
      }
      setPendingFile(null);
      setMessage('');
      setIsTyping(false);
      resetTranscript();
      userEditedRef.current = false;
      return;
    }
    if (message.trim()) {
      onSend(message);
      setMessage('');
      setIsTyping(false);
      resetTranscript();
      userEditedRef.current = false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
    // Mark as user-edited so live transcript won't overwrite edits
    if (!isListening) userEditedRef.current = true;
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      userEditedRef.current = false;
      resetTranscript();
      setMessage('');
      startListening();
    }
  };

  const handleCancelVoice = () => {
    stopListening();
    resetTranscript();
    setMessage('');
    setIsTyping(false);
    userEditedRef.current = false;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAIMenu(false);
      }
    };

    if (showAIMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAIMenu]);

  // AI Capability Handlers
  const handleDocumentExplainer = () => {
    setShowAIMenu(false);
    fileInputRef.current?.click();
  };

  const handlePhotoAnswer = () => {
    setShowAIMenu(false);
    if (photoInputRef.current) {
      photoInputRef.current.click();
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) stageFile(file, 'photo-answer');
      };
      input.click();
    }
  };

  const handleLearningMode = () => {
    setShowAIMenu(false);
    setMessage('🧠 ');
    setIsTyping(true);
    inputRef.current?.focus();
  };

  const handleVoiceQuery = () => {
    setShowAIMenu(false);
    handleMicClick();
  };

  const handleFileUploadClick = () => {
    setShowAIMenu(false);
    fileInputRef.current?.click();
  };

  const stageFile = (file: File, capability: string) => {
    setPendingFile({ file, capability });
    setMessage('');
    setIsTyping(true);
    inputRef.current?.focus();
  };

  const cancelPendingFile = () => {
    setPendingFile(null);
    setMessage('');
    setIsTyping(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) stageFile(file, 'document-explain');
    if (e.target) e.target.value = '';
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) stageFile(file, 'photo-answer');
    if (e.target) e.target.value = '';
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border-t border-gray-200 p-3 sm:p-4 md:p-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* Pending file preview */}
        <AnimatePresence>
          {pendingFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {pendingFile.capability === 'photo-answer' ? '📸' : '📄'}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm text-blue-800 font-medium truncate max-w-[240px]">
                      {pendingFile.file.name}
                    </span>
                    <span className="text-xs text-blue-600">
                      {(pendingFile.file.size / 1024).toFixed(1)} KB — {t('chat_pending_file_hint')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cancelPendingFile}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  ✕ {t('chat_pending_file_remove')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice listening indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 items-end">
                    <div className="w-1.5 h-5 bg-red-500 rounded-full animate-pulse" />
                    <div className="w-1.5 h-3 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                    <div className="w-1.5 h-6 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                    <div className="w-1.5 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.45s' }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-red-700 font-medium">
                      {t('chat_listening_now')}
                    </span>
                    {interimText && (
                      <span className="text-xs text-gray-500 italic truncate max-w-[200px]">
                        {interimText}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelVoice}
                  className="text-xs text-red-600 hover:text-red-800 hover:underline"
                >
                  {t('common_cancel')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        <AnimatePresence>
          {sttError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600"
            >
              {sttError}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 sm:gap-3">
          {/* Buttons - Left Side */}
          <div className="flex gap-1 sm:gap-2">
            {/* AI Capabilities Plus Button */}
            <div className="relative" ref={menuRef}>
              <motion.button
                type="button"
                onClick={() => setShowAIMenu(!showAIMenu)}
                disabled={isLoading}
                className={`p-2 sm:p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  showAIMenu
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={t('chat_ai_menu_title')}
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </motion.button>

              {/* AI Capabilities Menu */}
              <AnimatePresence>
                {showAIMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
                  >
                    {/* Menu Header */}
                    <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-700">{t('chat_ai_menu_title')}</p>
                    </div>

                    {/* Menu Options */}
                    <div className="py-1">
                      {/* Document Explainer */}
                      <button
                        type="button"
                        onClick={handleDocumentExplainer}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                      >
                        <span className="text-2xl">📄</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                            {t('chat_ai_menu_document_explainer')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t('chat_ai_menu_document_explainer_sub')}
                          </p>
                        </div>
                      </button>

                      {/* Photo Answer */}
                      <button
                        type="button"
                        onClick={handlePhotoAnswer}
                        className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center gap-3 group"
                      >
                        <span className="text-2xl">📸</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-green-600">
                            {t('chat_ai_menu_photo_answer')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t('chat_ai_menu_photo_answer_sub')}
                          </p>
                        </div>
                      </button>

                      {/* Learning Mode */}
                      <button
                        type="button"
                        onClick={handleLearningMode}
                        className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 group"
                      >
                        <span className="text-2xl">🧠</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-purple-600">
                            {t('chat_ai_menu_learning_mode')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t('chat_ai_menu_learning_mode_sub')}
                          </p>
                        </div>
                      </button>

                      {/* Voice Query */}
                      {isSTTSupported && (
                        <button
                          type="button"
                          onClick={handleVoiceQuery}
                          className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors flex items-center gap-3 group"
                        >
                          <span className="text-2xl">🎤</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 group-hover:text-red-600">
                              {t('chat_ai_menu_voice_query')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {t('chat_ai_menu_voice_query_sub')}
                            </p>
                          </div>
                        </button>
                      )}

                      {/* File Upload */}
                      <button
                        type="button"
                        onClick={handleFileUploadClick}
                        className="w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors flex items-center gap-3 group"
                      >
                        <span className="text-2xl">📂</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-orange-600">
                            {t('chat_ai_menu_upload_file')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t('chat_ai_menu_upload_file_sub')}
                          </p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Input Field */}
          <div
            className={`flex-1 relative transition-all duration-200 ${
              isTyping ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={handleChange}
              disabled={isLoading}
              placeholder={pendingFile ? t('chat_pending_file_placeholder') : isListening ? t('chat_input_listening_placeholder') : t('chat_input_placeholder')}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-colors text-xs sm:text-sm md:text-base disabled:bg-gray-50 disabled:cursor-not-allowed text-black placeholder-gray-400"
            />
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 rounded-lg pointer-events-none border border-blue-500 shadow-lg"
              />
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {/* Hidden photo input */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />

          {/* Buttons - Right Side */}
          <div className="flex gap-1 sm:gap-2">
            {/* Microphone Icon */}
            {isSTTSupported && !isListening && (
              <motion.button
                type="button"
                onClick={handleMicClick}
                disabled={isLoading}
                className="p-2 sm:p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 hover:text-red-600 hover:bg-red-50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={t('chat_voice_title')}
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a1 1 0 112 0 7 7 0 01-6 6.93V20h3a1 1 0 110 2H8a1 1 0 110-2h3v-2.07A7 7 0 015 11a1 1 0 112 0 5 5 0 0010 0z"
                  />
                </svg>
              </motion.button>
            )}

            {/* Stop Recording button — shown while recording INSTEAD of mic + send */}
            {isListening ? (
              <motion.button
                type="button"
                onClick={stopListening}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-xs sm:text-sm flex items-center gap-1.5"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                title={t('chat_stop_recording_title')}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="5" y="5" width="10" height="10" rx="1" />
                </svg>
                <span className="hidden sm:inline">{t('chat_message_stop')}</span>
              </motion.button>
            ) : (
              /* Send Button */
              <motion.button
                type="submit"
                disabled={(!message.trim() && !pendingFile) || isLoading}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs sm:text-sm md:text-base"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.9429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.01449275 C3.34915502,0.9 2.40734225,0.9 1.77946707,1.4429026 C0.994623095,2.0702797 0.837654326,3.16168242 1.15159189,3.94717275 L3.03521743,10.388179 C3.03521743,10.5452764 3.19218622,10.7023738 3.50612381,10.7023738 L16.6915026,11.4878607 C16.6915026,11.4878607 17.1624089,11.4878607 17.1624089,11.4878607 C17.6333152,11.4878607 18.1042215,11.8591528 18.1042215,12.3304449 C18.1042215,12.8017371 17.6333152,13.1730287 17.1624089,13.1730287 C16.6915026,13.1730287 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
                </svg>
              </motion.button>
            )}
          </div>
        </div>

        {/* Character Counter & Voice Preview Info */}
        {message.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between text-xs text-gray-500 mt-2"
          >
            <span>
              {message.length} {message.length !== 1 ? t('chat_characters_plural') : t('chat_characters_singular')}
            </span>
            {transcript && (
              <span className="text-blue-600">
                {t('chat_voice_input_preview')}
              </span>
            )}
          </motion.div>
        )}
      </div>
    </motion.form>
  );
}
