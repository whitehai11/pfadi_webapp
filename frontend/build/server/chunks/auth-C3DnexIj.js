import { w as writable } from './index-BzU1KQlH.js';

const session = writable(null);
const roleLabel = (role) => {
  if (role === "user") return "Nutzer";
  if (role === "admin") return "Admin";
  return "Materialwart";
};

export { roleLabel as r, session as s };
//# sourceMappingURL=auth-C3DnexIj.js.map
