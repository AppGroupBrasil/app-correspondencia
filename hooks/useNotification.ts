"use client";

import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Toast } from '@capacitor/toast';
import { TIMEOUT } from '@/constants/porteiro.constants';

type NotificationType = 'success' | 'error' | null;

interface Notification {
  type: NotificationType;
  message: string;
}

interface UseNotificationReturn {
  notification: Notification | null;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  clearNotification: () => void;
}

// Fallback de segurança para os tempos
const DURATION_SUCCESS = TIMEOUT?.MENSAGEM_SUCESSO || 3000;
const DURATION_ERROR = TIMEOUT?.MENSAGEM_ERRO || 4000;

export const useNotification = (): UseNotificationReturn => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showSuccess = useCallback((message: string) => {
    // 📱 SE FOR APP NATIVO (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      void Toast.show({
        text: message,
        duration: 'short',
        position: 'bottom',
      });
    } 
    // 💻 SE FOR WEB (Navegador/Produção)
    else {
      setNotification({ type: 'success', message });
      setTimeout(() => {
        setNotification(null);
      }, DURATION_SUCCESS);
    }
  }, []);

  const showError = useCallback((message: string) => {
    // 📱 SE FOR APP NATIVO
    if (Capacitor.isNativePlatform()) {
      void Toast.show({
        text: message,
        duration: 'long', // Erro fica mais tempo
        position: 'bottom',
      });
    } 
    // 💻 SE FOR WEB
    else {
      setNotification({ type: 'error', message });
      setTimeout(() => {
        setNotification(null);
      }, DURATION_ERROR);
    }
  }, []);

  return {
    notification,
    showSuccess,
    showError,
    clearNotification,
  };
};