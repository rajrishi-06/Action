import { addDays, nextMonday, setHours, setMinutes, startOfTomorrow } from 'date-fns';

export const parseTaskInput = (input) => {
  let text = input;
  let dueDate = null;
  let priority = 'medium';
  let tags = [];

  const lowerInput = input.toLowerCase();

  // Priority detection
  if (lowerInput.includes('urgent') || lowerInput.includes('asap') || lowerInput.includes('!!!')) {
    priority = 'urgent';
  } else if (lowerInput.includes('high priority') || lowerInput.includes('important')) {
    priority = 'high';
  } else if (lowerInput.includes('low priority')) {
    priority = 'low';
  }

  // Date detection (Simple heuristics)
  if (lowerInput.includes('tomorrow')) {
    dueDate = startOfTomorrow();
    // Default to 9 AM if no time specified
    dueDate = setHours(dueDate, 9);
    dueDate = setMinutes(dueDate, 0);
  } else if (lowerInput.includes('tonight')) {
    dueDate = setHours(new Date(), 20); // 8 PM
    dueDate = setMinutes(dueDate, 0);
  } else if (lowerInput.includes('next week')) {
    dueDate = nextMonday(new Date());
    dueDate = setHours(dueDate, 9);
    dueDate = setMinutes(dueDate, 0);
  }

  // Time detection (very basic regex)
  // Matches "at 5pm", "at 5:30 pm", "at 17:00"
  const timeMatch = lowerInput.match(/at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3];

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    if (dueDate) {
        dueDate = setHours(dueDate, hours);
        dueDate = setMinutes(dueDate, minutes);
    } else {
        // If time is specified but no date, assume today if time is in future, else tomorrow
        let potentialDate = setMinutes(setHours(new Date(), hours), minutes);
        if (potentialDate < new Date()) {
            potentialDate = addDays(potentialDate, 1);
        }
        dueDate = potentialDate;
    }
  }

  // Tag detection (#tag)
  const tagMatches = text.match(/#\w+/g);
  if (tagMatches) {
    tags = tagMatches.map(tag => tag.slice(1));
  }

  return {
    text,
    dueDate,
    priority,
    tags
  };
};
