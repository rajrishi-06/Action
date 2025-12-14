// AI-powered task analysis utilities
// Since we can't use OpenAI API directly without a key, we'll implement rule-based AI simulation

export const analyzeTask = (taskTitle) => {
  const keywords = {
    large: ['project', 'prepare', 'build', 'create', 'develop', 'design', 'study', 'learn', 'master'],
    exam: ['exam', 'test', 'quiz', 'midterm', 'final'],
    coding: ['code', 'program', 'develop', 'debug', 'implement', 'fix', 'build'],
    research: ['research', 'investigate', 'analyze', 'study'],
  };

  const lowerTitle = taskTitle.toLowerCase();
  
  return {
    isLarge: keywords.large.some(kw => lowerTitle.includes(kw)),
    isExam: keywords.exam.some(kw => lowerTitle.includes(kw)),
    isCoding: keywords.coding.some(kw => lowerTitle.includes(kw)),
    isResearch: keywords.research.some(kw => lowerTitle.includes(kw)),
  };
};

export const generateSubtasks = (taskTitle) => {
  const analysis = analyzeTask(taskTitle);
  const lowerTitle = taskTitle.toLowerCase();

  // Rule-based subtask generation
  if (analysis.isExam) {
    return [
      'Review lecture notes and materials',
      'Create summary sheets for key topics',
      'Practice with sample questions',
      'Review difficult concepts',
      'Do a final mock test',
    ];
  }

  if (lowerTitle.includes('portfolio') || lowerTitle.includes('website')) {
    return [
      'Plan site structure and design',
      'Set up development environment',
      'Create main pages (Home, About, Projects)',
      'Add project showcases',
      'Implement responsive design',
      'Deploy to hosting platform',
    ];
  }

  if (lowerTitle.includes('assignment') || lowerTitle.includes('homework')) {
    return [
      'Read and understand requirements',
      'Gather necessary resources',
      'Create outline or plan',
      'Complete main work',
      'Review and proofread',
    ];
  }

  if (analysis.isCoding) {
    return [
      'Set up project structure',
      'Implement core functionality',
      'Add error handling',
      'Write tests',
      'Refactor and optimize',
      'Document code',
    ];
  }

  if (analysis.isResearch) {
    return [
      'Define research scope',
      'Gather sources and references',
      'Take notes and organize findings',
      'Analyze data',
      'Write summary/report',
    ];
  }

  // Generic subtasks for other large tasks
  if (analysis.isLarge) {
    return [
      'Break down into smaller steps',
      'Complete initial phase',
      'Complete middle phase',
      'Finalize and review',
    ];
  }

  return null; // No subtasks needed
};

export const suggestPriority = (task) => {
  if (!task.dueDate) return 'medium';

  const now = new Date();
  const dueDate = new Date(task.dueDate);
  const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);

  if (hoursUntilDue < 24) return 'urgent';
  if (hoursUntilDue < 48) return 'high';
  if (hoursUntilDue < 7 * 24) return 'medium';
  return 'low';
};

export const detectProcrastination = (tasks) => {
  const now = new Date();
  const warnings = [];

  // Find overdue tasks
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.completed) return false;
    return new Date(t.dueDate) < now;
  });

  if (overdueTasks.length > 0) {
    warnings.push({
      type: 'overdue',
      message: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
      severity: 'high',
      tasks: overdueTasks,
    });
  }

  // Detect workload issues
  const incompleteTasks = tasks.filter(t => !t.completed);
  if (incompleteTasks.length > 20) {
    warnings.push({
      type: 'overload',
      message: 'You have many pending tasks. Consider archiving completed ones or breaking large tasks down.',
      severity: 'medium',
    });
  }

  // Detect tasks with same deadline
  const dueDateGroups = {};
  incompleteTasks.forEach(task => {
    if (task.dueDate) {
      const dateKey = new Date(task.dueDate).toDateString();
      dueDateGroups[dateKey] = (dueDateGroups[dateKey] || 0) + 1;
    }
  });

  Object.entries(dueDateGroups).forEach(([date, count]) => {
    if (count > 5) {
      warnings.push({
        type: 'clustered',
        message: `${count} tasks are due on ${date}. Consider spreading them out.`,
        severity: 'medium',
      });
    }
  });

  return warnings;
};

export const smartSort = (tasks) => {
  const now = new Date();

  return [...tasks].sort((a, b) => {
    // Completed tasks go to bottom
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;

    // Priority weights
    const priorityWeight = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const aPriority = priorityWeight[a.priority] || 2;
    const bPriority = priorityWeight[b.priority] || 2;

    // Calculate urgency score
    const getUrgencyScore = (task) => {
      if (!task.dueDate) return 0;
      const hoursUntilDue = (new Date(task.dueDate) - now) / (1000 * 60 * 60);
      if (hoursUntilDue < 0) return 1000; // Overdue gets highest score
      return Math.max(0, 100 - hoursUntilDue);
    };

    const aUrgency = getUrgencyScore(a);
    const bUrgency = getUrgencyScore(b);

    // Combined score
    const aScore = aPriority * 10 + aUrgency;
    const bScore = bPriority * 10 + bUrgency;

    return bScore - aScore;
  });
};
