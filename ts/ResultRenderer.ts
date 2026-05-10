// ts/ResultRenderer.ts
import {Fraction} from "./Fraction";

export class ResultRenderer {
    /**
     * Рендеринг кроків симплекс-методу (таблиці)
     */
    public static render(history: any[], container: HTMLElement): void {
        container.innerHTML = '';
        history.forEach((step, idx) => {
            const card = document.createElement('div');
            card.className = 'card step-card';
            let html = `<h3 style="margin-bottom: 1rem; color: #1e293b;">Крок №${idx}: ${step.description}</h3>`;
            html += `<div class="table-responsive"><table class="transport-table">`;

            html += `<thead><tr><th>Базис</th>`;
            const totalCols = step.matrix[0].length;
            for (let j = 1; j < totalCols; j++) html += `<th>x<sub>${j}</sub></th>`;
            html += `<th>B</th></tr></thead><tbody>`;

            step.matrix.forEach((row: any[], i: number) => {
                const isZRow = i === step.matrix.length - 1;
                html += `<tr><td class="label-cell" style="background: #f8fafc; font-weight: bold;">
                    ${isZRow ? 'Z' : 'x' + (step.basis[i] + 1)}
                </td>`;

                row.forEach((cell, j) => {
                    const isPivotRow = (i === step.pivotRow);
                    const isPivotCol = (j === step.pivotCol);
                    const isIntersection = isPivotRow && isPivotCol;

                    let style = '';
                    if (isIntersection) {
                        style = 'background: #d1fae5; font-weight: bold; border: 2px solid #10b981; color: #065f46;';
                    } else if (isPivotRow) {
                        style = 'background: #fff7ed; color: #9a3412;';
                    } else if (isPivotCol) {
                        style = 'background: #eff6ff; color: #1e40af;';
                    }
                    html += `<td style="${style}">${this.formatFraction(cell)}</td>`;
                });
                html += `</tr>`;
            });

            html += `</tbody></table></div>`;
            card.innerHTML = html;
            container.appendChild(card);
        });
    }

    /**
     * Рендеринг графічного методу (Canvas)
     */
    /**
     * Рендеринг графічного методу (Canvas) з повним оформленням
     */
    public static renderGraphical(result: any, container: HTMLElement): void {
        const canvasId = 'graph-canvas';
        container.innerHTML = `
        <div class="card step-card">
            <h3 style="margin-bottom: 1rem;">📈 Графічний розв'язок</h3>
            <div style="display: flex; justify-content: center; background: #fff; padding: 15px; border-radius: 8px;">
                <canvas id="${canvasId}" width="500" height="500" style="border: 1px solid #e2e8f0; max-width: 100%;"></canvas>
            </div>
            <div style="margin-top: 15px; padding: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                <p style="color: #166534;"><b>Оптимальна точка:</b> <span style="font-weight:700">(${result.best.x1.toFixed(2)}; ${result.best.x2.toFixed(2)})</span></p>
                <p style="color: #166534;"><b>Значення Z = </b> <span style="font-weight:700">${result.best.z.toFixed(2)}</span></p>
            </div>
        </div>`;

        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;

        const pad = 60;
        const maxX = Math.max(...result.points.map((p: any) => p.x), 5) * 1.2;
        const maxY = Math.max(...result.points.map((p: any) => p.y), 5) * 1.2;

        const toX = (x: number) => pad + (x * (canvas.width - pad * 2) / maxX);
        const toY = (y: number) => canvas.height - pad - (y * (canvas.height - pad * 2) / maxY);

        // 1. Сітка
        ctx.strokeStyle = '#f1f5f9';
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
            const x = (maxX / 10) * i;
            const y = (maxY / 10) * i;
            ctx.moveTo(toX(x), toY(0)); ctx.lineTo(toX(x), toY(maxY));
            ctx.moveTo(toX(0), toY(y)); ctx.lineTo(toX(maxX), toY(y));
        }
        ctx.stroke();

        // 2. ОДР (Заливка)
        if (result.points.length > 2) {
            const cx = result.points.reduce((a: any, b: any) => a + b.x, 0) / result.points.length;
            const cy = result.points.reduce((a: any, b: any) => a + b.y, 0) / result.points.length;
            const sorted = [...result.points].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

            ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
            ctx.beginPath();
            ctx.moveTo(toX(sorted[0].x), toY(sorted[0].y));
            sorted.forEach(p => ctx.lineTo(toX(p.x), toY(p.y)));
            ctx.closePath();
            ctx.fill();
        }

        // 3. ЛІНІЇ ОБМЕЖЕНЬ ТА РІВНЯННЯ
        result.lines.forEach((l: any, i: number) => {
            const color = `hsl(${i * 137.5}, 65%, 45%)`;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            if (Math.abs(l.b) > 1e-9) {
                ctx.moveTo(toX(0), toY(l.c / l.b));
                ctx.lineTo(toX(maxX), toY((l.c - l.a * maxX) / l.b));
            } else {
                ctx.moveTo(toX(l.c / l.a), toY(0));
                ctx.lineTo(toX(l.c / l.a), toY(maxY));
            }
            ctx.stroke();

            // Підпис рівняння
            ctx.font = 'italic 11px Inter';
            let eq = `${l.a.toFixed(1)}x₁ ${l.b >= 0 ? '+' : ''} ${l.b.toFixed(1)}x₂ = ${l.c.toFixed(1)}`;
            const textW = ctx.measureText(eq).width;

            let lx = Math.abs(l.b) > 1e-9 ? toX(maxX * 0.6) : toX(l.c / l.a) + 5;
            let ly = Math.abs(l.b) > 1e-9 ? toY((l.c - l.a * maxX * 0.6) / l.b) - 5 : toY(maxY * 0.7);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(lx - 2, ly - 12, textW + 4, 14);
            ctx.fillStyle = color;
            ctx.fillText(eq, lx, ly);
        });

        // 4. ГРАДІЄНТ (Вектор Z)
        const [objC1, objC2] = result.objCoeffs;
        if (Math.abs(objC1) > 0.01 || Math.abs(objC2) > 0.01) {
            const sX = toX(0), sY = toY(0);
            const len = Math.sqrt(objC1**2 + objC2**2);
            const vX = toX((objC1 / len) * (maxX * 0.2)), vY = toY((objC2 / len) * (maxY * 0.2));

            ctx.strokeStyle = '#1e40af'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(sX, sY); ctx.lineTo(vX, vY); ctx.stroke();

            const ang = Math.atan2(vY - sY, vX - sX);
            ctx.fillStyle = '#1e40af'; ctx.beginPath();
            ctx.moveTo(vX, vY);
            ctx.lineTo(vX - 12 * Math.cos(ang - 0.4), vY - 12 * Math.sin(ang - 0.4));
            ctx.lineTo(vX - 12 * Math.cos(ang + 0.4), vY - 12 * Math.sin(ang + 0.4));
            ctx.fill();
            ctx.fillText('grad Z', vX + 5, vY);
        }

        // 5. ЛІНІЯ РІВНЯ (Indigo пунктир)
        const curZ = result.best.z;
        ctx.setLineDash([8, 4]); ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2;
        ctx.beginPath();
        if (Math.abs(objC2) > 1e-9) {
            ctx.moveTo(toX(0), toY(curZ / objC2));
            ctx.lineTo(toX(maxX), toY((curZ - objC1 * maxX) / objC2));
        } else {
            ctx.moveTo(toX(curZ / objC1), toY(0));
            ctx.lineTo(toX(curZ / objC1), toY(maxY));
        }
        ctx.stroke(); ctx.setLineDash([]);

        // 6. ОСІ
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(pad, 10); ctx.lineTo(pad, canvas.height - pad); ctx.lineTo(canvas.width - 10, canvas.height - pad);
        ctx.stroke();
        ctx.fillStyle = '#334155'; ctx.font = 'bold 14px Inter';
        ctx.fillText('x₂', pad - 25, 20); ctx.fillText('x₁', canvas.width - 20, canvas.height - pad + 25);

        // 7. ОПТИМАЛЬНА ТОЧКА
        ctx.fillStyle = '#ef4444'; ctx.beginPath();
        ctx.arc(toX(result.best.x1), toY(result.best.x2), 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e293b'; ctx.font = 'bold 13px Inter';
        ctx.fillText(`Opt (${result.best.x1.toFixed(2)}; ${result.best.x2.toFixed(2)})`, toX(result.best.x1) + 12, toY(result.best.x2) - 12);
    }

    /**
     * Рендеринг транспортної задачі
     */
    public static renderTransport(history: any[], costs: any[][], container: HTMLElement): void {
        container.innerHTML = '';
        history.forEach((step, idx) => {
            const card = document.createElement('div');
            card.className = 'card step-card';
            let html = `<h4>Крок №${idx}: ${step.description}</h4>`;
            html += `<div class="table-responsive"><table class="transport-table">`;
            html += `<thead><tr><th>A \\ B</th>`;
            for (let j = 0; j < step.matrix[0].length; j++) html += `<th>B${j+1}</th>`;
            html += `</tr></thead><tbody>`;

            step.matrix.forEach((row: any[], i: number) => {
                html += `<tr><td class="label-cell">A${i+1}</td>`;
                row.forEach((cell, j) => {
                    const isPivot = (i === step.pivotRow && j === step.pivotCol);
                    const cost = costs[i] && costs[i][j] ? costs[i][j].toString() : "0";
                    html += `
                    <td class="transport-cell" style="${isPivot ? 'background: #ecfdf5; border: 2px solid #10b981;' : ''}">
                        <div class="cell-combined">
                            <div class="cell-cost">${cost}</div>
                            <div class="cell-qty">${cell.isZero() ? '' : this.formatFraction(cell)}</div>
                        </div>
                    </td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table></div>`;
            card.innerHTML = html;
            container.appendChild(card);
        });
    }

    private static formatFraction(f: Fraction): string {
        if (f.den === 1) return f.num.toString();
        return `<span class="fraction"><span class="numerator">${f.num}</span><span class="denominator">${f.den}</span></span>`;
    }
}