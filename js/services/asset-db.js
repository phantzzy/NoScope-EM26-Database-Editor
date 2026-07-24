const AssetDB = (() => {
    const DB_NAME = "noscope-assets";
    const STORE_NAME = "images";

    function open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                    request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function run(mode, operation) {
        const database = await open();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, mode);
            const request = operation(transaction.objectStore(STORE_NAME));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => database.close();
        });
    }

    return {
        async get(key) {
            const record = await run("readonly", store => store.get(key));
            return record?.blob || null;
        },
        put(key, blob) {
            return run("readwrite", store => store.put({ key, blob, updatedAt: Date.now() }));
        },
        remove(key) {
            return run("readwrite", store => store.delete(key));
        }
    };
})();
