export interface FieldDefinition {
  key: string;
  required?: boolean;
  visible?: boolean;
  storage?: string;
  label?: string;
}

export interface EntityProfile {
  fields: FieldDefinition[];
}

export interface BusinessProfileUi {
  navHidden?: string[];
}

export interface BusinessProfile {
  id: string;
  code?: string;
  name: string;
  version?: number;
  modules: Record<string, boolean>;
  entities?: Record<string, EntityProfile>;
  strategies?: Record<string, string>;
  pricing?: Record<string, unknown>;
  ui?: BusinessProfileUi;
}

export interface BusinessProfileOption {
  id: string;
  name: string;
}
