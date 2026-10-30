import { ids, type CharacterId } from './model';
import { browserStorage, type StoragePort } from '../shell/storage';
export { others } from './model';
export const CHARACTER_KEY = 'arcade-lab:character:v1';
let fallback: CharacterId = 'panda';
const sessionChoices = new WeakMap<StoragePort, CharacterId>();
export function selectedCharacter(storage: StoragePort | undefined = browserStorage()): CharacterId {
    if (!storage) return fallback;
    const session = sessionChoices.get(storage);
    if (session) return session;
    try {
        const value = storage.getItem(CHARACTER_KEY);
        return ids.find(id => id === value) ?? 'panda';
    } catch { return fallback; }
}
export function selectCharacter(id: CharacterId, storage: StoragePort | undefined = browserStorage()): void {
    fallback = id;
    if (!storage) return;
    try { storage.setItem(CHARACTER_KEY, id); sessionChoices.delete(storage); }
    catch { sessionChoices.set(storage, id); }
}
