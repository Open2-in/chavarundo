import { useState, useEffect } from 'react';
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
  getDoc
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

async function enrichReport(reportId: string, lat: number, lng: number) {
  try {
    const [adrData, constituency, roadInfo] = await Promise.all([
      fetchAddress(lat, lng),
      getConstituency(lat, lng),
      fetchRoadClassification(lat, lng)
    ]);

    console.log('adrData', adrData)

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
      const docRef = doc(db, 'waste_reports', reportId);
      await updateDoc(docRef, updates);
    }
  } catch (err) {
    console.error('Error enriching report in background:', err);
  }
}

// Global actions to manipulate Firestore waste reports

export const addRecord = async (payload: CreateWasteReportInputProp): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'waste_reports'), payload);
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
    const docRef = doc(db, 'waste_reports', id);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.error('Firestore deleteRecord error:', err);
    throw err;
  }
};

export const editRecord = async (id: string, updates: UpdateWasteReportInputProp): Promise<void> => {
  try {
    const docRef = doc(db, 'waste_reports', id);
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
      // Run background enrichment without awaiting
      enrichReport(id, lat, lng).catch(() => { });
    }
  } catch (err: any) {
    console.error('Firestore editRecord error:', err);
    throw err;
  }
};

export const voteRecord = async (
  id: string,
  type: 'up' | 'down',
  userId: string,
  currentUpvoters: string[] = [],
  currentDownvoters: string[] = []
): Promise<void> => {
  try {
    const docRef = doc(db, 'waste_reports', id);
    const hasUpvoted = currentUpvoters.includes(userId);
    const hasDownvoted = currentDownvoters.includes(userId);

    const updates: Record<string, any> = {};

    if (type === 'up') {
      if (hasUpvoted) {
        updates.upvoterIds = arrayRemove(userId);
      } else {
        updates.upvoterIds = arrayUnion(userId);
        if (hasDownvoted) {
          updates.downvoterIds = arrayRemove(userId);
        }
      }
    } else {
      if (hasDownvoted) {
        updates.downvoterIds = arrayRemove(userId);
      } else {
        updates.downvoterIds = arrayUnion(userId);
        if (hasUpvoted) {
          updates.upvoterIds = arrayRemove(userId);
        }
      }
    }

    await updateDoc(docRef, updates);
  } catch (err: any) {
    console.error('Firestore voteRecord error:', err);
    throw err;
  }
};

// Global react hook to listen to updates and return actions
export function useWasteReports(): WasteReportStoreProp {
  const [reports, setReports] = useState<WasteReportProp[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = query(collection(db, 'waste_reports'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reportsList: WasteReportProp[] = [];
        snapshot.forEach((doc) => {
          reportsList.push({
            id: doc.id,
            ...(doc.data() as Omit<WasteReportProp, 'id'>),
          } as WasteReportProp);
        });
        setReports(reportsList);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore subscription error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const [draft, setDraft] = useState<Partial<WasteReportProp>>({});

  const updateDraft = (updates: Partial<WasteReportProp>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const clearDraft = () => {
    setDraft({});
  };

  const getRecord = async (id: string): Promise<WasteReportProp | null> => {
    const local = reports.find((r) => r.id === id);
    if (local) return local;

    try {
      const docRef = doc(db, 'waste_reports', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...(docSnap.data() as Omit<WasteReportProp, 'id'>)
        } as WasteReportProp;
      }
    } catch (err) {
      console.error('Error fetching document from Firestore:', err);
    }
    return null;
  };

  return {
    reports,
    loading,
    error,
    addRecord,
    deleteRecord,
    getRecord,
    editRecord,
    voteRecord,
    draft,
    updateDraft,
    clearDraft
  };
}
