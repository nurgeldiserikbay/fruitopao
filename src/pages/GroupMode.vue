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
import TimerItem from '@/components/TimerItem.vue'
import ResultTable from '@/components/ResultTable.vue'

import { usePageStore } from '@/store/pageStore'
import { useAdsStore } from '@/store/adsStore'

import Admob from '@/utils/admob'
import { ICoord, ITile, TYPE_GRID, TYPE_PATH } from '@/utils/types'
import { useAudio } from '@/composables/useAudio'

import { generateBoard, modifyTable, randomInt } from './game'

const pageStore = usePageStore()
const adsStore = useAdsStore()
const audioCont = useAudio()

const cols = 16
const rows = 8
const width = 100 / (cols + 2)
const height = 100 / (rows + 2)

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
		transform: `translate(${col * 100}%, ${row * 100}%)`,
		transformOrigin: 'center',
		backgroundImage: tile ? `url('/img/fruits/${tile.type}.png')` : '',
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
	if (Capacitor.getPlatform() === 'android') {
		if (adsStore.loading) return
		adsStore.toggleLoading(true)
		Admob.interstitial({
			isFirst: false,
			onInterstitialAdClosed: () => {
				adsStore.toggleLoading(false)
				next()
			},
		})
	} else {
		next()
	}
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
		selectedPoints.value = []
		return
	}
	audioCont.playAudio('select')
	selectedPoints.value.push(coord)
}

function generateTable() {
	// tiles.value = TestData
	tiles.value = generateBoard(cols, rows)
}

function timeend() {
	audioCont.playAudio('timeend')
	isEnd.value = true
}

function clearTimers() {
	Object.values(timers).forEach((id) => clearTimeout(id))
}
</script>

<template>
	<div class="page">
		<div class="page__head">
			<BackLink />
			<TimerItem
				class="time"
				:is-win="isWin"
				:level="level"
				:scale="4"
				@addtimescore="addtimescore"
				@timeend="timeend"
			/>
			<div class="page__info">
				<div class="page__tile">
					<img
						v-if="selectedTileType !== null"
						:src="`/img/fruits/${selectedTileType}.png`"
						alt=""
					/>
				</div>
				<div class="page__score">
					<img src="@/assets/img/star.png" alt="" />
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
							'tile--active': isSelected(row, col),
						}"
						:row="row"
						:col="col"
						class="tile"
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
		</div>

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
.page {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	padding: 15px 15px 85px;

	&__head {
		position: relative;
		z-index: 300;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 15px;
		width: 100%;
		box-sizing: border-box;
		padding: 0 10px;
		margin-bottom: 10px;
	}

	&__info {
		width: 30%;
		padding: 2px 5px 2px 15px;
		box-sizing: border-box;
		flex-shrink: 0;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		gap: 15px;
		color: #000;
		font-size: 22px;
		letter-spacing: 2px;
		background: rgba(255, 255, 255, 0.3);
		backdrop-filter: blur(3px);
		border-radius: 5px;
	}

	&__tile {
		width: clamp(24px, 6vw, 32px);
		aspect-ratio: 1.156;

		img {
			display: block;
			width: 100%;
			height: 100%;
		}
	}

	&__score {
		display: flex;
		align-items: center;
		gap: 5px;

		img {
			width: 20px;
			height: 20px;
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
	width: 100%;
	aspect-ratio: 2;
	max-width: 100%;
	box-sizing: border-box;
	background-color: rgba(255, 255, 255, 0.1);
	backdrop-filter: blur(3px);
	transform: translateY(-35px);

	.tile {
		position: absolute;
		top: 0;
		left: 0;
		box-sizing: border-box;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		padding: 5px;
		transition: transform 0.2s linear, opacity 0.2s linear;
		background-size: 100% 100%;
		background-repeat: no-repeat;

		&:after {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			bottom: 0;
			right: 0;
			z-index: 1;
			background: #bff75f75;
			opacity: 0;
			transition: 0.2s linear;
		}

		&--active {
			z-index: 10;
			opacity: 0.8;

			&:after {
				opacity: 1;
			}
		}
	}
}
</style>
