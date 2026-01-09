/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
				serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
				dyslexic: ['OpenDyslexic', 'sans-serif']
			}
		}
	},
	plugins: []
};
