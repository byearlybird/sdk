export type IdGenerator = () => string;

export const generateId: IdGenerator = () => crypto.randomUUID();
