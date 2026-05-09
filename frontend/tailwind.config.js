/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          abyss: '#060d1f',
          base: '#0a1226',
          panel: '#0f1a36',
          card: '#142048',
          elevated: '#1a2a5c',
          line: '#1f2c5a'
        },
        ink: {
          1: '#e6ecff',
          2: '#a8b2d6',
          3: '#6c789f'
        },
        accent: {
          cyan: '#22d3ee',
          teal: '#14b8a6',
          blue: '#3b82f6',
          green: '#10b981',
          amber: '#f59e0b',
          gold: '#eab308',
          red: '#ef4444',
          rose: '#f43f5e',
          purple: '#a855f7'
        },
        sev: {
          critical: '#dc2626',
          high: '#ea580c',
          medium: '#ca8a04',
          low: '#64748b'
        }
      },
      fontFamily: {
        brand: ['Orbitron', 'sans-serif'],
        heading: ['Rajdhani', 'sans-serif'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0,0,0.2,1) infinite',
        'border-breathe': 'border-breathe 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'count-up': 'count-up 0.3s ease-out',
        'radar-sweep': 'radar-sweep 4s linear infinite',
        'marching-ants': 'marching-ants 1s linear infinite',
        'shake': 'shake 0.5s ease-in-out'
      },
      keyframes: {
        'border-breathe': {
          '0%, 100%': { borderColor: 'rgba(34, 211, 238, 0.15)' },
          '50%': { borderColor: 'rgba(34, 211, 238, 0.45)' }
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(34, 211, 238, 0.15)' },
          '50%': { boxShadow: '0 0 20px rgba(34, 211, 238, 0.3)' }
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 }
        },
        'slide-down': {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(0)' }
        },
        'fade-in': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        },
        'count-up': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        },
        'radar-sweep': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' }
        },
        'marching-ants': {
          to: { strokeDashoffset: '-20' }
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' }
        }
      },
      backdropBlur: {
        xs: '2px'
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(34, 211, 238, 0.25)',
        'glow-red': '0 0 15px rgba(220, 38, 38, 0.3)',
        'glow-amber': '0 0 15px rgba(245, 158, 11, 0.25)',
        'glow-green': '0 0 12px rgba(16, 185, 129, 0.2)',
        'glow-purple': '0 0 15px rgba(168, 85, 247, 0.25)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.05)'
      }
    }
  },
  plugins: []
};
