import {Fraction} from "./Fraction";

export interface Tableau {
    matrix: Fraction[][];
    basis: number[];
    pivotRow?: number;
    pivotCol?: number;
    description: string;
}
export interface ISolverStrategy {
    solve(data: any): Tableau[];
}