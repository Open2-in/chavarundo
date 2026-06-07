export interface AuthoritySubject {
  type: "mla" | "mp" | "ward" | "lsgd" | "district";
  name: string;
  party?: string | null;
  phone?: string | null;
  email?: string | null;
  idKey: string | number; // e.g. acNo for MLA, pcName for MP, secLsgCode for Ward, lsgCode for LSGD
  subIdKey?: string | number; // e.g. wardNo for Ward
  label?: string; // e.g. "Assembly Constituency"
}
