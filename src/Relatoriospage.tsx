import type { CSSProperties, MouseEvent } from "react";
import { Link } from "react-router";
import {
    Stethoscope,
    DollarSign,
    Receipt,
    BadgeDollarSign,
    PackageCheck,
    Syringe,
    BedDouble,
    Scissors,
    CalendarX2,
    PawPrint,
    ShieldCheck,
    TrendingUp,
    TriangleAlert,
    ChevronRight,
    type LucideIcon,
} from "lucide-react";
import "./relatorios.css";

type Report = {
    slug: string;
    title: string;
    count: string;
    icon: LucideIcon;
    tint: string; // cor de destaque do ícone
};

const REPORTS: Report[] = [
    { slug: "atendimentos", title: "Atendimentos", count: "1.150", icon: Stethoscope, tint: "#FF8A3D" },
    { slug: "financeiro", title: "Financeiro (receitas e despesas)", count: "1.138", icon: DollarSign, tint: "#4C9BFF" },
    { slug: "faturamento-servico", title: "Faturamento por serviço", count: "1.138", icon: Receipt, tint: "#34D399" },
    { slug: "faturamento-profissional", title: "Faturamento por profissional", count: "1.138", icon: BadgeDollarSign, tint: "#A78BFA" },
    { slug: "estoque-validade", title: "Estoque e validade", count: "190", icon: PackageCheck, tint: "#FF8A3D" },
    { slug: "vacinas", title: "Vacinas aplicadas e atrasadas", count: "560", icon: Syringe, tint: "#4C9BFF" },
    { slug: "internacoes", title: "Internações", count: "110", icon: BedDouble, tint: "#34D399" },
    { slug: "cirurgias", title: "Cirurgias", count: "110", icon: Scissors, tint: "#A78BFA" },
    { slug: "agendamentos-faltas", title: "Agendamentos e faltas", count: "28", icon: CalendarX2, tint: "#FF8A3D" },
    { slug: "novos-clientes", title: "Novos clientes e animais", count: "320", icon: PawPrint, tint: "#4C9BFF" },
    { slug: "convenios", title: "Convênios", count: "28", icon: ShieldCheck, tint: "#34D399" },
    { slug: "produtividade", title: "Produtividade da equipe", count: "1.150", icon: TrendingUp, tint: "#A78BFA" },
    { slug: "ocorrencias", title: "Ocorrências", count: "60", icon: TriangleAlert, tint: "#FF8A3D" },
];

// brilho que acompanha o mouse dentro do card (efeito "liquid glass")
function trackLight(e: MouseEvent<HTMLAnchorElement>) {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export default function RelatoriosPage() {
    return (
        <div className="rel-root">
            {/* Fundo Dot Matrix */}
            <div className="rel-bg" aria-hidden>
                <div className="rel-dot-pattern" />
                <div className="rel-vignette" />
            </div>

            {/* Conteúdo */}
            <div className="rel-content">
                <span className="rel-eyebrow">INTELIGÊNCIA DE NEGÓCIO</span>
                <h1 className="rel-title">Relatórios</h1>
                <p className="rel-sub">
                    Indicadores clínicos, operacionais e financeiros prontos para análise e impressão.
                </p>

                <div className="rel-grid">
                    {REPORTS.map(({ slug, title, count, icon: Icon, tint }) => (
                        <Link
                            key={slug}
                            to={`/relatorios/${slug}`}
                            className="rel-card"
                            onMouseMove={trackLight}
                            style={{ "--tint": tint } as CSSProperties}
                        >
                            <span className="rel-icon">
                                <Icon size={22} strokeWidth={2} />
                            </span>
                            <span className="rel-text">
                                <strong>{title}</strong>
                                <small>{count} registros disponíveis</small>
                            </span>
                            <ChevronRight className="rel-chevron" size={18} />
                        </Link>
                    ))}
                </div>
            </div>

        </div>
    );
}