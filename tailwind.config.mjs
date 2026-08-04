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
        gold:    { DEFAULT: '#C8A76A', soft: '#E4D2A8', hover: '#B89554' },
        cream:   '#F5F6F8',
        'gray-cool': '#6E7480',
        'gray-soft': '#B5BAC2',
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        serif: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [],
};
