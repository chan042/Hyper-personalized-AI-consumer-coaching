"use client";

import { Menu, Bell } from 'lucide-react';

export default function Header() {
    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            backgroundColor: 'var(--background-light)'
        }}>
            <Menu color="var(--text-main)" size={24} />
            <h1 style={{
                color: 'var(--primary)',
                fontSize: '1.5rem',
                fontWeight: 'bold'
            }}>
                Duduk
            </h1>
            <Bell color="var(--text-main)" size={24} />
        </header>
    );
}
