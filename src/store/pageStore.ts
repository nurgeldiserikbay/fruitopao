import { ref, computed } from 'vue'
import type { Component } from 'vue'
import { defineStore } from 'pinia'

import { TYPE_PAGES } from '@/utils/types'

import { PAGES } from '@/utils/conts'

import StartPage from '@/pages/StartPage.vue'
import TimeMode from '@/pages/TimeMode.vue'
import GroupMode from '@/pages/GroupMode.vue'
import ClassicMode from '@/pages/ClassicMode.vue'

export const usePageStore = defineStore('PageStore', () => {
	const currentPage = ref<TYPE_PAGES>(PAGES.START)

	// Экран итога живёт внутри страницы режима, а фон рисуется снаружи сцены.
	// Без этого флага фоновый слой не знал бы, что поверх поля висит карточка,
	// и оставлял бы фон игрового режима.
	const resultOpen = ref(false)

	function setResultOpen(value: boolean) {
		resultOpen.value = value
	}

	const pages: { [key in TYPE_PAGES]: Component } = {
		START: StartPage,
		CLASSIC: ClassicMode,
		TIME: TimeMode,
		GROUP: GroupMode,
	}

	const currentPageComponent = computed(() => {
		return pages[currentPage.value]
	})

	const backLink = computed(() => {
		if (currentPage.value === PAGES.CLASSIC) return PAGES.START
		if (currentPage.value === PAGES.TIME) return PAGES.START
		if (currentPage.value === PAGES.GROUP) return PAGES.START
		return ''
	})

	function routeTo(page: TYPE_PAGES) {
		currentPage.value = page
	}

	function toBackLink() {
		if (backLink.value) routeTo(backLink.value)
	}

	return {
		currentPage,
		resultOpen,
		setResultOpen,
		currentPageComponent,
		routeTo,
		backLink,
		toBackLink,
	}
})
