/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bs-bg': '#0a0a0a',
        'bs-surface': '#111111',
        'bs-border': '#1a1a1a',
        'bs-green': '#00ff88',
        'bs-cyan': '#00d4ff',
        'bs-amber': '#ffaa00',
        'bs-red': '#ff3b3b',
        'bs-purple': '#9d4edd',
      },
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace'],
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 5px #00ff88, 0 0 10px #00ff88' },
          '50%': { boxShadow: '0 0 20px #00ff88, 0 0 40px #00ff88' },
        },
        'shake-red': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-8px)' },
          '80%': { transform: 'translateX(8px)' },
        },
        'flash-green': {
          '0%': { backgroundColor: 'transparent' },
          '30%': { backgroundColor: 'rgba(0,255,136,0.2)' },
          '100%': { backgroundColor: 'transparent' },
        },
        typewriter: {
          from: { width: '0' },
          to: { width: '100%' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rank-up': {
          '0%': { backgroundColor: 'rgba(0,255,136,0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'rank-down': {
          '0%': { backgroundColor: 'rgba(255,59,59,0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'amber-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        matrix: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        glitch: 'glitch 0.3s infinite',
        'glitch-slow': 'glitch 1s infinite',
        scanline: 'scanline 3s linear infinite',
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'shake-red': 'shake-red 0.4s ease-in-out',
        'flash-green': 'flash-green 0.8s ease-out',
        typewriter: 'typewriter 3s steps(40, end)',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'rank-up': 'rank-up 1s ease-out',
        'rank-down': 'rank-down 1s ease-out',
        'amber-pulse': 'amber-pulse 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
