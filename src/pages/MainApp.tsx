import { useNavigate } from 'react-router-dom';
import App from '../App';
import { Button } from '../components/ui/button';

export default function MainApp() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // TODO: Add any cleanup logic here (e.g., clearing tokens, etc.)
    navigate('/');
  };

  return (
    <div className="relative">
      <div className="absolute top-4 right-4">
        <Button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md shadow-sm"
        >
          Logout
        </Button>
      </div>
      <App />
    </div>
  );
} 