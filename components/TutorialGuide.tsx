'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

// Aqui definimos que o componente ACEITA receber passos de fora
interface TutorialGuideProps {
  chaveLocalStorage: string;
  passos: any[]; // Aceita a lista de passos vinda da página
}

export default function TutorialGuide({ chaveLocalStorage, passos }: TutorialGuideProps) {
  
  useEffect(() => {
    // Verifica se já viu o tutorial
    const jaViu = localStorage.getItem(chaveLocalStorage);
    if (jaViu) return;

    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Próximo →',
      prevBtnText: '← Voltar',
      doneBtnText: 'Entendi',
      steps: passos, // 👈 AQUI ESTÁ O SEGREDO: Ele usa os passos que você mandou!
      onDestroyStarted: () => {
        localStorage.setItem(chaveLocalStorage, 'true');
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }, [chaveLocalStorage, passos]);

  return null;
}