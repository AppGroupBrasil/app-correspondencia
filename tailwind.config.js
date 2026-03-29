/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
    "./constants/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cor primária do sistema: #057321 (Verde) - MANTIDA
        primary: {
          50: '#e6f7ec',
          100: '#c2ebd0',
          200: '#9adeb1',
          300: '#71d192',
          400: '#52c77a',
          500: '#057321',  // Cor principal
          600: '#046a1e',
          700: '#035e1a',
          800: '#025216',
          900: '#01380f',
        },
        // Cores secundárias e de suporte
        success: {
          50: '#e6f7ec',
          500: '#057321',
          600: '#046a1e',
          700: '#035e1a',
        },
        // Cores para status
        status: {
          pending: '#f59e0b',
          delivered: '#10b981',
          returned: '#6366f1',
          lost: '#ef4444',
        },
      },
      // Sombras premium
      boxShadow: {
        'premium': '0 4px 6px -1px rgba(5, 115, 33, 0.1), 0 2px 4px -1px rgba(5, 115, 33, 0.06)',
        'premium-lg': '0 10px 15px -3px rgba(5, 115, 33, 0.1), 0 4px 6px -2px rgba(5, 115, 33, 0.05)',
        'premium-xl': '0 20px 25px -5px rgba(5, 115, 33, 0.1), 0 10px 10px -5px rgba(5, 115, 33, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'inner-glow': 'inset 0 2px 4px 0 rgba(5, 115, 33, 0.06)',
      },
      // Gradientes premium
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #057321 0%, #046119 100%)',
        'gradient-primary-soft': 'linear-gradient(135deg, #e6f7ec 0%, #c2ebd0 100%)',
        'gradient-card': 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
      },
      // Animações suaves
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      // Transições suaves
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      // Border radius premium
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      // Fontes
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
