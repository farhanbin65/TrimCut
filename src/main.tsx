import { createRoot } from 'react-dom/client';
import { App } from './App';
import { IconsPage } from './pages/IconsPage';
import './style.css';
const root = document.getElementById('root');
if (!root) throw Error('Missing application root.');
createRoot(root).render(location.pathname.replace(/\/$/, '') === '/icons' ? <IconsPage /> : <App />);
