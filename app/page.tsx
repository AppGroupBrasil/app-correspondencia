'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// ==================== HEADER ====================
function LandingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsMobileMenuOpen(false)
    }
  }

  return (
    <header className="w-full z-50 bg-[#057321] py-4 shadow-sm sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <Image
            src="/logo-app-correspondencia.png"
            alt="App Correspondência"
            width={56}
            height={56}
            className="h-14 md:h-20 w-auto transition-all duration-300"
          />
          <span className="font-bold text-lg sm:text-xl md:text-4xl tracking-tight transition-all duration-300 text-white">
            App Correspondência
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollToSection('como-funciona')} className="text-white/80 hover:text-white transition-colors text-sm font-medium cursor-pointer">Como Funciona</button>
          <button onClick={() => scrollToSection('demonstracao')} className="text-white/80 hover:text-white transition-colors text-sm font-medium cursor-pointer">Tour Visual</button>
          <button onClick={() => scrollToSection('funcoes')} className="text-white/80 hover:text-white transition-colors text-sm font-medium cursor-pointer">Funcionalidades</button>
          <button onClick={() => scrollToSection('precos')} className="text-white/80 hover:text-white transition-colors text-sm font-medium cursor-pointer">Preços</button>
          <button onClick={() => scrollToSection('contato')} className="text-white/80 hover:text-white transition-colors text-sm font-medium cursor-pointer">Contato</button>
          <Link
            href="/login"
            className="ml-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-[#057321] font-bold text-sm hover:bg-gray-100 transition-colors shadow-md"
          >
            Acessar Plataforma
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-white"
          aria-label="Abrir menu"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-100 p-4 flex flex-col gap-3 md:hidden z-50">
          <button onClick={() => scrollToSection('como-funciona')} className="text-gray-700 hover:text-[#057321] transition-colors text-sm font-medium py-2 text-left cursor-pointer">Como Funciona</button>
          <button onClick={() => scrollToSection('demonstracao')} className="text-gray-700 hover:text-[#057321] transition-colors text-sm font-medium py-2 text-left cursor-pointer">Tour Visual</button>
          <button onClick={() => scrollToSection('funcoes')} className="text-gray-700 hover:text-[#057321] transition-colors text-sm font-medium py-2 text-left cursor-pointer">Funcionalidades</button>
          <button onClick={() => scrollToSection('precos')} className="text-gray-700 hover:text-[#057321] transition-colors text-sm font-medium py-2 text-left cursor-pointer">Preços</button>
          <button onClick={() => scrollToSection('contato')} className="text-gray-700 hover:text-[#057321] transition-colors text-sm font-medium py-2 text-left cursor-pointer">Contato</button>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#057321] text-white font-bold text-sm hover:bg-[#045a1a] transition-colors mt-2"
          >
            Acessar Plataforma
          </Link>
        </div>
      )}
    </header>
  )
}

// ==================== HERO ====================
function Hero() {
  return (
    <section className="relative flex items-center pt-10 pb-10 bg-gradient-to-br from-[#057321] to-green-800 overflow-hidden">
      <div className="absolute top-20 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#25D366]/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid lg:grid-cols-2 gap-4 items-center py-2 overflow-hidden">
        <div className="space-y-4 text-center lg:text-left">
          <h1 className="text-[1.65rem] sm:text-4xl md:text-5xl lg:text-7xl font-extrabold text-white leading-[1.5] tracking-tight">
            Gestão de<br />
            <span className="text-[#25D366] break-all">Correspondências</span><br />
            <span className="block mt-2 sm:mt-4">via WhatsApp</span>
          </h1>

          <p className="text-sm sm:text-base md:text-xl text-green-50 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Simplifique a vida de síndicos, porteiros e moradores com avisos automáticos, fotos de encomendas e controle total na palma da mão.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-white hover:bg-gray-100 text-[#057321] font-bold px-6 sm:px-8 h-12 sm:h-14 text-base sm:text-lg shadow-lg shadow-white/20 w-full sm:w-auto rounded-lg transition-colors"
            >
              Acessar Plataforma
              <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
            <button
              className="inline-flex items-center justify-center bg-white/10 border border-white/20 text-white hover:bg-white/20 h-12 sm:h-14 text-base sm:text-lg w-full sm:w-auto gap-2 px-5 sm:px-6 rounded-lg transition-colors"
              onClick={() => document.getElementById('demonstracao')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Conheça o Sistema
            </button>
          </div>

          <div className="pt-4 sm:pt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-white/80 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <svg className="text-[#25D366] h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Sem instalação complexa</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="text-[#25D366] h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Suporte humanizado</span>
            </div>
          </div>
        </div>

        <div className="relative lg:h-[550px] flex items-center justify-center">
          <div className="relative w-[240px] md:w-[300px]">
            <img
              src="/images/landing/mockup_mobile_real.png"
              alt="App Correspondência Mobile"
              className="w-full h-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-1/4 -right-8 bg-white p-4 rounded-xl shadow-xl z-30 w-48 animate-bounce border border-gray-100 hidden md:block" style={{ animationDuration: '3s' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-[#057321]">📦</div>
                <div>
                  <p className="text-xs font-bold text-gray-800">Nova Encomenda</p>
                  <p className="text-[10px] text-gray-500">Agora mesmo</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">Sua encomenda chegou na portaria!</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ==================== HOW IT WORKS ====================
function HowItWorks() {
  const steps = [
    { icon: '📦', title: '1. Chegada', description: 'O porteiro registra a encomenda, tira uma foto e gera um protocolo em segundos.' },
    { icon: '📲', title: '2. Notificação', description: 'O sistema envia automaticamente um aviso no WhatsApp do morador com a foto.' },
    { icon: '🔐', title: '3. Retirada', description: 'O morador vai à portaria e apresenta seu documento ou QR Code exclusivo.' },
    { icon: '✅', title: '4. Registro', description: 'O porteiro confirma a entrega e o sistema armazena a assinatura digital.' }
  ]

  return (
    <section id="como-funciona" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#057321] font-semibold tracking-wider uppercase text-sm">Passo a Passo</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">Simples, Rápido e Seguro</h2>
          <p className="text-lg text-gray-600">Entenda como o fluxo de correspondências funciona na prática.</p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0"></div>
          <div className="grid md:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-white border-4 border-green-50 rounded-full flex items-center justify-center text-[#057321] mb-6 shadow-sm group-hover:border-[#057321] transition-colors duration-300 relative">
                  <span className="text-3xl">{step.icon}</span>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#25D366] text-white rounded-full flex items-center justify-center font-bold text-sm border-2 border-white">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ==================== SCREENSHOTS CAROUSEL ====================
function ScreenshotsCarousel() {
  const screenshots = [
    {
      id: 'morador', title: 'Painel do Morador', description: 'Acompanhe suas encomendas em tempo real, receba notificações instantâneas e autorize retiradas com total segurança.',
      image: '/images/landing/morador.png', role: 'Morador', color: 'from-violet-500 to-purple-600',
      highlights: ['Rastreio em tempo real', 'Notificações push', 'Autorização digital']
    },
    {
      id: 'portaria', title: 'Painel da Portaria', description: 'Registro ágil de encomendas com leitura de código de barras, controle de retiradas e notificações automáticas para moradores.',
      image: '/images/landing/portaria.png', role: 'Porteiro', color: 'from-amber-500 to-orange-600',
      highlights: ['Registro em segundos', 'Controle de retiradas', 'Notificação automática']
    },
    {
      id: 'sindico', title: 'Painel do Síndico', description: 'Visão executiva do condomínio com métricas, indicadores de performance e gestão completa de correspondências.',
      image: '/images/landing/sindico.png', role: 'Síndico', color: 'from-blue-500 to-indigo-600',
      highlights: ['Métricas e KPIs', 'Aprovações rápidas', 'Visão gerencial']
    }
  ]

  const [activeIndex, setActiveIndex] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const activeItem = screenshots[activeIndex]

  const goTo = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  const goNext = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % screenshots.length)
  }, [])

  useEffect(() => {
    if (!autoPlay) return
    const interval = setInterval(goNext, 5000)
    return () => clearInterval(interval)
  }, [autoPlay, goNext])

  return (
    <section id="demonstracao" className="relative py-28 md:py-36 overflow-hidden" onMouseEnter={() => setAutoPlay(false)} onMouseLeave={() => setAutoPlay(true)}>
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
            <span className="text-emerald-400 font-medium text-sm tracking-wide">🖥️ Tour Visual Interativo</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-5 leading-tight">
            Conheça o Sistema <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">por Dentro</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Explore cada tela e descubra como a gestão de correspondências pode ser simples, eficiente e automatizada.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-12 md:mb-16">
          <div className="inline-flex flex-wrap justify-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            {screenshots.map((item, index) => (
              <button
                key={item.id}
                onClick={() => goTo(index)}
                className={`relative flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                  index === activeIndex ? 'text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {index === activeIndex && <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${item.color} opacity-90`} />}
                <span className="relative">{item.role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-2 order-2 lg:order-1 space-y-6">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${activeItem.color} shadow-lg`}>
                <span className="text-white text-xl">{activeItem.role === 'Morador' ? '👤' : activeItem.role === 'Porteiro' ? '🛡️' : '📊'}</span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Perfil</span>
                <p className="text-white font-bold text-lg leading-tight">{activeItem.role}</p>
              </div>
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">{activeItem.title}</h3>
              <p className="text-gray-400 text-base md:text-lg leading-relaxed">{activeItem.description}</p>
            </div>
            <div className="space-y-3 pt-2">
              {activeItem.highlights.map((highlight, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${activeItem.color} flex items-center justify-center opacity-80`}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-gray-300 text-sm md:text-base font-medium">{highlight}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex gap-1.5">
                {screenshots.map((_, i) => (
                  <button key={i} onClick={() => goTo(i)} className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${i === activeIndex ? `w-8 bg-gradient-to-r ${activeItem.color}` : 'w-1.5 bg-gray-600 hover:bg-gray-500'}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-3 order-1 lg:order-2 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
              <img src={activeItem.image} alt={activeItem.title} className="w-full h-auto" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 md:mt-20 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: 'Mensagens', value: 'Ilimitadas' },
            { label: 'Apartamentos', value: 'Ilimitados' },
            { label: 'Sem surpresas', value: 'Preço fixo!' },
            { label: 'Tudo documentado', value: 'Registro completo!' }
          ].map((stat, i) => (
            <div key={i} className="text-center p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-xl md:text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs md:text-sm text-gray-500 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ==================== SYSTEM FUNCTIONS ====================
function SystemFunctions() {
  const functions = [
    {
      id: 'cadastro-condominio', label: 'Cadastro do Condomínio', icon: '🏢',
      title: 'Cadastro do Condomínio',
      description: 'Cadastre seu condomínio de forma simples e rápida. Basta informar o CNPJ e os dados básicos para liberar o acesso ao sistema imediatamente, sem burocracia.',
      gradient: 'from-emerald-500 to-green-600', bgGradient: 'from-emerald-50 to-green-50', accentText: 'text-emerald-600',
      steps: ['CADASTRE O NOME E O CNPJ DO CONDOMÍNIO', 'E-MAIL E SENHA', 'WHATSAPP', 'Cadastro finalizado. Teste por 7 dias, sem compromisso!']
    },
    {
      id: 'cadastro-morador', label: 'Cadastro do Morador', icon: '👤',
      title: 'Cadastro do Morador',
      description: 'O próprio morador pode realizar seu cadastro utilizando o CNPJ do condomínio, QR Code, Link de convite ou através de planilha em lote. Todos os cadastros precisam ser ativados pelo síndico.',
      gradient: 'from-violet-500 to-purple-600', bgGradient: 'from-violet-50 to-purple-50', accentText: 'text-violet-600',
      steps: ['CADASTRE NOME, E-MAIL E WHATSAPP.', 'ESCOLHA SEU PERFIL: PROPRIETÁRIO, LOCATÁRIO, ETC.', 'BLOCO E APARTAMENTO', 'AGUARDE A ATIVAÇÃO PELO SÍNDICO OU RESPONSÁVEL.']
    },
    {
      id: 'funcoes-sindico', label: 'Síndico / Responsável', icon: '⚙️',
      title: 'Gestão Total na Palma da Mão',
      description: 'Acompanhe métricas, gerencie cadastros de moradores e porteiros, visualize relatórios de entregas em tempo real. Gere relatórios, cadastre mensagens personalizadas, emita segunda via de avisos e recibos.',
      gradient: 'from-blue-500 to-indigo-600', bgGradient: 'from-blue-50 to-indigo-50', accentText: 'text-blue-600',
      features: ['Dashboard com métricas em tempo real', 'Relatórios detalhados de entregas', 'Gestão completa de moradores e porteiros', 'Mensagens personalizadas para portaria', 'Segunda via de avisos e recibos']
    },
    {
      id: 'painel-porteiro', label: 'Painel do Porteiro', icon: '🛡️',
      title: 'Agilidade na Portaria',
      description: 'Ferramentas otimizadas para o dia a dia da portaria. Registre encomendas com foto em segundos e notifique os moradores automaticamente via WhatsApp.',
      gradient: 'from-amber-500 to-orange-600', bgGradient: 'from-amber-50 to-orange-50', accentText: 'text-amber-600',
      steps: ['AVISO DE CORRESPONDÊNCIA COMPLETO (com foto, QR Code).', 'AVISOS RÁPIDOS (com protocolo e foto).', 'REGISTRAR RETIRADA (foto, assinatura digital).', 'SEGUNDA VIA DOS AVISOS E RECIBOS.']
    },
    {
      id: 'painel-morador', label: 'Painel do Morador', icon: '🏠',
      title: 'Comodidade para Você',
      description: 'Acompanhe suas encomendas de onde estiver. Receba avisos com foto, autorize retiradas por terceiros e tenha todo o histórico organizado.',
      gradient: 'from-rose-500 to-pink-600', bgGradient: 'from-rose-50 to-pink-50', accentText: 'text-rose-600',
      features: ['Notificações com foto da encomenda', 'Histórico completo de recebimentos', 'QR Code para retirada segura', 'Autorização de retirada por terceiros']
    }
  ]

  const [activeTab, setActiveTab] = useState(functions[0].id)
  const activeFunction = functions.find(f => f.id === activeTab) || functions[0]

  return (
    <section id="funcoes" className="py-28 bg-gradient-to-b from-gray-50 via-white to-gray-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
            <span className="text-emerald-700 font-semibold text-sm tracking-wide">✨ Funcionalidades</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mt-2 mb-5 leading-tight">
            Conheça as Funções <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-500">do Sistema</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Explore cada módulo e veja como nossa plataforma atende a todas as necessidades do seu condomínio.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch">
          {/* Tabs */}
          <div className="lg:w-[280px] xl:w-[320px] shrink-0">
            <div className="lg:sticky lg:top-24 space-y-2">
              {functions.map((func) => {
                const isActive = activeTab === func.id
                return (
                  <button
                    key={func.id}
                    onClick={() => setActiveTab(func.id)}
                    className={`group w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl text-left transition-all duration-300 ${
                      isActive ? `bg-gradient-to-r ${func.bgGradient} border shadow-lg shadow-gray-200/50` : 'bg-white border border-transparent hover:border-gray-200 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isActive ? `bg-gradient-to-br ${func.gradient} text-white shadow-lg` : 'bg-gray-100 text-gray-400'
                    }`}>
                      <span className="text-lg">{func.icon}</span>
                    </div>
                    <h3 className={`font-semibold text-[15px] leading-tight transition-colors ${isActive ? func.accentText : 'text-gray-700'}`}>
                      {func.label}
                    </h3>
                    {isActive && <svg className={`w-4 h-4 shrink-0 ml-auto ${func.accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
              <div className={`p-8 md:p-10 bg-gradient-to-br ${activeFunction.bgGradient}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeFunction.gradient} text-white flex items-center justify-center shadow-lg`}>
                    <span>{activeFunction.icon}</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900">{activeFunction.title}</h3>
                </div>
                <p className="text-gray-600 leading-relaxed text-[15px] md:text-base mb-8 max-w-2xl">{activeFunction.description}</p>

                {'steps' in activeFunction && activeFunction.steps ? (
                  <div className="space-y-4">
                    {activeFunction.steps.map((step: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-4">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${activeFunction.gradient} text-white flex items-center justify-center shrink-0 shadow-md font-bold text-sm`}>
                          {idx + 1}
                        </div>
                        <p className="font-medium text-gray-700 text-sm leading-relaxed pt-1.5">{step}</p>
                      </div>
                    ))}
                  </div>
                ) : 'features' in activeFunction && activeFunction.features ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {activeFunction.features.map((feature: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/80">
                        <svg className={`w-5 h-5 ${activeFunction.accentText} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-sm font-medium text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ==================== DOCUMENTS PREVIEW ====================
function DocumentsPreview() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Documentação Profissional e Segura</h2>
          <p className="text-lg text-gray-600">Garanta transparência total com comprovantes digitais detalhados gerados automaticamente.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="flex flex-col items-center group">
            <div className="relative w-full max-w-md bg-gray-100 rounded-xl overflow-hidden shadow-lg border border-gray-200 mb-6 transition-transform duration-300 group-hover:-translate-y-2">
              <img src="/images/landing/modelo_aviso.jpg" alt="Modelo de Aviso de Chegada" className="w-full h-auto" loading="lazy" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-[#057321]">📋</div>
              <h3 className="text-xl font-bold text-gray-900">Aviso de Chegada</h3>
            </div>
            <p className="text-gray-600 text-center max-w-sm">Notificação completa com dados do destinatário, local de retirada e QR Code.</p>
          </div>
          <div className="flex flex-col items-center group">
            <div className="relative w-full max-w-md bg-gray-100 rounded-xl overflow-hidden shadow-lg border border-gray-200 mb-6 transition-transform duration-300 group-hover:-translate-y-2">
              <img src="/images/landing/modelo_recibo.png" alt="Modelo de Recibo de Retirada" className="w-full h-auto" loading="lazy" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-[#057321]">🧾</div>
              <h3 className="text-xl font-bold text-gray-900">Recibo de Retirada</h3>
            </div>
            <p className="text-gray-600 text-center max-w-sm">Segurança jurídica com assinatura digital, foto do pacote, data/hora e QR Code.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ==================== PRICING ====================
function Pricing() {
  return (
    <section id="precos" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#057321] font-semibold tracking-wider uppercase text-sm">Planos e Preços</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">Simples, Transparente e Ilimitado</h2>
          <p className="text-lg text-gray-600">Escolha o plano ideal para o tamanho do seu condomínio.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
          {/* Plano Padrão */}
          <div className="w-full border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-2xl flex flex-col h-full">
            <div className="text-center pt-10 pb-8 border-b border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Condomínios até 299 Unidades</h3>
              <p className="text-gray-500 text-sm">Para condomínios pequeno e médio porte</p>
              <div className="mt-6 flex items-baseline justify-center gap-1">
                <span className="text-sm text-gray-500 font-medium">R$</span>
                <span className="text-5xl font-extrabold text-[#057321]">199</span>
                <span className="text-xl text-gray-500 font-medium">,00</span>
                <span className="text-gray-400 ml-2">/mês</span>
              </div>
            </div>
            <div className="p-8 flex-grow">
              <ul className="space-y-4">
                {['Até 299 Unidades', 'Envios Ilimitados de Notificações', 'Moradores Ilimitados', 'Porteiros Ilimitados', 'Armazenamento de Fotos Ilimitado', 'Suporte Prioritário via WhatsApp', 'Backup Automático Diário', 'Sem Taxa de Instalação'].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-[#057321]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-gray-700 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 bg-gray-50 border-t border-gray-100 mt-auto">
              <button onClick={() => window.open('https://wa.me/5511933284364?text=Ol%C3%A1!%20Gostaria%20de%20contratar%20o%20plano%20de%20R$%20199,00%20do%20App%20Correspond%C3%AAncia.', '_blank')} className="w-full h-12 text-lg font-bold shadow-md hover:shadow-lg transition-all bg-[#057321] hover:bg-[#045a1a] text-white rounded-lg">
                Contratar Agora
              </button>
            </div>
          </div>

          {/* Plano Grande Porte */}
          <div className="w-full border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-white rounded-2xl flex flex-col h-full">
            <div className="text-center pt-10 pb-8 border-b border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Condomínios acima de 300 Unidades</h3>
              <p className="text-gray-500 text-sm">Para condomínios de grande porte</p>
              <div className="mt-6 flex items-baseline justify-center gap-1">
                <span className="text-sm text-gray-500 font-medium">R$</span>
                <span className="text-5xl font-extrabold text-[#057321]">299</span>
                <span className="text-xl text-gray-500 font-medium">,00</span>
                <span className="text-gray-400 ml-2">/mês</span>
              </div>
            </div>
            <div className="p-8 flex-grow">
              <ul className="space-y-4">
                {['Acima de 300 Unidades', 'Envios Ilimitados de Notificações', 'Moradores Ilimitados', 'Porteiros Ilimitados', 'Armazenamento de Fotos Ilimitado', 'Suporte Prioritário via WhatsApp', 'Backup Automático Diário', 'Sem Taxa de Instalação'].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-[#057321]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-gray-700 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 bg-gray-50 border-t border-gray-100 mt-auto">
              <button onClick={() => window.open('https://wa.me/5511933284364?text=Ol%C3%A1!%20Gostaria%20de%20contratar%20o%20plano%20de%20R$%20299,00%20para%20grandes%20condom%C3%ADnios.', '_blank')} className="w-full h-12 text-lg font-bold shadow-md hover:shadow-lg transition-all bg-[#057321] hover:bg-[#045a1a] text-white rounded-lg">
                Contratar Agora
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Precisa de uma solução personalizada?{' '}
            <a href="https://wa.me/5511933284364?text=Ol%C3%A1!%20Preciso%20de%20uma%20solu%C3%A7%C3%A3o%20personalizada." target="_blank" rel="noopener noreferrer" className="text-[#057321] font-semibold hover:underline">Fale conosco</a>.
          </p>
        </div>
      </div>
    </section>
  )
}

// ==================== FEATURES ====================
function Features() {
  const features = [
    { icon: '🏢', title: 'Para Síndicos', description: 'Controle total com dashboard de métricas, gestão de cadastros e relatórios completos para eliminar planilhas.' },
    { icon: '✅', title: 'Para Porteiros', description: 'Registre encomendas em segundos com foto e envie avisos automáticos. Mais agilidade e menos erros na portaria.' },
    { icon: '👥', title: 'Para Moradores', description: 'Receba notificações no WhatsApp com foto do pacote. Autorize vizinhos e acompanhe seu histórico de recebimentos.' }
  ]
  const differentials = [
    { icon: '📱', title: 'Notificações Multicanal', description: 'Avisos automáticos via WhatsApp, E-mail e App.' },
    { icon: '✍️', title: 'Registro de Retirada', description: 'Com foto, recibo e assinatura digital. Segurança jurídica.' },
    { icon: '🔒', title: 'Registro com Foto', description: 'O morador vê a foto do pacote antes de descer para buscar.' }
  ]

  return (
    <section id="perfis" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">A Solução Completa para seu Condomínio</h2>
          <p className="text-lg text-gray-600">Desenvolvido pensando em cada pessoa que interage com o sistema.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {features.map((f, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 group">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-white text-[#057321] border-2 border-[#057321] group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">{f.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
              <p className="text-gray-600 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 overflow-hidden relative">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Por que escolher o App Correspondência?</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {differentials.map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-[#057321] mb-4">
                  <span className="text-3xl">{item.icon}</span>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h4>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ==================== PRESENTATION SECTION ====================
function PresentationSection() {
  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-green-100 flex flex-col md:flex-row-reverse items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 pointer-events-none"></div>
          <div className="flex-1 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-[#057321] text-sm font-bold mb-4">
              <span>📑 Material Completo</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Apresentação do Sistema</h2>
            <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
              Baixe nossa apresentação completa em PDF e conheça todos os detalhes, funcionalidades e benefícios do App Correspondência.
            </p>
          </div>
          <div className="relative z-10 shrink-0">
            <a href="/apresentacao.pdf" target="_blank" rel="noopener noreferrer">
              <button className="bg-[#057321] hover:bg-[#045a1a] text-white font-bold text-lg h-16 px-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 rounded-lg flex items-center gap-2">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Ver Apresentação
              </button>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ==================== TRANSPARENCY SECTION ====================
function TransparencySection() {
  return (
    <section className="py-20 bg-green-50 border-t border-green-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-green-100 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 pointer-events-none"></div>
          <div className="flex-1 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-[#057321] text-sm font-bold mb-4">
              <span>🛡️ Segurança Jurídica</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Transparência Total</h2>
            <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
              Acreditamos na clareza e na confiança. Acesse nosso contrato de prestação de serviços, leia todas as cláusulas. Sem letras miúdas, sem fidelidade.
            </p>
          </div>
          <div className="relative z-10 shrink-0">
            <Link href="/contrato">
              <button className="bg-[#057321] hover:bg-[#045a1a] text-white font-bold text-lg h-16 px-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 rounded-lg flex items-center gap-2">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Acessar Contrato
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ==================== FOOTER ====================
function Footer() {
  return (
    <footer id="contato" className="bg-gray-900 text-gray-300 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <span className="font-bold text-2xl text-white tracking-tight mb-6 block">App Correspondência</span>
            <p className="text-gray-400 leading-relaxed max-w-sm mb-6">
              A solução definitiva para gestão de encomendas em condomínios. Segurança, agilidade e tecnologia para síndicos, porteiros e moradores.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Links Rápidos</h4>
            <ul className="space-y-3">
              <li><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="hover:text-[#057321] transition-colors">Início</a></li>
              <li><a href="#como-funciona" className="hover:text-[#057321] transition-colors">Como Funciona</a></li>
              <li><a href="#demonstracao" className="hover:text-[#057321] transition-colors">Tour Visual</a></li>
              <li><a href="#funcoes" className="hover:text-[#057321] transition-colors">Funcionalidades</a></li>
              <li><a href="#precos" className="hover:text-[#057321] transition-colors">Preços</a></li>
              <li><Link href="/login" className="hover:text-[#057321] transition-colors">Acessar Plataforma</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Contato</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-[#057321] mt-1">📞</span>
                <span>(11) 93328-4364</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#057321] mt-1">✉️</span>
                <span>contato@appcorrespondencia.com.br</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} App Correspondência. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}

// ==================== OUR SYSTEMS SECTION ====================
function OurSystemsSection() {
  const systems = [
    { name: 'Gestão e Limpeza', url: 'gestaoelimpeza.com.br', logo: '/images/landing/logo-gestao-limpeza.png' },
    { name: 'App Correspondência', url: 'appcorrespondencia.com.br', logo: '/images/landing/logo-app-correspondencia-icon.png' },
    { name: 'Portaria X', url: 'portariax.com.br', logo: '/images/landing/logo-portariax.png' },
    { name: 'Manutenção X', url: 'manutencaox.com.br', logo: '/images/landing/logo-manutencaox.png' },
  ]

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Nossos Sistemas</h2>
          <p className="text-lg text-[#057321] font-medium">Soluções completas para a gestão do seu condomínio</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {systems.map((system, i) => (
            <a
              key={i}
              href={`https://${system.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center group"
            >
              <div className="w-24 h-24 mb-5 flex items-center justify-center">
                <img src={system.logo} alt={system.name} className="w-full h-full object-contain rounded-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{system.name}</h3>
              <p className="text-sm text-[#057321] font-medium group-hover:underline">{system.url}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

// ==================== PARTNERSHIP SECTION ====================
function PartnershipSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Gostou dos nossos sistemas?
          </h2>
          <p className="text-xl md:text-2xl text-[#057321] font-semibold mb-10">
            Seja nosso sócio e tenha ganhos de até 50% em recorrência.
          </p>
          <div className="grid sm:grid-cols-3 gap-8 mb-10">
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-green-100 text-[#057321] flex items-center justify-center mx-auto mb-4 text-2xl">🚀</div>
              <p className="text-lg font-bold text-gray-900">1 Aplicativo novo lançado todo mês*</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-green-100 text-[#057321] flex items-center justify-center mx-auto mb-4 text-2xl">🎨</div>
              <p className="text-lg font-bold text-gray-900">1 Aplicativo 100% customizado ao seu gosto</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-green-100 text-[#057321] flex items-center justify-center mx-auto mb-4 text-2xl">💰</div>
              <p className="text-lg font-bold text-gray-900">Recorrência por toda vida</p>
            </div>
          </div>
          <a
            href="https://wa.me/5511933284364?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20a%20parceria."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Entre em contato e saiba mais
          </a>
        </div>
      </div>
    </section>
  )
}

// ==================== WHATSAPP BUTTON ====================
function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/5511933284364?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20App%20Correspond%C3%AAncia."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-300"
      aria-label="Falar no WhatsApp"
    >
      <svg className="w-8 h-8" fill="white" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    </a>
  )
}

// ==================== MAIN PAGE ====================
export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingHeader />
      <main>
        <Hero />
        <HowItWorks />
        <ScreenshotsCarousel />
        <SystemFunctions />
        <DocumentsPreview />
        <Pricing />
        <Features />
        <PresentationSection />
        <TransparencySection />
        <OurSystemsSection />
        <PartnershipSection />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
