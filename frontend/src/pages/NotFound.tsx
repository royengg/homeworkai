import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>404</h1>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Sorry, that page doesn’t exist.
      </p>
      <Link
        to="/dashboard"
        style={{
          padding: '0.5rem 1rem',
          background: '#000',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '0.375rem',
        }}
      >
        Back to Workspace
      </Link>
    </div>
  );
}