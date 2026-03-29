'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth, db } from '@/app/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import Image from 'next/image'

import { Browser } from '@capacitor/browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string|undefined>(undefined)
  const [modalEsqueciSenha, setModalEsqueciSenha] = useState(false)
  const [emailRecuperacao, setEmailRecuperacao] = useState('')
  const [loadingRecuperacao, setLoadingRecuperacao] = useState(false)

  const demo = process.env.NEXT_PUBLIC_DEMO === 'true'

  // ✅ Função para abrir o WhatsApp
  const abrirWhatsApp = async () => {
    try {
      await Browser.open({ url: `https://wa.me/${process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP || '5581999618516'}` })
    } catch {
      window.open(`https://wa.me/${process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP || '5581999618516'}`, '_blank', 'noopener,noreferrer')
    }
  }

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(undefined)
    setLoading(true)
    try {
      if (demo) {
        router.push('/dashboard-responsavel')
        return
      }

      // 1. Login Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, senha)
      const uid = userCredential.user.uid

      // 2. Dados Firestore
      const userDoc = await getDoc(doc(db, 'users', uid))

      if (!userDoc.exists()) {
        setErro('Usuário não encontrado no sistema')
        await auth.signOut()
        return
      }

      const userData = userDoc.data()
      const role = userData.role || ''
      const ativo = userData.ativo !== false 
      const aprovado = userData.aprovado !== false 

      // 3. Verificações
      if (role === 'morador') {
        if (!aprovado) {
          setErro('Seu cadastro ainda não foi aprovado pelo responsável')
          await auth.signOut()
          return
        }
        if (!ativo) {
          setErro('Sua conta está inativa. Entre em contato com o responsável')
          await auth.signOut()
          return
        }
      }

      // 4. Redirecionamento
      switch (role) {
        case 'morador': router.push('/dashboard-morador'); break
        case 'responsavel': router.push('/dashboard-responsavel'); break
        case 'porteiro': router.push('/dashboard-porteiro'); break
        case 'adminMaster': router.push('/dashboard-master'); break
        case 'admin': router.push('/dashboard-admin'); break
        default:
          setErro('Perfil de usuário não reconhecido')
          await auth.signOut()
      }

    } catch (e: any) {
      console.error('Erro ao fazer login:', e, 'Code:', e?.code, 'Message:', e?.message)
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {     
        setErro('Email ou senha incorretos')
      } else if (e.code === 'auth/too-many-requests') {
        setErro('Muitas tentativas. Tente novamente mais tarde')
      } else if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions')) {
        setErro('Erro de permissão ao acessar dados. Verifique as regras do Firestore.')
      } else {
        setErro(`Erro ao fazer login: ${e.code || e.message || 'desconhecido'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const recuperarSenha = async () => {
    if (!emailRecuperacao.trim() || !emailRecuperacao.includes('@')) {
      alert('Digite um email válido')
      return
    }
    try {
      setLoadingRecuperacao(true)
      await sendPasswordResetEmail(auth as any, emailRecuperacao)
      alert('✅ Email de recuperação enviado!\n\nVerifique sua caixa de entrada e spam.')
      setModalEsqueciSenha(false)
      setEmailRecuperacao('')
    } catch (err: any) {
      console.error('Erro ao enviar email:', err)
      if (err.code === 'auth/user-not-found') {
        alert('Email não encontrado')
      } else {
        alert('Erro ao enviar email de recuperação')
      }
    } finally {
      setLoadingRecuperacao(false)
    }
  }

  return (
    // ✅ AJUSTE CRÍTICO: 
    // - min-h-[100dvh]: Garante altura total correta em navegadores mobile (barra de endereço).
    // - paddingTop env(...): Protege contra o notch do iPhone.
    <div 
      className="bg-gradient-to-br from-green-50 to-green-100 flex justify-center py-10 px-4 sm:px-6 lg:px-8 overflow-y-auto w-full"
      style={{ 
        minHeight: '100dvh',
        paddingTop: 'max(2.5rem, env(safe-area-inset-top))' 
      }}
    >
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 my-auto">
        
        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo-app-correspondencia.png"
              alt="Logo Correspondências"
              width={120}
              height={120}
              className="object-contain"
              priority // Carregamento prioritário para o logo não "piscar"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">APP CORRESPONDÊNCIA</h1>
          <p className="text-gray-600">Sistema de Gestão de Correspondência</p>
        </div>

        {/* Avisos */}
        {demo && (
          <div className="text-sm p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            Modo DEMO ativo.
          </div>
        )}
        {erro && (
          <div className="text-sm p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {erro}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            {/* AJUSTE: text-base evita zoom automático no iPhone ao clicar no input */}
            <input
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <button
                type="button"
                onClick={() => setModalEsqueciSenha(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Esqueci a senha
              </button>
            </div>
            <div className="relative">
              {/* AJUSTE: text-base evita zoom automático no iPhone */}
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 text-base focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
              >
                {mostrarSenha ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary-500 text-white py-3 rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 transition active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Divisor */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">ou</span>
          </div>
        </div>

        {/* Área de Botões Secundários */}
        <div className="flex flex-col gap-3">
            <button
            onClick={() => router.push('/cadastro-condominio')}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 text-white py-3 rounded-lg font-medium hover:bg-primary-600 transition active:scale-[0.98]"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            CADASTRAR CONDOMÍNIO
            </button>

            <button
            onClick={() => router.push('/cadastro-morador')}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 text-white py-3 rounded-lg font-medium hover:bg-primary-600 transition active:scale-[0.98]"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            CADASTRO DO MORADOR
            </button>

            <button
            onClick={() => router.push('/')}
            type="button"
            className="w-full flex items-center justify-center gap-2 bg-white text-[#057321] border-2 border-[#057321] py-3 rounded-lg font-bold hover:bg-green-50 transition active:scale-[0.98]"
            >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            CONHEÇA O SISTEMA
            </button>
        </div>

      </div>

      {/* Modal Esqueci a Senha */}
      {modalEsqueciSenha && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Recuperar Senha</h3>
              <button
                onClick={() => {
                  setModalEsqueciSenha(false)
                  setEmailRecuperacao('')
                }}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Digite seu email e enviaremos um link para redefinir sua senha.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                {/* AJUSTE: text-base evita zoom no iPhone */}
                <input
                  type="email"
                  value={emailRecuperacao}
                  onChange={(e) => setEmailRecuperacao(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setModalEsqueciSenha(false)
                    setEmailRecuperacao('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={recuperarSenha}
                  disabled={loadingRecuperacao}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"        
                >
                  {loadingRecuperacao ? 'Enviando...' : 'Enviar Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}