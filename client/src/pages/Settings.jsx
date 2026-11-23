import { useTheme } from "../context/ThemeContext";

const Settings = () => {
  const { density, setDensity } = useTheme();

  return (
    <div className="page-grid">
      <h2>Settings</h2>
      <div className="panel">
        <label>Interface Density</label>
        <select value={density} onChange={(e) => setDensity(e.target.value)}>
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
        </select>
      </div>
    </div>
  );
};

export default Settings;
