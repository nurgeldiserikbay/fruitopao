import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAdsStore = defineStore('adsStore', () => {
	const loading = ref(false)

	function toggleLoading(value: boolean) {
		loading.value = value
	}

	const bannerInited = ref(false)

	// Реальная высота баннера в пикселях устройства. 0 — баннера ещё нет,
	// тогда интерфейс держит минимальную резервную полосу.
	const bannerHeight = ref(0)

	function setBannerHeight(value: number) {
		bannerHeight.value = value
	}

	// Та же высота, но в единицах сцены 720x405. Пересчёт делает SceneWrapper:
	// только он знает текущий масштаб. Минимум 53 — резервная полоса из handoff.
	const bannerScene = ref(53)

	function setBannerScene(value: number) {
		bannerScene.value = value
	}

	function bannerInit() {
		bannerInited.value = true
	}

	return {
		loading,
		toggleLoading,
		bannerInited,
		bannerInit,
		bannerHeight,
		setBannerHeight,
		bannerScene,
		setBannerScene,
	}
})
