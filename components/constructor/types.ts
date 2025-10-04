// Типы для No-Code конструктора
export interface ConstructorElement {
  id: string;
  type: 'block' | 'module' | 'container';
  component: string;
  props: Record<string, any>;
  children?: ConstructorElement[];
  position: { x: number; y: number };
  size: { width: number; height: number };
  responsive: ResponsiveSettings;
  animations?: AnimationSettings;
  zIndex: number;
}

export interface ResponsiveSettings {
  desktop: ElementSettings;
  tablet: ElementSettings;
  mobile: ElementSettings;
}

export interface ElementSettings {
  width: number;
  height: number;
  position: { x: number; y: number };
  visible: boolean;
  styles: Record<string, any>;
}

export interface AnimationSettings {
  type: 'entrance' | 'exit' | 'hover' | 'scroll';
  animation: string;
  duration: number;
  delay: number;
  easing: string;
}

export interface ConstructorState {
  elements: ConstructorElement[];
  selectedElement: string | null;
  viewport: 'desktop' | 'tablet' | 'mobile';
  zoom: number;
  grid: boolean;
  snapToGrid: boolean;
}

// Типы блоков
export type BlockType = 
  | 'container'
  | 'row'
  | 'column'
  | 'text'
  | 'image'
  | 'button'
  | 'form'
  | 'productGrid'
  | 'productFilter'
  | 'productCart'
  | 'priceCalculator'
  | 'productGallery'
  | 'productComparison';

export interface BlockDefinition {
  type: BlockType;
  name: string;
  category: 'layout' | 'content' | 'forms' | 'products';
  icon: string;
  defaultProps: Record<string, any>;
  defaultSize: { width: number; height: number };
  minSize: { width: number; height: number };
  maxSize: { width: number; height: number };
  resizable: boolean;
  draggable: boolean;
}

