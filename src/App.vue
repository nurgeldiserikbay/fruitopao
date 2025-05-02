<script lang="ts" setup>
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

import Admob from '@/utils/admob'

import { usePageStore } from '@/store/pageStore'

import SceneWrapper from '@/components/SceneWrapper.vue'

const pageStore = usePageStore()

onMounted(async () => {
	if (Capacitor.getPlatform() === 'android') {
		Admob.initialize()
	}

	if (Capacitor.getPlatform() === 'android') {
		await Fullscreen.activateImmersiveMode()
		await StatusBar.hide()
		await StatusBar.setOverlaysWebView({ overlay: true })
		await SplashScreen.hide()
	}
})
</script>

<template>
	<SceneWrapper>
		<component :is="pageStore.currentPageComponent" />
	</SceneWrapper>
</template>

<style lang="scss" scoped>
.wrapper {
	width: 100%;
	min-height: 100dvh;
}
</style>
