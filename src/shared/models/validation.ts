import type {
  Config,
  Incremental,
  PluginMetadataWithConfig,
  PluginName,
  RefPosition,
  RuleMetadataWithConfig,
  ValidationResponse,
} from '@monokle/validation';

import type {SarifRule} from './policy';

type Initialization = 'uninitialized' | 'loading' | 'error' | 'loaded';

export type ValidationState = {
  config: Config;
  status: Initialization;
  lastResponse?: ValidationResponse;
  loadRequestId?: string;
  /**
   * The plugin metadata and configuration for all plugins.
   */
  metadata?: Record<PluginName, PluginMetadataWithConfig>;

  /**
   * The rule metadata and configuration for all plugins.
   */
  rules?: Record<PluginName, RuleMetadataWithConfig[]>;
};

export type ResourceValidationError = {
  property: string;
  message: string;
  errorPos?: RefPosition;
  description?: string;
  rule?: SarifRule;
};

export type ResourceValidation = {
  isValid: boolean;
  errors: ResourceValidationError[];
};

export type LoadValidationResult = {
  rules: Record<PluginName, RuleMetadataWithConfig[]>;
  metadata: Record<PluginName, PluginMetadataWithConfig>;
};

export type ValidationArgs = {
  incremental?: Incremental;
};
