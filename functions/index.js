const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}
exports.transferirAcessoCondominio = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Não autenticado.");
  }

  const role = context.auth.token?.role;
  const isAdminMaster = role === "ADMIN_MASTER" || role === "adminMaster";
  if (!isAdminMaster) {
    throw new functions.https.HttpsError("permission-denied", "Sem permissão.");
  }

  const { condominioId, novoEmail } = data || {};
  if (!condominioId || !novoEmail) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "condominioId e novoEmail são obrigatórios."
    );
  }

  const ref = admin.firestore().collection("condominios").doc(condominioId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "Condomínio não encontrado.");
  }

  const { authUid } = snap.data() || {};
  if (!authUid) {
    throw new functions.https.HttpsError("failed-precondition", "Sem authUid no condomínio.");
  }

  await admin.auth().updateUser(authUid, { email: novoEmail, emailVerified: false });

  // derruba sessões
  await admin.auth().revokeRefreshTokens(authUid);

  // atualiza firestore
  await ref.update({
    emailLogin: novoEmail,
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });

  // gera link pro novo síndico definir senha
  const resetLink = await admin.auth().generatePasswordResetLink(novoEmail);

  return { ok: true, resetLink };
});