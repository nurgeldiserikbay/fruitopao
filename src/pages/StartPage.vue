<script lang="ts" setup>
import { onBeforeUnmount, onMounted } from 'vue'

import { usePageStore } from '@/store/pageStore'

import UiButton from '@/components/UiButton.vue'

import { useAudio } from '@/composables/useAudio'

import { PAGES } from '@/utils/conts'

const {
	play,
	stop,
	toggleMusic,
	toggleAudio,
	playAudio,
	musicActive,
	audioActive,
} = useAudio()

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
</script>

<template>
	<div class="page start-page">
		<div class="start-page__head">
			<button
				:class="{ active: musicActive }"
				class="start-page__music"
				@click="toggleMusic(), playAudio('click')"
			></button>
			<button
				:class="{ active: audioActive }"
				class="start-page__sound"
				@click="toggleAudio(), playAudio('click')"
			></button>
		</div>

		<div class="start-page__body">
			<div class="start-page__logo">
				<img src="@/assets/img/logotype.png" alt="" />
			</div>

			<div class="start-page__btns">
				<UiButton @click="pageStore.routeTo(PAGES.CLASSIC), playAudio('click')">
					Classic
				</UiButton>
				<UiButton @click="pageStore.routeTo(PAGES.TIME), playAudio('click')">
					Time
				</UiButton>
				<UiButton @click="pageStore.routeTo(PAGES.GROUP), playAudio('click')">
					Group
				</UiButton>
			</div>
		</div>

		<a
			href="https://docs.google.com/document/d/1n50CPwqrjHT-nVk9VynjzNZVxV45Jt4hDKEMcvZJZQk/edit?usp=sharing"
			target="_blank"
			class="privacy"
			>Privacy Policy</a
		>
	</div>
</template>

<style lang="scss" scoped>
.start-page {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 15px;

	&__head {
		display: flex;
		justify-content: flex-start;
		gap: 10px;

		button {
			width: 40px;
			height: 40px;
			border-radius: 8px;
			border: none;
			outline: none;
			cursor: pointer;
			opacity: 0.5;
			transition: 0.3s linear;
			background-size: cover;
			background-color: transparent;

			&.active {
				opacity: 1;
			}
		}
	}

	&__music {
		background-image: url('@/assets/img/music.png');
	}

	&__sound {
		background-image: url('@/assets/img/sound.png');
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
</style>
