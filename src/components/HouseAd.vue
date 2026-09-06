<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

import { useAdsStore } from '@/store/adsStore'
import { useAudio } from '@/composables/useAudio'

import {
	PROMO_GAMES,
	promoIcon,
	promoLink,
	type IPromoGame,
} from '@/utils/promoGames'

const ROTATE_MS = 7000

const adsStore = useAdsStore()
const { playAudio } = useAudio()

// Порядок перемешиваем один раз за сессию, иначе первая игра списка всегда
// получала бы весь показ, а последние — никогда.
const order = ref<IPromoGame[]>(
	[...PROMO_GAMES].sort(() => (Math.random() > 0.5 ? 1 : -1))
)
const index = ref(0)
const gateOpen = ref(false)
const gateA = ref(0)
const gateB = ref(0)
const gateOptions = ref<number[]>([])

const game = computed(() => order.value[index.value % order.value.length])
const gateAnswer = computed(() => gateA.value * gateB.value)

let rotateTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
	rotateTimer = setInterval(() => {
		index.value = (index.value + 1) % order.value.length
	}, ROTATE_MS)
})

onBeforeUnmount(() => {
	if (rotateTimer) clearInterval(rotateTimer)
})

// Родительский контроль перед выходом в магазин.
//
// Игра помечена как детская: в AdMob стоят tagForChildDirectedTreatment и
// tagForUnderAgeOfConsent. Families Policy требует, чтобы переход из такого
// приложения во внешний магазин был закрыт родительским барьером — иначе
// ребёнок уходит на страницу установки одним случайным тапом. Барьер простой
// умышленно: он должен отсекать случайное нажатие, а не проверять знания.
function openGate() {
	playAudio('click')
	gateA.value = 3 + Math.floor(Math.random() * 6)
	gateB.value = 3 + Math.floor(Math.random() * 6)
	const right = gateA.value * gateB.value
	const wrong = new Set<number>()
	while (wrong.size < 2) {
		const shift = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.floor(Math.random() * 9))
		if (right + shift > 0 && right + shift !== right) wrong.add(right + shift)
	}
	gateOptions.value = [right, ...wrong].sort(() =>
		Math.random() > 0.5 ? 1 : -1
	)
	gateOpen.value = true
}

function answer(value: number) {
	playAudio('click')
	if (value !== gateAnswer.value) {
		gateOpen.value = false
		return
	}
	gateOpen.value = false
	window.open(promoLink(game.value), '_blank')
}
</script>

<template>
	<!-- Полоса живёт только до появления баннера AdMob: как только нативный
	баннер загрузился, он занимает эту же зону, и две рекламы друг на друге не
	нужны. В браузерной сборке баннера не будет никогда, поэтому промо
	остаётся. -->
	<div v-if="!adsStore.bannerInited" class="house-ad">
		<button class="house-ad__body" type="button" @click="openGate">
			<img :src="promoIcon(game)" :alt="game.title" class="house-ad__icon" />
			<span class="house-ad__text">
				<span class="house-ad__label">More games</span>
				<span class="house-ad__title">{{ game.title }}</span>
			</span>
			<span class="house-ad__cta">PLAY</span>
		</button>
	</div>

	<div v-if="gateOpen" class="gate" @click.self="gateOpen = false">
		<div class="gate__card">
			<div class="gate__title">Ask a grown-up</div>
			<div class="gate__question">{{ gateA }} × {{ gateB }} = ?</div>
			<div class="gate__options">
				<button
					v-for="option in gateOptions"
					:key="option"
					class="gate__option"
					type="button"
					@click="answer(option)"
				>
					{{ option }}
				</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/_redesign.scss';

.house-ad {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 400;
	height: 52px;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;

	&__body {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 10px;
		max-width: 420px;
		height: 44px;
		padding: 0 6px 0 6px;
		border: 2px solid rgba(255, 255, 255, 0.8);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.86);
		box-shadow: 0 4px 10px rgba(7, 94, 114, 0.24);
		cursor: pointer;
		font-family: LuckiestGuy, sans-serif;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	&__icon {
		width: 34px;
		height: 34px;
		border-radius: 9px;
		display: block;
		flex-shrink: 0;
	}

	&__text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		line-height: 1.1;
		text-align: left;
	}

	&__label {
		font-size: 10px;
		letter-spacing: 1px;
		color: rgba(18, 61, 102, 0.62);
	}

	&__title {
		font-size: 15px;
		letter-spacing: 1px;
		color: $navy;
		white-space: nowrap;
	}

	&__cta {
		flex-shrink: 0;
		padding: 5px 14px;
		border-radius: 999px;
		font-size: 14px;
		letter-spacing: 1px;
		color: #fff;
		background: linear-gradient(180deg, #63e2e7, #17b3bd);
	}
}

.gate {
	position: fixed;
	inset: 0;
	z-index: 500;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(18, 61, 102, 0.72);
	backdrop-filter: blur(4px);
	font-family: LuckiestGuy, sans-serif;

	&__card {
		min-width: 260px;
		padding: 22px 26px;
		border-radius: 22px;
		border: 3px solid rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.92);
		text-align: center;
		color: $navy;
	}

	&__title {
		font-size: 15px;
		letter-spacing: 1px;
		opacity: 0.7;
	}

	&__question {
		margin: 8px 0 16px;
		font-size: 30px;
		letter-spacing: 2px;
	}

	&__options {
		display: flex;
		justify-content: center;
		gap: 10px;
	}

	&__option {
		min-width: 62px;
		padding: 10px 8px;
		border-radius: 999px;
		border: 2px solid rgba(255, 255, 255, 0.9);
		background: linear-gradient(180deg, #63e2e7, #17b3bd);
		color: #fff;
		font-family: LuckiestGuy, sans-serif;
		font-size: 20px;
		letter-spacing: 1px;
		cursor: pointer;
		touch-action: manipulation;
	}
}
</style>
