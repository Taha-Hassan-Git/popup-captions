'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GameFormInfo } from '../../../game-logic/types'
import { usePlayerId } from '../hooks/usePlayerId'
import { generateRoomId } from '../utils/generateRoomId'
import { Button } from './Button'
import { Input } from './Input'
import { RedMessage } from './Message'
import { Panel } from './Panel'

const defaultGameFormData: GameFormInfo = { roomId: '', playerName: '', playerId: '' }

const placeHolderRoomId = generateRoomId()

export default function NewGameForm() {
	const searchParams = useSearchParams()
	const errorMessage = searchParams.get('error')
	const [showErrorMessage, setShowErrorMessage] = useState<boolean>(() => !!errorMessage)
	const [gameFormData, setGameFormData] = useState<GameFormInfo>(defaultGameFormData)
	const [showJoinExisting, setShowJoinExisting] = useState<boolean | undefined>(undefined)
	const playerId = usePlayerId()
	const isSubmitDisabled = showJoinExisting
		? !gameFormData.roomId || !gameFormData.playerName
		: !gameFormData.playerName

	useEffect(() => {
		if (errorMessage) {
			setShowErrorMessage(true)
			const timer = setTimeout(() => {
				setShowErrorMessage(false)
			}, 5000)
			return () => clearTimeout(timer)
		}
	}, [errorMessage])

	useEffect(() => {
		// if we have a roomId in the query params, it means they came via a qr code
		const roomId = searchParams.get('roomId')
		if (roomId) {
			setGameFormData((prev) => {
				return { ...prev, roomId }
			})
			setShowJoinExisting(true)
		}
	}, [searchParams])

	if (showJoinExisting === undefined) {
		return (
			<div className="w-full flex flex-col items-center">
				{
					//disappears after 5 seconds
					showErrorMessage && <RedMessage message={errorMessage || 'Something went wrong'} />
				}
				<Panel className="flex flex-col gap-5 mt-5">
					<Button
						variant="primary"
						onClick={() => {
							setShowJoinExisting(false)
						}}
					>
						Create new room
					</Button>
					<Button
						variant="primary"
						onClick={() => {
							setShowJoinExisting(true)
						}}
					>
						Join existing room
					</Button>
				</Panel>
			</div>
		)
	}
	return (
		<Panel className="!p-0 mt-5">
			<div className="flex w-full">
				<Button
					variant={showJoinExisting ? 'secondary' : 'disabled'}
					className="flex-1 px-2 rounded-tl-md rounded-r-none rounded-none bg-gray-100 disabled:bg-white disabled:text-gray-800"
					disabled={showJoinExisting}
					onClick={() => setShowJoinExisting(true)}
				>
					Join existing room
				</Button>
				<Button
					variant={!showJoinExisting ? 'secondary' : 'disabled'}
					className="flex-1 px-2 rounded-tr-md rounded-l-none rounded-none bg-gray-100 disabled:bg-white disabled:text-gray-800"
					disabled={!showJoinExisting}
					onClick={() => setShowJoinExisting(false)}
				>
					Create new room
				</Button>
			</div>
			<div className="p-8 flex flex-col gap-5 w-full">
				{showJoinExisting ? (
					<Input
						name={'roomId'}
						type={'text'}
						label={'Room Id:'}
						value={gameFormData.roomId}
						placeholder={placeHolderRoomId}
						handleChange={(e) => {
							setGameFormData((prev) => {
								return { ...prev, roomId: e.target.value }
							})
						}}
					/>
				) : (
					<div>Something</div>
				)}

				<Input
					name={'playerName'}
					type={'text'}
					label={'Your Name:'}
					placeholder={'...what is your name?'}
					value={gameFormData.playerName}
					handleChange={(e) => {
						setGameFormData((prev) => {
							return { ...prev, playerName: e.target.value }
						})
					}}
				/>
				<input readOnly className="hidden" name="playerId" value={playerId}></input>
				<div className="self-center w-full">
					<Button
						disabled={isSubmitDisabled}
						className="disabled:bg-gray-300 disabled:text-gray-800 w-full"
						type="submit"
					>
						{showJoinExisting ? 'Join Room' : 'Create Room'}
					</Button>
				</div>
			</div>
		</Panel>
	)
}
