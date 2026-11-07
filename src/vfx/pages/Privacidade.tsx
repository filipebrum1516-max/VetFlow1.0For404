import { useState } from "react"
import { useNavigate } from "react-router"

const ATUALIZADO = "30 de outubro de 2026"

const PRIVACIDADE: [string, string[]][] = [
  ["1. Quem somos e a quem esta política se aplica", [
    "Esta Política explica como o VetFlow trata dados pessoais, em conformidade com a Lei nº 13.709/2018, a Lei Geral de Proteção de Dados Pessoais (LGPD).",
    "A clínica ou hospital veterinário que contrata o VetFlow é a CONTROLADORA dos dados de seus tutores, clientes e colaboradores: é ela quem decide por que e como esses dados são usados. O VetFlow atua como OPERADOR, tratando os dados em nome da clínica e segundo as suas instruções (art. 5º, VI e VII, e art. 39 da LGPD).",
    "Para os dados de cadastro dos próprios usuários do sistema (nome, e-mail, CPF e registros de acesso), o VetFlow também atua como controlador.",
  ]],
  ["2. Quais dados tratamos", [
    "Tutores e clientes: nome, CPF ou CNPJ, RG ou inscrição estadual, data de nascimento, telefone, WhatsApp, e-mail, endereço, histórico de compras, pagamentos, débitos, limite de crédito e preferências de contato.",
    "Animais: nome, espécie, raça, idade, peso, prontuário, vacinas, exames, prescrições, internações e imagens. Dados de animais não são dados pessoais, mas ficam vinculados ao tutor e recebem a mesma proteção.",
    "Colaboradores e usuários: nome, e-mail, CPF, perfil de acesso, registro profissional (CRMV), comissão, data e hora de acesso e ações realizadas no sistema.",
    "Dados de entrega: endereço, ponto de referência, telefone, nome de quem recebeu, assinatura e foto do comprovante.",
    "Dados técnicos: preferências salvas no navegador (tema, unidade ativa) e registros de segurança.",
    "O VetFlow não exige dados pessoais sensíveis (art. 5º, II). Se a clínica registrar algum, por exemplo uma informação de saúde do tutor em observações, deverá fazê-lo apenas quando necessário e com base legal adequada.",
  ]],
  ["3. Para que usamos os dados e com qual base legal", [
    "Atendimento veterinário, agenda, prontuário e vacinas: execução de contrato com o tutor (art. 7º, V) e cumprimento de obrigação legal e regulatória do médico-veterinário (art. 7º, II).",
    "Vendas, caixa, emissão de comprovantes, duplicatas e documentos fiscais: execução de contrato (art. 7º, V) e obrigação legal fiscal (art. 7º, II).",
    "Cobrança, controle de crédito e vendas a prazo: execução de contrato (art. 7º, V) e proteção do crédito (art. 7º, X).",
    "Entregas: execução de contrato (art. 7º, V).",
    "Lembretes de vacina e retorno, confirmação de agenda e envio de comprovantes por WhatsApp ou e-mail: legítimo interesse ligado ao serviço contratado (art. 7º, IX), sempre com opção de recusar.",
    "Mensagens promocionais e publicações: somente com consentimento do tutor (art. 7º, I), que pode ser retirado a qualquer momento.",
    "Controle de acesso por perfil, registro de ações e segurança: legítimo interesse e prevenção a fraudes (art. 7º, IX).",
  ]],
  ["4. Com quem os dados podem ser compartilhados", [
    "Somente com quem precisa deles para a finalidade informada: laboratórios e parceiros de exames, convênios e planos de saúde animal, instituições de pagamento (maquininhas, Pix, boletos), transportadoras ou entregadores, provedores de hospedagem e autoridades públicas quando houver obrigação legal ou ordem judicial.",
    "O VetFlow não vende dados pessoais e não os utiliza para publicidade de terceiros.",
    "Se houver transferência internacional (por exemplo, servidores fora do Brasil), ela seguirá o art. 33 da LGPD, com garantias adequadas.",
  ]],
  ["5. Por quanto tempo guardamos", [
    "Os dados ficam guardados enquanto durar a relação com a clínica e, depois disso, pelo prazo necessário para cumprir obrigações legais e regulatórias, como a guarda de prontuários exigida pelo Conselho Federal de Medicina Veterinária e de documentos fiscais e contábeis, ou para o exercício de direitos em processos (art. 16).",
    "Encerrados esses prazos, os dados são eliminados ou anonimizados.",
  ]],
  ["6. Direitos do titular", [
    "Todo titular pode, a qualquer momento e de forma gratuita (art. 18): confirmar se tratamos seus dados; acessá-los; corrigir dados incompletos, inexatos ou desatualizados; pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade; pedir a portabilidade; saber com quem os dados foram compartilhados; ser informado sobre a possibilidade de não consentir; e revogar o consentimento.",
    "Os pedidos de tutores e clientes devem ser feitos à clínica, que é a controladora. O VetFlow apoia a clínica a responder em até 15 dias.",
    "O titular também pode peticionar à Autoridade Nacional de Proteção de Dados (ANPD).",
  ]],
  ["7. Segurança", [
    "Cada pessoa acessa o sistema com usuário próprio e vê apenas as abas do seu perfil: administrador, vendedor, caixa, estoque, veterinário ou entregador. As ações importantes, como vendas, estornos, sangrias, cancelamentos e edições, ficam registradas com usuário, data e hora.",
    "Aplicamos medidas técnicas e administrativas razoáveis para proteger os dados contra acesso não autorizado, perda ou alteração (art. 46): senhas individuais, controle de permissões, conexão criptografada (HTTPS) no ambiente publicado e cópias de segurança.",
    "Recomendamos que cada colaborador não compartilhe sua senha e encerre a sessão ao sair do computador.",
  ]],
  ["8. Incidentes de segurança", [
    "Se ocorrer um incidente que possa gerar risco ou dano relevante aos titulares, o VetFlow avisará a clínica sem demora, e a clínica comunicará a ANPD e os titulares afetados, conforme o art. 48 da LGPD.",
  ]],
  ["9. Armazenamento no navegador", [
    "O VetFlow usa o armazenamento local do navegador (localStorage e sessionStorage) para manter a sessão, o tema e os dados de trabalho. Não usamos cookies de rastreamento nem de publicidade.",
    "Na versão atual, os dados ficam no navegador do computador onde foram registrados. Use computadores da clínica, protegidos por senha, e não utilize o sistema em computadores públicos.",
  ]],
  ["10. Crianças e adolescentes", [
    "O sistema não é destinado a menores de 18 anos. Se for necessário registrar dados de um menor, por exemplo como contato de entrega, a clínica deve fazê-lo no seu melhor interesse e com consentimento de um dos pais ou responsável (art. 14).",
  ]],
  ["11. Encarregado (DPO) e contato", [
    "Cada clínica deve indicar o seu encarregado pelo tratamento de dados pessoais (art. 41) e divulgar o contato dele aos tutores.",
    "Encarregado do VetFlow: privacidade@vetflow.com.br.",
  ]],
  ["12. Alterações", [
    "Esta política pode ser atualizada. A data da última versão fica no topo da página e, quando houver mudança relevante, os usuários serão avisados ao entrar no sistema.",
  ]],
]

const TERMOS: [string, string[]][] = [
  ["1. Aceite", ["Ao acessar o VetFlow, o usuário declara que leu e concorda com estes Termos de Uso e com a Política de Privacidade. Quem não concordar não deve utilizar o sistema."]],
  ["2. O que é o VetFlow", ["O VetFlow é um sistema de gestão para clínicas e hospitais veterinários: agenda, prontuário, vendas, caixa, estoque, entregas, financeiro e relatórios. A \"Clínica exemplo\" contém apenas dados fictícios, para demonstração e treinamento. A \"Minha clínica\" é o ambiente real de trabalho."]],
  ["3. Contas e acessos", [
    "Cada colaborador recebe um acesso individual, criado pelo administrador da clínica, com perfil definido: Administrador, Vendedor, Caixa, Estoque, Veterinário ou Entregador.",
    "O usuário é responsável por manter sua senha em sigilo e por todas as ações feitas com o seu acesso. Em caso de suspeita de uso indevido, deve avisar o administrador imediatamente.",
    "O administrador da clínica é responsável por criar, alterar e desativar acessos, e por desativar o usuário de colaboradores desligados.",
  ]],
  ["4. Uso permitido", [
    "Usar o sistema apenas para as atividades da clínica e dentro das permissões do seu perfil.",
    "Registrar informações verdadeiras e mantê-las atualizadas.",
    "Tratar os dados de tutores e colaboradores com sigilo, apenas para a finalidade do atendimento, conforme a LGPD e o Código de Ética do Médico-Veterinário.",
  ]],
  ["5. É proibido", [
    "Compartilhar senhas ou usar o acesso de outra pessoa.",
    "Copiar, exportar ou divulgar dados pessoais sem necessidade ou autorização.",
    "Tentar acessar áreas não liberadas ao seu perfil, burlar controles do caixa ou do estoque, ou alterar registros para encobrir operações.",
    "Inserir conteúdo ilegal, ofensivo ou que viole direitos de terceiros.",
  ]],
  ["6. Responsabilidades da clínica", ["A clínica, como controladora, é responsável pela base legal dos dados que cadastra, por informar os tutores sobre o tratamento, por atender aos pedidos dos titulares e pela emissão correta de documentos fiscais. Os comprovantes gerados pelo VetFlow sem integração fiscal são não fiscais."]],
  ["7. Disponibilidade e cópias", ["O VetFlow busca manter o sistema disponível e funcionando, mas podem ocorrer interrupções para manutenção ou por falhas externas. Recomenda-se exportar relatórios periodicamente."]],
  ["8. Alterações e foro", ["Estes termos podem ser atualizados, com aviso aos usuários. Aplica-se a legislação brasileira. Fica eleito o foro do domicílio da clínica contratante, salvo disposição legal em contrário."]],
]

export default function Privacidade() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<"privacidade" | "termos">("privacidade")
  const list = tab === "privacidade" ? PRIVACIDADE : TERMOS
  return (
    <div className="pvc">
      <header className="pvc-top">
        <img src="/assets/vetflow-wordmark-dark.png" alt="VetFlow" />
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/login"))}>← Voltar</button>
      </header>
      <main className="pvc-main">
        <span className="pvc-k">LGPD · Lei nº 13.709/2018</span>
        <h1>{tab === "privacidade" ? "Política de Privacidade" : "Termos de Uso"}</h1>
        <p className="pvc-sub">Última atualização: {ATUALIZADO}</p>
        <div className="pvc-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "privacidade"} className={tab === "privacidade" ? "on" : ""} onClick={() => setTab("privacidade")}>Política de Privacidade</button>
          <button role="tab" aria-selected={tab === "termos"} className={tab === "termos" ? "on" : ""} onClick={() => setTab("termos")}>Termos de Uso</button>
        </div>
        <div className="pvc-sum">
          <b>Em resumo</b>
          <ul>
            <li>A clínica é dona dos dados dos tutores; o VetFlow só os trata em nome dela.</li>
            <li>Usamos os dados para atender, vender, cobrar, entregar e cumprir a lei. Nada é vendido.</li>
            <li>Cada colaborador tem o próprio acesso e vê só o que precisa.</li>
            <li>O titular pode pedir acesso, correção ou exclusão dos dados à clínica.</li>
          </ul>
        </div>
        {list.map(([title, paras]) => (
          <section key={title} className="pvc-sec">
            <h2>{title}</h2>
            {paras.map((t, i) => <p key={i}>{t}</p>)}
          </section>
        ))}
        <p className="pvc-note">Este texto é um modelo preparado para o VetFlow e deve ser revisado pelo jurídico da clínica antes do uso em produção, incluindo os dados do controlador e do encarregado.</p>
      </main>
      <footer className="pvc-ft">© {new Date().getFullYear()} VetFlow 1.0 · 404 · privacidade@vetflow.com.br</footer>
    </div>
  )
}
