import { TransportationSolver } from '../../ts/TransportationSolver';
import { Fraction } from '../../ts/Fraction';

describe('TransportationSolver Unit Tests', () => {
    const solver = new TransportationSolver();

    test('should balance excess supply (dummy consumer)', () => {
        const data = {
            supply: [new Fraction(100)], demand: [new Fraction(50)],
            costs: [[new Fraction(1)]]
        };
        const history = solver.solve(data);
        expect(lastStep(history).matrix[0].length).toBe(2); // 1 реальний + 1 фіктивний
    });

    test('should balance excess demand (dummy supplier)', () => {
        const data = {
            supply: [new Fraction(50)], demand: [new Fraction(100)],
            costs: [[new Fraction(1)]]
        };
        const history = solver.solve(data);
        expect(lastStep(history).matrix.length).toBe(2); // 1 реальний + 1 фіктивний
    });

    test('should correctly allocate using minimum cost method', () => {
        const data = {
            supply: [new Fraction(10), new Fraction(10)],
            demand: [new Fraction(10), new Fraction(10)],
            costs: [
                [new Fraction(1), new Fraction(10)],
                [new Fraction(5), new Fraction(2)]
            ]
        };
        const history = solver.solve(data);
        expect(history[1].pivotRow).toBe(0);
        expect(history[1].pivotCol).toBe(0);
    });

    function lastStep(h: any[]) { return h[h.length - 1]; }
});