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
		<div
			class="time__in"
			:style="{
				width: getWidth,
			}"
		></div>
	</div>
</template>

<style lang="scss" scoped>
.time {
	width: 80%;
	font-size: 14px;
	box-sizing: border-box;
	height: 20px;
	text-align: center;
	border-radius: 5px;
	border: 1px solid hsl(65, 100%, 50%);

	&__in {
		position: relative;
		border-radius: 5px;
		height: 100%;
		background: hsl(60, 100%, 50%);
		filter: drop-shadow(0 0 5px hsl(67, 100%, 61%));
	}
}
</style>
