import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { canvas: '#FAF9F6', ink: '#191B1F', marigold: '#FFB800', cream: '#FFF5D6', chip: '#F0EEE9', field: '#F5F3EF' }, fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] } } }, plugins: [] } satisfies Config;
