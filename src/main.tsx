import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { schedulerService } from './services/scheduler-service';

// Initialize the reminder scheduler
schedulerService.start();

createRoot(document.getElementById("root")!).render(<App />);
