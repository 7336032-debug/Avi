// Client-side data client: same `.from(table)...` shape the rest of the
// app already speaks (see queryBuilder.ts), backed by this device's
// localStorage instead of a server. No login — there's exactly one
// implicit local user.

import { LOCAL_USER_ID } from "./store";
import { LocalQueryBuilder, type StoreAccessor } from "./queryBuilder";
import { readStore, writeStore } from "./browserStore";

const browserAccessor: StoreAccessor = {
  get: readStore,
  set: writeStore,
};

export function createBrowserClient() {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from<T = any>(table: string) {
      return new LocalQueryBuilder<T>(table, browserAccessor);
    },
    auth: {
      async getUser() {
        return { data: { user: { id: LOCAL_USER_ID, email: "" } }, error: null };
      },
    },
  };
}
