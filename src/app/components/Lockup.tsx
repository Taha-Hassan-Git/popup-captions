import { Captions } from 'lucide-react'

export function Lockup({ size }: { size?: 'small' | 'large' }) {
	return (
		<div className="flex items-center space-x-3">
			<div className="p-2 bg-blue-50 rounded-lg">
				<Captions className={`text-blue-500 ${size === 'large' ? 'h-12 w-12' : 'h-7 w-7'}`} />
			</div>
			<h1 className={`font-bold text-gray-800 ${size === 'large' ? 'text-4xl' : 'text-2xl'}`}>
				Popup
			</h1>
		</div>
	)
}
