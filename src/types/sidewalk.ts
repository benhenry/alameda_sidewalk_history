export interface SidewalkSegment {
  id: string;
  coordinates: [number, number][];
  contractor: string;
  year: number;
  street: string;
  block: string;
  photos?: Photo[];
  notes?: string;
  specialMarks?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Photo {
  id: string;
  sidewalkSegmentId: string;
  filename: string;
  caption?: string;
  type: 'contractor_stamp' | 'special_mark' | 'general';
  coordinates?: [number, number];
  uploadedAt: Date;
}

export interface Contractor {
  id: string;
  name: string;
  yearsActive: number[];
  totalSegments: number;
}

export interface FilterOptions {
  contractor?: string;
  year?: number;
  decade?: number;
  street?: string;
}