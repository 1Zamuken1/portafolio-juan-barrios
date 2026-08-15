// @ts-nocheck - Ambient declarations for test runner
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

import { BlueprintPathCalculator } from './blueprint-path-calculator';

describe('BlueprintPathCalculator', () => {
  let service: BlueprintPathCalculator;

  beforeEach(() => {
    service = new BlueprintPathCalculator();
  });

  describe('calculatePath (orthogonal)', () => {
    it('should create L-shape path for right->left connection on same plane', () => {
      const from = { x: 100, y: 50 };
      const to = { x: 400, y: 50 };
      
      const path = service.buildOrthogonalPath(from, to, 'right', 'left', 0);
      
      expect(path).toContain('M 100 50');
      expect(path).toContain('L 250 50');
      expect(path).toContain('L 400 50');
    });

    it('should offset parallel paths correctly with channelOffset', () => {
      const from = { x: 100, y: 50 };
      const to = { x: 400, y: 50 };
      
      const path1 = service.buildOrthogonalPath(from, to, 'right', 'left', 0);
      const path2 = service.buildOrthogonalPath(from, to, 'right', 'left', 12);
      
      expect(path1).not.toEqual(path2);
      expect(path2).toContain('L 262 50'); // 250 + 12
    });
    
    it('should create simple L-shape for mixed sides (right->top)', () => {
      const from = { x: 100, y: 50 };
      const to = { x: 400, y: 300 };
      
      const path = service.buildOrthogonalPath(from, to, 'right', 'top', 0);
      
      expect(path).toContain('M 100 50');
      expect(path).toContain('L 400 50');
      expect(path).toContain('L 400 300');
    });
  });

  describe('calculatePath (curved)', () => {
    it('should create Bézier curve', () => {
      const from = { x: 100, y: 50 };
      const to = { x: 400, y: 300 };
      
      const path = service.buildCurvedPath(from, to, 'right', 'left');
      
      expect(path).toContain('M 100 50');
      expect(path).toContain('C 150 50 350 300 400 300');
    });
  });
  
  describe('calculatePath (straight)', () => {
    it('should create direct line', () => {
      const from = { x: 100, y: 50 };
      const to = { x: 400, y: 300 };
      
      const path = service.buildStraightPath(from, to);
      
      expect(path).toEqual('M 100 50 L 400 300');
    });
  });
});
