/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a1226',
          panel: '#0f1a36',
          card: '#142048',
          line: '#1f2c5a'
        },
        ink: {
          1: '#e6ecff',
          2: '#a8b2d6',
          3: '#6c789f'
        },
        accent: {
          cyan: '#22d3ee',
          blue: '#3b82f6',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0,0,0.2,1) infinite'
      }
    }
  },
  plugins: []
};
