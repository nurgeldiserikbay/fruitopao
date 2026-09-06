import { ref } from 'vue'
import { defineStore } from 'pinia'

import { TYPE_PAGES } from '@/utils/types'

// Рекорд хранится по режимам: в Group таймер идёт вчетверо быстрее, а в Time
// поле постоянно пополняется — общий рекорд на три режима сравнивал бы
// несравнимое.
//
// pinia-plugin-persistedstate был подключён в main.ts, но им никто не
// пользовался: до сих пор ни одно состояние не переживало перезапуск.
export const useScoreStore = defineStore(
	'scoreStore',
	() => {
		const best = ref<Partial<Record<TYPE_PAGES, number>>>({})

		function submit(mode: TYPE_PAGES, value: number) {
			if (value > (best.value[mode] ?? 0)) {
				best.value = { ...best.value, [mode]: value }
			}
		}

		function bestOf(mode: TYPE_PAGES) {
			return best.value[mode] ?? 0
		}

		return { best, submit, bestOf }
	},
	{ persist: true }
)
