// Gemini AI Integration for TaskMaster
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Call Gemini API with a prompt
 */
async function callGeminiAPI(prompt) {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No response from Gemini API');
    }

    return text.trim();
  } catch (error) {
    console.error('Gemini API Error:', error);
    return null;
  }
}

/**
 * Generate subtasks for a complex task using AI
 */
export async function generateAISubtasks(taskTitle) {
  const prompt = `Break down this task into 3-5 specific, actionable subtasks: "${taskTitle}"

Rules:
- Each subtask should be a single, concrete action
- Start each subtask with an action verb
- Keep subtasks short (5-8 words max)
- Make them sequential if order matters
- Return ONLY the subtasks, one per line, no numbering or extra text

Example for "Plan vacation to Europe":
Research destinations and create shortlist
Book flights and reserve hotels
Create daily itinerary with activities
Prepare travel documents and insurance
Pack luggage and essentials

Now generate subtasks for: "${taskTitle}"`;

  const response = await callGeminiAPI(prompt);
  
  if (!response) {
    return null;
  }

  // Parse the response into an array of subtasks
  const subtasks = response
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .slice(0, 5); // Max 5 subtasks

  return subtasks.length > 0 ? subtasks : null;
}

/**
 * Suggest priority level based on task content using AI
 */
export async function suggestAIPriority(taskTitle) {
  const prompt = `Analyze this task and suggest a priority level: "${taskTitle}"

Consider:
- Urgency (time-sensitive words like "urgent", "ASAP", "today", "deadline")
- Importance (critical tasks, health, safety, legal matters)
- Impact (affects others, business-critical, dependencies)
- Default to "medium" if unclear

Return ONLY one word: urgent, high, medium, or low

Task: "${taskTitle}"
Priority:`;

  const response = await callGeminiAPI(prompt);
  
  if (!response) {
    return 'medium';
  }

  const priority = response.toLowerCase().trim();
  
  if (['urgent', 'high', 'medium', 'low'].includes(priority)) {
    return priority;
  }

  return 'medium';
}

/**
 * Analyze task and provide productivity insights using AI
 */
export async function analyzeTaskWithAI(taskTitle) {
  const prompt = `Analyze this task and provide a brief productivity insight: "${taskTitle}"

Provide ONE of these insights (choose the most relevant):
1. If it's complex: "This looks like a multi-step project. Consider breaking it down."
2. If it's time-sensitive: "This appears time-sensitive. Set a specific deadline."
3. If it's vague: "Try making this more specific and actionable."
4. If it's good: "Well-defined task! Clear action and outcome."
5. If it needs context: "Add more context - who, what, when, where, why?"

Return ONLY the insight, no explanation.

Task: "${taskTitle}"
Insight:`;

  const response = await callGeminiAPI(prompt);
  
  return response || null;
}

/**
 * Generate smart task suggestions based on user's task history
 */
export async function generateTaskSuggestions(recentTasks) {
  const taskList = recentTasks.slice(0, 10).map(t => t.title).join('\n');
  
  const prompt = `Based on these recent tasks, suggest 3 helpful follow-up tasks:

Recent tasks:
${taskList}

Generate 3 smart suggestions that are:
- Related to their current work
- Actionable next steps
- Different from existing tasks

Return ONLY the 3 suggestions, one per line, no numbering.

Suggestions:`;

  const response = await callGeminiAPI(prompt);
  
  if (!response) {
    return [];
  }

  const suggestions = response
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .slice(0, 3);

  return suggestions;
}

/**
 * Get AI-powered productivity coaching based on task patterns
 */
export async function getProductivityCoaching(tasks) {
  const completedCount = tasks.filter(t => t.completed).length;
  const overdueCount = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const totalCount = tasks.length;
  const highPriorityCount = tasks.filter(t => !t.completed && (t.priority === 'urgent' || t.priority === 'high')).length;

  const prompt = `Provide productivity coaching based on these stats:

- Total tasks: ${totalCount}
- Completed: ${completedCount}
- Overdue: ${overdueCount}
- High priority pending: ${highPriorityCount}

Give ONE specific, actionable coaching tip (max 15 words). Be encouraging if doing well, constructive if struggling.

Coaching:`;

  const response = await callGeminiAPI(prompt);
  
  return response || 'Keep going! Consistency is key to productivity.';
}

/**
 * Smart categorization - suggest tags for a task
 */
export async function suggestAITags(taskTitle) {
  const prompt = `Suggest 1-3 relevant tags for this task: "${taskTitle}"

Common categories: work, personal, health, finance, shopping, learning, social, home, urgent, project

Return ONLY the tags, comma-separated, no hashtags.

Task: "${taskTitle}"
Tags:`;

  const response = await callGeminiAPI(prompt);
  
  if (!response) {
    return [];
  }

  const tags = response
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0)
    .slice(0, 3);

  return tags;
}

/**
 * Estimate time required for a task
 */
export async function estimateTaskTime(taskTitle) {
  const prompt = `Estimate how many minutes this task will take: "${taskTitle}"

Consider typical time for similar tasks. Return ONLY a number (minutes).

Task: "${taskTitle}"
Minutes:`;

  const response = await callGeminiAPI(prompt);
  
  if (!response) {
    return null;
  }

  const minutes = parseInt(response.replace(/\D/g, ''));
  
  return !isNaN(minutes) && minutes > 0 ? minutes : null;
}
