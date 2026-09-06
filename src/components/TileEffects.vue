<script lang="ts" setup>
import type { ITileEffect } from '@/composables/useTileEffects'

const $props = defineProps<{
	effects: ITileEffect[]
	cellWidth: number
	cellHeight: number
}>()

// Та же система координат, что у фишек: проценты от контейнера сетки.
function cellStyle(effect: ITileEffect) {
	return {
		width: `${$props.cellWidth}%`,
		height: `${$props.cellHeight}%`,
		transform: `translate(${(effect.col - 1) * 100}%, ${(effect.row - 1) * 100}%)`,
	}
}
</script>

<template>
	<div
		v-for="effect in effects"
		:key="effect.id"
		:style="cellStyle(effect)"
		class="fx"
	>
		<template v-if="effect.kind === 'sparkle'">
			<span
				v-for="(part, ind) in effect.parts"
				:key="ind"
				:style="{
					'--dx': `${part.dx}%`,
					'--dy': `${part.dy}%`,
					'--delay': `${part.delay}ms`,
				}"
				class="fx__spark"
			/>
		</template>

		<!-- Пара сошлась: плитка кратко вспыхивает галочкой, фрукт на ней
		сжимается и гаснет. Обе фишки убирают из сетки сразу, поэтому состояние
		показывает копия в слое эффектов. -->
		<span v-else-if="effect.kind === 'dissolve'" class="fx__match">
			<span
				:style="{
					backgroundImage: `url('/img/fruits-redesign/${effect.type}.webp')`,
				}"
				class="fx__match-fruit"
			/>
		</span>

		<!-- В двух верхних рядах подъём уводит плашку под шапку, поэтому там
		очки всплывают вниз. -->
		<span
			v-else
			:class="{ 'fx__score--below': effect.row <= 1 }"
			class="fx__score"
			>+{{ effect.value }}</span
		>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/_redesign.scss';

.fx {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 20;
	pointer-events: none;

	&__spark {
		position: absolute;
		inset: 12%;
		background: url('@/assets/redesign/effects/sparkle.svg') center / contain
			no-repeat;
		animation: fx-spark 340ms ease-out var(--delay) both;
	}

	&__match {
		position: absolute;
		inset: 0;
		background: url('@/assets/redesign/ui/tile-match.svg') center / 100% 100%
			no-repeat;
		animation: fx-match 300ms ease-out both;

		&-fruit {
			position: absolute;
			inset: 0;
			background-size: 84% 84%;
			background-position: center;
			background-repeat: no-repeat;
			animation: fx-dissolve 300ms ease-in both;
		}
	}

	// Подложку рисуем стилями, а не plus-score.svg: в ассете уже нарисованы
	// собственные «+» и «P», и число поверх них накладывается на чужие глифы.
	// Палитра взята оттуда же, чтобы не разъезжаться с остальным набором.
	&__score {
		position: absolute;
		left: 50%;
		bottom: 60%;
		padding: 2px 9px;
		border-radius: 999px;
		border: 2px solid #fff;
		background: rgba(36, 59, 104, 0.82);
		color: #fff;
		font-size: 12px;
		line-height: 1.3;
		letter-spacing: 1px;
		white-space: nowrap;
		animation: fx-score 520ms ease-out both;

		&--below {
			top: 60%;
			bottom: auto;
			animation-name: fx-score-below;
		}
	}
}

@keyframes fx-spark {
	0% {
		transform: translate(0, 0) scale(0.3);
		opacity: 0;
	}
	25% {
		opacity: 1;
	}
	100% {
		transform: translate(var(--dx), var(--dy)) scale(1);
		opacity: 0;
	}
}

@keyframes fx-match {
	0% {
		opacity: 0;
		transform: scale(0.9);
	}
	25% {
		opacity: 1;
		transform: scale(1);
	}
	100% {
		opacity: 0;
		transform: scale(1.04);
	}
}

@keyframes fx-dissolve {
	0% {
		transform: scale(1);
		opacity: 1;
	}
	100% {
		transform: scale(0.65);
		opacity: 0;
	}
}

@keyframes fx-score {
	0% {
		transform: translate(-50%, 0) scale(0.8);
		opacity: 0;
	}
	20% {
		transform: translate(-50%, -6px) scale(1);
		opacity: 1;
	}
	100% {
		transform: translate(-50%, -22px) scale(1);
		opacity: 0;
	}
}

@keyframes fx-score-below {
	0% {
		transform: translate(-50%, 0) scale(0.8);
		opacity: 0;
	}
	20% {
		transform: translate(-50%, 6px) scale(1);
		opacity: 1;
	}
	100% {
		transform: translate(-50%, 22px) scale(1);
		opacity: 0;
	}
}

// Спецификация: оставить только смену прозрачности, без разлёта и подъёма.
@media (prefers-reduced-motion: reduce) {
	.fx {
		&__spark {
			animation: fx-fade 100ms linear both;
		}

		&__match,
		&__match-fruit {
			animation: fx-fade-out 100ms linear both;
		}

		&__score {
			transform: translateX(-50%);
			animation: fx-fade 400ms linear both;
		}
	}
}

@keyframes fx-fade-out {
	0% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

@keyframes fx-fade {
	0% {
		opacity: 0;
	}
	30% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}
</style>
