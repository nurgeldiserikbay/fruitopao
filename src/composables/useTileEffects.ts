import { ref, onBeforeUnmount } from 'vue'

// Эффекты снятия пары: искры и всплывающие очки. Живут отдельно от сетки,
// потому что фишкам нельзя трогать transform — он занят инлайновой раскладкой
// и GSAP на анимации маршрута. Эффект — самостоятельный элемент в том же
// контейнере и с той же системой координат, ему трансформации свободны.

export interface ISparkPart {
	dx: number
	dy: number
	delay: number
}

export interface ITileEffect {
	id: number
	kind: 'sparkle' | 'score' | 'dissolve'
	row: number
	col: number
	value?: number
	type?: number
	parts?: ISparkPart[]
}

// Держим синхронно с длительностями в _redesign.scss.
const SPARKLE_MS = 460
const SCORE_MS = 520
const DISSOLVE_MS = 320

export function useTileEffects() {
	const effects = ref<ITileEffect[]>([])
	const timers = new Set<ReturnType<typeof setTimeout>>()
	let seq = 0

	function push(effect: Omit<ITileEffect, 'id'>, ttl: number) {
		const id = (seq += 1)
		effects.value = [...effects.value, { ...effect, id }]

		const timer = setTimeout(() => {
			effects.value = effects.value.filter((item) => item.id !== id)
			timers.delete(timer)
		}, ttl)

		timers.add(timer)
	}

	// 4–6 искр по спецификации. Разброс и задержки случайные: одинаковые лучи
	// читаются как нарисованная звезда, а не как рассыпающийся эффект.
	function sparkle(row: number, col: number) {
		const count = 4 + Math.floor(Math.random() * 3)
		const parts: ISparkPart[] = []

		for (let i = 0; i < count; i += 1) {
			const angle = (Math.PI * 2 * i) / count + Math.random() * 0.7
			const dist = 55 + Math.random() * 45
			parts.push({
				dx: Math.round(Math.cos(angle) * dist),
				dy: Math.round(Math.sin(angle) * dist),
				delay: Math.round(Math.random() * 70),
			})
		}

		push({ kind: 'sparkle', row, col, parts }, SPARKLE_MS)
	}

	function score(row: number, col: number, value: number) {
		push({ kind: 'score', row, col, value }, SCORE_MS)
	}

	// Призрак снятой фишки. Саму фишку из сетки убирают сразу, поэтому
	// сжиматься и гаснуть должна копия в слое эффектов — иначе пришлось бы
	// откладывать изменение состояния поля ради анимации.
	function dissolve(row: number, col: number, type: number) {
		push({ kind: 'dissolve', row, col, type }, DISSOLVE_MS)
	}

	function clear() {
		timers.forEach((timer) => clearTimeout(timer))
		timers.clear()
		effects.value = []
	}

	onBeforeUnmount(clear)

	return { effects, sparkle, score, dissolve, clear }
}
