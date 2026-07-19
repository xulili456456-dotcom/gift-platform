import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
  return (
    <div style={{display:'flex', minHeight:'100vh', background:'#f2f2f7'}}>
      <AdminSidebar />
      <div style={{flex:1, marginLeft:200, overflow:'auto'}}>
        {children}
      </div>
    </div>
  );
}
