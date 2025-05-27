'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [userInput, setUserInput] = useState('');
  const [interactions, setInteractions] = useState([]);
  const [contextText, setContextText] = useState('');
  const [selectedModel, setSelectedModel] = useState(
    'gemini-2.5-flash-preview-05-20'
  ); // Default model

  const models = [
    { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' }, // Example model
  ];

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
    setUserInput(event.target.value);
  };

  const handleGetSuggestion = async () => {
    if (!userInput.trim()) {
      return;
    }
    const currentInput = userInput;

    try {
      const response = await fetch(
        'http://localhost:3001/api/process-input/suggest-model',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userInput: currentInput }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSelectedModel(data.modelSuggestions[0].model);
      setContextText(data.context);
    } catch (error) {
      console.error('Error sending data to API:', error);
    }
  };

  const handleSendToApi = async () => {
    if (!userInput.trim()) {
      return;
    }

    const tempId = `temp-${Date.now()}`;

    // Optimistically add the new interaction
    const tempEntry = {
      input: userInput,
      response: null,
      status: 'Waiting',
      selectedModel: selectedModel,
      _id: tempId,
    };

    setInteractions((prev) => [tempEntry, ...prev]);
    const currentInput = userInput;
    setUserInput('');

    try {
      const response = await fetch(
        'http://localhost:3001/api/process-input/generate-prompt',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userInput: currentInput,
            selectedModel: selectedModel,
            contextText: contextText,
          }),
        }
      );

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
    <div className='h-screen flex flex-col items-center px-4 pt-[calc(var(--header-height, 60px) + var(--warning-header-height, 0px))]'>
      <div className='flex-grow w-full flex flex-col overflow-y-auto'>
        <h1 className='text-3xl font-bold pt-6 mb-6 text-center'>
          Prompt Generator
        </h1>
        {/* Modify this div to allow vertical scrolling for its content */}
        <div className='flex flex-col flex-grow min-h-0 overflow-y-auto hide-parent-scrollbar'>
          {/* Remove overflow-hidden from the table itself */}
          <table className='fixed-header-table flex-grow min-w-full divide-y divide-gray-200 border border-gray-300 rounded-md mb-6'>
            <thead className='datatable-header sticky top-0 z-10'>
              <tr>
                <th
                  scope='col'
                  className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider datatable-header-th'
                >
                  Input Value
                </th>
                <th
                  scope='col'
                  className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider datatable-header-th'
                >
                  AI Response
                </th>
                <th
                  scope='col'
                  className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider datatable-header-th'
                >
                  Status
                </th>
                <th
                  scope='col'
                  className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider datatable-header-th'
                >
                  Selected Model
                </th>
                <th
                  scope='col'
                  className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider datatable-header-th'
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
                  <td className='px-6 py-4 whitespace-normal text-sm text-gray-900'>
                    {interaction.selectedModel}
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
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className='px-4 py-2 border border-gray-400 rounded-md mb-4 w-full shadow-sm focus:outline-none focus:border-blue-600 focus:ring-blue-600'
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <input
          type='text'
          value={userInput}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSendToApi();
            }
          }}
          placeholder='Enter something'
          className='px-4 py-2 border border-gray-400 rounded-md mb-4 w-full shadow-sm focus:outline-none focus:border-blue-600 focus:ring-blue-600'
        />
        <button
          onClick={handleGetSuggestion}
          className='px-6 py-2 mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300'
        >
          Get Model Suggestion
        </button>
        <button
          onClick={handleSendToApi}
          className='px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300'
        >
          Send to API
        </button>
      </div>
    </div>
  );
}
