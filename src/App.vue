<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

import Admob from '@/utils/admob'

import { usePageStore } from '@/store/pageStore'

import SceneWrapper from '@/components/SceneWrapper.vue'

import { PAGES } from '@/utils/conts'

import menuBg from '@/assets/redesign/backgrounds/menu-tropical.webp'
import gameBg from '@/assets/redesign/backgrounds/game-calm.webp'

const pageStore = usePageStore()

// Фон живёт вне SceneWrapper. Сцена жёстко 720x405 и вписывается в экран с
// полями, поэтому фон внутри неё накрывал только саму сцену, а по краям
// оставалась заливка. Фиксированный слой закрывает вьюпорт целиком при любых
// пропорциях устройства.
const bgImage = computed(() => {
	if (pageStore.currentPage === PAGES.START || pageStore.resultOpen)
		return menuBg
	return gameBg
})

onMounted(async () => {
	if (Capacitor.getPlatform() === 'android') {
		void Admob.initialize().catch(() => {})
	}

	if (Capacitor.getPlatform() === 'android') {
		await Fullscreen.activateImmersiveMode()
		await StatusBar.hide()
		await StatusBar.setOverlaysWebView({ overlay: true })
		await SplashScreen.hide()

		App.addListener('backButton', () => {
			App.exitApp()
		})
	}
})
</script>

<template>
	<div :style="{ backgroundImage: `url(${bgImage})` }" class="scene-bg"></div>

	<SceneWrapper>
		<component :is="pageStore.currentPageComponent" />
	</SceneWrapper>
</template>

<style lang="scss" scoped>
.scene-bg {
	position: fixed;
	inset: 0;
	z-index: -1;
	background-size: cover;
	background-position: center;
	background-repeat: no-repeat;
	transition: background-image 0.2s linear;
}
</style>
