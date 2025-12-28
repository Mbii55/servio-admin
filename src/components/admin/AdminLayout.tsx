// src/components/admin/AdminLayout.tsx
"use client";

import { useState, ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AdminLayoutProps {
    children: ReactNode;
    title?: string;
    description?: string;
}

export const AdminLayout = ({
    children,
    title = "Dashboard",
    description
}: AdminLayoutProps) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar for desktop - Reduced height */}
            <aside className="hidden lg:block lg:flex-shrink-0 lg:w-64">
                <div className="h-[calc(100vh-1rem)] mt-2 ml-2 mr-1 rounded-2xl overflow-hidden bg-gray-900">
                    <Sidebar />
                </div>
            </aside>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
                </div>
            )}

            {/* Mobile sidebar - Reduced height */}
            <aside
                className={`
                    fixed inset-y-2 left-2 z-50 w-64 h-[calc(100vh-1rem)] transform transition-transform duration-300 ease-in-out lg:hidden
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="h-full rounded-2xl overflow-hidden bg-gray-900">
                    <Sidebar />
                </div>
            </aside>

            {/* Main content area */}
            <div className="flex flex-col flex-1 w-0 overflow-hidden">
                {/* Header */}
                <Header 
                    title={title} 
                    description={description}
                    onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
                />

                {/* Main content */}
                <main className="flex-1 overflow-y-auto bg-gray-50">
                    <div className="p-4 sm:p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>

            {/* Hide scrollbar globally */}
            <style jsx global>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};