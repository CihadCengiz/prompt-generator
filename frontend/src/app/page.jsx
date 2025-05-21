'use client';

import { useState } from 'react';

export default function Home() {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleButtonClick = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/process-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputValue }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response:', data);
    } catch (error) {
      console.error('Error sending data to API:', error);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-screen py-2'>
      <h1 className='text-4xl font-bold mb-6'>Prompt Generator</h1>
      <input
        type='text'
        value={inputValue}
        onChange={handleInputChange}
        placeholder='Enter something'
        className='px-4 py-2 border border-gray-300 rounded-md mb-4 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500'
      />
      <button
        onClick={handleButtonClick}
        className='px-6 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
      >
        Send to API
      </button>
    </div>
  );
}
