import { createContext, useContext, useState } from "react";
import { USERS } from "../features/demo/data.js";
import { authService, profileService } from "../api/endpoints.js";
import { setAccessToken } from "../api/axios.js";

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";
const AuthContext = createContext(null);
const KEY = "brandshield.demo.identity.v2";
function initialUser() {
  if (!DEMO_MODE) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && USERS[saved.role]?.id === saved.id ? saved : null;
  } catch {
    return null;
  }
}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(initialUser);
  const [authError, setAuthError] = useState("");
  const remember = (value) => {
    if (DEMO_MODE) {
      try {
        if (value) localStorage.setItem(KEY, JSON.stringify(value));
        else localStorage.removeItem(KEY);
      } catch {
        throw new Error(
          "Browser storage is unavailable. Allow local storage to use the persistent demo.",
        );
      }
    }
    setUser(value);
    setAuthError("");
  };
  const login = async (
    { email, password, role = "Admin", name },
    register = false,
  ) => {
    if (DEMO_MODE) {
      remember({
        ...USERS[role],
        ...(register
          ? {
              name: name.trim(),
              email: email.trim(),
              initials: name
                .trim()
                .split(/\s+/)
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase(),
            }
          : {}),
      });
      return;
    }
    const result = await authService[register ? "register" : "login"]({
      email,
      password,
      ...(register ? { name } : {}),
    });
    if (!result.access_token || !result.user)
      throw new Error(
        "Invalid authentication response. Expected access_token and user.",
      );
    setAccessToken(result.access_token);
    remember(result.user);
  };
  const switchRole = (role) => {
    if (!DEMO_MODE || !USERS[role]) return;
    remember({ ...USERS[role] });
  };
  const logout = () => {
    setAccessToken(null);
    remember(null);
  };
  const updateProfile = async (values) => {
    if (
      !values.name?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email || "")
    )
      throw new Error("Enter a name and valid email.");
    const result = DEMO_MODE
      ? { ...user, ...values }
      : await profileService.update(values);
    remember({
      ...result,
      initials: result.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    });
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        switchRole,
        updateProfile,
        demo: DEMO_MODE,
        authError,
        setAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
