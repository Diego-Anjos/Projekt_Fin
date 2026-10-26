import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos e Condições | Projekt Fin",
  description:
    "Termos e Condições de utilização da plataforma Projekt Fin, incluindo Quantum.IA, dados de mercado e gamificação de metas.",
};

export default function TermosPage() {
  return (
    /*
      Scroll próprio da página: o RootLayout usa `html.h-full` +
      `overflow-x: hidden` (que força overflow-y auto no html a 100%
      de altura) e a app autenticada faz scroll no AppShell (h-dvh).
      Em rotas públicas longas, o <main> tem de ser o contentor de
      scroll (h-dvh + overflow-y-auto), senão o documento não desce.
    */
    <main className="relative z-10 h-dvh min-h-0 overflow-x-hidden overflow-y-auto bg-[#070C09] px-4 py-10 text-gray-300 md:px-8 lg:px-16">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-sm text-emerald-400/90">
          <Link href="/" className="transition hover:text-emerald-300 hover:underline">
            ← Voltar ao login
          </Link>
        </p>

        <header className="mt-8 space-y-3 border-b border-white/10 pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Termos e Condições
          </h1>
          <p className="text-sm text-slate-400">
            Última atualização: outubro de 2026 · Projekt Fin
          </p>
        </header>

        <article className="mt-10 space-y-10 text-sm leading-relaxed text-slate-300 sm:text-base">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Aceitação</h2>
            <p>
              Ao criar uma conta ou utilizar o <strong className="text-white">Projekt Fin</strong>,
              o utilizador declara ter lido, compreendido e concordado com estes Termos e Condições
              e com as políticas de privacidade da plataforma. Se não concordar, não deve utilizar
              o serviço.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Descrição do serviço</h2>
            <p>
              O Projekt Fin é uma plataforma de gestão financeira pessoal que oferece, entre outras
              funcionalidades:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>Controlo de gastos, fluxo de caixa e exportação de dados (CSV/JSON);</li>
              <li>
                <strong className="text-slate-200">Gamificação de metas</strong> financeiras, com
                progresso visual e alocação de saldo positivo;
              </li>
              <li>
                Acompanhamento de indicadores de mercado, ações, FIIs e criptomoedas através de{" "}
                <strong className="text-slate-200">APIs de terceiros</strong> (incluindo Brapi e HG
                Brasil);
              </li>
              <li>Feed de notícias económicas proveniente de fornecedores externos;</li>
              <li>
                Assistente virtual <strong className="text-slate-200">Quantum.IA</strong>, com
                insights baseados no contexto financeiro do utilizador.
              </li>
            </ul>
          </section>

          <section className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-5">
            <h2 className="text-lg font-semibold text-amber-200">
              3. Isenção de responsabilidade (Disclaimer)
            </h2>
            <p className="text-amber-100/90">
              Os dados de mercado e notícias exibidos são informativos e não constituem recomendação
              de investimento.
            </p>
            <p className="text-slate-400">
              Cotações, indicadores, screener e conteúdos jornalísticos podem conter atrasos,
              imprecisões ou interrupções provenientes das APIs de terceiros. O utilizador é o único
              responsável pelas decisões financeiras que tomar. O Projekt Fin e a Quantum.IA não
              prestam aconselhamento de investimento, fiscal ou jurídico.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. Conta e dados do utilizador</h2>
            <p>
              O utilizador é responsável por manter a confidencialidade das credenciais de acesso e
              pela veracidade das informações registadas (transações, metas, subscrições, etc.). A
              autenticação e o armazenamento de dados são efetuados através de serviços de
              infraestrutura (incluindo Appwrite), sujeitos às respetivas políticas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Privacidade</h2>
            <p>
              Tratamos dados pessoais e financeiros necessários ao funcionamento da plataforma
              (conta, preferências, histórico e contexto para a Quantum.IA). Não vendemos os seus
              dados a terceiros para marketing. Integrações externas (mercado, notícias, IA) podem
              processar pedidos técnicos sem expor o seu histórico financeiro completo, salvo quando
              necessário para a funcionalidade solicitada.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Uso aceite</h2>
            <p>
              É proibido utilizar a plataforma para fins ilícitos, abusivos ou que comprometam a
              segurança do serviço ou de outros utilizadores. Reservamo-nos o direito de suspender
              contas em caso de violação destes termos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Alterações</h2>
            <p>
              Podemos atualizar estes Termos periodicamente para refletir novas funcionalidades
              (como Market Hub, notícias ou gamificação). A data de “Última atualização” no topo
              desta página indica a versão vigente. O uso continuado após alterações constitui
              aceitação das novas condições.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">8. Contacto</h2>
            <p>
              Para questões relacionadas com estes Termos ou com a privacidade, utilize os canais de
              suporte indicados na aplicação ou no repositório oficial do projeto.
            </p>
          </section>
        </article>

        <footer className="mt-14 border-t border-white/10 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Projekt Fin · Feito com 💚
        </footer>
      </div>
    </main>
  );
}
