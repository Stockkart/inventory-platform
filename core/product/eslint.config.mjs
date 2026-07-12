import nx from '@nx/eslint-plugin';
import baseConfig, { domainUiKitHtmlBan } from '../../eslint.config.mjs';

export default [...baseConfig, ...nx.configs['flat/react'], domainUiKitHtmlBan];
