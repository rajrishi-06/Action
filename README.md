# 🚀 TaskMaster - Modern AI-Powered Todo List

A delightful, intelligent, and feature-rich task management application built with React, Tailwind CSS, and Supabase.

![TaskMaster](https://img.shields.io/badge/React-18-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-cyan) ![Supabase](https://img.shields.io/badge/Supabase-Enabled-green)

## ✨ Features

### 🎯 Core Task Management
- **Smart Task Creation** - Natural language parsing for dates, times, priorities, and tags
- **Rich Task Model** - Title, description, priority, due date, tags, subtasks, completion status
- **Subtask Support** - Break down complex tasks into manageable steps
- **Drag & Drop** - Intuitive task reordering in Kanban view
- **Offline-First** - Optimistic updates for instant feedback

### 🧠 AI-Powered Intelligence
- **Smart Task Breakdown** - AI suggests subtasks for complex tasks
- **Priority Detection** - Automatic priority suggestions based on keywords
- **Procrastination Alerts** - Warns about overdue tasks and workload
- **Productivity Coach** - Real-time insights and recommendations
- **Smart Sorting** - Tasks ranked by urgency and importance

### 📊 Multiple Views
1. **List View** - Classic task list with filtering
2. **Kanban Board** - Visual workflow (Urgent / To Do / Done)
3. **Calendar View** - Monthly view with tasks by due date
4. **Analytics Dashboard** - Productivity insights, heatmaps, and charts
5. **Focus Mode** - Pomodoro timer integration (25/5/15 min modes)

### 🎮 Gamification
- **XP System** - Earn points for completing tasks (10-50 XP based on priority)
- **Level Progression** - Level up as you complete tasks
- **Achievement Badges** - 8 unlockable achievements
- **Streak Tracking** - Daily activity monitoring

### ⌨️ Keyboard-First UX
- **Command Palette** - Press \`Cmd+K\` for quick actions
- **Keyboard Navigation** - Arrow keys, Enter, Escape support
- **Export Options** - JSON, CSV, Markdown formats

### 🔐 Authentication & Security
- Google OAuth, Email/Password, Magic Link
- Row Level Security (RLS) for data protection
- Secure session management with Supabase

## 🚀 Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure Environment
Create \`.env\` file:
\`\`\`env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

### 3. Set Up Database
Run \`tables.sql\` in Supabase SQL Editor to create:
- Tasks table with RLS policies
- User stats for gamification
- Task analytics for insights

### 4. Start Development Server
\`\`\`bash
npm run dev
\`\`\`

Visit http://localhost:5173 🎉

## 🎮 Usage Examples

### Natural Language Task Creation
\`\`\`
"Buy groceries tomorrow at 3pm #shopping !high"
→ Due: Tomorrow 3pm, Priority: High, Tag: shopping

"Call dentist next Monday !urgent"
→ Due: Next Monday, Priority: Urgent
\`\`\`

### Keyboard Shortcuts
- \`Cmd/Ctrl + K\` - Command palette
- \`↑/↓\` - Navigate
- \`Enter\` - Execute
- \`Esc\` - Close

## 🛠️ Tech Stack

- React 18 + Vite
- Tailwind CSS 3.4
- Framer Motion
- Supabase (PostgreSQL + Auth)
- React Router DOM
- @dnd-kit (drag & drop)
- date-fns, lucide-react

## 📁 Project Structure

\`\`\`
src/
├── components/       # UI components
├── context/          # State management
├── utils/            # Helper functions
└── App.jsx           # Main app
\`\`\`

## 🚀 Deployment

\`\`\`bash
npm run build
\`\`\`

Deploy \`dist/\` folder to Vercel/Netlify with environment variables.

## �� License

MIT License

---

**Made with 🚀 by TaskMaster Team**
*Stay productive, stay focused!* ✨
