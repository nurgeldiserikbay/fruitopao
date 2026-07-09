import {
	AdMob,
	AdmobConsentStatus,
	BannerAdSize,
	BannerAdPosition,
	BannerAdPluginEvents,
	AdMobBannerSize,
	BannerAdOptions,
	InterstitialAdPluginEvents,
	AdLoadInfo,
	AdOptions,
} from '@capacitor-community/admob'
import type { PluginListenerHandle } from '@capacitor/core'

const AdMobInitializationOptions = {
	testingDevices: ['8a1b4b83d67add00', '1f6e845f97c74f32', 'e81b6ee74e7f26dc'],
	// Тестовые объявления только в dev-сборке; в проде — боевые.
	initializeForTesting: import.meta.env.DEV,
	// Изменено true -> false: детский инвентарь режет доходность.
	// Если аудитория действительно детская — вернуть true осознанно.
	tagForChildDirectedTreatment: false,
}

// Минимальный интервал между интерстишлами (частотный кап).
const INTERSTITIAL_MIN_INTERVAL_MS = 60_000

class Admob {
	// Флаг однократной подписки на события баннера (защита от накопления слушателей).
	private bannerListenersAdded = false
	// Хендлы слушателей интерстишла — снимаем перед повторной подпиской.
	private interstitialListenerHandles: PluginListenerHandle[] = []
	// Время последнего показанного интерстишла для частотного капа.
	private lastInterstitialShownAt = 0

	async initialize() {
		await AdMob.initialize(AdMobInitializationOptions)

		const [trackingInfo, consentInfo] = await Promise.all([
			AdMob.trackingAuthorizationStatus(),
			AdMob.requestConsentInfo(),
		])

		if (trackingInfo.status === 'notDetermined') {
			// console.log('Display information before ads load first time')
		} else if (
			trackingInfo.status === 'authorized' &&
			consentInfo.isConsentFormAvailable &&
			consentInfo.status === AdmobConsentStatus.REQUIRED
		) {
			await AdMob.showConsentForm()
		}
	}

	async showBanner() {
		// Подписываемся на события баннера только один раз за жизнь приложения,
		// иначе на каждом входе на игровой экран копятся слушатели.
		if (!this.bannerListenersAdded) {
			this.bannerListenersAdded = true

			AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
				// Subscribe Banner Event Listener
			})

			AdMob.addListener(
				BannerAdPluginEvents.SizeChanged,
				(size: AdMobBannerSize) => {
					console.log(size)
					// Subscribe Change Banner Size
				}
			)
		}

		const options: BannerAdOptions = {
			// TODO: боевой ID — проверить, что это прод ad unit, а не тестовый.
			adId: 'ca-app-pub-9702825788968948/6128253678',
			adSize: BannerAdSize.BANNER,
			position: BannerAdPosition.BOTTOM_CENTER,
			margin: 0,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			// npa: true
		}

		await AdMob.showBanner(options)
	}

	async resumeBanner() {
		await AdMob.resumeBanner()
	}

	async hideBanner() {
		await AdMob.hideBanner()
	}

	async removeBanner() {
		await AdMob.removeBanner()
	}

	private async clearInterstitialListeners() {
		await Promise.all(
			this.interstitialListenerHandles.map((handle) => handle.remove())
		)
		this.interstitialListenerHandles = []
	}

	async interstitial({
		isFirst,
		onInterstitialAdClosed,
	}: {
		isFirst: boolean
		onInterstitialAdClosed: () => void
	}) {
		let isClosed = false
		function closeAds() {
			if (isClosed) return
			isClosed = true
			onInterstitialAdClosed()
		}

		// Снимаем слушателей от предыдущего показа, чтобы они не накапливались
		// (interstitial вызывается на каждом уровне).
		await this.clearInterstitialListeners()

		this.interstitialListenerHandles.push(
			await AdMob.addListener(
				InterstitialAdPluginEvents.Loaded,
				(info: AdLoadInfo) => {
					console.log(info)
				}
			),
			await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
				console.log('Dismissed')
				closeAds()
			}),
			await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
				console.log('FailedToLoad')
				closeAds()
			}),
			await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
				console.log('FailedToShow')
				closeAds()
			})
		)

		const options: AdOptions = {
			// TODO: боевой ID — проверить, что это прод ad unit, а не тестовый.
			adId: 'ca-app-pub-9702825788968948/3839070057',
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			// npa: true
		}

		await AdMob.prepareInterstitial(options)

		// Частотный кап: не показываем интерстишл на первом уровне и чаще,
		// чем раз в INTERSTITIAL_MIN_INTERVAL_MS. Игра при этом продолжается.
		const now = Date.now()
		const capReached =
			now - this.lastInterstitialShownAt < INTERSTITIAL_MIN_INTERVAL_MS

		if (isFirst || capReached) {
			closeAds()
			return
		}

		this.lastInterstitialShownAt = now
		await AdMob.showInterstitial()
	}
}

export default new Admob()
