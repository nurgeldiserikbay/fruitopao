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
// Частота межстраничной: каждые две пройденные игры, начиная со второй.
// Интервал по времени оставлен страховкой от слишком быстрых уровней и
// намеренно мягкий — иначе он перебивал бы правило «каждые две игры».
const INTERSTITIAL_MIN_INTERVAL_MS = 30_000
const INTERSTITIAL_FIRST_AT_LEVEL = 2
const INTERSTITIAL_EVERY_N_LEVELS = 2

// Таймаутом ограничена только ЗАГРУЗКА объявления. Показ обрывать нельзя:
// закрывает объявление сам игрок.
const INTERSTITIAL_LOAD_TIMEOUT_MS = 5000

// Сколько ждать, пока система реально применит возврат системных панелей,
// прежде чем открывать объявление. Меньше кадра-двух не хватает: SDK успевает
// снять старые врезки и промахнуться мимо кнопки закрытия.
const SYSTEM_BARS_SETTLE_MS = 350

// Страховка, если Dismissed не пришёл: снимает только блокировку игрового
// потока. Системные панели этот путь не трогает — объявление может быть ещё на
// экране, и возврат immersive-режима спрятал бы кнопку закрытия под панель.
const INTERSTITIAL_WATCHDOG_MS = 25_000

// Резерв под баннер: примерно столько занимает adaptive-баннер на телефоне.
// Пока настоящая высота неизвестна, рекламная зона стоит на этом значении и
// никогда не бывает нулевой — иначе вёрстка прыгает при приходе объявления.
const BANNER_RESERVE_HEIGHT = 56

class Admob {
	/** Куда сообщать о состоянии слота. Ставится из App.vue до initialize(). */
	private bannerListener: ((live: boolean, height: number) => void) | null = null

	/**
	 * Стоит ли на экране настоящее объявление.
	 *
	 * Отдельный флаг нужен потому, что `SizeChanged` о наличии объявления не
	 * говорит ничего: плагин рассылает его и на загрузке — с настоящим
	 * размером, и на отказе, скрытии, снятии — с нулями. Если считать слот
	 * живым по любому из них, после снятия баннера слот останется «живым» с
	 * нулевой высотой: кросс-промо спрячется, а на его месте будет пустая
	 * полоса.
	 */
	private bannerLoaded = false
	/** Последняя известная высота объявления. */
	private bannerHeightPx = 0

	/** Подписка страницы на состояние слота. Ставится до initialize(). */
	onBannerChange(listener: (live: boolean, height: number) => void) {
		this.bannerListener = listener
	}

	private publishBanner(live: boolean, height = 0) {
		this.bannerListener?.(live, height)
	}

	/**
	 * Нативный баннер рисуется поверх вебвью, а не внутри вёрстки, поэтому
	 * сама страница о нём ничего не знает. Через эту переменную она узнаёт
	 * высоту объявления и держит под него место.
	 *
	 * Это же и есть защита от «реклама перекрывает управление»:
	 * adaptive-баннер на планшете вырастает почти вдвое против телефонного, и
	 * фиксированный отступ под него промахивается.
	 *
	 * `null` — вернуться к резерву из вёрстки. Место при этом не исчезает: в
	 * нём просто снова появляется кросс-промо.
	 */
	private setSlotHeight(px: number | null) {
		if (typeof document === 'undefined') return
		const root = document.documentElement.style
		if (px === null) root.removeProperty('--ad-slot')
		else root.setProperty('--ad-slot', `${Math.max(44, Math.round(px))}px`)
	}

	/**
	 * Добавляет к рекламной зоне системный инсет — туда же, куда система
	 * отодвинула баннер.
	 *
	 * Ставится и снимается вместе с самим объявлением, а не один раз при
	 * старте: когда баннера нет, отодвигать не подо что — в полосе стоит
	 * кросс-промо, и лишний инсет оставит под ним пустую кромку.
	 *
	 * Само число здесь не считается и не может: его знает браузер и отдаёт
	 * через `env(safe-area-inset-bottom)`. Переменной присваивается выражение,
	 * а не результат: инсет меняется вместе с системными панелями, и вычислять
	 * его должен CSS. Требует `viewport-fit=cover` в `index.html`.
	 */
	private setBannerInset(on: boolean) {
		if (typeof document === 'undefined') return
		const root = document.documentElement.style
		if (on) root.setProperty('--ad-inset', 'env(safe-area-inset-bottom, 0px)')
		else root.removeProperty('--ad-inset')
	}

	/** Слот пуст: место остаётся, но в нём снова кросс-промо. */
	private clearBanner() {
		this.bannerLoaded = false
		this.bannerHeightPx = 0
		this.setSlotHeight(null)
		this.setBannerInset(false)
		this.publishBanner(false)
	}

	// Флаг однократной подписки на события баннера (защита от накопления слушателей).
	private bannerListenersAdded = false
	/** Объявление уже подтянуто и может быть показано без ожидания загрузки. */
	private interstitialPrepared = false
	/** Подготовка уже идёт: второй параллельный запрос только всё сломает. */
	private interstitialLoading = false

	private adOpenHandlers: (() => void)[] = []
	private adCloseHandlers: (() => void)[] = []

	// Полноэкранная реклама открылась и закрылась. Нужна интерфейсу, чтобы
	// глушить музыку на время показа: сам плагин звук игры не трогает, и
	// объявление шло поверх играющей музыки.
	onAdOpen(handler: () => void) {
		this.adOpenHandlers.push(handler)
	}

	onAdClose(handler: () => void) {
		this.adCloseHandlers.push(handler)
	}

	private bannerLoadedHandlers: (() => void)[] = []
	private bannerSizeHandlers: ((height: number) => void)[] = []

	// Подписка на реальную высоту баннера.
	onBannerSize(handler: (height: number) => void) {
		this.bannerSizeHandlers.push(handler)
	}

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
					// Отдаём высоту наружу. Адаптивный баннер сам решает, каким
					// быть, и на части устройств он заметно выше зарезервированной
					// полосы — интерфейс должен подстраиваться под факт, а не под
					// константу. Настройки запроса это не меняет.
					this.bannerSizeHandlers.forEach((handler) => handler(size.height))
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
		// Объявление ушло с экрана — слот снова наш.
		this.clearBanner()
	}

	async removeBanner() {
		await AdMob.removeBanner()
		// Объявление ушло с экрана — слот снова наш.
		this.clearBanner()
	}

	// Пока показывается полноэкранная реклама, системные панели должны быть видны:
	// activity объявления принадлежит SDK, и с Android 15 система рисует его
	// edge-to-edge, поэтому в immersive-режиме кнопка закрытия может оказаться под
	// панелью или вырезом. Ошибки здесь не критичны — реклама всё равно показывается,
	// просто в полноэкранном виде игры.
	private async showSystemBars() {
		// Каждый вызов со своим catch, а не общей цепочкой: падение первого не
		// должно отменять остальные. Плагин fullscreen стоит версии 0.0.19 при
		// Capacitor 8 и вполне может отказать — тогда врезки должен вернуть хотя
		// бы StatusBar.
		await Fullscreen.deactivateImmersiveMode().catch(() => {})
		await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
		await StatusBar.show().catch(() => {})

		// Пауза перед показом — не суеверие.
		//
		// Вызовы выше возвращают управление сразу, а система применяет новые
		// врезки окна только через кадр-другой. Объявление открывалось следующей
		// же строкой, и SDK считал позицию кнопки закрытия по СТАРЫМ врезкам
		// полноэкранного режима — кнопка уезжала под панель или за край экрана,
		// и объявление становилось незакрываемым.
		await new Promise((resolve) =>
			setTimeout(resolve, SYSTEM_BARS_SETTLE_MS)
		)
	}

	private async restoreImmersiveMode() {
		await Fullscreen.activateImmersiveMode().catch(() => {})
		await StatusBar.hide().catch(() => {})
		await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
	}

	private async clearInterstitialListeners() {
		await Promise.all(
			this.interstitialListenerHandles.map((handle) => handle.remove())
		)
		this.interstitialListenerHandles = []
	}

	private interstitialOptions(): AdOptions {
		return {
			// TODO: боевой ID — проверить, что это прод ad unit, а не тестовый.
			adId: 'ca-app-pub-9702825788968948/3839070057',
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			npa: true,
			// immersiveMode осознанно не выставляем: с Android 15 (edge-to-edge)
			// он уводит кнопку закрытия рекламы под системные панели/вырез, и
			// объявление становится незакрываемым — это отказ по Families Policy.
		}
	}

	/**
	 * Заранее подтянуть объявление.
	 *
	 * Загрузка занимает до нескольких секунд. Если начинать её в момент
	 * завершения уровня, игрок успевает нажать «дальше» раньше, чем она
	 * закончится, — и объявление либо выходит поверх уже начавшейся игры, либо
	 * не выходит вовсе. Поэтому грузим заранее, на входе в режим.
	 */
	async preloadInterstitial() {
		// Дожидаемся инициализации так же, как это делает баннер: страница
		// монтируется раньше, чем AdMob успевает подняться, и предзагрузка без
		// этого ожидания тихо не делала ничего.
		await this.initialize().catch(() => {})
		if (!this.initialized) return
		if (this.interstitialPrepared || this.interstitialLoading) return

		this.interstitialLoading = true
		try {
			await AdMob.prepareInterstitial(this.interstitialOptions())
			this.interstitialPrepared = true
		} catch (error) {
			console.log(error)
		} finally {
			this.interstitialLoading = false
		}
	}

	async interstitial({
		isFirst = false,
		levelsDone = 0,
		canShow,
		onInterstitialAdClosed,
	}: {
		isFirst?: boolean
		levelsDone?: number
		canShow?: () => boolean
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
			this.adCloseHandlers.forEach((handler) => handler())
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
		const tooEarlyByLevel =
			levelsDone > 0 &&
			(levelsDone < INTERSTITIAL_FIRST_AT_LEVEL ||
				levelsDone % INTERSTITIAL_EVERY_N_LEVELS !== 0)

		if (
			isFirst ||
			tooEarlyByLevel ||
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
			await AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
				this.adOpenHandlers.forEach((handler) => handler())
			}),
			await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
				console.log('Dismissed')
				closeAds()
				// Готовим следующее заранее, чтобы к концу очередного уровня оно
				// уже было на руках.
				void this.preloadInterstitial()
			}),
			await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
				console.log('FailedToLoad')
				this.interstitialPrepared = false
				closeAds()
			}),
			await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
				console.log('FailedToShow')
				this.interstitialPrepared = false
				closeAds()
				void this.preloadInterstitial()
			})
		)

		const options = this.interstitialOptions()

		// Системные панели возвращаем ДО загрузки, а не перед самым показом.
		//
		// Игра идёт в immersive-режиме, и объявление открывается поверх такого
		// окна. Раньше панели возвращались строкой выше showInterstitial, и
		// система просто не успевала применить новые врезки: SDK считал позицию
		// кнопки закрытия по старым, полноэкранным, и кнопка уезжала под панель
		// или за край экрана. Загрузка занимает до пяти секунд — этого запаса
		// системе хватает с избытком, и отдельный таймер уже не нужен как
		// основная мера.
		await this.showSystemBars()
		barsShown = true

		// Повторно готовить уже подтянутое объявление нельзя.
		//
		// Именно на этом реклама и перестала выходить совсем: предзагрузка на
		// входе в режим делала своё дело, а здесь код заново звал
		// prepareInterstitial. Повторная подготовка загруженного объявления не
		// завершается, срабатывал пятисекундный таймаут — и показ отменялся
		// каждый раз.
		let loaded = this.interstitialPrepared

		if (!loaded && this.interstitialLoading) {
			// Предзагрузка ещё в пути. Второй параллельный запрос её сломает,
			// поэтому этот показ пропускаем — объявление будет к следующему.
			releaseFlow()
			restoreBars()
			return
		}

		if (!loaded) {
			this.interstitialLoading = true
			loaded = await new Promise<boolean>((resolve) => {
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
			this.interstitialLoading = false
			this.interstitialPrepared = loaded
		}

		if (!loaded || isClosed) {
			// Объявления не будет, а панели уже показаны — возвращаем игру в
			// полноэкранный режим, иначе она так и останется с панелями.
			releaseFlow()
			restoreBars()
			return
		}

		clearTimeout(timeoutId)
		this.interstitialPrepared = false

		// Последняя проверка перед показом: уместен ли он ещё.
		//
		// Загрузка занимает секунды, и за это время игрок успевает нажать
		// «дальше». Раньше объявление в таком случае выходило поверх уже
		// начавшейся игры — ровно то размещение, которое Google называет
		// недопустимым. Теперь показ просто отменяется: пропущенный показ лучше
		// показа не вовремя.
		if (canShow && !canShow()) {
			releaseFlow()
			restoreBars()
			return
		}

		this.lastInterstitialShownAt = Date.now()

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
