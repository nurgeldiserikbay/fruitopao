<script lang="ts" setup>
// Искры по периметру карточки победы.
//
// Позиции детерминированные, по эллипсу: случайный разброс тут читается как
// шум, а ровный обход по кругу — как рамка, которая зажигается. Задержки идут
// по обходу, поэтому искры не вспыхивают все разом.
const COUNT = 12

const parts = Array.from({ length: COUNT }, (_, ind) => {
	const t = ind / COUNT
	const angle = t * Math.PI * 2 - Math.PI / 2
	return {
		x: 50 + Math.cos(angle) * 48,
		y: 50 + Math.sin(angle) * 46,
		delay: Math.round(t * 280),
	}
})
</script>

<template>
	<div class="win-fx">
		<span
			v-for="(part, ind) in parts"
			:key="ind"
			:style="{
				left: `${part.x}%`,
				top: `${part.y}%`,
				'--delay': `${part.delay}ms`,
			}"
			class="win-fx__spark"
		/>
	</div>
</template>

<style lang="scss" scoped>
.win-fx {
	position: absolute;
	top: 50%;
	left: 50%;
	z-index: 90;
	width: 300px;
	height: 150px;
	transform: translate(-50%, -50%);
	pointer-events: none;

	&__spark {
		position: absolute;
		width: 22px;
		height: 22px;
		margin: -11px 0 0 -11px;
		background: url('@/assets/redesign/effects/sparkle.svg') center / contain
			no-repeat;
		animation: win-spark 700ms ease-out var(--delay) both;
	}
}

@keyframes win-spark {
	0% {
		transform: scale(0.2) rotate(-25deg);
		opacity: 0;
	}
	35% {
		transform: scale(1) rotate(0deg);
		opacity: 1;
	}
	100% {
		transform: scale(0.7) rotate(20deg);
		opacity: 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.win-fx__spark {
		animation: win-spark-fade 400ms linear var(--delay) both;
	}
}

@keyframes win-spark-fade {
	0% {
		opacity: 0;
	}
	40% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}
</style>
