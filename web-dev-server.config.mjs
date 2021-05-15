import { fromRollup } from '@web/dev-server-rollup';
import rollupReplace from '@rollup/plugin-replace';

const replace = fromRollup(rollupReplace);

export default {
  plugins: [
    replace({
      // setting "include" is important for performance
      include: [],
      'process.env.NODE_ENV': '"development"',
    }),
  ],
};