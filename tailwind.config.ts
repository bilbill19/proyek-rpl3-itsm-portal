import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    // Renderer Markdown bersama (src/lib/ai/markdown.tsx) WAJIB ter-scan:
    // tanpa glob ini, class unik seperti `pl-5` pada <ul>/<ol> tak pernah
    // dikompilasi → padding list = 0px (preflight) dan bullet marker jatuh
    // hampir menempel tepi kotak jawaban pada SEMUA konsumen parseMarkdown.
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      boxShadow: {
        'glow': '0 0 35px -5px rgba(99, 102, 241, 0.25)',
        'glow-lg': '0 0 50px -10px rgba(99, 102, 241, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
