// Vertical plugin schema types (from GET /shops/me/schema and GET /verticals/{id}/schema)

export type VerticalSchemaFieldType = 'string' | 'number' | 'date' | 'enum';

export type SchemaDisplayMode = 'regular' | 'basic' | 'invoice';

export type VerticalSchemaSurface = 'registration' | 'scan-sell' | 'onboarding' | 'invoice';

export type InventorySearchSortDirection = 'asc' | 'desc';

export interface VerticalSearchSortFieldDef {
  field: string;
  direction?: InventorySearchSortDirection;
  nulls?: 'last' | 'first';
}

export interface VerticalEntitySearchConfig {
  defaultSort?: VerticalSearchSortFieldDef[];
  cursor?: 'compound-key' | 'skip';
}

export interface InventorySearchSortState {
  field: string;
  direction: InventorySearchSortDirection;
}

export interface VerticalSchemaFieldDef {
  key: string;
  apiKey?: string;
  label?: string;
  type?: VerticalSchemaFieldType;
  required?: boolean;
  storage?: 'core' | 'extension';
  tier?: string;
  indexed?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  group?: string;
  showIn?: string[];
  values?: string[];
  validation?: Record<string, unknown>;
}

export interface VerticalEntitySchema {
  fields?: VerticalSchemaFieldDef[];
  search?: VerticalEntitySearchConfig;
}

export interface ShopSchemaResponse {
  shopId?: string;
  verticalId: string;
  pluginVersion: string;
  mode: SchemaDisplayMode;
  entities: Record<string, VerticalEntitySchema>;
}

export interface VerticalSummary {
  verticalId: string;
  version: string;
  status: string;
}

export type VerticalSchemaResponse = Omit<ShopSchemaResponse, 'shopId'>;
