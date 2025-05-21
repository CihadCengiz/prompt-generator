'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [interactions, setInteractions] = useState([]);

  // Fetch interactions from backend on initial load
  useEffect(() => {
    const fetchInteractions = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/interactions');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setInteractions(data);
      } catch (error) {
        console.error('Error fetching interactions:', error);
      }
    };

    fetchInteractions();
  }, []); // Empty dependency array means this runs once on mount

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
      // After successful save, refetch interactions to update the list
      const fetchInteractions = async () => {
        try {
          const response = await fetch('http://localhost:3001/api/interactions');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setInteractions(data);
        } catch (error) {
          console.error('Error fetching interactions:', error);
        }
      };

      fetchInteractions();

      // Clear the input field after sending
      setInputValue('');
    } catch (error) {
      console.error('Error sending data to API:', error);
    }
  };

  return (
    <div className='min-h-screen py-2 px-4 flex flex-col items-center'>
      <h1 className='text-3xl font-bold mb-6'>Prompt Generator</h1>
      <table className='min-w-full divide-y divide-gray-200 border border-gray-300 rounded-md overflow-hidden mb-6'>
        <thead className='bg-gray-50'>
          <tr>
            <th
              scope='col'
              className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
            >
              Input Value
            </th>
            <th
              scope='col'
              className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
            >
              AI Response
            </th>
            <th
              scope='col'
              className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
            >
              ChatGPT Link
            </th>
          </tr>
        </thead>
        <tbody className='bg-white divide-y divide-gray-200 max-h-96 overflow-y-auto'>
          {interactions.map((interaction, index) => (
            <tr key={index}>
              <td className='px-6 py-4 whitespace-normal text-sm text-gray-900'>
                {interaction.input}
              </td>
              <td className='px-6 py-4 whitespace-normal text-sm text-gray-900 max-h-64 overflow-auto'>
                {interaction.response || 'Waiting for AI response...'}
              </td>
              <td className='px-6 py-4 whitespace-normal text-sm text-blue-600 hover:underline'>
                {interaction.response && (
                <a
                  href={`https://chatgpt.com/codex?prompt=${encodeURIComponent(
                    interaction.response
                  ).replace(/%20/g, '+')}`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Open in ChatGPT Codex
                </a>
              )}
            </td>
          </tr>
          ))}
        </tbody>
      </table>

      <div className='flex flex-col items-center w-full max-w-md'>
        <input
          type='text'
          value={inputValue}
          onChange={handleInputChange}
          placeholder='Enter something'
          className='px-4 py-2 border border-gray-300 rounded-md mb-4 w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
        <button
          onClick={handleButtonClick}
          className='px-6 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
        >
          Send to API
        </button>
      </div>
    </div>
  );
}
