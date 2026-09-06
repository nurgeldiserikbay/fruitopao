<script lang="ts" setup>
import {
	onBeforeUnmount,
	onMounted,
	ref,
	shallowRef,
	computed,
	watch,
} from 'vue'
import { Capacitor } from '@capacitor/core'

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

import { generateBoard, modifyTable, randomInt } from './game'

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
const freeCoords = ref<ICoord[]>([])
const tiles = shallowRef<TYPE_GRID>([])
const selectedTileType = ref<number | null>(null)
const selectedPoints = ref<ICoord[]>([])
const failPoint = ref<ICoord>()
const targetBeat = ref(false)
const targetShake = ref(false)
const leavingPoints = ref<ICoord[]>([])

// Порядковый номер фишки в уходящем наборе задаёт задержку каскада.
const leaveIndex = computed(() => (row: number, col: number) => {
	return leavingPoints.value.findIndex(
		(point) => point.row === row && point.col === col
	)
})
const selectedTileCount = computed(() => {
	return tiles.value.reduce((total, row) => {
		total += row.reduce((t2, col) => {
			if (col?.type === selectedTileType.value) t2 += 1
			return t2
		}, 0)
		return total
	}, 0)
})
const allSelected = computed(() => {
	return (
		selectedPoints.value?.length &&
		selectedPoints.value?.length === selectedTileCount.value
	)
})
const isSelected = computed(() => (row: number, col: number) => {
	return selectedPoints.value?.some(
		(coord) => coord.row === row && coord.col === col
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

watch(
	() => [allSelected.value],
	() => {
		if (allSelected.value) removeCurTiles()
	}
)

onMounted(async () => {
	audioCont.play('gameMusic')
	document.addEventListener('visibilitychange', handleVisibilityChange)

	generateTable()
	selectType()

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

function selectType() {
	let tile: ITile | null = null
	while (!tile) {
		tile = tiles.value[randomInt(1, rows)][randomInt(1, cols)]
	}
	selectedTileType.value = tile.type
}

function addtimescore(scoreVal: number) {
	score.value += scoreVal
}

function next() {
	level.value += 1
	isEnd.value = false
	isWin.value = false
	isAnimate.value = false
	freeCoords.value = []
	generateTable()
	selectType()
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

function runShuffle(tilesGrid: TYPE_GRID) {
	audioCont.playAudio('shuffle')
	tiles.value = [...tilesGrid]
}

function clearTiles() {
	if (!selectedPoints.value.length) return
	audioCont.playAudio('remove')

	// Искры на каждой снятой фишке, но всплывающие очки — одни, суммой:
	// шесть отдельных «+20» друг на друге не читаются.
	const last = selectedPoints.value[selectedPoints.value.length - 1]
	selectedPoints.value.forEach((tile) => {
		sparkle(tile.row, tile.col)
		// Тип читаем до обнуления: призраку нужна картинка снятой фишки.
		const cur = tiles.value[tile.row][tile.col]
		if (cur) dissolve(tile.row, tile.col, cur.type)
	})
	popScore(last.row, last.col, selectedPoints.value.length * 20)

	const emptyPoint: TYPE_PATH = []
	selectedPoints.value.forEach((tile) => {
		tiles.value[tile.row][tile.col] = null
		score.value += 20
		freeCoords.value.push(tile)
		emptyPoint.push([tile.row, tile.col])
	})

	selectedPoints.value = []

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
		selectType()
		delete timers['0']
		isAnimate.value = false
	}, 100)
}

function removeCurTiles() {
	isAnimate.value = true
	clearTiles()
}

function clickTile(coord: ICoord) {
	if (
		isAnimate.value ||
		isEnd.value ||
		selectedTileType.value === null ||
		allSelected.value
	)
		return
	const selectedTile = tiles.value[coord.row][coord.col]
	if (
		!selectedTile ||
		isSelected.value(coord.row, coord.col)
	)
		return
	if (selectedTile.type !== selectedTileType.value) {
		audioCont.playAudio('fail')
		markFail(coord)
		releaseSelected()
		return
	}
	audioCont.playAudio('select')
	selectedPoints.value.push(coord)
	beatTarget()
}

function generateTable() {
	// tiles.value = TestData
	tiles.value = generateBoard(cols, rows)
}

function timeend() {
	audioCont.playAudio('timeend')
	isEnd.value = true
	scoreStore.submit(PAGES.GROUP, score.value)
}

// Подсветка промаха держится ровно на длительность анимации.
function markFail(point: ICoord) {
	failPoint.value = point
	clearTimeout(timers['3'])
	timers['3'] = setTimeout(() => {
		failPoint.value = undefined
		delete timers['3']
	}, 200)
}

// Тап по чужому фрукту: набранные рамки уходят каскадом, а не пропадают
// разом, и цель в шапке дёргается — иначе непонятно, что сбросился весь набор.
function releaseSelected() {
	leavingPoints.value = [...selectedPoints.value]
	selectedPoints.value = []
	targetShake.value = false
	requestAnimationFrame(() => {
		targetShake.value = true
	})
	clearTimeout(timers['5'])
	timers['5'] = setTimeout(() => {
		leavingPoints.value = []
		targetShake.value = false
		delete timers['5']
	}, 420)
}

// Цель в шапке коротко отзывается на каждый верный тап: иначе не видно, что
// счётчик связан с нажатием по полю.
function beatTarget() {
	targetBeat.value = false
	requestAnimationFrame(() => {
		targetBeat.value = true
	})
	clearTimeout(timers['4'])
	timers['4'] = setTimeout(() => {
		targetBeat.value = false
		delete timers['4']
	}, 200)
}

function clearTimers() {
	Object.values(timers).forEach((id) => clearTimeout(id))
}
</script>

<template>
	<div class="page">
		<div class="page__rail page__rail--left">
			<BackLink />
			<AudioToggles :size="40" chip vertical />
		</div>

		<div class="page__head">
			<div class="page__level">LEVEL {{ level + 1 }}</div>
			<TimerItem
				class="time"
				:is-win="isWin"
				:level="level"
				:scale="4"
				@addtimescore="addtimescore"
				@timeend="timeend"
			/>
			<div class="page__info">
				<div
					:class="{
						'page__target--beat': targetBeat,
						'page__target--shake': targetShake,
					}"
					class="page__target"
				>
					<div class="page__tile">
						<img
							v-if="selectedTileType !== null"
							:src="`/img/fruits-redesign/${selectedTileType}.webp`"
							alt=""
						/>
					</div>
					<span class="page__target-count">
						{{ selectedPoints.length }}/{{ selectedTileCount }}
					</span>
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
							'--leave': Math.max(0, leaveIndex(row, col)),
						}"
						:class="{
							[`tile--${TILE_COLORS[tile.type % 4]}`]: true,
							'tile--active': isSelected(row, col),
							'tile--fail': failPoint?.row === row && failPoint?.col === col,
							'tile--leaving': leaveIndex(row, col) >= 0,
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
		padding: 0 20px;
		// Без ограничения таймер забирал всю свободную ширину и доминировал
		// в шапке, хотя это самый второстепенный из показателей.
		max-width: 230px;
	}

	// Общая стеклянная плашка из набора. Панель тёмно-синяя, поэтому весь
	// текст и иконки в шапке светлые: чёрный на ней не читался.

	// Боковые рельсы. Поле 580 в сцене 720, значит по краям всегда свободно
	// по 70 px — сцена фиксированная, так что место есть при любых пропорциях
	// устройства. Туда уносим всё нажимаемое: сверху остаются только
	// показатели, а кнопки оказываются под большими пальцами.
	&__rail {
		position: absolute;
		top: 68px;
		bottom: 58px;
		width: 62px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: 10px;
		z-index: 300;

		&--left {
			left: 4px;
		}

		&--right {
			right: 4px;
		}
	}

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

	// Правило режима — «собрать все такие» — из одной иконки не читается,
	// поэтому рядом с целью стоит счётчик набранного.
	&__target {
		@include hud-capsule;


		&--beat {
			animation: target-beat 0.19s ease-out;
		}

		&--shake {
			animation: target-shake 0.22s linear;
		}

		&-count {
			font-size: 18px;
			letter-spacing: 1px;
			color: $navy;
		}
	}

	&__tile {
		position: relative;
		width: clamp(24px, 6vw, 32px);
		aspect-ratio: 1.156;

		// Кольцо цели: выносим за пределы иконки, чтобы не перекрывать фрукт.
		&:after {
			content: '';
			position: absolute;
			inset: -30%;
			pointer-events: none;
			background: url('@/assets/redesign/overlays/group-target-ring.svg')
				center / 100% 100% no-repeat;
		}

		img {
			display: block;
			width: 100%;
			height: 100%;
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

		@include tile-overlay(url('@/assets/redesign/overlays/tile-group-selected.svg'));
		@include tile-layers;
		@include tile-fail;
		@include tile-leaving;
	}
}

@keyframes target-shake {
	0%,
	100% {
		transform: translateX(0);
	}
	25% {
		transform: translateX(-3px);
	}
	75% {
		transform: translateX(3px);
	}
}

@keyframes target-beat {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.08);
	}
}

@media (prefers-reduced-motion: reduce) {
	.page__target--beat,
	.page__target--shake {
		animation: none;
	}
}
</style>
