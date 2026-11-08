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

			await expect(gamePage.startCaptioningButton).toBeVisible()
			await expect(gamePage.speakers).toHaveCount(1)

			await gamePage.inviteButton.click()
			await expect(gamePage.roomId).toHaveText(gamePage.getRoomIdFromUrl())
		})
	})

	test.describe('Game Room', () => {
		test('Multiple speakers can join the same room', async ({ createPlayerContext }) => {
			const [player1, player2, player3] = await createPlayerContext(3)

			// Host creates the room
			const roomId = await createRoom(player1, 'Player1')

			// Player 2 joins
			await joinRoom(player2, roomId, 'Player2', 'mic')
			await expect(player1.gamePage.speakers).toHaveCount(2)
			await expect(player2.gamePage.speakers).toHaveCount(2)

			// Player 3 joins
			await joinRoom(player3, roomId, 'Player3', 'mic')
			await expect(player1.gamePage.speakers).toHaveCount(3)
			await expect(player2.gamePage.speakers).toHaveCount(3)
			await expect(player3.gamePage.speakers).toHaveCount(3)
		})

		test('Audience members are not shown as speakers', async ({ createPlayerContext }) => {
			const [player1, player2] = await createPlayerContext(2)

			const roomId = await createRoom(player1, 'Player1')
			await joinRoom(player2, roomId, 'Player2', 'audience')

			await expect(player2.gamePage.speakers).toHaveCount(1)
			await expect(player2.gamePage.startCaptioningButton).toBeHidden()
		})

		test('Players with duplicate names can still join', async ({ createPlayerContext }) => {
			const [player1, player2] = await createPlayerContext(2)

			// Host creates the room
			const roomId = await createRoom(player1, 'SameName')

			// Player 2 joins with the same name
			await joinRoom(player2, roomId, 'SameName', 'mic')
			await expect(player1.gamePage.speakers).toHaveCount(2)
			await expect(player2.gamePage.speakers).toHaveCount(2)
		})
	})

	test.describe('Captions', () => {
		test('Captions from a mic appear for the audience', async ({ createPlayerContext }) => {
			const [mic, audience] = await createPlayerContext(2)

			// Real speech recognition can't run headless, so stub it and drive it by hand.
			await mic.page.addInitScript(() => {
				class FakeSpeechRecognition {
					onresult: ((event: unknown) => void) | null = null
					onend: (() => void) | null = null
					start() {
						;(window as unknown as { __recognition: unknown }).__recognition = this
					}
					stop() {
						this.onend?.()
					}
					abort() {}
				}
				;(window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition =
					FakeSpeechRecognition
				;(window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
					FakeSpeechRecognition
			})

			const roomId = await createRoom(mic, 'Speaker')
			await joinRoom(audience, roomId, 'Listener', 'audience')

			await mic.gamePage.startCaptioningButton.click()
			await mic.page.evaluate(() => {
				const recognition = (
					window as unknown as { __recognition: { onresult: (event: unknown) => void } }
				).__recognition
				const result = Object.assign([{ transcript: 'Hello from the mic' }], { isFinal: true })
				recognition.onresult({ resultIndex: 0, results: [result] })
			})

			await expect(audience.page.getByTestId('caption-feed')).toContainText('Hello from the mic')
			await expect(audience.page.getByTestId('caption-feed')).toContainText('Speaker')

			const speakerBar = audience.page.getByTestId('speaker-bar')
			const micSpeakerBar = mic.page.getByTestId('speaker-bar')
			await Promise.all([
				expect(speakerBar).toContainText('Speaker, speaking'),
				expect(micSpeakerBar).toContainText('Speaker (you), speaking'),
			])
			await expect(speakerBar).not.toContainText('speaking')
			await expect(micSpeakerBar).not.toContainText('speaking')
		})
	})
})

async function createRoom(context: PlayerContext, name: string): Promise<string> {
	await context.homePage.goto()
	await context.homePage.createNewButton.click()
	await context.homePage.nameInput.fill(name)
	await context.homePage.micRoleOption.click()
	await context.homePage.createRoomFormButton.click()

	await expect(context.gamePage.startCaptioningButton).toBeVisible()
	return context.gamePage.getRoomIdFromUrl()
}

async function joinRoom(
	context: PlayerContext,
	roomId: string,
	name: string,
	role: 'mic' | 'audience'
) {
	await context.homePage.goto()
	await context.homePage.joinExistingButton.click()
	await context.homePage.roomIdInput.fill(roomId)
	await context.homePage.nameInput.fill(name)
	if (role === 'mic') {
		await context.homePage.micRoleOption.click()
	} else {
		await context.homePage.audienceRoleOption.click()
	}
	await context.homePage.joinRoomFormButton.click()

	await expect(context.gamePage.inviteButton).toBeVisible()
	// The mic button only appears once this phone has joined as a mic
	if (role === 'mic') await expect(context.gamePage.startCaptioningButton).toBeVisible()
}
