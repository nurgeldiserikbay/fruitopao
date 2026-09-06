<template>
	<button
		class="ui-button"
		:class="{ [`ui-button--${bg}`]: true, [`ui-button--${size}`]: true }"
		:style="{ width: `${width}px` }"
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
	}>(),
	{
		bg: '',
		width: 150,
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

	width: clamp(150px, 34vw, 190px);
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
	font-size: clamp(20px, 5vw, 28px);
	line-height: 1;
	letter-spacing: 2px;
	padding: 0 0 clamp(3px, 1vw, 6px);
	box-sizing: border-box;
	color: #ffffff;
	-webkit-text-stroke: 2px #c8394a;
	background-size: 100% 100%;
	background-color: transparent;
	background-image: url('@/assets/redesign/ui/button-primary.svg');
	background-repeat: no-repeat;
	touch-action: manipulation;
	-webkit-tap-highlight-color: transparent;

	&--small {
		font-size: clamp(18px, 4vw, 24px);
	}
}
</style>
