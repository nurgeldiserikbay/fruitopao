<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'

import { usePageStore } from '@/store/pageStore'
import { useScoreStore } from '@/store/scoreStore'

const pageStore = usePageStore()
const scoreStore = useScoreStore()

// Рекорд берём по текущему режиму: карточка итога живёт внутри страницы
// режима, так что currentPage — это и есть режим сыгранной партии.
const best = computed(() => scoreStore.bestOf(pageStore.currentPage))

onMounted(() => pageStore.setResultOpen(true))
onBeforeUnmount(() => pageStore.setResultOpen(false))

withDefaults(
	defineProps<{
		result: number
	}>(),
	{}
)

const $emits = defineEmits(['close'])
</script>

<template>
	<div class="result">
		<div class="result__in">
			<div class="result__title">Your Score</div>
			<div class="result__table">
				<div>{{ result }}</div>
			</div>
			<div v-if="best" class="result__best">BEST {{ best }}</div>
			<button class="result__btn" @click="$emits('close')" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/_common.scss';
@import '@/assets/_redesign.scss';

.result {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000;
	// Своей картинки у экрана итога больше нет: фон рисует общий слой на весь
	// вьюпорт, а этот блок лежит внутри сцены и накрыл бы только её — на краях
	// был бы виден шов между двумя кадрированиями одной и той же картинки.
	// Вместо этого — вуаль в цвете панели HUD, она же прячет поле под собой.
	background: rgba(23, 61, 105, 0.72);
	backdrop-filter: blur(6px);
	color: #fff;
	animation: result-backdrop 160ms ease-out both;

	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;

	&__in {
		position: relative;
		padding: clamp(30px, 8vw, 65px) clamp(15px, 4vw, 28px) clamp(35px, 8vw, 68px);
		border-radius: 12px;
		height: clamp(40vh, 60vh, 80vh);
		width: clamp(280px, 90%, 40%);
		box-sizing: border-box;
		display: flex;
		justify-content: space-around;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
		margin-bottom: clamp(50px, 10vh, 100px);
		background: rgba(255, 255, 255, 0.18);
		border: 3px solid rgba(255, 255, 255, 0.4);
		border-radius: 18px;
		font-size: clamp(18px, 4vw, 22px);
		animation: result-card 220ms ease-out both;
	}

	&__title {
		font-size: clamp(20px, 5vw, 28px);
		text-align: center;
	}

	&__table {
		width: clamp(60%, 70%, 80%);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-grow: 1;
		padding-bottom: clamp(15px, 4vw, 30px);
		letter-spacing: 3px;
		font-size: clamp(24px, 6vw, 28px);
	}

	&__best {
		padding-bottom: clamp(10px, 3vw, 20px);
		font-size: clamp(14px, 3.5vw, 18px);
		letter-spacing: 2px;
		opacity: 0.75;
	}

	&__btn {
		flex-shrink: 0;
		display: block;
		width: clamp(36px, 8vw, 46px);
		height: clamp(36px, 8vw, 46px);
		background-color: transparent;
		border-radius: 10px;
		border: none;
		cursor: pointer;
		background-size: cover;
		background-color: transparent;
		background-image: url('@/assets/redesign/icons/home.svg');
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
}

@keyframes result-backdrop {
	0% {
		opacity: 0;
	}
	100% {
		opacity: 1;
	}
}

@keyframes result-card {
	0% {
		opacity: 0;
		transform: scale(0.9);
	}
	100% {
		opacity: 1;
		transform: scale(1);
	}
}

// Спецификация: без scale и сдвигов, только затухание.
@media (prefers-reduced-motion: reduce) {
	.result,
	.result__in {
		animation: result-backdrop 140ms linear both;
	}
}
</style>
