
export enum LogSectionType {
  DORI = 'Dori Detail',
  WARPIN = 'Warpin Detail',
  BHEEM = 'Bheem Detail',
  DELIVERY = 'Delivery Detail'
}

export interface TableColumn {
  id: string;
  header: string;
}

export interface TableRow {
  id: string;
  values: Record<string, string>;
}

export interface SectionData {
  columns: TableColumn[];
  rows: TableRow[];
}

export interface StockLog {
  id: string;
  date: string;
  author: string;
  isLocked: boolean;
  [LogSectionType.DORI]: SectionData;
  [LogSectionType.WARPIN]: SectionData;
  [LogSectionType.BHEEM]: SectionData;
  [LogSectionType.DELIVERY]: SectionData;
}

export interface User {
  name: string;
}
