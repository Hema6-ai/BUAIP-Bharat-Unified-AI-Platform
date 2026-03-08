"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTextToSpeech } from '@/app/lib/hooks/useTextToSpeech';
import { useTranslation } from '@/app/lib/useTranslation';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  onRethink?: () => void;
}

/**
 * Convert URLs in text to clickable links
 */
function formatMessageWithLinks(text: string, isUser: boolean): JSX.Element[] {
  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  const parts: JSX.Element[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  
  // Different styling for user vs assistant messages
  const linkClass = isUser
    ? "text-blue-100 hover:text-white underline break-all font-medium"
    : "text-blue-600 hover:text-blue-800 underline break-all font-medium";

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${key++}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }

    // Add the URL as a clickable link
    const url = match[0];
    parts.push(
      <a
        key={`link-${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {url}
      </a>
    );

    lastIndex = match.index + url.length;
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${key++}`}>
        {text.substring(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : [<span key="single">{text}</span>];
}

export default function ChatMessage({
  role,
  content,
  isTyping = false,
  onRethink,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const { speak, stop, isPlaying, error: ttsError } = useTextToSpeech();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Share response
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: t('chat_message_share_title'),
          text: content,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to share:', err);
        setShareError(t('chat_message_share_failed'));
        setTimeout(() => setShareError(null), 2000);
      }
    }
  };

  // Listen to response
  const handleListen = () => {
    if (isPlaying) {
      stop();
    } else {
      speak(content);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-2 sm:gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shadow-sm">
            <Image
              src="/BUAIP_logo.png"
              alt="BUAIP"
              fill
              className="object-cover"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 max-w-xs sm:max-w-sm md:max-w-2xl lg:max-w-3xl">
        <div
          className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm shadow-sm'
          }`}
        >
          {isTyping ? (
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-100" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-200" />
            </div>
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {formatMessageWithLinks(content, isUser)}
            </div>
          )}
        </div>

        {/* Response Toolbar - Only for assistant messages */}
        {!isUser && !isTyping && (
          <div className="flex items-center gap-1 sm:gap-2 px-1">
            {/* Copy Button */}
            <motion.button
              onClick={handleCopy}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title={t('chat_message_copy_title')}
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:inline">{t('chat_message_copied')}</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">{t('chat_message_copy')}</span>
                </>
              )}
            </motion.button>

            {/* Rethink Button */}
            {onRethink && (
              <motion.button
                onClick={onRethink}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                title={t('chat_message_rethink_title')}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">{t('chat_message_rethink')}</span>
              </motion.button>
            )}

            {/* Share Button */}
            <motion.button
              onClick={handleShare}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title={t('chat_message_share_title')}
            >
              {shareError ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:inline text-red-600">{t('chat_message_error')}</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="hidden sm:inline">{t('chat_message_share')}</span>
                </>
              )}
            </motion.button>

            {/* Listen Button */}
            <motion.button
              onClick={handleListen}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                isPlaying
                  ? 'text-orange-600 bg-orange-50'
                  : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
              }`}
              title={isPlaying ? t('chat_message_stop_audio_title') : t('chat_message_listen_title')}
            >
              {isPlaying ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                  <span className="hidden sm:inline">{t('chat_message_stop')}</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                  <span className="hidden sm:inline">{t('chat_message_listen')}</span>
                </>
              )}
            </motion.button>
          </div>
        )}

        {/* Notification badges */}
        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-green-600 px-1"
            >
              {t('chat_message_copied_to_clipboard')}
            </motion.div>
          )}
          {ttsError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-red-500 px-1"
            >
              ⚠ Voice unavailable — check your connection
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
          U
        </div>
      )}
    </motion.div>
  );
}
