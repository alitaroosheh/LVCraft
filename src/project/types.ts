/** LVCraft project manifest (lvproj.json) */
export interface LvProj {
  version: 1;
  lvglVersion: string;
  targetMcu?: string;
  resolution: { width: number; height: number };
  colorDepth: 8 | 16 | 32;
  memoryProfile?: 'minimal' | 'default' | 'large';
  theme?: string;
  generator?: GeneratorConfig;
  assetManifestHash?: string;
}

export interface GeneratorConfig {
  namingConvention?: 'snake_case' | 'camelCase';
  modularSplitting?: boolean;
}

/** Default values for new projects */
export const DEFAULT_LVPROJ: LvProj = {
  version: 1,
  lvglVersion: '9.0.0',
  resolution: { width: 320, height: 240 },
  colorDepth: 16,
  memoryProfile: 'default',
  theme: 'default',
  generator: { namingConvention: 'snake_case', modularSplitting: true }
};

/** Root widget tree (layout.json) */
export interface Layout {
  version: 1;
  root?: LayoutWidget;
}

/** Event binding: string = handler name, true/object = auto-generate stub */
export type EventBinding = string | true | Record<string, unknown>;

export interface LayoutWidget {
  type: string;
  id?: string;
  children?: LayoutWidget[];
  /** LV_EVENT_CLICKED */
  onClick?: EventBinding;
  onClicked?: EventBinding;
  /** LV_EVENT_VALUE_CHANGED */
  onValueChanged?: EventBinding;
  /** LV_EVENT_PRESSED / LV_EVENT_RELEASED */
  onPressed?: EventBinding;
  onReleased?: EventBinding;
  /** LV_EVENT_FOCUSED / LV_EVENT_DEFOCUSED */
  onFocus?: EventBinding;
  onFocused?: EventBinding;
  onDefocus?: EventBinding;
  onDefocused?: EventBinding;
  [key: string]: unknown;
}

/** Default empty layout */
export const DEFAULT_LAYOUT: Layout = {
  version: 1,
  root: undefined
};

/** Shared style entry (styles.json shared array) */
export interface SharedStyle extends Record<string, unknown> {
  id: string;
  bg_color?: number;
  bg_opa?: number;
  border_width?: number;
  border_color?: number;
  radius?: number;
  pad_all?: number;
  text_color?: number;
}

/** Shared and theme styles (styles.json) */
export interface Styles {
  version: 1;
  shared: SharedStyle[];
  theme?: Record<string, unknown>;
}

export const DEFAULT_STYLES: Styles = {
  version: 1,
  shared: [],
  theme: undefined
};

/** Asset manifest (assets.json) */
export interface Assets {
  version: 1;
  images: AssetEntry[];
  fonts: AssetEntry[];
}

export interface AssetEntry {
  path: string;
  id?: string;
  [key: string]: unknown;
}

export const DEFAULT_ASSETS: Assets = {
  version: 1,
  images: [],
  fonts: []
};
