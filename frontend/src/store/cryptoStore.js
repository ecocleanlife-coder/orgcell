import { create } from 'zustand';
import { get, set, del } from 'idb-keyval';
import { generateMasterKey, exportKey, importKey } from '../utils/cryptoUtils';

const STORAGE_KEY = 'orgcell_master_key';

const useCryptoStore = create((setStore, getStore) => ({
    masterKey: null,
    isKeyLoaded: false,

    initKey: async () => {
        try {
            // Check IndexedDB
            let key = await get(STORAGE_KEY);
            if (!key) {
                // First time user: generate a new AES-GCM key automatically
                key = await generateMasterKey();
                await set(STORAGE_KEY, key);
            }
            setStore({ masterKey: key, isKeyLoaded: true });
        } catch (err) {
            console.error("Failed to initialize Master Key", err);
            setStore({ isKeyLoaded: true }); // prevent blocking
        }
    },

    exportMasterKey: async () => {
        const { masterKey } = getStore();
        if (!masterKey) throw new Error("No master key found");
        return await exportKey(masterKey);
    },

    importMasterKey: async (base64Str) => {
        try {
            const newKey = await importKey(base64Str);
            await set(STORAGE_KEY, newKey);
            setStore({ masterKey: newKey });
            return true;
        } catch (err) {
            console.error("Failed to import key", err);
            return false;
        }
    },

    clearKey: async () => {
        await del(STORAGE_KEY);
        setStore({ masterKey: null });
    }
}));

export default useCryptoStore;
