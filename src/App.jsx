import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BookingPage from './components/BookingPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:candidate_id" element={<BookingPage />} />
        <Route path="/" element={<BookingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
