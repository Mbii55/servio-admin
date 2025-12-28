// src/components/admin/Header.tsx
"use client";

import { useAuth } from "../../context/AuthContext";

interface HeaderProps {
    title?: string;
    description?: string;
    onMenuClick?: () => void;
}

export const Header = ({
    title = "Dashboard",
    description,
    onMenuClick
}: HeaderProps) => {
    const { logout } = useAuth();

    return (
        <>
            <header className="header">
                <div className="header-content">
                    {/* Left side - Mobile menu + Title */}
                    <div className="header-left">
                        {/* Mobile menu button */}
                        {onMenuClick && (
                            <button
                                onClick={onMenuClick}
                                className="menu-button"
                                aria-label="Toggle menu"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M4 6h16M4 12h16M4 18h16"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </button>
                        )}

                        <div>
                            <h1 className="header-title">{title}</h1>
                            {description && (
                                <p className="header-description">{description}</p>
                            )}
                        </div>
                    </div>

                    {/* Right side - Logout button */}
                    <div className="header-right">
                        <button
                            onClick={logout}
                            className="logout-button"
                            aria-label="Sign out"
                        >
                            <svg className="logout-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path
                                    d="M13 3h3a2 2 0 012 2v10a2 2 0 01-2 2h-3M8 13l-5-5m0 0l5-5m-5 5h12"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <span className="logout-text">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            <style jsx>{`
        .header {
          background: linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%);
          border-bottom: 1px solid #E5E7EB;
          position: sticky;
          top: 0;
          z-index: 30;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .header-content {
          padding: 16px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          min-width: 0;
        }

        .header-title {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          background: linear-gradient(135deg, #111827 0%, #374151 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .header-description {
          margin: 4px 0 0;
          font-size: 13px;
          color: #6B7280;
          font-weight: 500;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logout-button {
          position: relative;
          padding: 10px 20px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%);
          color: #FFFFFF;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          font-weight: 700;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .logout-button:hover {
          background: linear-gradient(135deg, #EF4444 0%, #B91C1C 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
        }

        .logout-button:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
        }

        .logout-icon {
          flex-shrink: 0;
        }

        .logout-text {
          white-space: nowrap;
        }

        .menu-button {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: none;
          background: #F3F4F6;
          color: #6B7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .menu-button:hover {
          background: #E5E7EB;
          color: #111827;
        }

        @media (min-width: 768px) {
          .menu-button {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .header-content {
            padding: 12px 20px;
          }

          .header-title {
            font-size: 18px;
          }

          .header-description {
            font-size: 12px;
          }

          .logout-button {
            padding: 8px 16px;
            font-size: 13px;
          }

          .logout-text {
            display: none; /* Hide text on mobile, show only icon */
          }

          .logout-icon {
            margin: 0;
          }
        }

        @media (min-width: 768px) {
          .logout-text {
            display: inline;
          }
        }
      `}</style>
        </>
    );
};