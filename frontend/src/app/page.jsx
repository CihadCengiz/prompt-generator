'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [interactions, setInteractions] = useState([]);

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

    const tempId = `temp-${Date.now()}`;

    // Optimistically add the new interaction
    const tempEntry = {
      input: inputValue,
      response: null,
      status: 'Waiting',
      _id: tempId,
    };
    setInteractions((prev) => [tempEntry, ...prev]);
    const currentInput = inputValue;
    setInputValue('');

    try {
      const response = await fetch('http://localhost:3001/api/process-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputValue: currentInput }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Update the specific interaction with the real id and response
      setInteractions((prev) =>
        prev.map((int) =>
          int._id === tempId
            ? {
                ...int,
                _id: data.id,
                response: data.aiResponse,
                status: 'Completed',
              }
            : int
        )
      );
    } catch (error) {
      console.error('Error sending data to API:', error);
      setInteractions((prev) =>
        prev.map((int) =>
          int._id === tempId
            ? { ...int, response: 'Error', status: 'Error' }
            : int
        )
      );
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
    <div
      className='h-screen flex flex-col items-center px-4 pt-[calc(var(--header-height, 60px) + var(--warning-header-height, 0px))]'
    >
      <div className='flex-grow w-full flex flex-col'>
        <h1 className='text-3xl font-bold pt-6 mb-6 text-center'>Prompt Generator</h1>
        {/* Modify this div to allow vertical scrolling for its content */}
        <div className='flex flex-col flex-grow min-h-0'>
          {/* Remove overflow-hidden from the table itself */}
          <table className='fixed-header-table h-[50vh] min-w-full divide-y divide-gray-200 border border-gray-300 rounded-md mb-6'>
        <thead className='bg-gray-50 sticky top-0 z-10'>
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
        <tbody className='bg-white divide-y divide-gray-200'>
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
      </div>
      </div>

      <div className='flex flex-col items-center w-full bg-white dark:bg-gray-800 p-4 shadow-lg z-10'>
        <input
          type='text'
          value={inputValue}
          onChange={handleInputChange}
          placeholder='Enter something'
          className='px-4 py-2 border border-gray-400 rounded-md mb-4 w-full shadow-sm focus:outline-none focus:border-blue-600 focus:ring-blue-600'
        />
        <button
          onClick={handleButtonClick}
          className='px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-indigo-700 active:scale-95'
        >
          Send to API
        </button>
      </div>
    </div>
  );
}
