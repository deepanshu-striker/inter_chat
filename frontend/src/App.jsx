import React from 'react'
import VoiceChat from './components/VoiceChat'

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">Voice Chat</h1>
        <VoiceChat />
      </div>
    </div>
  )
}
