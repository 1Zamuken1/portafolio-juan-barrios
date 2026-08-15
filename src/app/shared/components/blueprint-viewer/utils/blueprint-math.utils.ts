export class BlueprintMathUtils {
  static snapToGrid(value: number, gridSize: number): number {
    if (!gridSize) return value;
    return Math.round(value / gridSize) * gridSize;
  }
}
