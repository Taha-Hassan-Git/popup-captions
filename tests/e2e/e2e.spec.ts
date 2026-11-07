import { expect, PlayerContext, test } from './fixtures/game-test'

test.describe('Player join behaviour', () => {
	test.describe('Homepage', () => {
		test.beforeEach(async ({ homePage }) => {
			await homePage.goto()
		})

		test('Should load homepage elements', async ({ homePage }) => {
			expect(homePage.header).toBeTruthy()
			await expect(homePage.createNewButton).toBeVisible()
			await expect(homePage.joinExistingButton).toBeVisible()
		})

		test('Can toggle between create and join room forms', async ({ homePage }) => {
			// Open the create room form
			await homePage.createNewButton.click()
			await expect(homePage.createRoomFormButton).toBeVisible()
			await expect(homePage.joinRoomFormButton).toBeHidden()

			// The submit button is disabled until a name and role are chosen
			await expect(homePage.createRoomFormButton).toBeDisabled()
			await homePage.nameInput.fill('PlayerName')
			await expect(homePage.createRoomFormButton).toBeDisabled()
			await homePage.micRoleOption.click()
			await expect(homePage.createRoomFormButton).toBeEnabled()

			// Switch to the join room form
			await homePage.joinExistingButton.click()
			await expect(homePage.createRoomFormButton).toBeHidden()
			await expect(homePage.joinRoomFormButton).toBeVisible()
		})

		test('Can create a room and go straight in', async ({ homePage, gamePage }) => {
			await homePage.createNewButton.click()
			await homePage.nameInput.fill('PlayerName')
			await homePage.micRoleOption.click()
			await homePage.createRoomFormButton.click()

			await expect(gamePage.roomId).toBeVisible()
			await expect(gamePage.infoBarRole).toHaveText('Mic')
		})
	})

	test.describe('Game Room', () => {
		test('Multiple players can join the same game room', async ({ createPlayerContext }) => {
			const [player1, player2, player3] = await createPlayerContext(3)

			// Host creates the room
			const roomId = await createRoom(player1, 'Player1')

			// Player 2 joins
			await joinRoom(player2, roomId, 'Player2')
			await verifyPlayerCount(player1, 2)
			await verifyPlayerCount(player2, 2)

			// Player 3 joins
			await joinRoom(player3, roomId, 'Player3')
			await verifyPlayerCount(player1, 3)
			await verifyPlayerCount(player2, 3)
			await verifyPlayerCount(player3, 3)
		})

		test('Players with duplicate names can still join', async ({ createPlayerContext }) => {
			const [player1, player2] = await createPlayerContext(2)

			// Host creates the room
			const roomId = await createRoom(player1, 'SameName')

			// Player 2 joins with the same name
			await joinRoom(player2, roomId, 'SameName')
			await verifyPlayerCount(player1, 2)
			await verifyPlayerCount(player2, 2)
		})
	})
})

async function createRoom(context: PlayerContext, name: string): Promise<string> {
	await context.homePage.goto()
	await context.homePage.createNewButton.click()
	await context.homePage.nameInput.fill(name)
	await context.homePage.micRoleOption.click()
	await context.homePage.createRoomFormButton.click()

	await expect(context.gamePage.roomId).toBeVisible()

	// Return the room ID for reuse
	return await context.gamePage.roomId.innerText()
}

async function joinRoom(context: PlayerContext, roomId: string, name: string) {
	await context.homePage.goto()
	await context.homePage.joinExistingButton.click()
	await context.homePage.roomIdInput.fill(roomId)
	await context.homePage.nameInput.fill(name)
	await context.homePage.audienceRoleOption.click()
	await context.homePage.joinRoomFormButton.click()

	await expect(context.gamePage.infoBarRole).toHaveText('Audience')
}

// Verify the player count with a retry to allow for real-time sync.
async function verifyPlayerCount(context: PlayerContext, expectedCount: number, timeout = 5000) {
	await expect(async () => {
		const count = await context.gamePage.getNumberOfPlayers()
		expect(count).toBe(expectedCount)
	}).toPass({ timeout })
}
