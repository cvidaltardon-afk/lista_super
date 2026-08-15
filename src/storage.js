// Reemplazo de window.storage (API propia de los artefactos de Claude)
// usando localStorage del navegador, para que la app funcione como
// sitio independiente fuera de Claude.

const PREFIX = "lista-super::";

export const storage = {
  async get(key) {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) {
      // Misma convención que window.storage: clave inexistente -> excepción
      throw new Error(`No existe la clave "${key}" en localStorage`);
    }
    return { key, value: raw, shared: false };
  },

  async set(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    } catch (e) {
      return null;
    }
  },

  async delete(key) {
    window.localStorage.removeItem(PREFIX + key);
    return { key, deleted: true, shared: false };
  },

  async list(prefix = "") {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const fullKey = window.localStorage.key(i);
      if (fullKey && fullKey.startsWith(PREFIX + prefix)) {
        keys.push(fullKey.slice(PREFIX.length));
      }
    }
    return { keys, prefix, shared: false };
  },
};
