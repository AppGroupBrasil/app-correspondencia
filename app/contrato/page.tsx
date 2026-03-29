'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function ContratoPage() {
  const [formData, setFormData] = useState({
    nomeCondominio: '',
    cnpjCondominio: '',
    enderecoCondominio: '',
    bairroCondominio: '',
    cidadeCondominio: '',
    ufCondominio: '',
    cepCondominio: '',
    nomeResponsavel: '',
    cpfResponsavel: '',
    cargoResponsavel: '',
    emailResponsavel: '',
    telefoneResponsavel: '',
    planoEscolhido: '',
    concordaTermos: false,
    dataContrato: new Date().toISOString().split('T')[0],
  })

  const [enviado, setEnviado] = useState(false)
  const contratoRef = useRef<HTMLDivElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.planoEscolhido) {
      alert('Por favor, selecione um plano.')
      return
    }
    if (!formData.concordaTermos) {
      alert('Você precisa concordar com os termos do contrato.')
      return
    }
    setEnviado(true)

    const planoTexto = formData.planoEscolhido === 'padrao'
      ? 'Plano Padrão (até 299 unidades) - R$ 199,00/mês'
      : 'Plano Grande Porte (acima de 300 unidades) - R$ 299,00/mês'

    const mensagem = encodeURIComponent(
      `Olá! Gostaria de formalizar a contratação do App Correspondência.\n\n` +
      `📋 *Dados do Contratante:*\n` +
      `Condomínio: ${formData.nomeCondominio}\n` +
      `CNPJ: ${formData.cnpjCondominio}\n` +
      `Responsável: ${formData.nomeResponsavel}\n` +
      `CPF: ${formData.cpfResponsavel}\n` +
      `Cargo: ${formData.cargoResponsavel}\n` +
      `Email: ${formData.emailResponsavel}\n` +
      `Telefone: ${formData.telefoneResponsavel}\n` +
      `Endereço: ${formData.enderecoCondominio}, ${formData.bairroCondominio} - ${formData.cidadeCondominio}/${formData.ufCondominio} - CEP: ${formData.cepCondominio}\n\n` +
      `📦 *Plano Escolhido:* ${planoTexto}\n` +
      `📅 Data: ${formData.dataContrato}`
    )

    window.open(`https://wa.me/5511933284364?text=${mensagem}`, '_blank')
  }

  const planoValor = formData.planoEscolhido === 'padrao' ? 'R$ 199,00' : formData.planoEscolhido === 'grande' ? 'R$ 299,00' : '___________'
  const planoDescricao = formData.planoEscolhido === 'padrao'
    ? 'Condomínios até 299 Unidades – R$ 199,00/mês'
    : formData.planoEscolhido === 'grande'
      ? 'Condomínios acima de 300 Unidades – R$ 299,00/mês'
      : '___________'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Estilos de impressão */}
      <style jsx global>{`
        @media print {
          header, .no-print { display: none !important; }
          body, .min-h-screen { background: white !important; }
          .shadow-lg, .shadow-xl { box-shadow: none !important; }
          .rounded-2xl { border-radius: 0 !important; }
          .max-w-4xl { max-width: 100% !important; padding: 0 !important; }
          .mb-8 { margin-bottom: 1rem !important; }
          .py-12 { padding-top: 0 !important; padding-bottom: 0 !important; }
        }
      `}</style>

      {/* Header */}
      <header className="bg-[#057321] py-4 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-app-correspondencia.png" alt="App Correspondência" width={48} height={48} className="h-12 w-auto" />
            <span className="font-bold text-xl text-white">App Correspondência</span>
          </Link>
          <Link href="/" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
            ← Voltar ao site
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Título */}
        <div className="text-center mb-10 no-print">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-[#057321] text-sm font-bold mb-4">
            📄 Contrato Digital
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Contrato de Prestação de Serviços</h1>
          <p className="text-gray-500">Preencha os dados abaixo para gerar seu contrato digitalmente.</p>
        </div>

        {/* Seleção de Plano */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8 no-print">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-[#057321] text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            Escolha o Plano
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <label
              className={`relative flex flex-col p-6 rounded-xl border-2 cursor-pointer transition-all ${
                formData.planoEscolhido === 'padrao'
                  ? 'border-[#057321] bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="planoEscolhido"
                value="padrao"
                checked={formData.planoEscolhido === 'padrao'}
                onChange={handleChange}
                className="sr-only"
              />
              {formData.planoEscolhido === 'padrao' && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-[#057321] rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
              <span className="text-lg font-bold text-gray-900 mb-1">Plano Padrão</span>
              <span className="text-sm text-gray-500 mb-3">Até 299 Unidades</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-gray-400">R$</span>
                <span className="text-3xl font-extrabold text-[#057321]">199</span>
                <span className="text-gray-400">,00/mês</span>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-gray-600">
                <li>✓ Envios Ilimitados de Notificações</li>
                <li>✓ Moradores e Porteiros Ilimitados</li>
                <li>✓ Suporte Prioritário via WhatsApp</li>
                <li>✓ Sem Taxa de Instalação</li>
              </ul>
            </label>

            <label
              className={`relative flex flex-col p-6 rounded-xl border-2 cursor-pointer transition-all ${
                formData.planoEscolhido === 'grande'
                  ? 'border-[#057321] bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="planoEscolhido"
                value="grande"
                checked={formData.planoEscolhido === 'grande'}
                onChange={handleChange}
                className="sr-only"
              />
              {formData.planoEscolhido === 'grande' && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-[#057321] rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
              <span className="text-lg font-bold text-gray-900 mb-1">Plano Grande Porte</span>
              <span className="text-sm text-gray-500 mb-3">Acima de 300 Unidades</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-gray-400">R$</span>
                <span className="text-3xl font-extrabold text-[#057321]">299</span>
                <span className="text-gray-400">,00/mês</span>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-gray-600">
                <li>✓ Envios Ilimitados de Notificações</li>
                <li>✓ Moradores e Porteiros Ilimitados</li>
                <li>✓ Suporte Prioritário via WhatsApp</li>
                <li>✓ Sem Taxa de Instalação</li>
              </ul>
            </label>
          </div>
        </div>

        {/* Dados do Contratante */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8 no-print">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-[#057321] text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              Dados do Contratante
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Condomínio / Empresa *</label>
                <input type="text" name="nomeCondominio" value={formData.nomeCondominio} onChange={handleChange} required
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900" placeholder="Ex: Condomínio Residencial Parque das Flores" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CNPJ *</label>
                <input type="text" name="cnpjCondominio" value={formData.cnpjCondominio} onChange={handleChange} required
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900" placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CEP *</label>
                <input type="text" name="cepCondominio" value={formData.cepCondominio} onChange={handleChange} required
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900" placeholder="00000-000" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço Completo *</label>
                <input type="text" name="enderecoCondominio" value={formData.enderecoCondominio} onChange={handleChange} required
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900" placeholder="Rua, número, complemento" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bairro *</label>
                <input type="text" name="bairroCondominio" value={formData.bairroCondominio} onChange={handleChange} required
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900" placeholder="Bairro" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cidade *</label>
                <input type="text" name="cidadeCondominio" value={formData.cidadeCondominio} onChange={handleChange} required
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900" placeholder="Cidade" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">UF *</label>
                <select name="ufCondominio" value={formData.ufCondominio} onChange={handleChange} required
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900 bg-white">
                  <option value="">Selecione</option>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Representante Legal</h3>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo *</label>
                <input type="text" name="nomeResponsavel" value={formData.nomeResponsavel} onChange={handleChange} required
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900" placeholder="Nome completo do responsável" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CPF *</label>
                <input type="text" name="cpfResponsavel" value={formData.cpfResponsavel} onChange={handleChange} required
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900" placeholder="000.000.000-00" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cargo *</label>
                <input type="text" name="cargoResponsavel" value={formData.cargoResponsavel} onChange={handleChange} required
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900" placeholder="Ex: Síndico, Administrador" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail *</label>
                <input type="email" name="emailResponsavel" value={formData.emailResponsavel} onChange={handleChange} required
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone / WhatsApp *</label>
                <input type="tel" name="telefoneResponsavel" value={formData.telefoneResponsavel} onChange={handleChange} required
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Data do Contrato</label>
                <input type="date" name="dataContrato" value={formData.dataContrato} onChange={handleChange}
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:border-[#057321] focus:ring-2 focus:ring-green-200 outline-none transition-all text-gray-900" />
              </div>
            </div>
          </div>

          {/* Contrato */}
          <div ref={contratoRef} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 md:p-10 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-[#057321] text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
              Termos do Contrato
            </h2>

            <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
              <h3 className="text-center text-lg font-bold text-gray-900 uppercase">
                Contrato de Prestação de Serviços de Software como Serviço (SaaS)
              </h3>

              <p className="text-sm text-gray-500 text-center">
                Contrato nº __________ | Data: {formData.dataContrato ? new Date(formData.dataContrato + 'T12:00:00').toLocaleDateString('pt-BR') : '___/___/______'}
              </p>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-bold text-gray-900 mb-2">CONTRATADA:</p>
                <p><strong>Razão Social:</strong> APP GROUP LTDA - ME</p>
                <p><strong>CNPJ:</strong> 51.797.070/0001-53</p>
                <p><strong>Endereço:</strong> Av. Paulista, 1106, Sala 01 Andar – Bela Vista – São Paulo/SP – CEP: 01310-914</p>
                <p><strong>Atividade Principal:</strong> Tratamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="font-bold text-gray-900 mb-2">CONTRATANTE:</p>
                <p><strong>Razão Social / Nome:</strong> {formData.nomeCondominio || '___________________________________________'}</p>
                <p><strong>CNPJ:</strong> {formData.cnpjCondominio || '___.___.___/____-__'}</p>
                <p><strong>Endereço:</strong> {formData.enderecoCondominio || '___________'}, {formData.bairroCondominio || '___________'} – {formData.cidadeCondominio || '___________'}/{formData.ufCondominio || '__'} – CEP: {formData.cepCondominio || '_____-___'}</p>
                <p><strong>Representante:</strong> {formData.nomeResponsavel || '___________________________________________'}</p>
                <p><strong>CPF:</strong> {formData.cpfResponsavel || '___.___.___-__'}</p>
                <p><strong>Cargo:</strong> {formData.cargoResponsavel || '___________'}</p>
                <p><strong>E-mail:</strong> {formData.emailResponsavel || '___________'}</p>
                <p><strong>Telefone:</strong> {formData.telefoneResponsavel || '___________'}</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="font-bold text-gray-900 mb-2">PLANO ESCOLHIDO:</p>
                <p>{planoDescricao}</p>
              </div>

              <hr />

              <h4 className="font-bold text-gray-900">CLÁUSULA 1ª – DO OBJETO</h4>
              <p>O presente contrato tem por objeto a prestação de serviços de licenciamento de uso do software <strong>&quot;App Correspondência&quot;</strong>, plataforma SaaS (Software as a Service) para gestão de correspondências e encomendas em condomínios residenciais e comerciais, incluindo funcionalidades de registro de entregas, notificações automáticas via WhatsApp e e-mail, assinatura digital, registro fotográfico e relatórios gerenciais.</p>

              <h4 className="font-bold text-gray-900">CLÁUSULA 2ª – DO PLANO E VALOR</h4>
              <p>2.1. O CONTRATANTE opta pelo plano descrito acima, no valor mensal de <strong>{planoValor}</strong> (reais), com vencimento todo dia 10 de cada mês.</p>
              <p>2.2. O pagamento será realizado via boleto bancário, PIX ou transferência bancária, conforme instruções enviadas pela CONTRATADA.</p>
              <p>2.3. Em caso de atraso no pagamento, incidirá multa de 2% (dois por cento) sobre o valor da parcela, acrescida de juros de mora de 1% (um por cento) ao mês.</p>
              <p>2.4. Os valores poderão ser reajustados anualmente com base no IGPM/FGV ou por índice que o substitua, mediante comunicação prévia de 30 (trinta) dias.</p>

              <h4 className="font-bold text-gray-900">CLÁUSULA 3ª – DOS SERVIÇOS INCLUSOS</h4>
              <p>3.1. A CONTRATADA disponibilizará ao CONTRATANTE:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Acesso ilimitado à plataforma App Correspondência;</li>
                <li>Cadastro ilimitado de moradores e porteiros;</li>
                <li>Envio ilimitado de notificações via WhatsApp e e-mail;</li>
                <li>Armazenamento ilimitado de fotos de correspondências;</li>
                <li>Backup automático diário dos dados;</li>
                <li>Suporte técnico prioritário via WhatsApp;</li>
                <li>Atualizações e melhorias do sistema sem custo adicional.</li>
              </ul>

              <h4 className="font-bold text-gray-900">CLÁUSULA 4ª – DA VIGÊNCIA</h4>
              <p>4.1. O presente contrato terá vigência a partir da data de assinatura, por prazo indeterminado.</p>
              <p>4.2. <strong>Não há fidelidade.</strong> Qualquer das partes poderá rescindir o contrato a qualquer momento, mediante comunicação prévia de 30 (trinta) dias por escrito.</p>

              <h4 className="font-bold text-gray-900">CLÁUSULA 5ª – DAS OBRIGAÇÕES DA CONTRATADA</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Manter a plataforma disponível e funcional 24 horas por dia, 7 dias por semana, com disponibilidade mínima de 99,5%;</li>
                <li>Garantir a segurança e confidencialidade dos dados armazenados;</li>
                <li>Prestar suporte técnico em horário comercial (segunda a sexta, das 9h às 18h);</li>
                <li>Realizar backups diários automáticos;</li>
                <li>Comunicar ao CONTRATANTE, com antecedência mínima de 48 horas, eventuais manutenções programadas.</li>
              </ul>

              <h4 className="font-bold text-gray-900">CLÁUSULA 6ª – DAS OBRIGAÇÕES DO CONTRATANTE</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Efetuar os pagamentos nas datas acordadas;</li>
                <li>Utilizar a plataforma de acordo com sua finalidade e legislação vigente;</li>
                <li>Não compartilhar credenciais de acesso com terceiros não autorizados;</li>
                <li>Fornecer informações verdadeiras e atualizadas para cadastro.</li>
              </ul>

              <h4 className="font-bold text-gray-900">CLÁUSULA 7ª – DA PROTEÇÃO DE DADOS (LGPD)</h4>
              <p>7.1. A CONTRATADA se compromete a tratar os dados pessoais dos usuários em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).</p>
              <p>7.2. Os dados coletados serão utilizados exclusivamente para a prestação dos serviços contratados.</p>
              <p>7.3. Em caso de rescisão, os dados do CONTRATANTE serão mantidos por 90 (noventa) dias para eventual backup, sendo eliminados após esse prazo.</p>

              <h4 className="font-bold text-gray-900">CLÁUSULA 8ª – DA RESCISÃO</h4>
              <p>8.1. O contrato poderá ser rescindido por qualquer das partes, sem multa, mediante aviso prévio de 30 dias.</p>
              <p>8.2. Em caso de inadimplência superior a 60 (sessenta) dias, a CONTRATADA poderá suspender o acesso à plataforma e rescindir o contrato unilateralmente.</p>
              <p>8.3. Após a rescisão, o acesso à plataforma será encerrado no último dia do período já pago.</p>

              <h4 className="font-bold text-gray-900">CLÁUSULA 9ª – DA PROPRIEDADE INTELECTUAL</h4>
              <p>9.1. O software App Correspondência, incluindo código-fonte, design, marcas e documentação, são de propriedade exclusiva da CONTRATADA.</p>
              <p>9.2. O presente contrato não transfere ao CONTRATANTE qualquer direito de propriedade intelectual sobre o software.</p>

              <h4 className="font-bold text-gray-900">CLÁUSULA 10ª – DO FORO</h4>
              <p>As partes elegem o foro da Comarca de São Paulo/SP para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato, com renúncia expressa de qualquer outro, por mais privilegiado que seja.</p>

              <hr />

              <p className="text-center text-sm text-gray-500">
                São Paulo, {formData.dataContrato ? new Date(formData.dataContrato + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '__ de __________ de ____'}.
              </p>

              <div className="grid md:grid-cols-2 gap-8 mt-8">
                <div className="text-center border-t-2 border-gray-300 pt-4">
                  <p className="font-bold text-gray-900">CONTRATADA</p>
                  <p className="text-sm text-gray-600">APP GROUP LTDA - ME</p>
                  <p className="text-sm text-gray-600">CNPJ: 51.797.070/0001-53</p>
                </div>
                <div className="text-center border-t-2 border-gray-300 pt-4">
                  <p className="font-bold text-gray-900">CONTRATANTE</p>
                  <p className="text-sm text-gray-600">{formData.nomeCondominio || '________________________________'}</p>
                  <p className="text-sm text-gray-600">{formData.nomeResponsavel || '________________________________'}</p>
                  <p className="text-sm text-gray-600">{formData.cpfResponsavel || 'CPF: ___.___.___-__'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Aceite e Envio */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8 no-print">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-[#057321] text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
              Aceite e Envio
            </h2>

            <label className="flex items-start gap-3 cursor-pointer mb-6">
              <input
                type="checkbox"
                name="concordaTermos"
                checked={formData.concordaTermos}
                onChange={handleChange}
                className="mt-1 w-5 h-5 text-[#057321] rounded border-gray-300 focus:ring-[#057321] accent-[#057321]"
              />
              <span className="text-gray-700 text-sm leading-relaxed">
                Declaro que li e concordo integralmente com todas as cláusulas deste <strong>Contrato de Prestação de Serviços</strong>. 
                Confirmo que os dados informados são verdadeiros e que possuo autorização para representar o CONTRATANTE nesta contratação.
              </span>
            </label>

            {enviado ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-lg font-bold text-green-800 mb-2">Contrato Enviado com Sucesso!</h3>
                <p className="text-green-700 text-sm">Os dados do contrato foram enviados via WhatsApp. Nossa equipe entrará em contato para finalizar a ativação.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  className="flex-1 h-14 bg-[#057321] hover:bg-[#045a1a] text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Enviar via WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 h-14 bg-gray-700 hover:bg-gray-800 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Imprimir Contrato
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Rodapé */}
        <div className="text-center text-sm text-gray-400 pb-8">
          <p>© {new Date().getFullYear()} App Correspondência – APP GROUP LTDA – CNPJ: 51.797.070/0001-53</p>
        </div>
      </div>
    </div>
  )
}
