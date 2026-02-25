import { useState } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import Splash from "./components/Splash";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null);

  const handleSplashContinue = () => {
    setShowSplash(false);
  };

  const handleLogin = (userRole) => {
    setRole(userRole);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setRole(null);
    setShowSplash(true);
  };

  if (showSplash) {
    return <Splash onContinue={handleSplashContinue} />;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`app-container role-${role}`}>
      <header className="app-header">
        <h1>WASTEWATER GIS</h1>

        <div className="header-controls">
          <span className="current-role">Role: {role.replace("-", " ")}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">
        <Dashboard role={role} />
      </main>
    </div>
  );
}
