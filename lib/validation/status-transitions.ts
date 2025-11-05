// lib/validation/status-transitions.ts
// Валидация переходов статусов документов согласно правилам системы

export const STATUS_TRANSITIONS = {
  quote: {
    'DRAFT': ['SENT', 'CANCELLED'],
    'SENT': ['ACCEPTED', 'REJECTED', 'CANCELLED'],
    'ACCEPTED': ['CANCELLED'],
    'REJECTED': ['CANCELLED'],
    'CANCELLED': []
  },
  invoice: {
    'DRAFT': ['SENT', 'CANCELLED'],
    'SENT': ['PAID', 'CANCELLED'],
    'PAID': ['ORDERED', 'CANCELLED'],
    'ORDERED': ['RECEIVED_FROM_SUPPLIER', 'CANCELLED'],
    'RECEIVED_FROM_SUPPLIER': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [],
    'CANCELLED': []
  },
  order: {
    'NEW_PLANNED': ['UNDER_REVIEW', 'CANCELLED'],
    'UNDER_REVIEW': ['AWAITING_MEASUREMENT', 'AWAITING_INVOICE', 'CANCELLED'],
    'AWAITING_MEASUREMENT': ['AWAITING_INVOICE', 'CANCELLED'],
    'AWAITING_INVOICE': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [],
    'CANCELLED': []
  },
  supplier_order: {
    'PENDING': ['ORDERED', 'CANCELLED'],
    'ORDERED': ['RECEIVED_FROM_SUPPLIER', 'CANCELLED'],
    'RECEIVED_FROM_SUPPLIER': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [],
    'CANCELLED': []
  }
};

export function canTransitionTo(
  documentType: string,
  currentStatus: string,
  newStatus: string
): boolean {
  const transitions = STATUS_TRANSITIONS[documentType as keyof typeof STATUS_TRANSITIONS];
  if (!transitions) return false;
  
  const allowedTransitions = transitions[currentStatus as keyof typeof transitions];
  return allowedTransitions?.includes(newStatus) || false;
}

export function getValidTransitions(
  documentType: string,
  currentStatus: string
): string[] {
  const transitions = STATUS_TRANSITIONS[documentType as keyof typeof STATUS_TRANSITIONS];
  if (!transitions) return [];
  
  return transitions[currentStatus as keyof typeof transitions] || [];
}

// Проверка возможности редактирования документа
export function canEditDocument(
  documentType: string,
  documentStatus: string
): boolean {
  // Документы можно редактировать только в статусе DRAFT
  return documentStatus === 'DRAFT';
}

// Проверка возможности удаления документа
export function canDeleteDocument(
  documentType: string,
  documentStatus: string
): boolean {
  // Документы можно удалять только в статусе DRAFT или CANCELLED
  return documentStatus === 'DRAFT' || documentStatus === 'CANCELLED';
}
