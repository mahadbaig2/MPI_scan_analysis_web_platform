"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function hashPassword(password: string): string {
  // Simple hash for demo purposes (use bcrypt in production)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const stored = localStorage.getItem("cardioscan_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("cardioscan_user");
      }
    }
    setIsLoading(false);
  }, []);

  const signup = async (name: string, email: string, password: string) => {
    // Check if user already exists
    const users = JSON.parse(localStorage.getItem("cardioscan_users") || "{}");
    if (users[email]) {
      return { success: false, error: "An account with this email already exists" };
    }

    // Store user
    users[email] = {
      name,
      email,
      passwordHash: hashPassword(password),
    };
    localStorage.setItem("cardioscan_users", JSON.stringify(users));

    // Auto login
    const userData = { email, name };
    setUser(userData);
    localStorage.setItem("cardioscan_user", JSON.stringify(userData));

    return { success: true };
  };

  const login = async (email: string, password: string) => {
    const users = JSON.parse(localStorage.getItem("cardioscan_users") || "{}");
    const storedUser = users[email];

    if (!storedUser) {
      return { success: false, error: "No account found with this email" };
    }

    if (storedUser.passwordHash !== hashPassword(password)) {
      return { success: false, error: "Incorrect password" };
    }

    const userData = { email: storedUser.email, name: storedUser.name };
    setUser(userData);
    localStorage.setItem("cardioscan_user", JSON.stringify(userData));

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("cardioscan_user");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
