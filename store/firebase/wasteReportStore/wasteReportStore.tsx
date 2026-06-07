import { create } from 'zustand';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  arrayUnion,
  arrayRemove,
  getDoc,
  limit,
  runTransaction,
  serverTimestamp,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { decode } from '@googlemaps/polyline-codec';
import { getConstituency } from '@/lib/constituency';
import { fetchAddress, fetchRoadClassification } from '@/services/geo';

import {
  WasteReportProp,
  CreateWasteReportInputProp,
  UpdateWasteReportInputProp,
  WasteReportStoreProp
} from './wasteReportStoreProperties';

const reportConverter: FirestoreDataConverter<WasteReportProp> = {
  toFirestore(report: any) {
    if (!report) return {};
    const { id, ...rest } = report;
    return rest;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): WasteReportProp {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      userId: data.userId,
      encodedPath: data.encodedPath,
      createdAt: data.createdAt,
      status: data.status,
      severity: data.severity,
      address: data.address,
      district: data.district,
      pincode: data.pincode,
      acName: data.acName,
      acNo: data.acNo,
      pcName: data.pcName,
      lsgd: data.lsgd,
      lsgdType: data.lsgdType,
      lsgdLabel: data.lsgdLabel,
      lsgCode: data.lsgCode,
      wardNo: data.wardNo,
      wardName: data.wardName,
      secLsgCode: data.secLsgCode,
      highwayTag: data.highwayTag,
      roadAuthority: data.roadAuthority,
      distanceM: data.distanceM,
      userPhotoURL: data.userPhotoURL,
      notes: data.notes,
      imageUrl: data.imageUrl,
      upvoterIds: data.upvoterIds || [],
      downvoterIds: data.downvoterIds || [],
      latitude: data.latitude,
      longitude: data.longitude,
    } as WasteReportProp;
  }
};

async function enrichReport(reportId: string, lat: number, lng: number, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const [adrData, constituency, roadInfo] = await Promise.all([
        fetchAddress(lat, lng),
        getConstituency(lat, lng),
        fetchRoadClassification(lat, lng)
      ]);

      console.log('adrData', adrData);

      const updates: Record<string, any> = {};

      if (adrData?.display_name) {
        updates.address = adrData.display_name;
      }
      const districtVal =
        adrData?.address?.state_district ||
        adrData?.address?.county ||
        adrData?.address?.city_district ||
        null;
      if (districtVal) {
        updates.district = districtVal;
      }
      if (adrData?.address?.postcode) {
        updates.pincode = adrData.address.postcode;
      }

      if (constituency) {
        updates.acName = constituency.acName;
        updates.acNo = constituency.acNo;
        updates.pcName = constituency.pcName;
        if (constituency.lsgd) updates.lsgd = constituency.lsgd;
        if (constituency.lsgdType) updates.lsgdType = constituency.lsgdType;
        if (constituency.lsgdLabel) updates.lsgdLabel = constituency.lsgdLabel;
        if (constituency.wardNo != null) updates.wardNo = constituency.wardNo;
        if (constituency.wardName) updates.wardName = constituency.wardName;
        if (constituency.secLsgCode) updates.secLsgCode = constituency.secLsgCode;
      }

      if (roadInfo) {
        updates.highwayTag = roadInfo.highwayTag;
        updates.roadAuthority = roadInfo.roadAuthority;
      }

      if (Object.keys(updates).length > 0) {
        const docRef = doc(db, 'waste_reports', reportId).withConverter(reportConverter);
        await updateDoc(docRef, updates);
      }
      return; // Success!
    } catch (err) {
      console.warn(`Enrichment attempt ${i + 1} failed:`, err);
      if (i === retries - 1) {
        console.error('Error enriching report in background after retries:', err);
      } else {
        await new Promise((res) => setTimeout(res, delay * Math.pow(2, i)));
      }
    }
  }
}

export const addRecord = async (payload: CreateWasteReportInputProp): Promise<string> => {
  try {
    const payloadWithTime = {
      ...payload,
      createdAt: payload.createdAt || serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'waste_reports').withConverter(reportConverter), payloadWithTime);
    const reportId = docRef.id;

    // Extract coordinates to trigger enrichment in background
    let lat = payload.latitude;
    let lng = payload.longitude;
    if ((lat === undefined || lng === undefined) && payload.encodedPath) {
      try {
        const decoded = decode(payload.encodedPath, 5);
        if (decoded && decoded.length > 0) {
          const midPoint = decoded[Math.floor(decoded.length / 2)];
          lat = midPoint[0];
          lng = midPoint[1];
        }
      } catch (err) {
        console.error("Failed to decode encodedPath in addRecord:", err);
      }
    }

    if (lat !== undefined && lng !== undefined) {
      // Run background enrichment without awaiting
      enrichReport(reportId, lat, lng).catch(() => { });
    }

    return reportId;
  } catch (err: any) {
    console.error('Firestore addRecord error:', err);
    throw err;
  }
};

export const deleteRecord = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'waste_reports', id).withConverter(reportConverter);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.error('Firestore deleteRecord error:', err);
    throw err;
  }
};

export const editRecord = async (id: string, updates: UpdateWasteReportInputProp): Promise<void> => {
  try {
    const docRef = doc(db, 'waste_reports', id).withConverter(reportConverter);
    
    // Fetch existing document to check if coordinates changed
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      throw new Error("Document does not exist");
    }
    const existingData = existingSnap.data();

    await updateDoc(docRef, updates);

    // If coordinates or encodedPath changed, trigger background enrichment
    let lat = updates.latitude;
    let lng = updates.longitude;
    if ((lat === undefined || lng === undefined) && updates.encodedPath) {
      try {
        const decoded = decode(updates.encodedPath, 5);
        if (decoded && decoded.length > 0) {
          const midPoint = decoded[Math.floor(decoded.length / 2)];
          lat = midPoint[0];
          lng = midPoint[1];
        }
      } catch (err) {
        console.error("Failed to decode encodedPath in editRecord:", err);
      }
    }

    if (lat !== undefined && lng !== undefined) {
      // Only enrich if coordinates actually changed
      const coordsChanged = existingData.latitude !== lat || existingData.longitude !== lng;
      if (coordsChanged) {
        enrichReport(id, lat, lng).catch(() => { });
      }
    }
  } catch (err: any) {
    console.error('Firestore editRecord error:', err);
    throw err;
  }
};

export const voteRecord = async (
  id: string,
  type: 'up' | 'down',
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'waste_reports', id).withConverter(reportConverter);
    await runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(docRef);
      if (!sfDoc.exists()) {
        throw new Error("Document does not exist!");
      }

      const data = sfDoc.data() || {};
      const upvoterIds = (data.upvoterIds || []) as string[];
      const downvoterIds = (data.downvoterIds || []) as string[];

      const hasUpvoted = upvoterIds.includes(userId);
      const hasDownvoted = downvoterIds.includes(userId);

      let newUpvoterIds = [...upvoterIds];
      let newDownvoterIds = [...downvoterIds];

      if (type === 'up') {
        if (hasUpvoted) {
          newUpvoterIds = newUpvoterIds.filter(uid => uid !== userId);
        } else {
          newUpvoterIds.push(userId);
          newDownvoterIds = newDownvoterIds.filter(uid => uid !== userId);
        }
      } else {
        if (hasDownvoted) {
          newDownvoterIds = newDownvoterIds.filter(uid => uid !== userId);
        } else {
          newDownvoterIds.push(userId);
          newUpvoterIds = newUpvoterIds.filter(uid => uid !== userId);
        }
      }

      transaction.update(docRef, {
        upvoterIds: newUpvoterIds,
        downvoterIds: newDownvoterIds
      });
    });
  } catch (err: any) {
    console.error('Firestore voteRecord error:', err);
    throw err;
  }
};

export const useWasteReports = create<WasteReportStoreProp>((set, get) => {
  return {
    reports: [],
    loading: true,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isVoting: false,
    error: null,
    draft: {},
    updateDraft: (updates) => {
      set((state) => ({ draft: { ...state.draft, ...updates } }));
    },
    clearDraft: () => {
      set({ draft: {} });
    },
    getRecord: async (id: string) => {
      const local = get().reports.find((r) => r.id === id);
      if (local) return local;

      try {
        const docRef = doc(db, 'waste_reports', id).withConverter(reportConverter);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data();
        }
      } catch (err) {
        console.error('Error fetching document from Firestore:', err);
      }
      return null;
    },
    addRecord: async (payload) => {
      set({ isCreating: true });
      try {
        const id = await addRecord(payload);
        return id;
      } finally {
        set({ isCreating: false });
      }
    },
    deleteRecord: async (id) => {
      set({ isDeleting: true });
      try {
        await deleteRecord(id);
      } finally {
        set({ isDeleting: false });
      }
    },
    editRecord: async (id, updates) => {
      set({ isUpdating: true });
      try {
        await editRecord(id, updates);
      } finally {
        set({ isUpdating: false });
      }
    },
    voteRecord: async (id, type, userId) => {
      set({ isVoting: true });
      try {
        await voteRecord(id, type, userId);
      } finally {
        set({ isVoting: false });
      }
    },
    initialize: () => {
      set({ loading: true, error: null });
      const q = query(
        collection(db, 'waste_reports').withConverter(reportConverter),
        orderBy('createdAt', 'desc'),
        limit(200)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const reportsList: WasteReportProp[] = [];
          snapshot.forEach((doc) => {
            reportsList.push(doc.data());
          });
          set({ reports: reportsList, loading: false });
        },
        (err) => {
          console.error('Firestore subscription error:', err);
          set({ error: err.message, loading: false });
        }
      );

      return unsubscribe;
    }
  };
});
