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
import HouseAd from '@/components/HouseAd.vue'

import { PAGES } from '@/utils/conts'

import menuBg from '@/assets/redesign/backgrounds/menu-tropical.webp'
import gameBg from '@/assets/redesign/backgrounds/game-calm.webp'

import { useAdsStore } from '@/store/adsStore'

const pageStore = usePageStore()
const adsStore = useAdsStore()

// Промо своих игр показываем только в режимах: на главном меню баннера нет,
// значит и подменять там нечего.
const showHouseAd = computed(() => pageStore.currentPage !== PAGES.START)

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
	// Отладочный ход: ?banner=110 подставляет высоту баннера вручную.
	//
	// Без этого геометрию под баннер нельзя проверить нигде, кроме реального
	// устройства с выкупленным объявлением: в браузере события SizeChanged не
	// будет никогда. Именно из-за отсутствия такой проверки баннер и перекрыл
	// нижний ряд плиток — резерв стоял константой из спецификации.
	const forced = Number(
		new URLSearchParams(window.location.search).get('banner')
	)
	if (Number.isFinite(forced) && forced > 0) adsStore.setBannerHeight(forced)

	if (Capacitor.getPlatform() === 'android') {
		// Подписку ставим до initialize(): первое событие баннера может прийти
		// раньше, чем страница успеет смонтироваться, и потеряться.
		Admob.onBannerChange((live, height) => adsStore.setBanner(live, height))

		void Admob.initialize().catch(() => {})
		Admob.onBannerLoaded(() => adsStore.bannerInit())
		Admob.onBannerSize((height) => adsStore.setBannerHeight(height))
	}

	if (Capacitor.getPlatform() === 'android') {
		// Каждый вызов в своём try/catch, а не общей цепочкой await.
		//
		// Раньше это была цепочка без обработки ошибок, и падение первого же
		// вызова уносило с собой три следующих. Цена конкретная:
		// @boengli/capacitor-fullscreen стоит версии 0.0.19 при Capacitor 8 —
		// если activateImmersiveMode отваливается, то immersive-режим не
		// включается и системная панель навигации остаётся на экране (в
		// ландшафте она сбоку и на светлой теме белая), а заодно не
		// выполняются StatusBar.hide и SplashScreen.hide — то есть заставка
		// висит вечно.
		await Fullscreen.activateImmersiveMode().catch(() => {})
		await StatusBar.hide().catch(() => {})
		await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
		await SplashScreen.hide().catch(() => {})

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

		<!-- Внутри сцены, а не поверх вьюпорта: сцена жёстко 720x405 и
		масштабируется целиком, поэтому полоса в фиксированных пикселях на
		телефоне не сжималась вместе со свободной зоной и налезала на поле. -->
		<HouseAd v-if="showHouseAd" />
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
