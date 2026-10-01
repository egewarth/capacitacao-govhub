// Adaptador do Firebase (login Google + Firestore) para a loja de progresso.
// O SDK só é baixado quando há configuração. Sem configuração, ou se o CDN falhar,
// criarNuvem devolve null e o site segue com o progresso só no navegador.
const VERSAO = '12.19.0';
const CDN = `https://www.gstatic.com/firebasejs/${VERSAO}/`;

const normalizar = (dados) => ({
  feitos: (dados && dados.feitos) || {},
  ultimaAula: (dados && dados.ultimaAula) || null,
});

export async function criarNuvem(config) {
  if (!config || !config.apiKey || !config.projectId) return null;
  try {
    const [app, auth, fs] = await Promise.all([
      import(CDN + 'firebase-app.js'),
      import(CDN + 'firebase-auth.js'),
      import(CDN + 'firebase-firestore.js'),
    ]);
    const firebase = app.initializeApp(config);
    const autenticacao = auth.getAuth(firebase);
    const banco = fs.getFirestore(firebase);
    const documento = (uid) => fs.doc(banco, 'progresso', uid);

    return {
      aoMudarUsuario(cb) {
        auth.onAuthStateChanged(autenticacao, (u) => cb(u ? {
          uid: u.uid,
          nome: u.displayName || u.email || 'Conta Google',
          email: u.email || null,
          foto: u.photoURL || null,
        } : null));
      },
      entrar: () => auth.signInWithPopup(autenticacao, new auth.GoogleAuthProvider()),
      sair: () => auth.signOut(autenticacao),
      async ler(uid) {
        const snap = await fs.getDoc(documento(uid));
        return snap.exists() ? normalizar(snap.data()) : null;
      },
      gravarTudo: (uid, { feitos, ultimaAula }) => fs.setDoc(documento(uid), {
        feitos, ultimaAula: ultimaAula || null, atualizadoEm: fs.serverTimestamp(),
      }),
      // Um campo por aula (feitos.<id>), numa única escrita: duas aulas marcadas ao mesmo
      // tempo em dispositivos diferentes não se sobrescrevem.
      marcar(uid, ids, valor) {
        const campos = [];
        for (const id of ids) campos.push(new fs.FieldPath('feitos', id), valor ? true : fs.deleteField());
        return fs.updateDoc(documento(uid), ...campos, 'atualizadoEm', fs.serverTimestamp());
      },
      gravarUltimaAula: (uid, ultimaAula) => fs.updateDoc(documento(uid),
        'ultimaAula', ultimaAula, 'atualizadoEm', fs.serverTimestamp()),
      ouvir: (uid, cb, erro) => fs.onSnapshot(documento(uid),
        (snap) => cb(normalizar(snap.exists() ? snap.data() : null)), erro),
    };
  } catch (e) {
    console.warn('Firebase indisponível; o progresso fica só neste navegador.', e);
    return null;
  }
}
