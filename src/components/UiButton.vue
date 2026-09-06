<template>
	<button
		class="ui-button"
		:class="{
			[`ui-button--${bg}`]: true,
			[`ui-button--${size}`]: true,
			[`ui-button--${tone}`]: true,
		}"
		:style="width ? { width: `${width}px` } : undefined"
	>
		<img v-if="icon" :src="icon" class="ui-button__icon" alt="" />
		<slot></slot>
	</button>
</template>

<script lang="ts" setup>
withDefaults(
	defineProps<{
		bg?: string
		width?: number
		size?: string
		icon?: string
		tone?: string
	}>(),
	{
		bg: '',
		tone: 'coral',
		// 0 — «ширину не навязывать»: раньше значение по умолчанию 150
		// приходило инлайновым стилем и перебивало CSS, из-за чего кнопка
		// оставалась узкой и длинные подписи заезжали на скругление.
		width: 0,
		size: '',
		icon: '',
	}
)
</script>

<style lang="scss" scoped>
.ui-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10px;

	&__icon {
		width: 1em;
		height: 1em;
		flex-shrink: 0;
	}

	// Размеры в пикселях, а не в vw: сцена и так масштабируется целиком через
	// transform, и vw поверх этого давал двойное масштабирование.
	width: 220px;
	// Пропорции берём у самой основы (viewBox 320x96), иначе скругления
	// и тень в SVG растягиваются.
	aspect-ratio: 3.33;
	border-radius: 18px;
	border: none;
	outline: none;
	cursor: pointer;
	font-family: LuckiestGuy;
	font-weight: 700;
	text-transform: uppercase;
	font-size: 22px;
	line-height: 1;
	letter-spacing: 2px;
	// Отступы под форму ассета: у таблетки rx=40 при высоте 80, то есть торцы
	// полностью круглые, и надпись без горизонтального отступа заезжала на
	// скругление. Нижний отступ поднимает текст к центру самой таблетки —
	// в SVG под ней оставлено место на тень.
	padding: 0 26px 5px;
	box-sizing: border-box;
	color: #ffffff;
	// Обводка рисуется по центру контура буквы и при 2px на кегле 22 съедала
	// сами буквы. paint-order уводит её за заливку, поэтому форма остаётся.
	-webkit-text-stroke: 3px #c8394a;
	paint-order: stroke fill;
	// Основа рисуется стилями, а не одним коралловым SVG: у режимов разные
	// акцентные цвета, а один файл на три кнопки этого не даёт.
	border-radius: 999px;
	border: 3px solid rgba(255, 255, 255, 0.92);
	box-shadow: 0 6px 0 rgba(7, 94, 114, 0.22), 0 10px 18px rgba(7, 94, 114, 0.26);
	touch-action: manipulation;
	-webkit-tap-highlight-color: transparent;

	&--small {
		font-size: 18px;
	}

	&--aqua {
		background: linear-gradient(180deg, #63e2e7, #17b3bd);
		-webkit-text-stroke-color: #0b7d88;
	}

	&--coral {
		background: linear-gradient(180deg, #ff9a9f, #f2606f);
		-webkit-text-stroke-color: #c8394a;
	}

	&--lemon {
		background: linear-gradient(180deg, #ffe697, #f7c53f);
		-webkit-text-stroke-color: #b07f14;
	}
}
</style>
