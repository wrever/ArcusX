import { handleOptions } from '../_shared/arcusx-cors.ts';
import { dispatch } from './handlers/router.ts';
import { tryDispatchRestV1 } from './handlers/rest-v1.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  const rest = await tryDispatchRestV1(req);
  if (rest) return rest;

  return dispatch(req);
});
