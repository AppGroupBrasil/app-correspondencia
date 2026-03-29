export default function DashboardPorteiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-gray-50">
      {children}
    </section>
  );
}