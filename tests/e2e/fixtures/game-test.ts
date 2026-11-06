import { test as base, BrowserContext, Page } from '@playwright/test'
import { GamePage } from './pages/GamePage'
import { HomePage } from './pages/HomePage'

/**
 * Represents a single player with their own browser page and page objects.
 */
export type PlayerContext = {
	page: Page
	homePage: HomePage
	gamePage: GamePage
}

type Fixtures = {
	homePage: HomePage
	gamePage: GamePage
	/** Creates `count` isolated players, each in their own browser context. */
	createPlayerContext: (count: number) => Promise<PlayerContext[]>
}

export const test = base.extend<Fixtures>({
	homePage: async ({ page }, use) => {
		await use(new HomePage(page))
	},
	gamePage: async ({ page }, use) => {
		await use(new GamePage(page))
	},
	createPlayerContext: async ({ browser }, use) => {
		const contexts: BrowserContext[] = []

		const create = async (count: number): Promise<PlayerContext[]> => {
			const players: PlayerContext[] = []
			for (let i = 0; i < count; i++) {
				const context = await browser.newContext()
				contexts.push(context)
				const page = await context.newPage()
				players.push({
					page,
					homePage: new HomePage(page),
					gamePage: new GamePage(page),
				})
			}
			return players
		}

		await use(create)

		for (const context of contexts) {
			await context.close()
		}
	},
})

export { expect } from '@playwright/test'
