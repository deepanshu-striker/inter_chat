import React from 'react';
import VoiceChat from '../components/VoiceChat'; // Your existing VoiceChat component

const AppPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">Voice Chat Application</h1>
        <VoiceChat />
      </div>
    </div>
  );
};

export default AppPage;
