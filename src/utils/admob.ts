import {
	AdMob,
	BannerAdSize,
	BannerAdPosition,
	BannerAdPluginEvents,
	AdMobBannerSize,
	BannerAdOptions,
	InterstitialAdPluginEvents,
	AdLoadInfo,
	AdOptions,
	MaxAdContentRating,
} from '@capacitor-community/admob'
import type { PluginListenerHandle } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

// Целевая аудитория игры в Google Play включает детей, поэтому действует
// Families Policy: каждый рекламный запрос должен быть помечен как детский,
// ограничен инвентарём с рейтингом G и неперсонализирован. Настройка в консоли
// AdMob эти флаги не заменяет: без них ревью отклоняет обновление с формулировкой
// «ad content is not consistent with the app's content rating».
const AdMobInitializationOptions = {
	testingDevices: ['8a1b4b83d67add00', '1f6e845f97c74f32', 'e81b6ee74e7f26dc'],
	// Тестовые объявления только в dev-сборке; в проде — боевые.
	initializeForTesting: import.meta.env.DEV,
	tagForChildDirectedTreatment: true,
	tagForUnderAgeOfConsent: true,
	maxAdContentRating: MaxAdContentRating.General,
}

// Минимальный интервал между интерстишлами (частотный кап).
const INTERSTITIAL_MIN_INTERVAL_MS = 60_000

// Таймаутом ограничена только ЗАГРУЗКА объявления. Показ обрывать нельзя:
// закрывает объявление сам игрок.
const INTERSTITIAL_LOAD_TIMEOUT_MS = 5000

// Страховка, если Dismissed не пришёл: снимает только блокировку игрового
// потока. Системные панели этот путь не трогает — объявление может быть ещё на
// экране, и возврат immersive-режима спрятал бы кнопку закрытия под панель.
const INTERSTITIAL_WATCHDOG_MS = 25_000

class Admob {
	// Флаг однократной подписки на события баннера (защита от накопления слушателей).
	private bannerListenersAdded = false
	private bannerLoadedHandlers: (() => void)[] = []

	// Подписка на загрузку баннера для интерфейса. Реклама об интерфейсе
	// ничего не знает и знать не должна — только отдаёт факт наружу.
	onBannerLoaded(handler: () => void) {
		this.bannerLoadedHandlers.push(handler)
	}
	// Хендлы слушателей интерстишла — снимаем перед повторной подпиской.
	private interstitialListenerHandles: PluginListenerHandle[] = []
	// Время последнего показанного интерстишла для частотного капа.
	private lastInterstitialShownAt = 0

	// Детская конфигурация запросов применяется именно в initialize(), поэтому ни
	// один запрос рекламы не должен уйти раньше. Промис кэшируется: точки показа
	// рекламы ждут этот же промис, повторная инициализация не происходит.
	private initPromise: Promise<void> | null = null
	private initialized = false

	initialize() {
		if (!this.initPromise) {
			this.initPromise = this.runInitialize()
		}
		return this.initPromise
	}

	private async runInitialize() {
		await AdMob.initialize(AdMobInitializationOptions)
		this.initialized = true

		// Форму согласия UMP осознанно не запрашиваем. Запросы помечены
		// tagForUnderAgeOfConsent, а у пользователя ниже возраста согласия согласие
		// на персонализацию не спрашивают — показывать ему форму выбора
		// персонализации неверно и по GDPR, и по Families Policy.
		// Неперсонализированную выдачу обеспечивает npa: true в каждом запросе.
	}

	async showBanner() {
		// Ждём детскую конфигурацию; если инициализация упала — баннер не
		// запрашиваем, показать нетегированный запрос хуже, чем не показать ничего.
		await this.initialize().catch((error) => console.log(error))
		if (!this.initialized) return

		// Подписываемся на события баннера только один раз за жизнь приложения,
		// иначе на каждом входе на игровой экран копятся слушатели.
		if (!this.bannerListenersAdded) {
			this.bannerListenersAdded = true

			AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
				// Единственное, что здесь появилось, — уведомление наружу.
				// Настройки запроса, размер, позиция и порядок вызовов не
				// меняются: по нему интерфейс убирает собственную промо-полосу,
				// чтобы две рекламы не оказались друг на друге.
				this.bannerLoadedHandlers.forEach((handler) => handler())
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
			// ADAPTIVE_BANNER, а не BANNER: фиксированный 320x50 не растягивается на ширину
			// экрана, и плагин центрирует его боковыми маргинами — а слушатель инсетов на
			// Android 15+ эти маргины обнуляет, из-за чего баннер уезжает к левому краю.
			adSize: BannerAdSize.ADAPTIVE_BANNER,
			position: BannerAdPosition.BOTTOM_CENTER,
			margin: 0,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			npa: true,
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

	// Пока показывается полноэкранная реклама, системные панели должны быть видны:
	// activity объявления принадлежит SDK, и с Android 15 система рисует его
	// edge-to-edge, поэтому в immersive-режиме кнопка закрытия может оказаться под
	// панелью или вырезом. Ошибки здесь не критичны — реклама всё равно показывается,
	// просто в полноэкранном виде игры.
	private async showSystemBars() {
		try {
			await Fullscreen.deactivateImmersiveMode()
			await StatusBar.show()
		} catch (error) {
			console.log(error)
		}
	}

	private async restoreImmersiveMode() {
		try {
			await Fullscreen.activateImmersiveMode()
			await StatusBar.hide()
		} catch (error) {
			console.log(error)
		}
	}

	private async clearInterstitialListeners() {
		await Promise.all(
			this.interstitialListenerHandles.map((handle) => handle.remove())
		)
		this.interstitialListenerHandles = []
	}

	async interstitial({
		isFirst = false,
		onInterstitialAdClosed,
	}: {
		isFirst?: boolean
		onInterstitialAdClosed?: () => void
	} = {}) {
		const done = onInterstitialAdClosed ?? (() => {})

		let isClosed = false
		let barsShown = false
		let timeoutId: ReturnType<typeof setTimeout> | undefined
		let watchdogId: ReturnType<typeof setTimeout> | undefined

		// Снятие блокировки и возврат системных панелей разведены намеренно:
		// страхующий таймер срабатывает, когда объявление может быть ещё на экране.
		const releaseFlow = () => {
			if (isClosed) return
			isClosed = true
			if (timeoutId) clearTimeout(timeoutId)
			if (watchdogId) clearTimeout(watchdogId)
			done()
		}

		const restoreBars = () => {
			if (!barsShown) return
			barsShown = false
			void this.restoreImmersiveMode()
		}

		const closeAds = () => {
			releaseFlow()
			restoreBars()
		}

		// Инициализация ещё не завершилась — пропускаем показ и сразу возвращаем
		// управление игре, не отправляя нетегированный запрос.
		if (!this.initialized) {
			releaseFlow()
			return
		}

		// Частотный кап проверяется ДО загрузки: раньше объявление грузилось всегда,
		// и игра ждала эту загрузку даже тогда, когда показ всё равно был запрещён
		// капом. Не показываем на первом уровне и чаще, чем раз в
		// INTERSTITIAL_MIN_INTERVAL_MS.
		const now = Date.now()
		if (
			isFirst ||
			now - this.lastInterstitialShownAt < INTERSTITIAL_MIN_INTERVAL_MS
		) {
			releaseFlow()
			return
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
			npa: true,
			// immersiveMode осознанно не выставляем: с Android 15 (edge-to-edge)
			// он уводит кнопку закрытия рекламы под системные панели/вырез, и
			// объявление становится незакрываемым — это отказ по Families Policy.
		}

		// Загрузку гоняем в скачки с таймаутом: ждать её дольше пяти секунд — это
		// уже «реклама мешает пользоваться приложением».
		const loaded = await new Promise<boolean>((resolve) => {
			timeoutId = setTimeout(() => {
				console.log('Interstitial load timed out')
				resolve(false)
			}, INTERSTITIAL_LOAD_TIMEOUT_MS)

			AdMob.prepareInterstitial(options)
				.then(() => resolve(true))
				.catch((error) => {
					console.log(error)
					resolve(false)
				})
		})

		if (!loaded || isClosed) {
			releaseFlow()
			return
		}

		clearTimeout(timeoutId)
		this.lastInterstitialShownAt = Date.now()

		// Возвращаем системные панели на время показа: игра идёт в landscape и в
		// immersive-режиме, а с Android 15 activity объявления рисуется edge-to-edge —
		// в этой комбинации кнопка закрытия чаще всего и уезжает под навигационную
		// панель, из-за чего реклама становится незакрываемой.
		await this.showSystemBars()
		barsShown = true
		watchdogId = setTimeout(() => {
			console.log('Interstitial dismiss watchdog fired')
			releaseFlow()
		}, INTERSTITIAL_WATCHDOG_MS)

		try {
			await AdMob.showInterstitial()
		} catch (error) {
			console.log(error)
			closeAds()
		}
	}
}

export default new Admob()
