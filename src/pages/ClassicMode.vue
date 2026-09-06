<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, shallowRef, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import gsap from 'gsap'

import UiButton from '@/components/UiButton.vue'
import BackLink from '@/components/BackLink.vue'
import AudioToggles from '@/components/AudioToggles.vue'
import TimerItem from '@/components/TimerItem.vue'
import ResultTable from '@/components/ResultTable.vue'
import TileEffects from '@/components/TileEffects.vue'
import WinSparkles from '@/components/WinSparkles.vue'

import { usePageStore } from '@/store/pageStore'
import { useScoreStore } from '@/store/scoreStore'

import Admob from '@/utils/admob'
import { ICoord, ITile, TYPE_GRID, TYPE_PATH } from '@/utils/types'
import { useAudio } from '@/composables/useAudio'
import { useTileEffects } from '@/composables/useTileEffects'

import { PAGES } from '@/utils/conts'

import {
	generateBoard,
	isTruePair,
	modifyTable,
	noMoves,
	shuffleTable,
} from './game'

const pageStore = usePageStore()
const scoreStore = useScoreStore()
const audioCont = useAudio()
const { effects, sparkle, score: popScore, dissolve } = useTileEffects()

// Поле уменьшено с 16x8: 128 фишек на телефоне в ландшафте давали слишком
// мелкую цель для пальца. 12x6 — это 72 фишки и клетка примерно на треть
// крупнее. Пар по-прежнему целое число, остальная логика от размера не зависит.
// Цвет плитки берётся по стабильному правилу type % 4 — так одинаковые
// фрукты всегда одного цвета, и поле читается как цветная сетка.
const TILE_COLORS = ['aqua', 'mint', 'coral', 'lemon']

const cols = 12
const rows = 6
// Контейнер поля считаем по видимой сетке, без служебной рамки. Рамка нужна
// логике: путь между фишками может обходить доску снаружи. Но занимала она по
// целой клетке с каждой стороны, то есть четверть высоты уходила в пустоту, и
// поле не влезало в запас под баннер. Теперь клетки рамки просто выходят за
// контейнер — они всё равно пустые и ничего не рисуют.
const width = 100 / cols
const height = 100 / rows

let timers: { [key: number]: ReturnType<typeof setTimeout> } = {}
const score = ref(0)
const level = ref(0)
const isEnd = ref(false)
const isWin = ref<boolean>(false)
const isAnimate = ref(false)

const tilesRefs = ref()
const shuffleCount = ref(5)
const freeCoords = ref<ICoord[]>([])
const tiles = shallowRef<TYPE_GRID>([])
const selectedPoint = ref<ICoord>()
const secondPoint = ref<ICoord>()
const failPoint = ref<ICoord>()
const isShuffling = ref(false)
const selectedTile = computed(() => {
	return (
		selectedPoint.value &&
		tiles.value[selectedPoint.value.row][selectedPoint.value.col]
	)
})

const getStyle = computed(() => (row: number, col: number, tile?: ITile) => {
	return {
		width: `${width}%`,
		height: `${height}%`,
		transform: `translate(${(col - 1) * 100}%, ${(row - 1) * 100}%)`,
		transformOrigin: 'center',
		'--row': row,
		// Фрукт уходит в отдельный слой (:before), поэтому это переменная,
		// а не фон самой фишки: фоном теперь служит подложка плитки.
		'--fruit': tile ? `url('/img/fruits-redesign/${tile.type}.webp')` : 'none',
	}
})

onMounted(async () => {
	audioCont.play('gameMusic')
	document.addEventListener('visibilitychange', handleVisibilityChange)

	generateTable()

	try {
		if (Capacitor.getPlatform() === 'android') {
			await Admob.showBanner()
		}
	} catch (error: any) {
		// console.log(error)
	}
})

onBeforeUnmount(() => {
	audioCont.stop('gameMusic')
	document.removeEventListener('visibilitychange', handleVisibilityChange)
	clearTimers()
	if (Capacitor.getPlatform() === 'android') {
		Admob.removeBanner()
	}
})

function handleVisibilityChange() {
	if (document.hidden) {
		audioCont.stop('gameMusic')
	} else {
		audioCont.play('gameMusic')
	}
}

function addtimescore(scoreVal: number) {
	score.value += scoreVal
}

function next() {
	level.value += 1
	if (shuffleCount.value < 5) shuffleCount.value += 1
	isEnd.value = false
	isWin.value = false
	freeCoords.value = []
	generateTable()
}

function nextLevel() {
	// Никакой рекламы на этом пути: переход на следующий уровень запускает игрок.
	// Показ перенесён на завершение уровня.
	next()
}

function morphTable(emptyPoint: TYPE_PATH) {
	const curLevel = level.value % 10
	if (curLevel === 0) return tiles.value
	return modifyTable(curLevel, tiles.value, emptyPoint)
}

function hardShuffle() {
	audioCont.playAudio('shuffle')
	const tilesGrid = shuffleTable(tiles.value)
	shuffleCount.value = shuffleCount.value - 1
	runShuffle(tilesGrid, true)
	playShuffleWave()
}

// Перезапуск анимации: класс надо снять и вернуть в следующем кадре, иначе
// повторное перемешивание подряд не проигрывается.
function playShuffleWave() {
	isShuffling.value = false
	requestAnimationFrame(() => {
		isShuffling.value = true
	})
	clearTimeout(timers['5'])
	timers['5'] = setTimeout(() => {
		isShuffling.value = false
		delete timers['5']
	}, 460)
}

function runShuffle(tilesGrid: TYPE_GRID, hard: boolean = false) {
	let isNotMove: boolean = false
	let suffled: boolean = false
	while ((isNotMove = noMoves(tilesGrid)) && shuffleCount.value > 0) {
		audioCont.playAudio('shuffle')
		tilesGrid = shuffleTable(tilesGrid)
		if (!suffled) suffled = true
	}
	if (suffled) playShuffleWave()
	if (suffled && !hard) shuffleCount.value = shuffleCount.value - 1
	if (isNotMove) {
		endRun()
	} else {
		tiles.value = [...tilesGrid]
	}
}

function clearTiles() {
	if (!selectedPoint.value || !secondPoint.value) return

	audioCont.playAudio('remove')
	sparkle(secondPoint.value.row, secondPoint.value.col)
	popScore(secondPoint.value.row, secondPoint.value.col, 20)

	// Тип читаем до обнуления: призраку нужна картинка снятой фишки.
	;[selectedPoint.value, secondPoint.value].forEach((point) => {
		const tile = tiles.value[point.row][point.col]
		if (tile) dissolve(point.row, point.col, tile.type)
	})

	tiles.value[selectedPoint.value.row][selectedPoint.value.col] = null
	tiles.value[secondPoint.value.row][secondPoint.value.col] = null
	score.value += 20
	freeCoords.value.push(selectedPoint.value)
	freeCoords.value.push(secondPoint.value)
	const emptyPoint: TYPE_PATH = [
		[selectedPoint.value.row, selectedPoint.value.col],
		[secondPoint.value.row, secondPoint.value.col],
	]
	selectedPoint.value = undefined
	secondPoint.value = undefined

	if (freeCoords.value.length === cols * rows) {
		isWin.value = true
		isEnd.value = true

		// Уровень пройден, экран итога уже показан — естественная пауза. Раньше
		// показ висел на кнопке перехода: объявление выходило в момент начала
		// следующего уровня, и сам уровень ждал его закрытия. Google называет это
		// недопустимым. Частоту ограничивает рекламный модуль.
		if (Capacitor.getPlatform() === 'android') {
			void Admob.interstitial()
		}

		return
	}

	timers['0'] = setTimeout(() => {
		runShuffle(morphTable(emptyPoint))
		delete timers['0']
	}, 100)
}

function moveTileByCoords(
	tile: HTMLDivElement,
	coords: TYPE_PATH,
	onComplete: (...args: any[]) => void
) {
	if (!coords || coords.length === 0) {
		return
	}

	const timeline = gsap.timeline({
		onStart() {
			isAnimate.value = true
		},
		onComplete() {
			timers['1'] = setTimeout(() => {
				onComplete()
				isAnimate.value = false
				delete timers['1']
			}, 500)
		},
	})

	coords.forEach((coord, coordInd) => {
		const [y, x] = coord
		const prevStep: [number, number] =
			coordInd === 0
				? [Number(selectedPoint.value?.row), Number(selectedPoint.value?.col)]
				: coords[coordInd - 1]
		const speed = Math.max(Math.abs(prevStep[0] - y), Math.abs(prevStep[1] - x))
		timeline.to(tile, {
			delay: 0.2,
			ease: 'none',
			duration: speed * 0.01,
			// Тот же сдвиг на клетку, что и в getStyle: служебная рамка вынесена
			// за контейнер, поэтому клетка (row, col) стоит на (row-1, col-1).
			// GSAP пишет x/y прямо в transform и затирает раскладку, так что без
			// вычитания фишка в начале маршрута прыгала на клетку вниз-вправо.
			x: `${(x - 1) * 100}%`,
			y: `${(y - 1) * 100}%`,
		})
	})
}

async function tilePair(point: ICoord) {
	if (!selectedPoint.value) return

	const pathPair = isTruePair(tiles.value, selectedPoint.value, point)

	if (pathPair) {
		secondPoint.value = point
		const elem = tilesRefs.value.find(
			(el: HTMLDivElement) =>
				el.id === `${selectedPoint.value?.row}-${selectedPoint.value?.col}`
		)

		moveTileByCoords(elem, pathPair.slice(1), clearTiles)
	} else {
		audioCont.playAudio('fail')
		markFail(point)
		selectedPoint.value = undefined
	}
}

function clickTile(coord: ICoord) {
	if (isAnimate.value || isEnd.value) return
	if (!selectedPoint.value) {
		audioCont.playAudio('select')
		selectedPoint.value = coord
	} else {
		const secondTile = tiles.value[coord.row][coord.col]
		if (secondTile?.key === selectedTile.value?.key) return
		else if (selectedTile.value?.type !== secondTile?.type) {
			audioCont.playAudio('select')
			selectedPoint.value = coord
		} else if (selectedTile.value?.type === secondTile?.type) {
			tilePair(coord)
		}
	}
}

function generateTable() {
	// tiles.value = TestData
	tiles.value = generateBoard(cols, rows)
}

function timeend() {
	audioCont.playAudio('timeend')
	endRun()
}

// Единая точка завершения: рекорд надо записать и когда вышло время, и когда
// не осталось ходов, — иначе половина партий в статистику не попадает.
function endRun() {
	isEnd.value = true
	scoreStore.submit(PAGES.CLASSIC, score.value)
}

// Подсветка промаха живёт ~200 мс: ровно на длительность анимации, дальше
// класс снимается, иначе контур останется висеть на фишке.
function markFail(point: ICoord) {
	failPoint.value = point
	clearTimeout(timers['2'])
	timers['2'] = setTimeout(() => {
		failPoint.value = undefined
		delete timers['2']
	}, 200)
}

function clearTimers() {
	Object.values(timers).forEach((id) => clearTimeout(id))
}
</script>

<template>
	<div class="page">
		<div class="page__head">
			<BackLink />
			<AudioToggles />
			<div class="page__level">LEVEL {{ level + 1 }}</div>
			<TimerItem
				class="time"
				:is-win="isWin"
				:level="level"
				@addtimescore="addtimescore"
				@timeend="timeend"
			/>
			<div class="page__info">
				<div class="page__reload" @click="hardShuffle">
					<span>{{ shuffleCount }}</span>
					<button></button>
				</div>

				<div class="page__score">
					<img src="@/assets/redesign/icons/star.svg?url" alt="" />
					<span>{{ score }}</span>
				</div>
			</div>
		</div>

		<div class="tiles">
			<template v-for="(tileRow, row) in tiles" :key="row">
				<template v-for="(tile, col) in tileRow" :key="col">
					<div
						v-if="tile"
						ref="tilesRefs"
						:id="`${row}-${col}`"
						:style="{
							...getStyle(row, col, tile),
						}"
						:class="{
							[`tile--${TILE_COLORS[tile.type % 4]}`]: true,
							'tile--active': tile?.key === selectedTile?.key,
							'tile--fail': failPoint?.row === row && failPoint?.col === col,
							'tile--shuffling': isShuffling,
						}"
						:row="row"
						:col="col"
						class="tile tile--filled"
						@click="clickTile({ row, col })"
					></div>
					<div
						v-else
						ref="tilesRefs"
						:id="`${row}-${col}`"
						:style="getStyle(row, col)"
						class="tile"
					></div>
				</template>
			</template>

			<TileEffects
				:effects="effects"
				:cell-width="width"
				:cell-height="height"
			/>
		</div>

		<WinSparkles v-if="isEnd && isWin" />

		<UiButton
			v-if="isEnd && isWin"
			class="page__next"
			@click="audioCont.playAudio('click'), nextLevel()"
		>
			Next
		</UiButton>

		<ResultTable
			v-if="isEnd && !isWin"
			:result="score"
			@close="audioCont.playAudio('click'), pageStore.toBackLink()"
		/>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/_redesign.scss';

.page {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	// 10 сверху и 58 снизу: HUD начинается на y=10, ниже y=347 остаётся
	// свободная полоса под нативный адаптивный баннер.
	padding: 10px 15px 58px;

	&__level {
		font-size: 18px;

		@include hud-capsule;
	}

	// Таймер стоит между фиксированными плашками, поэтому забирает остаток
	// строки сам: собственная ширина 80% из TimerItem рядом с номером уровня
	// переполняла шапку.
	.time {
		flex: 1 1 auto;
		width: auto;
		min-width: 0;

		@include hud-capsule;

		// Торцы капсулы скруглены (rx=26 при высоте 64 в hud-pill.svg), поэтому
		// полосе нужен отступ больше обычного: с 14px заливка выезжала на
		// скругление и выглядела вылезшей за пределы капсулы.
		padding: 0 22px;
	}

	// Общая стеклянная плашка из набора. Панель тёмно-синяя, поэтому весь
	// текст и иконки в шапке светлые: чёрный на ней не читался.
	// Шапка — не панель, а ряд отдельных капсул: одна длинная плашка на
	// телефоне сливалась в полосу, из которой ничего не вычитывается.
	&__head {
		position: relative;
		z-index: 300;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
		width: min(100%, 650px);
		margin-inline: auto;
		min-height: 52px;
		box-sizing: border-box;
		color: $navy;
	}

	// Обёртка больше ничего не рисует: капсулами стали сами счётчики.
	&__info {
		box-sizing: border-box;
		flex-shrink: 0;
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 8px;
		font-size: 20px;
	}

	&__reload {
		cursor: pointer;

		@include hud-capsule;

		button {
			width: 26px;
			height: 26px;
			border: none;
			cursor: pointer;
			padding: 0;
			// Иконка одноцветная и белая: на светлой капсуле красим её маской.
			background-color: $navy;
			mask: url('@/assets/redesign/icons/shuffle.svg') center / contain
				no-repeat;
			-webkit-mask: url('@/assets/redesign/icons/shuffle.svg') center /
				contain no-repeat;
		}
	}

	&__score {
		@include hud-capsule;

		img {
			width: 22px;
			height: 22px;
			display: block;
		}
	}

	&__next {
		position: absolute;
		top: 50%;
		left: 50%;
		z-index: 100;
		transform: translate(-50%, -50%);
	}
}

.tiles {
	position: relative;
	// Геометрия из handoff: поле 580x285 в зоне y 62–347, ниже 352 —
	// safe-zone нативного баннера, туда не должен попадать игровой UI.
	width: min(100%, 580px);
	aspect-ratio: 580 / 285;
	max-width: 580px;
	margin-inline: auto;
	box-sizing: border-box;
	@include board-plate;

	.tile {
		position: absolute;
		top: 0;
		left: 0;
		box-sizing: border-box;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		padding: 2px;
		transition: transform 0.2s linear, opacity 0.2s linear;
		background-size: 100% 100%;
		background-repeat: no-repeat;

		@include tile-overlay(url('@/assets/redesign/overlays/tile-selected.svg'));
		@include tile-layers;
		@include tile-fail;
		@include tile-shuffle;
	}
}
</style>
