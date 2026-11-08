import { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
	return <main className="w-full max-w-[500px] h-dvh flex flex-col">{children}</main>
}
