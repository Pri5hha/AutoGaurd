import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ShieldMark from "../components/ShieldMark";

const roles = ["System Admin", "Senior Auditor", "Auditor", "Analyst", "Read-Only"];

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("senior@autoguard.local");
  const [password, setPassword] = useState("Password@123");
  const [selectedRole, setSelectedRole] = useState("Senior Auditor");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="row" style={{ justifyContent: "center" }}>
          <ShieldMark />
          <h1>AUTOGUARD</h1>
        </div>
        <p className="muted tiny" style={{ textAlign: "center", margin: 0 }}>
          AI-Powered Admissions Anomaly Auditing Console
        </p>

        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <label>Role</label>
        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
          {roles.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>

        {error ? <div className="badge high">{error}</div> : null}
        <button className="btn btn-danger" type="submit">ENTER CONSOLE</button>
      </form>
    </div>
  );
};

export default Login;
