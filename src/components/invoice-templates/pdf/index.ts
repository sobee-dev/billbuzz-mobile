// components/receipt-templates/pdf/index.ts
//
// PDF-export twin of components/receipt-templates/index.ts. Same
// selection logic (purchase orders always get their own layout,
// irrespective of the business's chosen customer-facing template) but
// resolving to an HTML-builder function instead of a React component.

import { BusinessProfile } from '../../../services/business';
import { Document, DocumentType } from '../../../services/documents';
import { TemplateId } from '../index';
import { buildClassicHtml } from './classicHtml';
import { buildMinimalHtml } from './minimalHtml';
import { buildModernHtml } from './modernHtml';
import { buildProfessionalHtml } from './professionalHtml';
import { buildPurchaseOrderHtml } from './purchaseOrderHtml';


type HtmlBuilder = (doc: Document, business: BusinessProfile) => string;

const HTML_TEMPLATES: Record<TemplateId, HtmlBuilder> = {
  classic: buildClassicHtml,
  modern:  buildModernHtml,
  minimal: buildMinimalHtml,
  professional: buildProfessionalHtml,
};

export function getInvoiceHtml(
  templateId: string | undefined,
  documentType: DocumentType | undefined,
  doc: Document,
  business: BusinessProfile,
): string {
  // Purchase orders always use their own supplier-facing layout — same
  // rule as getInvoiceTemplate() in the RN registry.
  if (documentType === 'purchase_invoice') {
    return buildPurchaseOrderHtml(doc, business);
  }
  const builder = HTML_TEMPLATES[templateId as TemplateId] ?? HTML_TEMPLATES.minimal;
  return builder(doc, business);
}