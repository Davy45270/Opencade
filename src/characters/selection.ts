import { ids, type CharacterId } from './model';
import { browserStorage, readValue, writeValue, type StoragePort } from '../shell/storage';
export { others } from './model';
export const CHARACTER_KEY = 'arcade-lab:character:v1';
let fallback: CharacterId = 'panda';
export function selectedCharacter(storage: StoragePort | undefined = browserStorage()): CharacterId {
    const value = readValue(storage, CHARACTER_KEY);
    return ids.find(id => id === value) ?? (storage ? 'panda' : fallback);
}
export function selectCharacter(id: CharacterId, storage: StoragePort | undefined = browserStorage()): void {
    fallback = id;
    writeValue(storage, CHARACTER_KEY, id);
}
