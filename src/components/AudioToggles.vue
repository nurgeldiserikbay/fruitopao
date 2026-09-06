<script lang="ts" setup>
import { useAudio } from '@/composables/useAudio'

// Один компонент на два места. В меню тумблеры лежат на светлом тропическом
// фоне и им нужна тёмная подложка, в игре — на тёмной панели HUD, где подложка
// только мешала бы. Отсюда вариант `filled`.
withDefaults(
	defineProps<{
		filled?: boolean
		size?: number
	}>(),
	{
		filled: false,
		size: 26,
	}
)

const { toggleMusic, toggleAudio, playAudio, musicActive, audioActive } =
	useAudio()
</script>

<template>
	<div class="audio-toggles">
		<button
			:class="{ active: musicActive, filled }"
			:style="{ width: `${size}px`, height: `${size}px` }"
			class="audio-toggles__btn audio-toggles__btn--music"
			type="button"
			aria-label="music"
			@click="toggleMusic(), playAudio('click')"
		></button>
		<button
			:class="{ active: audioActive, filled }"
			:style="{ width: `${size}px`, height: `${size}px` }"
			class="audio-toggles__btn audio-toggles__btn--sound"
			type="button"
			aria-label="sound"
			@click="toggleAudio(), playAudio('click')"
		></button>
	</div>
</template>

<style lang="scss" scoped>
.audio-toggles {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;

	&__btn {
		flex-shrink: 0;
		padding: 0;
		border: none;
		outline: none;
		cursor: pointer;
		border-radius: 50%;
		background-color: transparent;
		background-size: 100%;
		background-position: center;
		background-repeat: no-repeat;
		opacity: 0.4;
		transition: opacity 0.3s linear;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;

		&.active {
			opacity: 1;
		}

		&.filled {
			border: 2px solid rgba(255, 255, 255, 0.72);
			background-color: rgba(23, 61, 105, 0.72);
			background-size: 62%;
		}

		&--music {
			background-image: url('@/assets/redesign/icons/music.svg');
		}

		&--sound {
			background-image: url('@/assets/redesign/icons/sound.svg');
		}
	}
}
</style>
