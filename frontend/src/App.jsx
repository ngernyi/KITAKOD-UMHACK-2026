import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Configuration from './pages/Configuration';
import DataInput from './pages/DataInput';
import ExternalData from './pages/ExternalData';
import Analysis from './pages/Analysis';
import Predictions from './pages/Predictions';
import Actions from './pages/Actions';
import AIAssistant from './pages/AIAssistant';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="data" element={<DataInput />} />
            <Route path="external" element={<ExternalData />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="predictions" element={<Predictions />} />
            <Route path="actions" element={<Actions />} />
            <Route path="ai" element={<AIAssistant />} />
            <Route path="config" element={<Configuration />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;