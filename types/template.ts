export type MessageCategory = 'ARRIVAL' | 'PICKUP' | 'WARNING' | 'GENERAL';

export interface MessageTemplate {
  id?: string;
  condoId: string;
  category: MessageCategory;
  title: string;
  content: string;
  isActive: boolean;
  isMandatory?: boolean;
  createdAt?: any;
  updatedAt?: any;
}