import React, { createContext, useContext, useState, useEffect } from 'react';

import jwt_decode from 'jwt-decode';

interface AuthContextType {
    token: string | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    rol: 'admin' | 'guardia' | 'profesor' | 'lectura' | null;
    cursosProfesor: number[];
    currentUser: string;
    login: (token: string, refreshToken?: string) => void;
    logout: () => void;
}

function decodeJwtPayload(token: string): Record<string, any> {
    try {
        return jwt_decode<any>(token);
    } catch (e) {
        console.error("AuthContext Decode error:", e);
        return {};
    }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));

    const payload = token ? decodeJwtPayload(token) : {};
    const isAdmin: boolean = payload.rol === 'admin';
    const rol: 'admin' | 'guardia' | 'profesor' | 'lectura' | null = payload.rol || null;
    const currentUser: string = payload.username || '';
    const cursosProfesor: number[] = payload.cursos_profesor || [];

    useEffect(() => {
        const syncToken = () => {
            setToken(localStorage.getItem('accessToken'));
        };
        window.addEventListener('storage', syncToken);
        return () => window.removeEventListener('storage', syncToken);
    }, []);

    const login = (newToken: string, refreshToken?: string) => {
        localStorage.setItem('accessToken', newToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setToken(null);
    };

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ token, isAuthenticated, isAdmin, rol, currentUser, cursosProfesor, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
