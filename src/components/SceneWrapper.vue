<template>
	<div class="scene-wrapper" :style="styleObj">
		<slot />
	</div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeMount, onBeforeUnmount } from 'vue'

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

const styleObj = ref({
	position: 'absolute',
	left: `50%`,
	top: `50%`,
	height: `${$props.height}px`,
	width: `${$props.width}px`,
	transformOrigin: '0 0',
	transform: `scale(1) translate(-50%, -50%)`,
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
