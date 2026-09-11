<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import OtherGames from '@/components/OtherGames.vue'

import { usePageStore } from '@/store/pageStore'

import UiButton from '@/components/UiButton.vue'
import AudioToggles from '@/components/AudioToggles.vue'

import { useAudio } from '@/composables/useAudio'

import { PAGES } from '@/utils/conts'

import classicIcon from '@/assets/redesign/icons/classic.svg?url'
import clockIcon from '@/assets/redesign/icons/clock.svg?url'
import groupIcon from '@/assets/redesign/icons/group.svg?url'

const { play, stop, playAudio } = useAudio()

const pageStore = usePageStore()

onMounted(() => {
	play('menuMusic')
	document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
	stop('menuMusic')
	document.removeEventListener('visibilitychange', handleVisibilityChange)
})

function handleVisibilityChange() {
	if (document.hidden) {
		stop('menuMusic')
	} else {
		play('menuMusic')
	}
}

const isOtherGames = ref(false)
</script>

<template>
	<div class="page start-page">
		<div class="start-page__head">
			<AudioToggles :size="40" filled />
		</div>

		<div class="start-page__body">
			<div class="start-page__logo">
				<img src="@/assets/img/logotype.png" alt="" />
			</div>

			<div class="start-page__btns">
				<UiButton
					:icon="classicIcon"
					tone="aqua"
					@click="pageStore.routeTo(PAGES.CLASSIC), playAudio('click')"
				>
					Classic
				</UiButton>
				<UiButton
					:icon="clockIcon"
					tone="coral"
					@click="pageStore.routeTo(PAGES.TIME), playAudio('click')"
				>
					Time
				</UiButton>
				<UiButton
					:icon="groupIcon"
					tone="lemon"
					@click="pageStore.routeTo(PAGES.GROUP), playAudio('click')"
				>
					Group
				</UiButton>
			</div>
		</div>

		<button
			class="promo-more"
			@click="(isOtherGames = true), playAudio('click')"
		>
			Other games
		</button>

		<a
			href="https://docs.google.com/document/d/1n50CPwqrjHT-nVk9VynjzNZVxV45Jt4hDKEMcvZJZQk/edit?usp=sharing"
			target="_blank"
			class="privacy"
			>Privacy Policy</a
		>

		<OtherGames v-if="isOtherGames" @close="isOtherGames = false" />
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/_redesign.scss' as *;

.start-page {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 15px;

	&__head {
		display: flex;
		justify-content: flex-start;
	}

	&__logo {
		max-width: 300px;
		position: relative;
		color: rgb(254, 206, 13);
		text-align: center;
		letter-spacing: 3px;
		-webkit-text-stroke: 2px rgb(45, 128, 0);
		font-size: 42px;
		background-color: rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(5px);
		box-shadow: 0 0 20px 0 rgba(255, 255, 255, 0.8);
		border-radius: 23% 77% 32% 68% / 58% 32% 68% 42%;
		padding: 25px 35px 13px 23px;
		overflow: hidden;

		img {
			display: block;
			width: 100%;
		}

		span {
			span {
				font-size: 32px;
			}
		}
	}

	&__btns {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		gap: 18px;
	}

	&__body {
		display: flex;
		justify-content: space-around;
		align-items: center;
		flex-grow: 1;
	}
}

.privacy {
	width: fit-content;
	display: inline-block;
	font-size: 16px;
	color: #060606;
	text-decoration: none;
	letter-spacing: 4px;
	text-align: center;
	background: rgba(255, 255, 255, 0.3);
	backdrop-filter: blur(3px);
	padding: 2px 15px;
}

/* Кнопка в раздел «Другие игры». Стоит над ссылкой на политику, тем же рядом. */
.promo-more {
	align-self: center;
	margin-bottom: 6px;
	padding: 8px 18px;
	border: none;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.86);
	box-shadow: 0 4px 10px rgba(7, 94, 114, 0.24);
	cursor: pointer;
	font-family: LuckiestGuy, sans-serif;
	font-size: 13px;
	letter-spacing: 0.6px;
	color: #0d6e86;
}

.promo-more:active {
	transform: translateY(2px);
}
</style>
