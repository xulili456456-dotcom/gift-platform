import { useEffect } from 'react';

export default function AdminRedirect() {
  useEffect(() => {
    window.location.href = '/admin/dashboard';
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <p className="text-text-muted">Redirecting to admin panel...</p>
    </div>
  );
}
