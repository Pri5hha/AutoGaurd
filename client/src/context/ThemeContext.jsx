import { createContext, useContext, useMemo, useState } from "react";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [density, setDensity] = useState("comfortable");

  const value = useMemo(() => ({ density, setDensity }), [density]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
