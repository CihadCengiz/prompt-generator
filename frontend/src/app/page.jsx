'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [interactions, setInteractions] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // Helper to fetch interactions from the backend
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

  // Fetch interactions from backend on initial load
  useEffect(() => {
    fetchInteractions();
  }, []); // Empty dependency array means this runs once on mount

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleButtonClick = async () => {
    if (!inputValue.trim()) {
      return;
    }

    // Immediately show the new interaction in the UI
    const tempEntry = {
      input: inputValue,
      response: null,
      status: 'Waiting',
      _id: `temp-${Date.now()}`,
    };
    setInteractions((prev) => [tempEntry, ...prev]);

    setIsSending(true);

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
    } finally {
      await fetchInteractions();
      setIsSending(false);
      setInputValue('');
    }
  };

  const handleLinkClick = async (id) => {
    try {
      await fetch(`http://localhost:3001/api/interactions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Completed' }),
      });
      await fetchInteractions();
    } catch (error) {
      console.error('Error updating status:', error);
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
              Status
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
          {interactions.map((interaction) => (
            <tr key={interaction._id}>
              <td className='px-6 py-4 whitespace-normal text-sm text-gray-900'>
                {interaction.input}
              </td>
              <td className='px-6 py-4 whitespace-normal text-sm text-gray-900 max-h-64 overflow-auto'>
                {interaction.response || 'Waiting for AI response...'}
              </td>
              <td className='px-6 py-4 whitespace-normal text-sm text-gray-900'>
                {interaction.status || 'Waiting'}
              </td>
              <td className='px-6 py-4 whitespace-normal text-sm text-blue-600 hover:underline'>
                {interaction.response && (
                <a
                  href={`https://chatgpt.com/codex?prompt=${encodeURIComponent(
                    interaction.response
                  ).replace(/%20/g, '+')}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  onClick={() => handleLinkClick(interaction._id)}
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
          className='px-4 py-2 border border-gray-300 rounded-md mb-4 w-full shadow-md focus:outline-none focus:ring-blue-500 focus:ring-offset-2'
        />
        <button
          onClick={handleButtonClick}
          disabled={isSending}
          className={`px-6 py-2 bg-blue-500 text-white font-semibold rounded-md shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
            isSending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-95'
          }`}
        >
          {isSending ? 'Sending...' : 'Send to API'}
        </button>
      </div>
    </div>
  );
}
