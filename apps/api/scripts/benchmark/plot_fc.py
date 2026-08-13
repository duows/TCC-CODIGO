#!/usr/bin/env python3
"""
BENCHMARK — Artefatos do Forward Checking (material reservado para a Avaliação Final).

⚠ Script novo, independente de `plot.py`/`tables.ts` — não os edita, não lê nem escreve em
`output/` (CSV e tabelas .tex versionados do TCC atual). O FC ainda não está integrado ao
Capítulo 10; estes artefatos ficam soltos em `imagens/output2/` até serem incorporados
manualmente.

Fonte dos dados: as 14 linhas transcritas verbatim de
`RELATORIO-FORWARD-CHECKING.md` (seção "3. Tabela crua completa") — não existe CSV com o
motor `fc`, então os números estão embutidos aqui em vez de lidos de um arquivo.

Gera em `imagens/output2/`:
  - fc-comparativo-checagens.png : AC-3 x FC x FB, checagens (eixo Y log), um painel por
    regime.
  - fc-checagens-linear.png : só AC-3 x FC, checagens em escala linear (evidencia a reta 4×d
    do FC).
  - fc-tabela-tres-motores.tex : tabela LaTeX com as 14 linhas, três motores lado a lado.

Estilo (cores, marcadores, grid, figsize, dpi) replicado de `plot.py` para casar visualmente
com as Figuras 17/18 já usadas no TCC; o motor `fc` usa cor/marcador novos dentro da mesma
paleta tab10 (verde/triângulo) para não colidir com azul (AC-3) nem vermelho (Força Bruta).

Uso:
    python plot_fc.py
"""

import math
import os

import matplotlib

matplotlib.use("Agg")  # backend sem display (salva direto em arquivo)
import matplotlib.pyplot as plt

OUT_DIR = r"F:\Meu Drive\TCC\TCC\imagens\output2"

ROTULO_MOTOR = {"ac3": "AC-3", "fc": "Forward Checking", "forca_bruta": "Força Bruta"}
ROTULO_REGIME = {"irrestrito": "Irrestrito", "selecao_parcial": "Seleção parcial"}
COR_MOTOR = {"ac3": "#1f77b4", "fc": "#2ca02c", "forca_bruta": "#d62728"}
ESTILO_REGIME = {"irrestrito": "-", "selecao_parcial": "--"}
MARCA_MOTOR = {"ac3": "o", "fc": "^", "forca_bruta": "s"}

# regime, d, ac3_chk, fc_chk, fb_chk, ac3_ms, fc_ms, fb_ms
# Transcrito verbatim de RELATORIO-FORWARD-CHECKING.md, seção 3.
DADOS = [
    ("irrestrito", 10, 118, 40, 152000, 0.104, 0.044, 7.792),
    ("irrestrito", 25, 302, 100, 14635000, 0.041, 0.058, 589.104),
    ("irrestrito", 50, 608, 200, 150000000, 0.082, 0.110, 6303.234),
    ("irrestrito", 75, 915, 300, 150501250, 0.195, 0.159, 6333.949),
    ("irrestrito", 100, 1225, 400, 150000000, 0.138, 0.207, 6149.180),
    ("irrestrito", 250, 3058, 1000, 162500000, 0.244, 0.535, 7114.861),
    ("irrestrito", 500, 6125, 2000, 204629760, 0.615, 0.853, 10070.998),
    ("selecao_parcial", 10, 71, 40, 16000, 0.022, 0.016, 0.720),
    ("selecao_parcial", 25, 211, 100, 574375, 0.034, 0.059, 22.700),
    ("selecao_parcial", 50, 591, 200, 9500000, 0.072, 0.059, 409.502),
    ("selecao_parcial", 75, 1118, 300, 47565000, 0.097, 0.087, 1967.781),
    ("selecao_parcial", 100, 1778, 400, 150000000, 0.136, 0.107, 6094.814),
    ("selecao_parcial", 250, 9191, 1000, 162500000, 0.306, 0.288, 6970.104),
    ("selecao_parcial", 500, 33878, 2000, 100000000, 1.010, 0.566, 3333.791),
]

REGIMES = ["irrestrito", "selecao_parcial"]


def _serie(regime, campo_idx):
    linhas = [l for l in DADOS if l[0] == regime]
    ds = [l[1] for l in linhas]
    ys = [l[campo_idx] for l in linhas]
    return ds, ys


def figura_comparativo_checagens(saida):
    """3 motores (AC-3, FC, FB), checagens em escala log, um painel por regime."""
    fig, axes = plt.subplots(1, len(REGIMES), figsize=(6 * len(REGIMES), 5), sharey=True, squeeze=False)
    campo_idx = {"ac3": 2, "fc": 3, "forca_bruta": 4}
    for ax, regime in zip(axes[0], REGIMES):
        for motor in ("ac3", "fc", "forca_bruta"):
            ds, ys = _serie(regime, campo_idx[motor])
            ax.plot(
                ds, ys,
                marker=MARCA_MOTOR[motor], color=COR_MOTOR[motor],
                linewidth=1.8, markersize=6, label=ROTULO_MOTOR[motor],
            )
        ax.set_yscale("log")
        ax.set_title(ROTULO_REGIME.get(regime, regime))
        ax.set_xlabel("d — componentes por categoria")
        ax.grid(True, which="both", linestyle=":", alpha=0.5)
        ax.legend()
    axes[0][0].set_ylabel("checagens de restrição — escala log")
    fig.suptitle("Checagens de restrição × tamanho do domínio — AC-3, Forward Checking e Força Bruta (por regime)")
    fig.tight_layout()
    fig.savefig(saida, dpi=150)
    print(f"Figura salva em: {saida}")


def figura_checagens_linear(saida):
    """Só AC-3 e FC, checagens em escala linear — evidencia a reta 4×d do FC."""
    fig, ax = plt.subplots(figsize=(9, 6))
    campo_idx = {"ac3": 2, "fc": 3}
    for motor in ("ac3", "fc"):
        for regime in REGIMES:
            ds, ys = _serie(regime, campo_idx[motor])
            rotulo = f"{ROTULO_MOTOR[motor]} — {ROTULO_REGIME.get(regime, regime)}"
            ax.plot(
                ds, ys,
                marker=MARCA_MOTOR[motor], color=COR_MOTOR[motor],
                linestyle=ESTILO_REGIME.get(regime, "-"),
                linewidth=1.6, markersize=5, label=rotulo,
            )
    ax.set_xlabel("d — componentes por categoria")
    ax.set_ylabel("checagens de restrição — escala linear")
    ax.set_title("Checagens de restrição × tamanho do domínio — AC-3 vs Forward Checking (escala linear)")
    ax.grid(True, which="both", linestyle=":", alpha=0.5)
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(saida, dpi=150)
    print(f"Figura salva em: {saida}")


def _fmt_checagens(n):
    """Espelha a convenção das tabelas existentes: >=1e6 vira notação científica
    com 3 algarismos significativos (arredondamento para cima no .5); abaixo disso,
    inteiro puro."""
    if n < 1_000_000:
        return str(int(n))
    exp = 0
    val = float(n)
    while val >= 10:
        val /= 10
        exp += 1
    mantissa = math.floor(val * 100 + 0.5) / 100
    if mantissa >= 10:
        mantissa /= 10
        exp += 1
    return f"{mantissa:.2f}e{exp}"


def _fmt_tempo(ms):
    return f"{ms:.3f}"


def tabela_tres_motores(saida):
    linhas_tex = []
    for regime, d, ac3_c, fc_c, fb_c, ac3_t, fc_t, fb_t in DADOS:
        linhas_tex.append(
            f"      {ROTULO_REGIME[regime]} & {d} & "
            f"\\num{{{_fmt_checagens(ac3_c)}}} & \\num{{{_fmt_checagens(fc_c)}}} & "
            f"\\num{{{_fmt_checagens(fb_c)}}} & "
            f"\\num{{{_fmt_tempo(ac3_t)}}} & \\num{{{_fmt_tempo(fc_t)}}} & "
            f"\\num{{{_fmt_tempo(fb_t)}}} \\\\"
        )

    corpo = "\n".join(linhas_tex)
    tex = f"""\\begin{{table}}[htbp]
  \\centering
  \\caption{{Comparação dos três motores (AC-3, forward checking e força bruta) nas 14
  combinações de regime e $d$ — checagens de restrição e tempo de execução, medianas de 5
  execuções. Material reservado para a Avaliação Final; ainda não referenciado no
  Capítulo~10. Nas linhas em que a força bruta não conclui a enumeração, os valores
  registrados são até o teto do benchmark, não o custo real de esgotar o produto
  cartesiano.}}
  \\label{{tab:bench-fc-comparativo}}
  \\resizebox{{\\ifdim\\width>\\linewidth\\linewidth\\else\\width\\fi}}{{!}}{{%
    \\begin{{tabular}}{{lrrrrrrr}}
      \\toprule
      Regime & $d$ & AC-3 checagens & FC checagens & FB checagens & AC-3 tempo (ms) & FC tempo (ms) & FB tempo (ms) \\\\
      \\midrule
{corpo}
      \\bottomrule
    \\end{{tabular}}%
  }}
  \\fonte{{Elaborada pelo autor}}
\\end{{table}}
"""
    with open(saida, "w", encoding="utf-8") as f:
        f.write(tex)
    print(f"Tabela salva em: {saida}")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    figura_comparativo_checagens(os.path.join(OUT_DIR, "fc-comparativo-checagens.png"))
    figura_checagens_linear(os.path.join(OUT_DIR, "fc-checagens-linear.png"))
    tabela_tres_motores(os.path.join(OUT_DIR, "fc-tabela-tres-motores.tex"))


if __name__ == "__main__":
    main()
