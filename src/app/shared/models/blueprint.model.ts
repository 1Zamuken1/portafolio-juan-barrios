export interface BlueprintNode {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface BlueprintEdge {
  from: string;
  to: string;
}

export interface BlueprintLayout {
  orientation?: 'vertical' | 'horizontal' | 'pipeline' | 'tree' | 'auto';
  rankDir?: 'LR' | 'TB';
}
