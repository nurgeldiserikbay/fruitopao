<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, computed, watch } from 'vue'

const $props = withDefaults(
	defineProps<{
		level: number
		isWin: boolean
		scale?: number
	}>(),
	{
		scale: 1,
	}
)

const $emits = defineEmits(['timeend', 'addtimescore'])

let timerId: ReturnType<typeof setInterval> | undefined
let savedTime = 0

const date = ref(0)
const getTimeValue = computed(() => {
	if ($props.level > 8) return 4800 / $props.scale
	if ($props.level > 7) return 5200 / $props.scale
	if ($props.level > 6) return 5600 / $props.scale
	if ($props.level > 5) return 6000 / $props.scale
	if ($props.level > 4) return 6400 / $props.scale
	if ($props.level > 3) return 6800 / $props.scale
	if ($props.level > 2) return 7200 / $props.scale
	if ($props.level > 1) return 7600 / $props.scale

	return 8000 / $props.scale
})
const getWidth = computed(() => {
	return `${(date.value / getTimeValue.value) * 100}%`
})

// Последняя пятая часть запаса: полоса становится коралловой и пульсирует.
// Раньше единственным сигналом об исходе времени был звук в самом конце.
const isLow = computed(() => date.value / getTimeValue.value <= 0.2)

watch(
	() => $props.isWin,
	() => {
		if ($props.isWin) {
			$emits('addtimescore', date.value)
			clearTimer()
		}
	}
)

watch(
	() => $props.level,
	() => {
		createTimer()
	}
)

onMounted(() => {
	createTimer()
	document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
	clearTimer()
	document.removeEventListener('visibilitychange', handleVisibilityChange)
})

function createTimer() {
	clearTimer()
	date.value = getTimeValue.value
	timerId = setInterval(() => {
		date.value -= 1
		if (date.value === 0) {
			clearTimer()
			$emits('timeend')
		}
	}, 100)
}

function clearTimer() {
	if (timerId) clearInterval(timerId)
}

function handleVisibilityChange() {
	if (document.hidden) {
		savedTime = date.value
		clearTimer()
	} else {
		date.value = savedTime
		createTimer()
	}
}
</script>

<template>
	<div class="time">
		<span class="time__icon"></span>
		<div class="time__track">
			<div
				class="time__in"
				:class="{ 'time__in--low': isLow }"
				:style="{
					width: getWidth,
				}"
			></div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.time {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 80%;
	font-size: 14px;
	box-sizing: border-box;
	// Полоса времени ничего не принимает на нажатие, это чистая индикация,
	// поэтому ей не нужна высота кнопки: толстый блок просто перетягивал на
	// себя внимание в шапке.
	height: 10px;

	// Часы — обычный элемент строки, а не абсолютный: рядом стоит номер
	// уровня, и вынос за границу полосы наезжал на подпись.
	// Иконка одноцветная и белая: на светлой капсуле красим её маской.
	&__icon {
		width: 17px;
		height: 17px;
		flex-shrink: 0;
		background-color: #123d66;
		mask: url('@/assets/redesign/icons/clock.svg') center / contain no-repeat;
		-webkit-mask: url('@/assets/redesign/icons/clock.svg') center / contain
			no-repeat;
	}

	&__track {
		flex: 1 1 auto;
		// Высота задаётся явно, а не в 100%: снаружи .time — капсула HUD со
		// своей высотой, и полоса растягивалась на неё целиком.
		height: 10px;
		border-radius: 999px;
		background: rgba(18, 61, 102, 0.16);
		overflow: hidden;
	}

	&__in {
		position: relative;
		border-radius: 999px;
		height: 100%;
		background: linear-gradient(90deg, #2fbf7a, #8fd94a);
		transition: background 0.3s linear;

		// drop-shadow пересчитывался каждые 100 мс вместе с шириной полосы —
		// на слабых Android это самый дорогой из возможных вариантов свечения.
		&--low {
			background: linear-gradient(90deg, #ff7c72, #ffab6b);
			animation: time-low 0.9s ease-in-out infinite;
		}
	}

	@keyframes time-low {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.55;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		&__in--low {
			animation: none;
		}
	}
}
</style>
