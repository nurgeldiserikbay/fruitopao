// Кросс-промо собственных игр. Показывается в полосе под полем, пока не
// поднялся баннер AdMob, и в браузерной сборке, где его не будет вовсе.
//
// Список закрыт вручную и только из опубликованных игр: каждая ссылка
// проверена на 200 в Google Play. Number Maze сюда не попал — его страница
// отдаёт 404, а промо в мёртвую ссылку хуже, чем его отсутствие.

export interface IPromoGame {
	id: string
	title: string
	icon: string
}

const store = (id: string) =>
	`https://play.google.com/store/apps/details?id=${id}`

export const PROMO_GAMES: IPromoGame[] = [
	{ id: 'com.thelightcome.fruitmatchpuzzle', title: 'Fruit Match Puzzle', icon: 'fruitmatch' },
	{ id: 'com.thelightcome.mazeofmouse', title: 'Maze Of Mouse', icon: 'mazeofmouse' },
	{ id: 'com.thelightcome.bughunt', title: 'Bug Hunt', icon: 'bughunt' },
	{ id: 'com.thelightcome.flowblocks', title: 'Flow Blocks', icon: 'flowblocks' },
	{ id: 'com.thelightcome.stackdrop', title: 'Stack Drop', icon: 'stackdrop' },
	{ id: 'com.thelightcome.neocube', title: 'Neo Cube', icon: 'neocube' },
	{ id: 'com.thelightcome.cutitright', title: 'Cut It Right', icon: 'cutitright' },
	{ id: 'com.thelightcome.glasspuzzle', title: 'Glass Puzzle', icon: 'glasspuzzle' },
	{ id: 'com.thelightcome.bubbledefense', title: 'Bubble Defense', icon: 'bubbledefense' },
	{ id: 'com.thelightcome.mathboxes', title: 'Math Boxes', icon: 'mathboxes' },
	{ id: 'com.thelightcome.chessknightpuzzles', title: 'Chess Knight', icon: 'chessknight' },
	{ id: 'com.thelightcome.pianonotes', title: 'Piano Notes', icon: 'pianonotes' },
	{ id: 'com.thelightcome.avoidbullets', title: 'Avoid Bullets', icon: 'avoidbullets' },
]

export function promoIcon(game: IPromoGame) {
	return `/img/promo/${game.icon}.webp`
}

export function promoLink(game: IPromoGame) {
	return store(game.id)
}
