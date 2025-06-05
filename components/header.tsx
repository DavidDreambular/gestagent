"use client"

import Link from "next/link"

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-gray-900">
          GestAgent
        </Link>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Usuario Demo</span>
          <button className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200">Opciones</button>
        </div>
      </div>
    </header>
  )
}

