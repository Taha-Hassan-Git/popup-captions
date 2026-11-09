'use client'
import classNames from 'classnames'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Role, roles } from '../../../game-logic/types'
import { usePlayerId } from '../hooks/usePlayerId'
import { generateRoomId } from '../utils/generateRoomId'
import { Button } from './Button'
import { Input } from './Input'
import { RedMessage } from './Message'
import { Panel } from './Panel'
import { RoleIcon, roleLabels } from './RoomScreen'

type JoinFormData = { roomId: string; playerName: string; role: Role | null }

const defaultGameFormData: JoinFormData = { roomId: '', playerName: '', role: null }

const roleDescriptions: Record<Role, string> = {
	mic: 'This phone listens and sends captions',
	audience: 'This phone just shows the captions',
}

const placeHolderRoomId = generateRoomId()

export default function NewGameForm() {
	const searchParams = useSearchParams()
	const errorMessage = searchParams.get('error')
	const [expiredError, setExpiredError] = useState<string | null>(null)
	const showErrorMessage = !!errorMessage && errorMessage !== expiredError
	const [gameFormData, setGameFormData] = useState<JoinFormData>(defaultGameFormData)
	const [showJoinExisting, setShowJoinExisting] = useState<boolean | undefined>(undefined)
	const playerId = usePlayerId()
	const isSubmitDisabled =
		!gameFormData.playerName || !gameFormData.role || (showJoinExisting && !gameFormData.roomId)

	useEffect(() => {
		if (errorMessage) {
			const timer = setTimeout(() => {
				setExpiredError(errorMessage)
			}, 5000)
			return () => clearTimeout(timer)
		}
	}, [errorMessage])

	// if we have a roomId in the query params, it means they came via a qr code
	const qrRoomId = searchParams.get('roomId')
	const [prevQrRoomId, setPrevQrRoomId] = useState<string | null>(null)
	if (qrRoomId !== prevQrRoomId) {
		setPrevQrRoomId(qrRoomId)
		if (qrRoomId) {
			setGameFormData((prev) => ({ ...prev, roomId: qrRoomId }))
			setShowJoinExisting(true)
		}
	}

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
				{showJoinExisting && (
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
				<fieldset className="flex flex-col gap-2">
					<legend className="mb-2">Use this phone as:</legend>
					{roles.map((role) => (
						<label
							key={role}
							className={classNames(
								'flex items-center gap-3 p-3 border rounded-md cursor-pointer',
								gameFormData.role === role ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
							)}
						>
							<input
								type="radio"
								name="role"
								value={role}
								checked={gameFormData.role === role}
								onChange={() => setGameFormData((prev) => ({ ...prev, role }))}
								className="sr-only"
							/>
							<RoleIcon role={role} className="w-6 h-6 text-gray-600" />
							<span className="flex flex-col">
								<span className="font-medium">{roleLabels[role]}</span>
								<span className="text-sm text-gray-500">{roleDescriptions[role]}</span>
							</span>
						</label>
					))}
				</fieldset>
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
