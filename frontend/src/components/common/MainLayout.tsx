import { Outlet } from 'react-router-dom';
import { useUI } from '../../hooks/useUI';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const MainLayout: React.FC = () => {
  const { sidebarOpen } = useUI();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar />
      
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <main className={`flex-1 transition-all duration-200 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;