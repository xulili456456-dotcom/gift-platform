import { useEffect } from 'react';

export default function AdminRedirect() {
  useEffect(() => {
    window.location.href = '/admin-panel';
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <p className="text-text-muted">跳转到管理后台...</p>
    </div>
  );
}
