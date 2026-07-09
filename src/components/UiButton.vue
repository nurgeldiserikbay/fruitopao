<template>
	<button
		class="ui-button"
		:class="{ [`ui-button--${bg}`]: true, [`ui-button--${size}`]: true }"
		:style="{ width: `${width}px` }"
	>
		<slot></slot>
	</button>
</template>

<script lang="ts" setup>
withDefaults(
	defineProps<{
		bg?: string
		width?: number
		size?: string
	}>(),
	{
		bg: '',
		width: 150,
		size: '',
	}
)
</script>

<style lang="scss" scoped>
.ui-button {
	display: inline-block;
	width: clamp(120px, 30vw, 150px);
	aspect-ratio: 2.05;
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
	padding-bottom: clamp(10px, 2vw, 15px);
	padding-right: clamp(3px, 1vw, 5px);
	box-sizing: border-box;
	color: #ffffff;
	-webkit-text-stroke: 2px #CC191C;
	background-size: contain;
	background-color: transparent;
	background-image: url('@/assets/img/button.png');
	background-repeat: no-repeat;
	touch-action: manipulation;
	-webkit-tap-highlight-color: transparent;

	&--small {
		font-size: clamp(18px, 4vw, 24px);
	}
}
</style>
