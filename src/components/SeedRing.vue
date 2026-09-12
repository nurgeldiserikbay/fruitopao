<script lang="ts" setup>
import { ref, watch, onBeforeUnmount } from 'vue'

// Кольцо отсчёта до подсева в режиме Time.
//
// Вынесено в отдельный компонент не ради красоты, а из-за конкретного бага.
// Отсчёт тикает десять раз в секунду, и когда он жил прямо в странице, каждый
// тик перерисовывал её целиком — вместе со всеми 72 фишками. А Vue при
// обновлении :style переписывает свойства безусловно, без поштучного
// сравнения: на каждом тике фишке возвращался раскладочный transform, затирая
// GSAP посреди анимации маршрута. Фишка дёргалась вперёд-назад всю дорогу.
//
// Здесь тик остаётся внутри компонента, и страница о нём не знает.

const $props = withDefaults(
	defineProps<{
		// Длительность текущего ожидания подсева, мс.
		duration: number
		// Меняется при каждом новом планировании подсева и перезапускает отсчёт.
		nonce: number
	}>(),
	{
		duration: 0,
		nonce: 0,
	}
)

// Последние полторы секунды подсвечиваем: иначе новые пары появляются без
// предупреждения и читаются как случайная помеха.
const SOON_MS = 1500

const left = ref(100)
const soon = ref(false)

let ticker: ReturnType<typeof setInterval> | undefined

function stop() {
	if (ticker) clearInterval(ticker)
	ticker = undefined
}

function start() {
	stop()
	if (!$props.duration) return

	const endAt = Date.now() + $props.duration
	left.value = 100
	soon.value = false

	ticker = setInterval(() => {
		const rest = Math.max(0, endAt - Date.now())
		left.value = (rest / $props.duration) * 100
		soon.value = rest > 0 && rest <= SOON_MS
		if (rest === 0) stop()
	}, 100)
}

watch(() => $props.nonce, start)

onBeforeUnmount(stop)
</script>

<template>
	<div
		:class="{ 'seed-ring--soon': soon }"
		:style="{ '--seed': `${left}%` }"
		class="seed-ring"
	></div>
</template>

<style lang="scss" scoped>
.seed-ring {
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	background: url('@/assets/redesign/overlays/time-seed-ring.svg') center /
		contain no-repeat;
	// Круговой отсчёт: убывающий сектор режем маской, сам ассет статичный.
	mask-image: conic-gradient(#000 var(--seed, 100%), transparent 0);
	-webkit-mask-image: conic-gradient(#000 var(--seed, 100%), transparent 0);

	&--soon {
		animation: seed-pulse 0.75s ease-in-out;
	}
}

@keyframes seed-pulse {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.18);
	}
}

@media (prefers-reduced-motion: reduce) {
	.seed-ring--soon {
		animation: none;
	}
}
</style>
