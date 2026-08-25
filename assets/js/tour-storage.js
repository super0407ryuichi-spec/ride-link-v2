(() => {
  const STORAGE_KEY = 'ride-link-v2:tours';
  const STORAGE_VERSION = 1;

  const storageAvailable = () => {
    try {
      const testKey = `${STORAGE_KEY}:test`;
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  };

  const normalizeTour = (tour) => ({
    id: String(tour.id || ''),
    title: String(tour.title || ''),
    origin: String(tour.origin || ''),
    waypoints: Array.isArray(tour.waypoints)
      ? tour.waypoints.map((point) => String(point)).filter(Boolean)
      : [],
    destination: String(tour.destination || ''),
    returnPoint: String(tour.returnPoint || ''),
    createdAt: String(tour.createdAt || '')
  });

  const readStore = () => {
    if (!storageAvailable()) throw new Error('storage-unavailable');

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: STORAGE_VERSION, tours: [] };
      const parsed = JSON.parse(raw);
      const tours = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.tours)
          ? parsed.tours
          : [];
      return {
        version: STORAGE_VERSION,
        tours: tours.map(normalizeTour).filter((tour) => tour.id)
      };
    } catch (error) {
      if (error?.message === 'storage-unavailable') throw error;
      return { version: STORAGE_VERSION, tours: [] };
    }
  };

  const writeStore = (store) => {
    if (!storageAvailable()) throw new Error('storage-unavailable');
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  };

  const createId = () => {
    if (typeof window.crypto?.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `tour-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const list = () => readStore().tours.map((tour) => ({ ...tour, waypoints: [...tour.waypoints] }));

  const save = (draft) => {
    if (!draft?.origin || !draft?.destination) throw new Error('invalid-tour');

    const store = readStore();
    const existing = draft.id
      ? store.tours.find((tour) => tour.id === draft.id)
      : null;
    const record = normalizeTour({
      ...draft,
      id: draft.id || createId(),
      createdAt: existing?.createdAt || draft.createdAt || new Date().toISOString()
    });
    const existingIndex = store.tours.findIndex((tour) => tour.id === record.id);

    if (existingIndex >= 0) store.tours.splice(existingIndex, 1, record);
    else store.tours.unshift(record);

    writeStore(store);
    return { ...record, waypoints: [...record.waypoints] };
  };

  const getById = (id) => list().find((tour) => tour.id === id) || null;

  const remove = (id) => {
    const store = readStore();
    const nextTours = store.tours.filter((tour) => tour.id !== id);
    const removed = nextTours.length !== store.tours.length;
    if (removed) {
      store.tours = nextTours;
      writeStore(store);
    }
    return removed;
  };

  window.RideLinkTourStorage = Object.freeze({
    key: STORAGE_KEY,
    list,
    save,
    getById,
    remove
  });
})();