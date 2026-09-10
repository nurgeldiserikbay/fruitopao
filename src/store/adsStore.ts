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

	/**
	 * Стоит ли сейчас настоящее объявление в баннерном слоте.
	 *
	 * Полоса под баннер здесь зарезервирована и без рекламы (bannerScene, минимум
	 * 53 единицы сцены), поэтому кто-то должен решать, что в ней рисовать:
	 * пришедший баннер закрывает полосу собой, а пока его нет — там кросс-промо
	 * наших же игр. Ответ знает только нативный слой, он его сюда и публикует.
	 *
	 * Высота приходит тем же событием и уходит в setBannerHeight — в тот самый
	 * пересчёт, который уже держит геометрию поля. Отдельного второго источника
	 * высоты здесь намеренно нет: два счётчика одной величины разъезжаются.
	 */
	const bannerLive = ref(false)

	function setBanner(live: boolean, height = 0) {
		bannerLive.value = live
		if (live && height > 0) setBannerHeight(height)
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
		bannerLive,
		setBanner,
	}
})
