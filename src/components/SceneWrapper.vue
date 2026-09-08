<template>
	<div class="scene-wrapper" :style="styleObj">
		<slot />
	</div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onBeforeMount, onBeforeUnmount } from 'vue'

import { useAdsStore } from '@/store/adsStore'

const $props = withDefaults(
	defineProps<{
		width?: number
		height?: number
	}>(),
	{
		width: 720,
		height: 405,
	}
)

const adsStore = useAdsStore()

// Минимальная резервная полоса из handoff: y 352–405 в единицах сцены.
const MIN_BANNER = 53

// Нативный баннер живёт в пикселях устройства, а сцена жёстко 720x405 и
// масштабируется трансформом. Поэтому высоту баннера надо перевести в единицы
// сцены — иначе резерв под него не совпадает с реальностью: на этом
// устройстве адаптивный баннер оказался заметно выше 53 и перекрыл нижний ряд
// плиток. Значение уходит переменной --banner-h, ею пользуются страницы.
const scale = ref(1)

function applyBannerHeight() {
	const inScene = adsStore.bannerHeight / (scale.value || 1)
	const value = Math.max(MIN_BANNER, Math.round(inScene))
	styleObj.value['--banner-h'] = `${value}px`
	adsStore.setBannerScene(value)
}

watch(() => adsStore.bannerHeight, applyBannerHeight)

const styleObj = ref<Record<string, string>>({
	position: 'absolute',
	left: `50%`,
	top: `50%`,
	height: `${$props.height}px`,
	width: `${$props.width}px`,
	transformOrigin: '0 0',
	transform: `scale(1) translate(-50%, -50%)`,
	'--banner-h': `${MIN_BANNER}px`,
})

function resize() {
	let ratio = 1
	let WH = window.innerHeight || screen.availHeight,
		WW = window.innerWidth || screen.availWidth,
		RH = $props.height,
		RW = $props.width

	if (WW / WH < RW / RH) ratio = WW / RW
	else ratio = WH / RH
	
	styleObj.value.transform = `scale(${ratio}) translate(-50%, -50%)`
	scale.value = ratio
	applyBannerHeight()
}

onMounted(resize)

onBeforeMount(() => {
	window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', resize)
})
</script>

<style lang="scss" scoped>
.scene-wrapper {
	// outline: 1px solid red;
}
</style>
