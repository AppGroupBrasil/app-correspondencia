export default function DashboardResponsavelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // AJUSTES:
    // 1. w-full: Garante que o container ocupe 100% da largura do dispositivo (evita encolhimento).
    // 2. overflow-x-hidden: Previne rolagem lateral acidental no celular se algum filho estourar a largura.
    <div className="min-h-screen w-full bg-gray-50 overflow-x-hidden">
      {children}
    </div>
  );
}