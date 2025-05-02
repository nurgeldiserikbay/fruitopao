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
		padding: 65px 28px 68px;
		border-radius: 12px;
		height: 60vh;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		justify-content: space-around;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
		margin-bottom: 100px;
		width: 40%;
		background: rgba(255, 255, 255, 0.3);
		backdrop-filter: blur(3px);
		border-radius: 18px;
		font-size: 22px;
	}

	&__table {
		width: 70%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-grow: 1;
		padding-bottom: 30px;
		letter-spacing: 3px;
		font-size: 28px;
	}

	&__btn {
		flex-shrink: 0;
		display: block;
		width: 46px;
		height: 46px;
		background-color: transparent;
		border-radius: 10px;
		border: none;
		cursor: pointer;
		background-size: cover;
		background-color: transparent;
		background-image: url('@/assets/img/home.png');
	}
}
</style>
