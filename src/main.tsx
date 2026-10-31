import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/enhancements.css';
import './styles/love.css';
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
