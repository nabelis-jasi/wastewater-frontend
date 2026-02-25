import { useState } from "react";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);

  // Predefined credentials for each role
  const credentials = {
    "field-operator": {
      username: "operator@wastewater.com",
      password: "operator123"
    },
    "field-collector": {
      username: "collector@wastewater.com",
      password: "collector123"
    },
    developer: {
      username: "developer@wastewater.com",
      password: "developer123"
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    // Trim and normalize inputs
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // Check credentials against all roles
    for (const [role, creds] of Object.entries(credentials)) {
      if (
        trimmedUsername === creds.username.toLowerCase() &&
        trimmedPassword === creds.password
      ) {
        onLogin(role);
        return;
      }
    }

    setError("Invalid credentials. Please try again.");
  };

  // Role selector view
  if (!selectedRole) {
    return (
      <div className="login-container">
        <div className="role-selection-box">
          <h1 className="login-title">WASTEWATER GIS</h1>
          <h2 className="role-prompt">Who are you?</h2>
          <p className="role-subtitle">Please select your role to continue</p>

          <div className="role-buttons">
            <button
              className="role-select-btn role-btn-operator"
              onClick={() => setSelectedRole("field-operator")}
            >
              <span className="role-icon">👤</span>
              <span className="role-name">Field Operator</span>
            </button>

            <button
              className="role-select-btn role-btn-collector"
              onClick={() => setSelectedRole("field-collector")}
            >
              <span className="role-icon">📋</span>
              <span className="role-name">Field Collector</span>
            </button>

            <button
              className="role-select-btn role-btn-developer"
              onClick={() => setSelectedRole("developer")}
            >
              <span className="role-icon">💻</span>
              <span className="role-name">Developer</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login view
  return (
    <div className="login-container">
      <div className="login-box">
        <button
          className="back-button"
          onClick={() => {
            setSelectedRole(null);
            setUsername("");
            setPassword("");
            setError("");
          }}
        >
          ← Back
        </button>

        <h1 className="login-title">WASTEWATER GIS</h1>

        <form onSubmit={handleLogin} className="login-form">
          <h2>Login as {selectedRole.replace("-", " ")}</h2>

          <div className="form-group">
            <label htmlFor="username">Email:</label>
            <input
              id="username"
              type="email"
              placeholder="Enter email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-button">
            Sign In
          </button>

          {error && <p className="error-message">{error}</p>}
        </form>

        <div className="credentials-info">
          <h3>Your Credentials:</h3>
          <div className="role-cred">
            <strong>Email:</strong>
            <p>{credentials[selectedRole].username}</p>
          </div>
          <div className="role-cred">
            <strong>Password:</strong>
            <p>{credentials[selectedRole].password}</p>
          </div>
        </div>
      </div>
    </div>
  );
}