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
@import '@/assets/_redesign.scss';

.audio-toggles {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;

	&__btn {
		position: relative;
		flex-shrink: 0;
		padding: 0;
		border: none;
		outline: none;
		cursor: pointer;
		border-radius: 50%;
		background-color: transparent;
		opacity: 0.4;
		transition: opacity 0.3s linear;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;

		// Иконки набора одноцветные и белые. На светлой капсуле HUD они бы
		// пропали, поэтому рисуем их маской и красим через currentColor: один
		// и тот же файл работает и на тёмном кружке меню, и на светлом HUD.
		color: $navy;

		&:before {
			content: '';
			position: absolute;
			inset: 0;
			background-color: currentColor;
			mask-image: var(--icon);
			mask-size: 100%;
			mask-position: center;
			mask-repeat: no-repeat;
			-webkit-mask-image: var(--icon);
			-webkit-mask-size: 100%;
			-webkit-mask-position: center;
			-webkit-mask-repeat: no-repeat;
		}

		&.active {
			opacity: 1;
		}

		&.filled {
			color: #fff;
			border: 2px solid rgba(255, 255, 255, 0.72);
			background-color: rgba(23, 61, 105, 0.72);

			&:before {
				inset: 19%;
			}
		}

		&--music {
			--icon: url('@/assets/redesign/icons/music.svg');
		}

		&--sound {
			--icon: url('@/assets/redesign/icons/sound.svg');
		}
	}
}
</style>
