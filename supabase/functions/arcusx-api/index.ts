import { handleOptions } from '../_shared/arcusx-cors.ts';
import { dispatch } from './handlers/router.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  return dispatch(req);
});
