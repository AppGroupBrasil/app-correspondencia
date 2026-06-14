// Receiver do push de cadastro da central (Fase 2 SSO) no path irmão do
// provisionamento de usuário (a central deriva WEBHOOK_URL .../provisioning/usuario
// -> .../provisioning/cadastro). Reexporta a mesma lógica de /api/cadastro.
export { runtime, dynamic, POST } from '../../cadastro/route';
