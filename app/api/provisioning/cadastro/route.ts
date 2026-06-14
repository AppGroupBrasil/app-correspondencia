// Receiver do push de cadastro da central (Fase 2 SSO) no path irmão do
// provisionamento de usuário. O handler real vive em /api/cadastro; este
// arquivo apenas o reexpõe. Os route segment config (runtime/dynamic) precisam
// ser literais estáticos (o Next não aceita reexport deles), por isso são
// redeclarados localmente.
import { POST as cadastroPOST } from '../../cadastro/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = cadastroPOST;
