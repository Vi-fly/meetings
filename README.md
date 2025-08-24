# Sync Essence - Smart Meeting Management

## Project Overview

**Sync Essence** is a professional meeting management platform that combines AI-powered transcription, automated minutes generation, and intelligent email invitations to streamline your meeting workflow.

## Features

- 🎯 **Smart Meeting Management** - Create, organize, and track meetings
- 🎤 **AI-Powered Transcription** - Convert audio to text with high accuracy
- 📝 **Automated Minutes Generation** - Generate professional meeting minutes
- 📧 **Intelligent Email Invitations** - Send beautiful, automated invitations
- 👥 **Contact Management** - Manage internal and external contacts
- 📊 **Analytics Dashboard** - Track meeting metrics and insights

## Tech Stack

This project is built with modern technologies:

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **Backend**: Python Flask, AssemblyAI, Google AI
- **Database**: Supabase (PostgreSQL)
- **Email**: SMTP with HTML templates
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Supabase account
- AssemblyAI API key
- Google AI API key

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd sync-essence

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
pip install -r requirements-api.txt

# Set up environment variables
cp env.config.example env.config
# Edit env.config with your API keys
```

### Development

```bash
# Start frontend development server
npm run dev

# Start backend server (in another terminal)
cd backend
python api-server.py
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:5001
```

And `backend/env.config`:

```env
ASSEMBLYAI_API_KEY=your_assemblyai_key
GEMINI_API_KEY=your_gemini_key
EMAIL_SENDER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_SMTP_SERVER=smtp.gmail.com
EMAIL_SMTP_PORT=587
```

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Vercel/Railway)

1. Deploy backend to Vercel or Railway
2. Update frontend API base URL
3. Configure environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue on GitHub.
