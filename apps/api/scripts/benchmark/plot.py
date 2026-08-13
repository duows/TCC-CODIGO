#!/usr/bin/env python3
"""
BENCHMARK — Figuras do capítulo de Resultados (baseline experimental do TCC).

Lê o CSV consolidado do harness (output/benchmark.csv, com coluna `regime`) e
salva dois PNG em output/:

  - fig_tempo.png     : tempo_ms x d, eixo Y log, AC-3 x Força Bruta, um subplot
                        por regime; abortos da FB marcados com "X".
  - fig_checagens.png : checagens_avaliadas x d, eixo Y log, os dois motores nos
                        dois regimes, SOBREPONDO a curva teórica d^5 (tracejada)
                        que a força bruta seguiria sem o teto de aborto. É a
                        figura principal do capítulo.

Dependência (fora do monorepo Node): apenas matplotlib (leitura via csv stdlib;
pandas NÃO é necessário).
    pip install matplotlib

Uso:
    python plot.py                      # usa output/benchmark.csv
    python plot.py caminho/para.csv     # CSV alternativo
"""

import csv
import os
import sys
from collections import defaultdict

import matplotlib

matplotlib.use("Agg")  # backend sem display (salva direto em arquivo)
import matplotlib.pyplot as plt

AQUI = os.path.dirname(os.path.abspath(__file__))
CSV_PADRAO = os.path.join(AQUI, "output", "benchmark.csv")

ROTULO_MOTOR = {"ac3": "AC-3", "forca_bruta": "Força Bruta"}
ROTULO_REGIME = {"irrestrito": "Irrestrito", "selecao_parcial": "Seleção parcial"}
COR_MOTOR = {"ac3": "#1f77b4", "forca_bruta": "#d62728"}
ESTILO_REGIME = {"irrestrito": "-", "selecao_parcial": "--"}
MARCA_MOTOR = {"ac3": "o", "forca_bruta": "s"}


def ler_csv(caminho):
    """Retorna estruturas indexadas por regime/motor a partir do CSV."""
    # dados[regime][motor] = list de dict(d, tempo, checagens, teorico, concluido)
    dados = defaultdict(lambda: defaultdict(list))
    teorico = {}  # d -> d^5
    with open(caminho, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            regime = row["regime"]
            motor = row["motor"]
            d = int(row["d"])
            dados[regime][motor].append(
                {
                    "d": d,
                    "tempo": float(row["tempo_ms_mediano"]),
                    "checagens": float(row["checagens_avaliadas"]),
                    "concluido": row["concluido"].strip().lower() == "true",
                }
            )
            teorico[d] = float(row["combinacoes_totais_teoricas"])
    for regime in dados:
        for motor in dados[regime]:
            dados[regime][motor].sort(key=lambda r: r["d"])
    return dados, teorico


def _pontos_abortados(pontos, chave):
    xs = [p["d"] for p in pontos if not p["concluido"]]
    ys = [p[chave] for p in pontos if not p["concluido"]]
    return xs, ys


def figura_tempo(dados, saida):
    regimes = [r for r in ("irrestrito", "selecao_parcial") if r in dados]
    fig, axes = plt.subplots(1, len(regimes), figsize=(6 * len(regimes), 5), sharey=True, squeeze=False)
    for ax, regime in zip(axes[0], regimes):
        for motor, pontos in dados[regime].items():
            ds = [p["d"] for p in pontos]
            tempos = [p["tempo"] for p in pontos]
            ax.plot(ds, tempos, marker=MARCA_MOTOR.get(motor, "o"), color=COR_MOTOR.get(motor),
                    linewidth=1.8, markersize=6, label=ROTULO_MOTOR.get(motor, motor))
            ax_x, ax_y = _pontos_abortados(pontos, "tempo")
            if ax_x:
                ax.scatter(ax_x, ax_y, marker="X", s=150, color="black", zorder=5,
                           label="FB abortada no teto")
        ax.set_yscale("log")
        ax.set_title(ROTULO_REGIME.get(regime, regime))
        ax.set_xlabel("d — componentes por categoria")
        ax.grid(True, which="both", linestyle=":", alpha=0.5)
        ax.legend()
    axes[0][0].set_ylabel("tempo (ms) — escala log")
    fig.suptitle("Tempo de execução × tamanho do domínio (por regime)")
    fig.tight_layout()
    fig.savefig(saida, dpi=150)
    print(f"Figura salva em: {saida}")


def figura_checagens(dados, teorico, saida):
    fig, ax = plt.subplots(figsize=(9, 6))

    # Séries por (regime, motor).
    for regime, motores in dados.items():
        for motor, pontos in motores.items():
            ds = [p["d"] for p in pontos]
            checagens = [p["checagens"] for p in pontos]
            rotulo = f"{ROTULO_MOTOR.get(motor, motor)} — {ROTULO_REGIME.get(regime, regime)}"
            ax.plot(ds, checagens, marker=MARCA_MOTOR.get(motor, "o"), color=COR_MOTOR.get(motor),
                    linestyle=ESTILO_REGIME.get(regime, "-"), linewidth=1.6, markersize=5, label=rotulo)
            ax_x, ax_y = _pontos_abortados(pontos, "checagens")
            if ax_x:
                ax.scatter(ax_x, ax_y, marker="X", s=140, color="black", zorder=5)

    # Curva teórica d^5 (o que a FB faria sem teto).
    ds_teo = sorted(teorico.keys())
    ax.plot(ds_teo, [teorico[d] for d in ds_teo], linestyle=(0, (6, 4)), color="gray",
            linewidth=2.0, label="Curva teórica $d^5$ (FB sem teto)")

    ax.set_yscale("log")
    ax.set_xlabel("d — componentes por categoria")
    ax.set_ylabel("checagens de restrição — escala log")
    ax.set_title("Checagens de restrição × tamanho do domínio\n(marcador X = força bruta abortada no teto)")
    ax.grid(True, which="both", linestyle=":", alpha=0.5)
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(saida, dpi=150)
    print(f"Figura salva em: {saida}")


def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else CSV_PADRAO
    if not os.path.exists(csv_path):
        sys.exit(f"CSV não encontrado: {csv_path}\nRode o benchmark primeiro (pnpm ... benchmark).")

    dados, teorico = ler_csv(csv_path)
    out = os.path.dirname(csv_path)
    figura_tempo(dados, os.path.join(out, "fig_tempo.png"))
    figura_checagens(dados, teorico, os.path.join(out, "fig_checagens.png"))


if __name__ == "__main__":
    main()
