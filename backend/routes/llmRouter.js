const modelProfiles = [
    {
      name: 'gemini-2.5-flash-preview-05-20',
      provider: 'google',
      costPer1kInput: 0.00025,
      costPer1kOutput: 0.0005,
      latency: 'fast',
      strengths: ['fast', 'low cost', 'codegen', 'general tasks'],
      weaknesses: ['long documents', 'deep reasoning'],
    },
    {
      name: 'gpt-4-turbo',
      provider: 'openai',
      costPer1kInput: 0.01,
      costPer1kOutput: 0.03,
      latency: 'medium',
      strengths: ['high quality', 'complex reasoning', 'tool use', 'codegen'],
      weaknesses: ['cost'],
    },
    {
      name: 'claude-3-sonnet',
      provider: 'anthropic',
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
      latency: 'medium',
      strengths: ['structured writing', 'markdown/docs', 'explanation'],
      weaknesses: ['less deterministic code edits'],
    },
  ];
  
  function estimateCost(model, inputTokens, outputTokens) {
    const profile = modelProfiles.find(m => m.name === model);
    if (!profile) return null;
    const inputCost = (inputTokens / 1000) * profile.costPer1kInput;
    const outputCost = (outputTokens / 1000) * profile.costPer1kOutput;
    return +(inputCost + outputCost).toFixed(6);
  }
  
  function recommendModels(taskPrompt = '', location = '', estimatedOutputTokens = 150) {
    const recommendations = [];
  
    const inputTokens = Math.ceil(taskPrompt.length / 4); // rough estimate: 4 chars/token
  
    // If no location is provided, try to infer one from the task prompt itself
    if (!location && typeof taskPrompt === 'string') {
      const hintMatch = taskPrompt.match(/\b(update|edit|modify)\s+(.+)/i);
      if (hintMatch) {
        location = hintMatch[2];
      }
    }
  
    const normalizedLocation = location?.toLowerCase().trim() || '';
    const isDocEdit =
      normalizedLocation.includes('readme') ||
      normalizedLocation.includes('.md') ||
      /docs?\//i.test(normalizedLocation);
  
    const isCode = /\.(js|ts|jsx|tsx|css|scss|html)$/i.test(location);
    const isSimple = taskPrompt.length < 100;
    const isComplex = taskPrompt.length > 300 || /analyze|refactor|redesign|multi-step/i.test(taskPrompt);
  
    if (isDocEdit) {
      recommendations.push({
        reason: 'Markdown/document editing task',
        model: 'claude-3-sonnet',
      });
    }
  
    if (isCode && isSimple) {
      recommendations.push({
        reason: 'Simple codegen task in JS/CSS/etc.',
        model: 'gemini-2.5-flash-preview-05-20',
      });
    }
  
    if (isCode && isComplex) {
      recommendations.push({
        reason: 'Complex code reasoning/refactor required',
        model: 'gpt-4-turbo',
      });
    }
  
    if (recommendations.length === 0) {
      recommendations.push({
        reason: 'Default fallback for general tasks',
        model: 'gemini-2.5-flash-preview-05-20',
      });
    }
  
    return {
      inferredLocation: location || null,
      suggestions: recommendations.map((r) => {
        const profile = modelProfiles.find((m) => m.name === r.model);
        return {
          model: profile.name,
          provider: profile.provider,
          latency: profile.latency,
          reason: r.reason,
          strengths: profile.strengths,
          weaknesses: profile.weaknesses,
          estimatedCost: `$${estimateCost(profile.name, inputTokens, estimatedOutputTokens)}`,
        };
      }),
      inputTokenEstimate: inputTokens,
      outputTokenEstimate: estimatedOutputTokens
    };
  }
  
  export { recommendModels };
  