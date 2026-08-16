// components/receipt-templates/index.ts
import { ComponentType } from 'react';
import { BusinessProfile } from '../../services/business';
import { Document, DocumentType } from '../../services/documents';
import { ClassicTemplate } from './ClassicTemplate';
import { MinimalTemplate } from './MinimalTemplate';
import { ModernTemplate } from './ModernTemplate';
import { PurchaseOrderTemplate } from './PurchaseOrderTemplate';


export type TemplateId = 'modern' | 'classic' | 'minimal' ;

export interface ReceiptTemplateProps {
  doc: Document;
  business: BusinessProfile;
}

// Add a new template: build the component, then register it here — one line.
export const RECEIPT_TEMPLATES: Record<TemplateId, ComponentType<ReceiptTemplateProps>> = {
  modern:  ModernTemplate,
  classic: ClassicTemplate,
  minimal: MinimalTemplate,
  
};

export function getInvoiceTemplate(
    id: string | undefined,
    documentType?: DocumentType,
  ): ComponentType<ReceiptTemplateProps> {
    // Purchase orders always use their own supplier-facing layout,
    // irrespective of whatever template the business has chosen for
    // customer-facing documents.
    if (documentType === 'purchase_invoice') return PurchaseOrderTemplate;
    return RECEIPT_TEMPLATES[id as TemplateId] ?? RECEIPT_TEMPLATES.modern;
  }