'use client'
import { CircleHelp } from 'lucide-react'
import Link from 'next/link'
import { HowToPlayContent } from './HowToPlayContent'
import { Lockup } from './Lockup'
import { Modal } from './Modal'

export default function Header() {
	return (
		<header className="w-full bg-white border-b shadow-md">
			<div className="max-w-[640px] mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					<Link href="/">
						<Lockup />
					</Link>
					<HowToPlayDialog />
				</div>
			</div>
		</header>
	)
}

function HowToPlayDialog() {
	return (
		<Modal
			title="How it works"
			trigger={
				<button
					aria-label="How it works"
					className="bg-gray-100 p-2 border border-gray-200 shadow-sm rounded-lg"
				>
					<CircleHelp className="w-7 h-7 text-gray-500" />
				</button>
			}
		>
			<HowToPlayContent />
		</Modal>
	)
}
