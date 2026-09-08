import { defineConfig } from 'vite'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

// https://vitejs.dev/config/
export default defineConfig({
	base: './',
	build: {
		outDir: './docs',
	},
	plugins: [vue(), svgLoader()],
	css: {
		preprocessorOptions: {
			scss: {
				// Vite по умолчанию зовёт Sass через старый JS API, и тот пишет
				// в сборку DEPRECATION WARNING [legacy-js-api]. Предупреждение
				// не про наш код, лечится переключением на современный
				// компилятор — вывод CSS при этом не меняется.
				api: 'modern-compiler',
			},
		},
	},
	resolve: {
		alias: [
			{
				find: '@',
				replacement: path.resolve(__dirname, './src/'),
			},
		],
	},
})
