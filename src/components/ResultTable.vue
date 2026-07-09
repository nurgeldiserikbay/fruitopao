<script lang="ts" setup>
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
			<button class="result__btn" @click="$emits('close')" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/_common.scss';

.result {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000;
	background: $bgColor;
	background: $bgGrad;
	background-image: url('@/assets/img/bg.png');
	background-repeat: repeat;
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
		background: rgba(255, 255, 255, 0.3);
		backdrop-filter: blur(3px);
		border-radius: 18px;
		font-size: clamp(18px, 4vw, 22px);
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
		background-image: url('@/assets/img/home.png');
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
}
</style>
