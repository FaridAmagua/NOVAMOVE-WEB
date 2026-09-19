/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  theme: {
    screens: {
      sm:  '540px',
      md:  '720px',
      lg:  '960px',
      xl:  '1280px',
      '2xl': '1440px',
    },
    extend: {
      colors: {
        navy:    { DEFAULT: '#0A1D3F', 700: '#11295A', 900: '#061129' },
        charcoal:'#1C1F24',
        gold:    { DEFAULT: '#071B68', soft: '#FFFFFF', hover: '#000000' },
        cream:   '#F5F6F8',
        'gray-cool': '#6E7480',
        'gray-soft': '#B5BAC2',
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        serif: ['Montserrat', 'sans-serif'],
      },
      fontWeight: {
        medium: '500',
        bold: '700',
        extrabold: '800',
      },
      fontSize: {
        h1: ['68px', { lineHeight: '1.1', fontWeight: '800' }],
        h2: ['48px', { lineHeight: '1.15', fontWeight: '800' }],
        h3: ['32px', { lineHeight: '1.2', fontWeight: '800' }],
        h4: ['24px', { lineHeight: '1.25', fontWeight: '800' }],
        h5: ['20px', { lineHeight: '1.3', fontWeight: '800' }],
        h6: ['16px', { lineHeight: '1.4', fontWeight: '700' }],
        pretitle: ['14px', { lineHeight: '17px', letterSpacing: '0.02em', fontWeight: '700' }],
        btn: ['14px', { lineHeight: '1.43', letterSpacing: '0.56px', fontWeight: '700' }],
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [],
};
