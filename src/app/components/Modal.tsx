import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { ReactElement, ReactNode } from 'react'

export function Modal({
	trigger,
	title,
	children,
}: {
	trigger: ReactElement
	title: string
	children: ReactNode
}) {
	return (
		<Dialog.Root>
			<Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
				<Dialog.Content
					aria-describedby={undefined}
					className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-3xl shadow-2xl ring-1 ring-gray-900/5 w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto focus:outline-none data-[state=open]:animate-dialog-in"
				>
					<div className="flex items-center justify-between gap-4 mb-6">
						<Dialog.Title className="text-xl font-semibold tracking-tight text-gray-900">
							{title}
						</Dialog.Title>
						<Dialog.Close
							aria-label="Close"
							className="-mr-2 grid size-9 place-items-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
						>
							<X className="size-5" />
						</Dialog.Close>
					</div>
					{children}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
